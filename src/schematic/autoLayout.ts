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
 * 母線（電源側）を選んでいないシートは主回路として並べる（autoLayoutMain）。
 * すでに置いた記号は動かさない。
 */
import type { SymbolDef } from './format';
import { canBeVertical, canFlip, itemSymbol, RAIL_INSET, ROW_PITCH, ROW_TOP, type ElementEntry, type SchematicBuild } from './layout';
import { snap, splitRail, type Schematic, type SchematicItem, type SchematicSheet } from './model';
import { pinPoint, placedBounds, symbolBounds } from './place';

type Paper = { width: number; height: number };

/** 横の範囲 [x1, x2] に重なる記号の外形のいちばん下（y は下向き）。範囲を省くと全体 */
function bottomOf(items: SchematicItem[], byId: Map<string, ElementEntry>, paper: Paper, range?: [number, number]): number {
  let bottom = -Infinity;
  for (const it of items) {
    const e = byId.get(it.element);
    if (!e) continue;
    const def = itemSymbol(e, it);
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

const RIGHT_KINDS = new Set(['coil', 'lamp', 'buzzer', 'motor']);

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
const LADDER_KINDS = new Set(['contact', 'coil', 'lamp', 'buzzer', 'plc-input', 'plc-output']);
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
  const left = railNet(sheet.rails?.supply);
  const right = railNet(sheet.rails?.common);
  if (!left) return autoLayoutMain(build, schematic, sheetId, paper);

  // --- 経路のグラフ（網を頂点、記号を辺とする） ---
  const adjacency = new Map<string, Edge[]>();
  const addEdge = (e: Edge) => adjacency.set(e.a, [...(adjacency.get(e.a) ?? []), e]);
  /** ソース出力（PNP）の出力点。段の左に置き、負荷を通って戻り側の母線へ着く経路を別に探す */
  const sources: { entry: ElementEntry; net: string }[] = [];
  for (const entry of build.elements) {
    if (!LADDER_KINDS.has(entry.element.kind)) continue;
    const terminalOf = (pin: string) => Object.entries(entry.element.pinOf).find(([, p]) => p === pin)?.[0];
    const t1 = terminalOf('1');
    if (!t1) continue;
    const n1 = build.netOf(entry.device, t1);
    if (entry.element.kind === 'plc-output' && entry.element.symbol === 'plc-out-src') {
      sources.push({ entry, net: n1 });
      continue;
    }
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

  // --- ソース出力（PNP）: 出力点を段の左に置き、負荷（と途中の接点）を通って戻り側の母線へ着く段にする ---
  for (const src of right ? sources : []) {
    if (where.has(src.entry.id) || elsewhere.has(src.entry.id)) continue;
    let best: Edge[] | undefined;
    const walk = (net: string, path: Edge[], seen: Set<string>) => {
      if (path.length >= MAX_DEPTH || (best && path.length >= best.length)) return;
      for (const e of adjacency.get(net) ?? []) {
        if (e.b === PLC_END || e.entry.element.kind.startsWith('plc-') || path.some((p) => p.entry === e.entry)) continue;
        if (e.b === right) {
          if (!best || path.length + 1 < best.length) best = [...path, e];
          continue;
        }
        if (seen.has(e.b) || e.b === left) continue;
        seen.add(e.b);
        walk(e.b, [...path, e], seen);
        seen.delete(e.b);
      }
    };
    walk(src.net, [], new Set([src.net]));
    if (!best) continue;
    const chain = best as Edge[];
    const above = Math.max(0, symbolBounds(src.entry.symbol).y2, ...chain.filter((e) => !isPlaced(e)).map((e) => symbolBounds(e.entry.symbol).y2));
    const y = rowBelow(bottomOf(items, build.byId, paper), above);
    // 出力点の記号は端子（右端）が基準点なので、枠の幅だけ右に置く
    const sx = START - symbolBounds(src.entry.symbol).x1;
    put({ entry: src.entry }, sx, y);
    let cursor = sx + GAP;
    for (const e of chain.slice(0, -1)) {
      if (isPlaced(e)) continue;
      put(e, cursor, y);
      cursor += widthOf(e.entry.symbol) + GAP;
    }
    const last = chain[chain.length - 1];
    if (!isPlaced(last)) put(last, Math.max(cursor, rightX(last.entry.symbol, paper)), y);
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

// ---- 主回路 ----

/** 主回路の機器の種類（極ごとに一次側から二次側へ流れるもの） */
const MAIN_KINDS = new Set(['source', 'breaker', 'contactor', 'thermal', 'motor']);
/** 主回路の機器どうしの縦の間隔[mm] */
const MAIN_GAP = 10;
/** 主回路の 1 列目（1 極目）の x */
const MAIN_X = 60;

interface MainNode {
  entry: ElementEntry;
  /** 一次側の端子（極の順）の網 */
  ins: string[];
  /** 二次側の端子（極の順）の網 */
  outs: string[];
  children: MainNode[];
  depth: number;
}

/**
 * 主回路を並べる。一次電源（なければ、ほかの主回路の機器から給電されていない機器）から始め、
 * すべての極が前の機器の二次側につながる機器をたどって縦に 1 列に並べる（いちばん長く続く枝を本線にする）。
 * 本線から分かれる機器（制御電源のサーキットプロテクタなど）は、横向きで本線の右に、分かれる位置の下に置く。
 */
export function autoLayoutMain(build: SchematicBuild, schematic: Schematic, sheetId: string, paper: Paper): AutoLayoutResult {
  const sheet = schematic.sheets.find((s) => s.id === sheetId)!;
  const placedIds = new Set(schematic.sheets.flatMap((s) => s.items.map((i) => i.element)));
  const terminalsOf = (e: ElementEntry, pins: string[]) =>
    pins.map((pin) => Object.entries(e.element.pinOf).find(([, p]) => p === pin)?.[0]).filter((t): t is string => !!t);
  const nodes: MainNode[] = [];
  for (const e of build.elements) {
    if (!MAIN_KINDS.has(e.element.kind) || placedIds.has(e.id)) continue;
    const n = Object.keys(e.element.pinOf).length;
    const pins = Array.from({ length: n }, (_, i) => String(i + 1));
    let ins: string[] = [];
    let outs: string[] = [];
    if (e.element.kind === 'source') outs = pins;
    else if (e.element.kind === 'motor') ins = pins;
    else {
      ins = pins.filter((p) => Number(p) % 2 === 1);
      outs = pins.filter((p) => Number(p) % 2 === 0);
    }
    const net = (ps: string[]) => terminalsOf(e, ps).map((t) => build.circuitNetOf(e.device, t));
    nodes.push({ entry: e, ins: net(ins), outs: net(outs), children: [], depth: 1 });
  }
  // 親子: 子のすべての一次側が、親の二次側の網にある
  const parentOf = new Map<MainNode, MainNode>();
  for (const child of nodes) {
    if (!child.ins.length) continue;
    const parent = nodes.find((p) => p !== child && p.outs.length && child.ins.every((n) => p.outs.includes(n)));
    if (parent) {
      parent.children.push(child);
      parentOf.set(child, parent);
    }
  }
  const depth = (n: MainNode, seen = new Set<MainNode>()): number => {
    if (seen.has(n)) return 0;
    seen.add(n);
    n.depth = 1 + Math.max(0, ...n.children.map((c) => depth(c, seen)));
    return n.depth;
  };
  const roots = nodes.filter((n) => !parentOf.has(n) && (n.entry.element.kind === 'source' || n.children.length));
  if (!roots.length) {
    return {
      schematic,
      placed: 0,
      message: '母線を選んでいないシートは主回路として並べます。置いていない一次電源・遮断器・電磁接触器などが見つかりません（制御回路は母線を選んでから並べてください）',
    };
  }
  for (const r of roots) depth(r);

  const H = paper.height;
  const items = [...sheet.items];
  let placed = 0;
  /** 要素の極 1 の端子（pin）が (x, y) に来るように置く（y は下向き）。置いた記号の端子の y を返す */
  const put = (n: MainNode, vertical: boolean, x: number, y: number, anchorPin: string) => {
    const item: SchematicItem = { element: n.entry.id, x: 0, y: 0, ...(vertical ? { vertical: true } : {}) };
    const def = itemSymbol(n.entry, item);
    const p = def.pins[anchorPin];
    item.x = snap(x - p[0]);
    item.y = snap(y + p[1]);
    items.push(item);
    placed++;
    const yOf = (pin: string) => item.y - (def.pins[pin]?.[1] ?? 0);
    return { item, def, yOf };
  };
  // 既に置いた記号の右から始める
  let x0 = MAIN_X;
  for (const it of sheet.items) {
    const e = build.byId.get(it.element);
    if (e) x0 = Math.max(x0, snap(placedBounds(itemSymbol(e, it), [it.x, H - it.y], it.rotation).x2 + 30));
  }

  const layoutChain = (root: MainNode, x: number) => {
    let node: MainNode | undefined = root;
    let y = 25;
    let first = true;
    while (node) {
      const vertical = canBeVertical(node.entry);
      // 端子 1（一次電源は 1 番目の端子、ほかは 1 極目の一次側）を本線の列にそろえる
      if (!first) y += MAIN_GAP;
      const { def, yOf } = put(node, vertical, x, y, '1');
      first = false;
      // 二次側の端子の高さ（なければ記号の下端）
      const outPin = node.entry.element.kind === 'source' ? '1' : node.entry.element.kind === 'motor' ? undefined : '2';
      y = outPin ? yOf(outPin) : y + 20;
      // 分かれる機器（本線でない子）は横向きで右に、分かれる位置の下に並べる
      const sorted: MainNode[] = [...node.children].sort((a, b) => b.depth - a.depth);
      const main: MainNode | undefined = sorted[0];
      const branches = sorted.slice(1);
      const width = vertical ? Math.max(...Object.values(def.pins).map((q) => q[0])) - def.pins['1'][0] : 0;
      for (const b of branches) {
        y += 7.5;
        const r = put(b, false, x + width + 25, y, '1');
        const lastIn = String(2 * (b.ins.length - 1) + 1);
        y = Math.max(y, r.yOf(lastIn)) + 2.5;
      }
      node = main;
    }
  };
  roots.forEach((r, i) => layoutChain(r, x0 + i * 80));

  return { schematic: { ...schematic, sheets: schematic.sheets.map((s) => (s.id === sheetId ? { ...s, items } : s)) }, placed };
}
