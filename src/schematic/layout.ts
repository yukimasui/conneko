/**
 * 図面（概念図の接続と展開図の配置）から、展開図 JSON（conneko-schematic）を組み立てる。
 *
 * - 要素は機器定義から切り出す（elements.ts）。配置は diagram.schematic。
 * - 線は概念図の接続から求める。電線・ケーブルのピン・同じ名前のリンクでつながった端子を 1 つの網とし、
 *   どこにも置いていない機器の中の常時導通の経路は素通しにする（置いていない端子台を飛ばしてつなぐ）。
 * - 網ごとに、置いた端子どうしを最小全域木でつなぎ、端子から少し出してから直角に曲げて引く。
 *   母線にした網の端子は、横にまっすぐ母線へ引き出す。
 * - 行番号は全シートの通し番号。コイルの下にはその機器の接点の行番号（接点の所在）、接点の下にはコイルの行番号を書く。
 *
 * 内部の計算は展開図 JSON と同じ y が上向きの座標で行う（配置は y が下向きなので変換する）。
 */
import { buildModel, key, supplyLabel, UnionFind, type DefLookup } from '../check/model';
import type { DeviceDefinition, ParamValues } from '../devices/types';
import type { Diagram } from '../model/diagram';
import { deviceElements, elementId, elementSymbol, type SchematicElement } from './elements';
import {
  SCHEMATIC_FORMAT,
  SCHEMATIC_LAYERS,
  SCHEMATIC_VERSION,
  type Point,
  type SchematicExport,
  type SchematicSheetOut,
  type SymbolDef,
} from './format';
import { paperOf, splitRail, type SchematicItem } from './model';
import { pinDirection, pinPoint, type Direction } from './place';

/** 1 行目の段の高さ（用紙の上端から）[mm] */
export const ROW_TOP = 30;
/** 段の間隔[mm] */
export const ROW_PITCH = 15;
/** 用紙の下端から最後の段までの余白（表題欄のぶん）[mm] */
const ROW_BOTTOM = 45;
/** 母線の位置（用紙の左端・右端から）[mm] */
export const RAIL_INSET = 40;
/** 行番号の位置（用紙の左端から）[mm] */
const ROW_NO_X = 25;
/** 端子から線を出す長さ（曲げる前にまっすぐ出す）[mm] */
const STUB = 5;
/** 線番・行番号の文字の高さ */
const WIRE_NO_TEXT = 2.5;
const REF_TEXT = 2;

export interface ElementEntry {
  /** 要素 ID（`<機器名>:<キー>`） */
  id: string;
  device: string;
  def: DeviceDefinition;
  element: SchematicElement;
  symbol: SymbolDef;
  /** 置いたシートと配置（置いていなければ undefined） */
  placed?: { sheet: string; item: SchematicItem };
}

export interface RailCandidate {
  /** `機器名.端子ID` */
  ref: string;
  label: string;
}

export interface SchematicBuild {
  doc: SchematicExport;
  /** 全機器の要素（図面の機器の順） */
  elements: ElementEntry[];
  byId: Map<string, ElementEntry>;
  /** 置いた要素の行番号（全シートの通し番号） */
  rows: Map<string, number>;
  /** 母線にできる網（電源出力の端子） */
  railCandidates: RailCandidate[];
  /** シートあたりの段の数 */
  rowsPerSheet: number;
}

const elementCache = new WeakMap<DeviceDefinition, Map<string, SchematicElement[]>>();

function cachedElements(def: DeviceDefinition, params?: ParamValues): SchematicElement[] {
  let byParams = elementCache.get(def);
  if (!byParams) elementCache.set(def, (byParams = new Map()));
  const k = JSON.stringify(params ?? {});
  let els = byParams.get(k);
  if (!els) byParams.set(k, (els = deviceElements(def, params)));
  return els;
}

/** シートあたりの段の数 */
export function rowsPerSheet(paperHeight: number): number {
  return Math.floor((paperHeight - ROW_BOTTOM - ROW_TOP) / ROW_PITCH) + 1;
}

