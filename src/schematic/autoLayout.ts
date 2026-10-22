/**
 * 展開図の自動配置（docs/schematic-dxf.md の段階 4）。
 *
 * 左の母線から、接点・コイル・表示灯・PLC の入出力点をたどって、右の母線（または PLC の入出力点）に着く経路を探し、
 * 行き着く記号（コイル・表示灯・入出力点）ごとに 1 段にする。
 * - いちばん短い経路を本線として左から並べ、行き着く記号は段の右端に置く。
 * - ほかの経路（自己保持の接点など、本線の一部を迂回する並列の枝）は、迂回する接点の真下の段に置く。
 * - ほかの段と共通の接点（非常停止など）は一度だけ置く（線は網として自動でつながる）。
 * - 経路を逆向きに通る記号は、端子を入れ替えて（flip）左右の向きを合わせる。
 * - 接点でたどれない PLC の入出力点（3 線式センサーの出力につながる入力など）は、
 *   つながった機器の箱（電源を母線からもらうもの）を左に、入出力点を右端に置いて 1 段にする（I/O 割付図）。
 * すでに置いた記号は動かさない。
 */
import type { SymbolDef } from './format';
import { canFlip, RAIL_INSET, ROW_PITCH, ROW_TOP, type ElementEntry, type SchematicBuild } from './layout';
import { snap, splitRail, type Schematic, type SchematicItem, type SchematicSheet } from './model';
import { pinPoint, placedBounds, symbolBounds } from './place';

type Paper = { width: number; height: number };

/** 横の範囲 [x1, x2] に重なる記号の外形のいちばん下（y は下向き）。範囲を省くと全体 */
function bottomOf(items: SchematicItem[], byId: Map<string, ElementEntry>, paper: Paper, range?: [number, number]): number {
  let bottom = -Infinity;
  for (const it of items) {
    const def = byId.get(it.element)?.symbol;
    if (!def) continue;
    const pb = placedBounds(def, [it.x, paper.height - it.y], it.rotation);
    if (range && (pb.x2 < range[0] || pb.x1 > range[1])) continue;
    bottom = Math.max(bottom, paper.height - pb.y1);
  }
  return bottom;
}

/** 外形の下端より下で、記号の上への張り出し（above）が重ならない最初の段の y */
function rowBelow(bottom: number, above: number): number {
  const minY = Number.isFinite(bottom) ? bottom + above + 2.5 : ROW_TOP;
  return ROW_TOP + Math.max(0, Math.ceil((minY - ROW_TOP) / ROW_PITCH)) * ROW_PITCH;
}

/** 段の右端に置く記号の x（右の母線から 10mm 空ける） */
function rightX(def: SymbolDef, paper: Paper): number {
  const b = symbolBounds(def);
  return snap(paper.width - RAIL_INSET - 10 - (b.x2 - b.x1));
}

const RIGHT_KINDS = new Set(['coil', 'lamp', 'motor']);

/**
 * 要素を 1 つ置く次の位置。コイル・負荷は右の母線の近く、それ以外は左の母線の近くに置き、
 * 横に重なる記号の外形のいちばん下より下で、置く記号の上への張り出しが重ならない最初の段にする
 * （コイルは左の接点と同じ段に並ぶ）。
 */
export function nextPosition(sheet: SchematicSheet, e: ElementEntry, paper: Paper, byId: Map<string, ElementEntry>): { x: number; y: number } {
  const b = symbolBounds(e.symbol);
  const x = RIGHT_KINDS.has(e.element.kind) ? rightX(e.symbol, paper) : RAIL_INSET + 20;
  const bottom = bottomOf(sheet.items, byId, paper, [x + b.x1 - 5, x + b.x2 + 5]);
  return { x, y: rowBelow(bottom, Math.max(0, b.y2)) };
}

/** 経路の辺（記号）。a → b の向きにたどる */
interface Edge {
  entry: ElementEntry;
  a: string;
  b: string;
  /** a 側が記号の端子 2（たどる向きと記号の向きが逆）なら true */
  reversed: boolean;
}

/** PLC の入出力点の先（段の終わり）を表す網 */
const PLC_END = '#plc';
/** 段を組む記号の種類 */
const LADDER_KINDS = new Set(['contact', 'coil', 'lamp', 'plc-input', 'plc-output']);
/** 経路の長さ（記号の数）と、行き着く記号ごとに調べる経路の数の上限 */
const MAX_DEPTH = 12;
const MAX_PATHS = 400;