/** 配置の y（下向き）からシート内の段の番号（0 から） */
export function localRow(y: number, rows: number): number {
  return Math.min(rows - 1, Math.max(0, Math.round((y - ROW_TOP) / ROW_PITCH)));
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const same = (a: Point, b: Point) => r3(a[0]) === r3(b[0]) && r3(a[1]) === r3(b[1]);

/** 連続する同じ点と、一直線上の途中の点を除く */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    if (out.length && same(out[out.length - 1], p)) continue;
    if (out.length >= 2) {
      const [a, b] = [out[out.length - 2], out[out.length - 1]];
      const collinear = (r3(a[0]) === r3(b[0]) && r3(b[0]) === r3(p[0])) || (r3(a[1]) === r3(b[1]) && r3(b[1]) === r3(p[1]));
      if (collinear) out.pop();
    }
    out.push(p);
  }
  return out;
}

interface PinAt {
  pos: Point;
  dir: Direction;
}

/** 2 つの端子を直角の折れ線でつなぐ */
function route(a: PinAt, b: PinAt): Point[] {
  const [ax, ay] = a.pos;
  const [bx, by] = b.pos;
  // 同じ高さで向かい合っている（a の右に b があり、a は右へ・b は左へ出す）ならまっすぐ
  if (r3(ay) === r3(by) && (bx - ax) * a.dir[0] > 0 && (ax - bx) * b.dir[0] > 0) return [a.pos, b.pos];
  if (r3(ax) === r3(bx) && (by - ay) * a.dir[1] > 0 && (ay - by) * b.dir[1] > 0) return [a.pos, b.pos];
  const sa: Point = [ax + a.dir[0] * STUB, ay + a.dir[1] * STUB];
  const sb: Point = [bx + b.dir[0] * STUB, by + b.dir[1] * STUB];
  const corner: Point = a.dir[0] !== 0 ? [sa[0], sb[1]] : [sb[0], sa[1]];
  return simplify([a.pos, sa, corner, sb, b.pos]);
}

/** 置いた端子どうしを結ぶ最小全域木（Prim 法。距離は縦横の和）の辺 */
function spanningTree(pins: PinAt[]): [number, number][] {
  const n = pins.length;
  const dist = (i: number, j: number) => Math.abs(pins[i].pos[0] - pins[j].pos[0]) + Math.abs(pins[i].pos[1] - pins[j].pos[1]);
  const inTree = new Array<boolean>(n).fill(false);
  const best = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  const edges: [number, number][] = [];
  best[0] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = true;
    if (from[u] >= 0) edges.push([from[u], u]);
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = dist(u, v);
      if (d < best[v]) {
        best[v] = d;
        from[v] = u;
      }
    }
  }
  return edges;
}

/** 線の分かれ目（3 本以上の線が集まる点）。点を通り抜ける線は 2 本と数える */
function junctions(polylines: Point[][]): Point[] {
  const segs: [Point, Point][] = polylines.flatMap((pl) => pl.slice(1).map((p, i) => [pl[i], p] as [Point, Point]));
  const candidates = new Map<string, Point>();
  for (const [a, b] of segs) for (const p of [a, b]) candidates.set(`${r3(p[0])},${r3(p[1])}`, p);
  const out: Point[] = [];
  for (const p of candidates.values()) {
    let degree = 0;
    for (const [a, b] of segs) {
      if (same(a, p) || same(b, p)) degree += 1;
      else if (onSegment(p, a, b)) degree += 2;
    }
    if (degree >= 3) out.push(p);
  }
  return out;
}

function onSegment(p: Point, a: Point, b: Point): boolean {
  const [x, y] = [r3(p[0]), r3(p[1])];
  if (r3(a[0]) === r3(b[0])) return x === r3(a[0]) && y > Math.min(r3(a[1]), r3(b[1])) && y < Math.max(r3(a[1]), r3(b[1]));
  if (r3(a[1]) === r3(b[1])) return y === r3(a[1]) && x > Math.min(r3(a[0]), r3(b[0])) && x < Math.max(r3(a[0]), r3(b[0]));
  return false;
}