export interface AutoLayoutResult {
  schematic: Schematic;
  /** 新しく置いた要素の数 */
  placed: number;
  /** 置けなかった理由など（置けたときは undefined） */
  message?: string;
}

export function autoLayout(build: SchematicBuild, schematic: Schematic, sheetId: string, paper: Paper): AutoLayoutResult {
  const sheet = schematic.sheets.find((s) => s.id === sheetId);
  if (!sheet) return { schematic, placed: 0, message: '展開図のシートがありません' };
  const railNet = (ref?: string) => {
    const r = ref ? splitRail(ref) : undefined;
    return r ? build.netOf(r.device, r.terminal) : undefined;
  };
  const left = railNet(sheet.rails?.left);
  const right = railNet(sheet.rails?.right);
  if (!left) return { schematic, placed: 0, message: '左の母線（電源側）を選んでから自動で並べてください' };

  // --- 経路のグラフ（網を頂点、記号を辺とする） ---
  const adjacency = new Map<string, Edge[]>();
  const addEdge = (e: Edge) => adjacency.set(e.a, [...(adjacency.get(e.a) ?? []), e]);
  for (const entry of build.elements) {
    if (!LADDER_KINDS.has(entry.element.kind)) continue;
    const terminalOf = (pin: string) => Object.entries(entry.element.pinOf).find(([, p]) => p === pin)?.[0];
    const t1 = terminalOf('1');
    if (!t1) continue;
    const n1 = build.netOf(entry.device, t1);
    if (entry.element.kind === 'plc-input' || entry.element.kind === 'plc-output') {
      addEdge({ entry, a: n1, b: PLC_END, reversed: false });
      continue;
    }
    const t2 = terminalOf('2');
    if (!t2 || !canFlip(entry.symbol)) continue;
    const n2 = build.netOf(entry.device, t2);
    if (n1 === n2) continue;
    addEdge({ entry, a: n1, b: n2, reversed: false });
    addEdge({ entry, a: n2, b: n1, reversed: true });
  }

  // --- 左の母線から段の終わり（右の母線・PLC の入出力点）までの経路 ---
  const paths: Edge[][] = [];
  const visit = (net: string, path: Edge[], seen: Set<string>) => {
    if (paths.length >= MAX_PATHS || path.length >= MAX_DEPTH) return;
    for (const e of adjacency.get(net) ?? []) {
      if (path.some((p) => p.entry === e.entry)) continue;
      if (e.b === PLC_END || e.b === right) {
        paths.push([...path, e]);
        continue;
      }
      if (seen.has(e.b) || e.b === left) continue;
      // 段の途中に PLC の入出力点は入らない
      if (e.entry.element.kind.startsWith('plc-')) continue;
      seen.add(e.b);
      visit(e.b, [...path, e], seen);
      seen.delete(e.b);
    }
  };
  visit(left, [], new Set([left]));

  // 行き着く記号ごとにまとめる（図面の機器の順）
  const order = new Map(build.elements.map((e, i) => [e.id, i]));
  const groups = new Map<string, Edge[][]>();
  for (const p of paths) {
    const end = p[p.length - 1].entry.id;
    groups.set(end, [...(groups.get(end) ?? []), p]);
  }
  const ends = [...groups.keys()].sort((a, b) => order.get(a)! - order.get(b)!);

  // --- 並べる ---
  const items = [...sheet.items];
  const where = new Map<string, SchematicItem>(items.map((i) => [i.element, i]));
  const elsewhere = new Set(schematic.sheets.filter((s) => s.id !== sheetId).flatMap((s) => s.items.map((i) => i.element)));
  let placed = 0;
  const put = (e: { entry: ElementEntry; reversed?: boolean }, x: number, y: number) => {
    const item: SchematicItem = { element: e.entry.id, x: snap(x), y: snap(y), ...(e.reversed ? { flip: true } : {}) };
    items.push(item);
    where.set(item.element, item);
    placed++;
    return item;
  };
  const isPlaced = (e: Edge) => where.has(e.entry.id) || elsewhere.has(e.entry.id);
  const widthOf = (def: SymbolDef) => {
    const b = symbolBounds(def);
    return b.x2 - b.x1;
  };
  /** 左の母線から並べはじめる x */
  const START = RAIL_INSET + 20;
  /** 記号どうしの間隔 */
  const GAP = 10;

  for (const end of ends) {
    const group = groups.get(end)!.sort((a, b) => a.length - b.length);
    const main = group[0];
    const last = main[main.length - 1];
    if (isPlaced(last)) continue;
    const middle = main.slice(0, -1);
    // 段の高さ: 並べる記号の上への張り出しのいちばん大きいもの
    const above = Math.max(0, ...main.filter((e) => !isPlaced(e)).map((e) => symbolBounds(e.entry.symbol).y2));
    const y = rowBelow(bottomOf(items, build.byId, paper), above);
    // 本線: 左から順に。共通の接点（置いてあるもの）は飛ばし、その右から続ける
    const xOf = new Map<string, number>();
    let cursor = START;
    for (const e of middle) {
      const at = where.get(e.entry.id);
      if (at) {
        cursor = Math.max(cursor, at.x + widthOf(e.entry.symbol) + GAP);
        xOf.set(e.entry.id, at.x);
        continue;
      }
      if (elsewhere.has(e.entry.id)) continue;
      xOf.set(e.entry.id, cursor);
      put(e, cursor, y);
      cursor += widthOf(e.entry.symbol) + GAP;
    }
    put(last, Math.max(cursor, rightX(last.entry.symbol, paper)), y);

    // 並列の枝: 本線にない記号を、迂回する本線の記号の真下に並べる
    for (const p of group.slice(1)) {
      const branch = p.slice(0, -1).filter((e) => !isPlaced(e));
      if (!branch.length || p[p.length - 1].entry.id !== end) continue;
      // 枝が本線から分かれる位置（最初に本線と違う記号のところ）
      const k = p.findIndex((e, i) => main[i]?.entry !== e.entry);
      const under = main[Math.max(0, k)];
      const bx = xOf.get(under?.entry.id ?? '') ?? START;
      const babove = Math.max(0, ...branch.map((e) => symbolBounds(e.entry.symbol).y2));
      const by = rowBelow(bottomOf(items, build.byId, paper, [bx - 5, bx + branch.reduce((w, e) => w + widthOf(e.entry.symbol) + GAP, 0)]), babove);
      let bxCursor = bx;
      for (const e of branch) {
        put(e, bxCursor, by);
        bxCursor += widthOf(e.entry.symbol) + GAP;
      }
    }
  }

  // --- 接点でたどれない入出力点: つながった機器の箱と 1 段にする ---
  const rails = [left, right].filter(Boolean);
  const netsOf = (e: ElementEntry) => Object.keys(e.element.pinOf).map((t) => ({ t, net: build.netOf(e.device, t) }));
  /** 配置した記号の端子の y（下向き） */
  const pinY = (e: ElementEntry, item: SchematicItem, terminal: string) =>
    paper.height - pinPoint(e.symbol, e.element.pinOf[terminal], [item.x, paper.height - item.y], item.rotation)[1];
  for (const point of build.elements) {
    if (!point.element.kind.startsWith('plc-') || where.has(point.id) || elsewhere.has(point.id)) continue;
    const net = netsOf(point)[0]?.net;
    const partner = build.elements.find(
      (e) => e.element.kind === 'box' && e.device !== point.device && netsOf(e).some((x) => x.net === net) && netsOf(e).some((x) => rails.includes(x.net)),
    );
    if (!partner || elsewhere.has(partner.id)) continue;
    let at = where.get(partner.id);
    if (!at) {
      const above = Math.max(0, symbolBounds(partner.symbol).y2, symbolBounds(point.symbol).y2);
      at = put({ entry: partner }, START, rowBelow(bottomOf(items, build.byId, paper), above));
    }
    const terminal = netsOf(partner).find((x) => x.net === net)!.t;
    put({ entry: point }, rightX(point.symbol, paper), pinY(partner, at, terminal));
  }

  if (!placed) {
    return {
      schematic,
      placed: 0,
      message: paths.length
        ? '新しく置く記号はありません（段の記号はすべて配置済みです）'
        : '左の母線から右の母線・PLC の入出力点へ、接点・コイル・表示灯だけでたどれる段が見つかりません',
    };
  }
  return { schematic: { ...schematic, sheets: schematic.sheets.map((s) => (s.id === sheetId ? { ...s, items } : s)) }, placed };
}