/** 線番を書く位置（いちばん長い横の区間の中央の上。横の区間がなければ最初の区間の右） */
function wireNoAt(polylines: Point[][]): { at: Point; align: 'center' | 'left' } | undefined {
  let best: { at: Point; len: number } | undefined;
  for (const pl of polylines) {
    for (let i = 0; i + 1 < pl.length; i++) {
      const [a, b] = [pl[i], pl[i + 1]];
      if (r3(a[1]) !== r3(b[1])) continue;
      const len = Math.abs(b[0] - a[0]);
      if (!best || len > best.len) best = { at: [(a[0] + b[0]) / 2, a[1] + 1.8], len };
    }
  }
  if (best) return { at: best.at, align: 'center' };
  const pl = polylines.find((x) => x.length >= 2);
  return pl ? { at: [(pl[0][0] + pl[1][0]) / 2 + 1, (pl[0][1] + pl[1][1]) / 2], align: 'left' } : undefined;
}

export function buildSchematic(diagram: Diagram, lookup: DefLookup): SchematicBuild {
  const model = buildModel(diagram, lookup, () => {});
  const schematic = diagram.schematic ?? { sheets: [] };
  const paper = paperOf(schematic);
  const { width: W, height: H } = paper;
  const rows = rowsPerSheet(H);
  const up = (x: number, y: number): Point => [x, H - y];

  // --- 要素と配置 ---
  const elements: ElementEntry[] = [];
  const terminalElement = new Map<string, { entry: ElementEntry; pin: string }>();
  for (const { device, def } of model.devices.values()) {
    for (const el of cachedElements(def, device.params)) {
      const entry: ElementEntry = { id: elementId(device.id, el.key), device: device.id, def, element: el, symbol: elementSymbol(el) };
      elements.push(entry);
      for (const [t, pin] of Object.entries(el.pinOf)) terminalElement.set(key(device.id, t), { entry, pin });
    }
  }
  const byId = new Map(elements.map((e) => [e.id, e]));
  const sheetIndex = new Map(schematic.sheets.map((s, i) => [s.id, i]));
  const rowOf = new Map<string, number>();
  for (const sh of schematic.sheets) {
    for (const it of sh.items) {
      const e = byId.get(it.element);
      if (!e || e.placed) continue;
      e.placed = { sheet: sh.id, item: it };
      rowOf.set(e.id, sheetIndex.get(sh.id)! * rows + localRow(it.y, rows) + 1);
    }
  }

  // --- 網 ---
  const uf = new UnionFind();
  for (const w of model.wires) uf.union(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of model.cablePairs) uf.union(a, b);
  for (const [a, b] of model.labelLinks) uf.union(a, b);
  for (const [a, b] of model.fixedLinks) {
    // 置いた要素の中の導通は記号として描くので、網にはまとめない
    if (!terminalElement.get(a)?.entry.placed && !terminalElement.get(b)?.entry.placed) uf.union(a, b);
  }
  const wireNos = new Map<string, Set<string>>();
  for (const w of model.wires) {
    if (!w.wireNo) continue;
    const root = uf.find(key(w.from.device, w.from.terminal));
    wireNos.set(root, (wireNos.get(root) ?? new Set()).add(w.wireNo));
  }
  const wireNoOf = (root: string) => [...(wireNos.get(root) ?? [])].sort((a, b) => a.localeCompare(b, 'ja', { numeric: true })).join(',');

  // 置いた端子（網ごと・シートごと）
  interface PlacedPin extends PinAt {
    root: string;
    row: number;
  }
  const pinsBySheet = new Map<string, PlacedPin[]>();
  const sheetsOfNet = new Map<string, Map<string, number[]>>();
  for (const e of elements) {
    if (!e.placed) continue;
    const { item } = e.placed;
    const at = up(item.x, item.y);
    const seen = new Set<string>();
    for (const [t, pin] of Object.entries(e.element.pinOf)) {
      const root = uf.find(key(e.device, t));
      const pos = pinPoint(e.symbol, pin, at, item.rotation);
      const id = `${root}@${r3(pos[0])},${r3(pos[1])}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const row = rowOf.get(e.id)!;
      const list = pinsBySheet.get(e.placed.sheet) ?? [];
      list.push({ root, pos, dir: pinDirection(e.symbol, pin, item.rotation), row });
      pinsBySheet.set(e.placed.sheet, list);
      const bySheet = sheetsOfNet.get(root) ?? new Map<string, number[]>();
      bySheet.set(e.placed.sheet, [...(bySheet.get(e.placed.sheet) ?? []), row]);
      sheetsOfNet.set(root, bySheet);
    }
  }

  // --- 接点の所在 ---
  const xrefOf = (e: ElementEntry): string | undefined => {
    const k = e.element.kind;
    const siblings = elements.filter((x) => x.device === e.device && x.placed);
    if (k === 'coil') {
      const a = siblings.filter((x) => x.element.kind === 'contactor' || x.element.symbol.startsWith('contact-no')).map((x) => rowOf.get(x.id)!);
      const b = siblings.filter((x) => x.element.symbol.startsWith('contact-nc')).map((x) => rowOf.get(x.id)!);
      const fmt = (label: string, ns: number[]) => (ns.length ? `${label}:${[...new Set(ns)].sort((x, y) => x - y).join(',')}` : '');
      return [fmt('a', a), fmt('b', b)].filter(Boolean).join(' ') || undefined;
    }
    if (k === 'contact') {
      const owner = siblings.find((x) => x.element.kind === 'coil' || x.element.kind === 'thermal');
      return owner ? String(rowOf.get(owner.id)) : undefined;
    }
    return undefined;
  };

  // --- シート ---
  const sheets: SchematicSheetOut[] = schematic.sheets.map((sh, index) => {
    const out: SchematicSheetOut = { id: sh.id, name: sh.name, paper, inserts: [], polylines: [], dots: [], texts: [] };
    drawFrame(out, diagram.settings?.title, diagram.settings?.revision, index, schematic.sheets.length);
    for (let r = 0; r < rows; r++) {
      out.texts.push({ at: up(ROW_NO_X, ROW_TOP + r * ROW_PITCH), text: String(index * rows + r + 1), height: WIRE_NO_TEXT, layer: 'FRAME' });
    }

    // 記号
    for (const it of sh.items) {
      const e = byId.get(it.element);
      if (!e || e.placed?.sheet !== sh.id || e.placed.item !== it) continue;
      const comment = e.element.kind.startsWith('plc-') ? diagram.devices.find((d) => d.id === e.device)?.comments?.[Object.keys(e.element.pinOf)[0]] : undefined;
      const xref = xrefOf(e);
      out.inserts.push({
        symbol: e.element.symbol,
        at: up(it.x, it.y),
        ...(it.rotation ? { rotation: it.rotation } : {}),
        layer: 'SYMBOL',
        attributes: { ...e.element.attributes, TAG: e.device, ...(xref ? { XREF: xref } : {}), ...(comment ? { COMMENT: comment } : {}) },
        element: e.id,
      });
    }

    // 母線
    const railRoot = (ref?: string) => {
      const r = ref ? splitRail(ref) : undefined;
      const k = r ? key(r.device, r.terminal) : undefined;
      return k && model.terminals.has(k) ? uf.find(k) : undefined;
    };
    const rails = [
      { side: 'left' as const, x: RAIL_INSET, ref: sh.rails?.left, root: railRoot(sh.rails?.left) },
      { side: 'right' as const, x: W - RAIL_INSET, ref: sh.rails?.right, root: railRoot(sh.rails?.right) },
    ];

    // 網ごとの線
    const byNet = new Map<string, PlacedPin[]>();
    for (const p of pinsBySheet.get(sh.id) ?? []) byNet.set(p.root, [...(byNet.get(p.root) ?? []), p]);
    for (const [root, pins] of byNet) {
      const rail = rails.find((r) => r.root === root);
      if (rail) continue;
      const polylines = spanningTree(pins).map(([i, j]) => route(pins[i], pins[j]));
      // 別のシートにも同じ網の端子があれば、その行番号を書く
      const others = [...(sheetsOfNet.get(root) ?? [])].filter(([s]) => s !== sh.id).flatMap(([, rs]) => rs);
      if (others.length) {
        const p = pins[0];
        const end: Point = [p.pos[0] + p.dir[0] * STUB, p.pos[1] + p.dir[1] * STUB];
        if (pins.length === 1) polylines.push([p.pos, end]);
        const text = `→${[...new Set(others)].sort((a, b) => a - b).join(',')}`;
        out.texts.push({ at: [end[0] + p.dir[0] * 1, end[1] + (p.dir[1] ? p.dir[1] * 2 : 0)], text, height: REF_TEXT, align: p.dir[0] < 0 ? 'right' : 'left', layer: 'TAG' });
      }
      for (const pl of polylines) out.polylines.push({ points: pl, layer: 'WIRE' });
      for (const at of junctions(polylines)) out.dots.push({ at, layer: 'WIRE' });
      const no = wireNoOf(root);
      const label = no ? wireNoAt(polylines) : undefined;
      if (label) out.texts.push({ at: label.at, text: no, height: WIRE_NO_TEXT, align: label.align, layer: 'WIRENO' });
    }

    // 母線と母線への引き出し
    for (const rail of rails) {
      if (!rail.root) continue;
      const pins = byNet.get(rail.root) ?? [];
      const no = wireNoOf(rail.root);
      for (const p of pins) {
        if (r3(p.pos[0]) === r3(rail.x)) continue;
        out.polylines.push({ points: [p.pos, [rail.x, p.pos[1]]], layer: 'WIRE' });
        out.dots.push({ at: [rail.x, p.pos[1]], layer: 'WIRE' });
        if (no) out.texts.push({ at: [(p.pos[0] + rail.x) / 2, p.pos[1] + 1.8], text: no, height: WIRE_NO_TEXT, layer: 'WIRENO' });
      }
      const ys = pins.map((p) => p.pos[1]);
      const top = ys.length ? Math.max(...ys) + ROW_PITCH / 2 : H - ROW_TOP + ROW_PITCH / 2;
      const bottom = ys.length ? Math.min(...ys) - ROW_PITCH / 2 : H - ROW_TOP - 2.5 * ROW_PITCH;
      out.polylines.push({ points: [[rail.x, top], [rail.x, bottom]], layer: 'WIRE' });
      const r = splitRail(rail.ref!)!;
      const terminal = model.terminals.get(key(r.device, r.terminal))?.terminal;
      out.texts.push({ at: [rail.x, top + 3], text: no || (terminal?.label ?? terminal?.id ?? ''), height: WIRE_NO_TEXT, layer: 'TAG' });
    }
    return out;
  });

  // --- 母線にできる網 ---
  const railCandidates: RailCandidate[] = [...model.supplies.entries()].map(([k, s]) => {
    const info = model.terminals.get(k)!;
    return { ref: `${info.device.id}.${info.terminal.id}`, label: `${info.device.id}.${info.terminal.label ?? info.terminal.id}（${supplyLabel(s)}）` };
  });

  const doc: SchematicExport = {
    format: SCHEMATIC_FORMAT,
    version: SCHEMATIC_VERSION,
    unit: 'mm',
    ...(diagram.settings?.title ? { title: diagram.settings.title } : {}),
    ...(diagram.settings?.revision ? { revision: diagram.settings.revision } : {}),
    layers: SCHEMATIC_LAYERS,
    symbols: Object.fromEntries(
      sheets.flatMap((s) => s.inserts).map((ins) => [ins.symbol, byId.get(ins.element!)!.symbol] as const),
    ),
    sheets,
  };
  return { doc, elements, byId, rows: rowOf, railCandidates, rowsPerSheet: rows };
}

/** 図面枠と表題欄 */
function drawFrame(out: SchematicSheetOut, title: string | undefined, revision: string | undefined, index: number, count: number) {
  const { width: W, height: H } = out.paper;
  const x1 = W - 130;
  out.polylines.push(
    { points: [[10, 10], [W - 10, 10], [W - 10, H - 10], [10, H - 10]], closed: true, layer: 'FRAME' },
    { points: [[x1, 10], [W - 10, 10], [W - 10, 30], [x1, 30]], closed: true, layer: 'FRAME' },
    { points: [[x1, 20], [W - 10, 20]], layer: 'FRAME' },
    { points: [[W - 35, 10], [W - 35, 30]], layer: 'FRAME' },
  );
  out.texts.push(
    { at: [x1 + 3, 25], text: title || 'Conneko', height: 3, align: 'left', layer: 'FRAME' },
    { at: [x1 + 3, 15], text: out.name, height: 3, align: 'left', layer: 'FRAME' },
    { at: [W - 22.5, 25], text: revision ? `版 ${revision}` : '', height: 2.5, layer: 'FRAME' },
    { at: [W - 22.5, 15], text: `${index + 1} / ${count}`, height: 2.5, layer: 'FRAME' },
  );
}
