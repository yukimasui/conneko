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
import type { Conductor, DeviceDefinition, ParamValues } from '../devices/types';
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
import { paperOf, splitRail, type Rails, type SchematicItem } from './model';
import { pinDirection, pinPoint, placedBounds, type Bounds, type Direction } from './place';
import { librarySymbol, textWidth } from './symbols';

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
  conductor: Conductor;
}

/** 母線の既定（電源側: +・R・L、戻り側: −・S・N。同じ機器の組を優先する） */
export function defaultRails(candidates: RailCandidate[]): Rails {
  const pick = (cs: Conductor[], device?: string) =>
    candidates.find((c) => cs.includes(c.conductor) && (!device || c.ref.startsWith(`${device}.`)));
  const supply = pick(['+']) ?? pick(['R', 'L']);
  if (!supply) return {};
  const device = supply.ref.slice(0, supply.ref.indexOf('.'));
  const back: Conductor[] = supply.conductor === '+' ? ['-'] : ['S', 'N'];
  const common = pick(back, device) ?? pick(back);
  return { supply: supply.ref, ...(common ? { common: common.ref } : {}) };
}

/** 母線を左にまとめるときの、電源側・戻り側の母線の x[mm] */
export const LEFT_SUPPLY_X = 35;
export const LEFT_COMMON_X = 42.5;
/** 戻り側へ戻す線を、段のどれだけ下に通すか（候補の順）[mm、上向きが正] */
const RETURN_DETOURS = [-7.5, -5, -10, -12.5, 7.5, 5];

/** 配置の向き（縦）に合わせた記号の ID（縦向きの記号がなければ元の記号） */
export function itemSymbolId(e: ElementEntry, item: SchematicItem): string {
  if (!item.vertical || e.element.box) return e.element.symbol;
  const v = `${e.element.symbol}-v`;
  return librarySymbol(v) ? v : e.element.symbol;
}

/** 配置の向き（縦）に合わせた記号 */
export function itemSymbol(e: ElementEntry, item: SchematicItem): SymbolDef {
  const id = itemSymbolId(e, item);
  return id === e.element.symbol ? e.symbol : librarySymbol(id)!;
}

/** 縦向きにして置ける要素か */
export function canBeVertical(e: ElementEntry): boolean {
  return !e.element.box && !!librarySymbol(`${e.element.symbol}-v`);
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
  /** 端子の網（同じ網の端子は同じ値）。展開図の今の配置で求めたもの */
  netOf(device: string, terminal: string): string;
  /**
   * 主回路の機器（一次電源・遮断器・電磁接触器・熱動素子・電動機）の中の経路を素通しにしない網。
   * 配置によらない（主回路を並べるときに、機器の一次側と二次側を分けて見るため）
   */
  circuitNetOf(device: string, terminal: string): string;
}

/** 端子を入れ替えて置ける記号（端子 1 と 2 だけを持つ記号） */
export function canFlip(def: SymbolDef): boolean {
  const pins = Object.keys(def.pins);
  return pins.length === 2 && pins.includes('1') && pins.includes('2');
}

const SWAP: Record<string, string> = { '1': '2', '2': '1' };

/** 配置の flip を反映した、端子 → 記号の端子の対応 */
export function placedPinOf(e: ElementEntry, item: SchematicItem): Record<string, string> {
  if (!item.flip || !canFlip(e.symbol)) return e.element.pinOf;
  return Object.fromEntries(Object.entries(e.element.pinOf).map(([t, pin]) => [t, SWAP[pin] ?? pin]));
}

/** 配置の flip を反映した属性（端子番号 T1 と T2 を入れ替える） */
function placedAttributes(e: ElementEntry, item: SchematicItem): Record<string, string> {
  const a = e.element.attributes;
  if (!item.flip || !canFlip(e.symbol)) return a;
  const { T1, T2, ...rest } = a;
  return { ...rest, ...(T2 !== undefined ? { T1: T2 } : {}), ...(T1 !== undefined ? { T2: T1 } : {}) };
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

/** 軸に平行な線分が四角の内側を通るか（縁に沿う・縁で止まるのは通らないとみなす） */
function crosses(a: Point, b: Point, r: Bounds): boolean {
  const e = 0.05;
  const [x1, x2] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  const [y1, y2] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  return x2 > r.x1 + e && x1 < r.x2 - e && y2 > r.y1 + e && y1 < r.y2 - e;
}

/** 折れ線が横切る記号の数 */
function hits(points: Point[], obstacles: Bounds[]): number {
  let n = 0;
  for (const r of obstacles) if (points.slice(1).some((p, i) => crosses(points[i], p, r))) n++;
  return n;
}

/** シートに引いた線分（網ごと）。別の網の線と重ならないように経路を選ぶ */
interface Segment {
  a: Point;
  b: Point;
  net: string;
}

/** 2 つの線分が一直線上で重なる長さ（重ならなければ 0） */
function overlap(p: Point, q: Point, s: Point, t: Point): number {
  if (r3(p[1]) === r3(q[1]) && r3(s[1]) === r3(t[1]) && r3(p[1]) === r3(s[1])) {
    return Math.min(Math.max(p[0], q[0]), Math.max(s[0], t[0])) - Math.max(Math.min(p[0], q[0]), Math.min(s[0], t[0]));
  }
  if (r3(p[0]) === r3(q[0]) && r3(s[0]) === r3(t[0]) && r3(p[0]) === r3(s[0])) {
    return Math.min(Math.max(p[1], q[1]), Math.max(s[1], t[1])) - Math.max(Math.min(p[1], q[1]), Math.min(s[1], t[1]));
  }
  return 0;
}

/** 点が線分の上（端を含む）にあるか */
const touches = (p: Point, a: Point, b: Point) => same(p, a) || same(p, b) || onSegment(p, a, b);

/** 縦と横の線分が、互いの途中で交わるか */
function crossing(p: Point, q: Point, s: Point, t: Point): boolean {
  const vertical = (a: Point, b: Point) => r3(a[0]) === r3(b[0]);
  const pair: Point[] | undefined = vertical(p, q) && !vertical(s, t) ? [p, q, s, t] : vertical(s, t) && !vertical(p, q) ? [s, t, p, q] : undefined;
  if (!pair) return false;
  const [v1, v2, h1, h2] = pair;
  const x = v1[0];
  const y = h1[1];
  return x > Math.min(h1[0], h2[0]) && x < Math.max(h1[0], h2[0]) && y > Math.min(v1[1], v2[1]) && y < Math.max(v1[1], v2[1]);
}

/**
 * 折れ線と別の網の線との干渉の点数。重なる・T 字に触れる（つながって見える）は 10、交差は 1。
 */
function conflicts(points: Point[], net: string, segments: Segment[]): number {
  let n = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const [p, q] = [points[i], points[i + 1]];
    for (const s of segments) {
      if (s.net === net) continue;
      if (overlap(p, q, s.a, s.b) > 0.01) n += 10;
      else if (touches(s.a, p, q) || touches(s.b, p, q) || touches(p, s.a, s.b) || touches(q, s.a, s.b)) n += 10;
      else if (crossing(p, q, s.a, s.b)) n += 1;
    }
  }
  return n;
}

/** 母線への引き出しで、記号の下（上）を回り込むときのずらし[mm]（上向きが正） */
const RAIL_DETOURS = [-5, -7.5, 5, 7.5, -10, 10, -12.5, 12.5, -2.5, 2.5];

/**
 * 母線へ横に引き出す線。まっすぐ引くと記号を横切る（端子が母線と反対を向いているなど）場合は、
 * 端子から出して記号の下（または上）を回り込んでから母線へ引く。
 */
function railRoute(p: PinAt, railX: number, net: string, obstacles: Bounds[], segments: Segment[], detours = RAIL_DETOURS): Point[] {
  const straight: Point[] = [p.pos, [railX, p.pos[1]]];
  const candidates: Point[][] = [straight];
  for (const len of STUBS) {
    const s: Point = [p.pos[0] + p.dir[0] * len, p.pos[1] + p.dir[1] * len];
    for (const dy of detours) candidates.push(simplify([p.pos, s, [s[0], s[1] + dy], [railX, s[1] + dy]]));
  }
  let best = straight;
  let bestScore = Infinity;
  candidates.forEach((c, i) => {
    const score = hits(c, obstacles) * 1000 + conflicts(c, net, segments) + i * 0.01;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  });
  return best;
}

/** 端子から出す長さの候補（短い方を優先し、重なるときに伸ばす） */
const STUBS = [STUB, STUB + 2.5, STUB + 5, STUB + 7.5, STUB - 2.5, STUB + 10];

/**
 * 2 つの端子を直角の折れ線でつなぐ。端子からまっすぐ出し、L 字に曲げてつなぐ。
 * 出す長さと曲げ方の組み合わせのうち、記号を横切らず、別の網の線と重ならないものを選ぶ。
 */
function route(a: PinAt, b: PinAt, net: string, obstacles: Bounds[], segments: Segment[]): Point[] {
  const [ax, ay] = a.pos;
  const [bx, by] = b.pos;
  // 同じ高さで向かい合っている（a の右に b があり、a は右へ・b は左へ出す）ならまっすぐ
  const facing =
    (r3(ay) === r3(by) && (bx - ax) * a.dir[0] > 0 && (ax - bx) * b.dir[0] > 0) ||
    (r3(ax) === r3(bx) && (by - ay) * a.dir[1] > 0 && (ay - by) * b.dir[1] > 0);
  const candidates: Point[][] = facing ? [[a.pos, b.pos]] : [];
  for (const len of STUBS) {
    const sa: Point = [ax + a.dir[0] * len, ay + a.dir[1] * len];
    const sb: Point = [bx + b.dir[0] * len, by + b.dir[1] * len];
    const first: Point = a.dir[0] !== 0 ? [sa[0], sb[1]] : [sb[0], sa[1]];
    const second: Point = a.dir[0] !== 0 ? [sb[0], sa[1]] : [sa[0], sb[1]];
    candidates.push(simplify([a.pos, sa, first, sb, b.pos]), simplify([a.pos, sa, second, sb, b.pos]));
  }
  // 記号を横切らないこと > 別の網と重ならないこと > 候補の順（短い出し方・まっすぐを優先）
  let best = candidates[0];
  let bestScore = Infinity;
  candidates.forEach((c, i) => {
    const score = hits(c, obstacles) * 1000 + conflicts(c, net, segments) + i * 0.01;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  });
  return best;
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
  // 行番号は展開接続図のシートだけで通し番号にする
  const ladderSheets = schematic.sheets.filter((s) => s.kind !== 'terminal');
  const sheetIndex = new Map(ladderSheets.map((s, i) => [s.id, i]));
  const rowOf = new Map<string, number>();
  for (const sh of ladderSheets) {
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
  // 主回路を並べるときの網: 主回路の機器の中の経路は、置いていなくても素通しにしない
  const MAIN = new Set(['source', 'breaker', 'contactor', 'thermal', 'motor']);
  const circuit = new UnionFind();
  for (const w of model.wires) circuit.union(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of model.cablePairs) circuit.union(a, b);
  for (const [a, b] of model.labelLinks) circuit.union(a, b);
  for (const [a, b] of model.fixedLinks) {
    const ka = terminalElement.get(a)?.entry.element.kind;
    const kb = terminalElement.get(b)?.entry.element.kind;
    if (!(ka && MAIN.has(ka)) && !(kb && MAIN.has(kb))) circuit.union(a, b);
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
    for (const [t, pin] of Object.entries(placedPinOf(e, item))) {
      const root = uf.find(key(e.device, t));
      const sym = itemSymbol(e, item);
      const pos = pinPoint(sym, pin, at, item.rotation);
      const id = `${root}@${r3(pos[0])},${r3(pos[1])}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const row = rowOf.get(e.id)!;
      const list = pinsBySheet.get(e.placed.sheet) ?? [];
      list.push({ root, pos, dir: pinDirection(sym, pin, item.rotation), row });
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
      const c = siblings.filter((x) => x.element.symbol.startsWith('contact-c')).map((x) => rowOf.get(x.id)!);
      const fmt = (label: string, ns: number[]) => (ns.length ? `${label}:${[...new Set(ns)].sort((x, y) => x - y).join(',')}` : '');
      return [fmt('a', a), fmt('b', b), fmt('c', c)].filter(Boolean).join(' ') || undefined;
    }
    if (k === 'contact') {
      const owner = siblings.find((x) => x.element.kind === 'coil' || x.element.kind === 'thermal');
      return owner ? String(rowOf.get(owner.id)) : undefined;
    }
    return undefined;
  };

  // --- シート ---
  const ladderOut = (sh: (typeof ladderSheets)[number]): SchematicSheetOut => {
    const index = sheetIndex.get(sh.id)!;
    const out: SchematicSheetOut = { id: sh.id, name: sh.name, source: sh.id, paper, inserts: [], polylines: [], dots: [], texts: [] };
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
        symbol: itemSymbolId(e, it),
        at: up(it.x, it.y),
        ...(it.rotation ? { rotation: it.rotation } : {}),
        layer: 'SYMBOL',
        attributes: { ...placedAttributes(e, it), TAG: e.device, ...(xref ? { XREF: xref } : {}), ...(comment ? { COMMENT: comment } : {}) },
        element: e.id,
      });
    }

    // 母線
    const railRoot = (ref?: string) => {
      const r = ref ? splitRail(ref) : undefined;
      const k = r ? key(r.device, r.terminal) : undefined;
      return k && model.terminals.has(k) ? uf.find(k) : undefined;
    };
    // 左にまとめる（既定）: 電源側・戻り側の順に左に並べ、戻り側へは段の下を通して戻す。左右に分ける: ラダー図の形
    const leftLayout = sh.rails?.layout !== 'sides';
    const rails = [
      { x: leftLayout ? LEFT_SUPPLY_X : RAIL_INSET, ref: sh.rails?.supply, root: railRoot(sh.rails?.supply), detours: RAIL_DETOURS },
      { x: leftLayout ? LEFT_COMMON_X : W - RAIL_INSET, ref: sh.rails?.common, root: railRoot(sh.rails?.common), detours: leftLayout ? RETURN_DETOURS : RAIL_DETOURS },
    ];

    // 線が避ける記号の外形と、引いた線分（別の網の線と重ならないように経路を選ぶ）
    const obstacles = out.inserts.map((ins) => placedBounds(symbolOfInsert(ins.symbol, byId.get(ins.element!)!), ins.at, ins.rotation));
    const segments: Segment[] = [];
    const draw = (points: Point[], net: string) => {
      out.polylines.push({ points, layer: 'WIRE' });
      for (let i = 0; i + 1 < points.length; i++) segments.push({ a: points[i], b: points[i + 1], net });
    };
    const byNet = new Map<string, PlacedPin[]>();
    for (const p of pinsBySheet.get(sh.id) ?? []) byNet.set(p.root, [...(byNet.get(p.root) ?? []), p]);

    // 母線と母線への引き出し（先に引き、ほかの線はこれを避ける）。母線の上端・下端はすべての母線でそろえる
    const railYs: number[] = [];
    for (const rail of rails) {
      if (!rail.root) continue;
      const pins = byNet.get(rail.root) ?? [];
      const no = wireNoOf(rail.root);
      const ys = railYs;
      for (const p of pins) {
        if (r3(p.pos[0]) === r3(rail.x)) continue;
        const pl = railRoute(p, rail.x, rail.root, obstacles, segments, rail.detours);
        draw(pl, rail.root);
        const end = pl[pl.length - 1];
        ys.push(end[1]);
        out.dots.push({ at: end, layer: 'WIRE' });
        if (no) {
          const [a, b] = [pl[pl.length - 2], end];
          out.texts.push({ at: [(a[0] + b[0]) / 2, b[1] + 1.8], text: no, height: WIRE_NO_TEXT, layer: 'WIRENO' });
        }
      }
    }
    const top = railYs.length ? Math.max(...railYs) + ROW_PITCH / 2 : H - ROW_TOP + ROW_PITCH / 2;
    const bottom = railYs.length ? Math.min(...railYs) - ROW_PITCH / 2 : H - ROW_TOP - 2.5 * ROW_PITCH;
    for (const rail of rails) {
      if (!rail.root) continue;
      const no = wireNoOf(rail.root);
      draw([[rail.x, top], [rail.x, bottom]], rail.root);
      const r = splitRail(rail.ref!)!;
      const terminal = model.terminals.get(key(r.device, r.terminal))?.terminal;
      out.texts.push({ at: [rail.x, top + 3], text: no || (terminal?.label ?? terminal?.id ?? ''), height: WIRE_NO_TEXT, layer: 'TAG' });
    }

    // 網ごとの線
    for (const [root, pins] of byNet) {
      if (rails.some((r) => r.root === root)) continue;
      const polylines: Point[][] = [];
      for (const [i, j] of spanningTree(pins)) {
        const pl = route(pins[i], pins[j], root, obstacles, segments);
        draw(pl, root);
        polylines.push(pl);
      }
      // 別のシートにも同じ網の端子があれば、その行番号を書く
      const others = [...(sheetsOfNet.get(root) ?? [])].filter(([s]) => s !== sh.id).flatMap(([, rs]) => rs);
      if (others.length) {
        const p = pins[0];
        const end: Point = [p.pos[0] + p.dir[0] * STUB, p.pos[1] + p.dir[1] * STUB];
        if (pins.length === 1) {
          draw([p.pos, end], root);
          polylines.push([p.pos, end]);
        }
        const text = `→${[...new Set(others)].sort((a, b) => a - b).join(',')}`;
        out.texts.push({ at: [end[0] + p.dir[0] * 1, end[1] + (p.dir[1] ? p.dir[1] * 2 : 0)], text, height: REF_TEXT, align: p.dir[0] < 0 ? 'right' : 'left', layer: 'TAG' });
      }
      for (const at of junctions(polylines)) out.dots.push({ at, layer: 'WIRE' });
      const no = wireNoOf(root);
      const label = no ? wireNoAt(polylines) : undefined;
      if (label) out.texts.push({ at: label.at, text: no, height: WIRE_NO_TEXT, align: label.align, layer: 'WIRENO' });
    }
    return out;
  };

  const sheets: SchematicSheetOut[] = schematic.sheets.flatMap((sh) =>
    sh.kind === 'terminal' ? terminalPages(sh, diagram, model, elements, paper) : [ladderOut(sh)],
  );
  sheets.forEach((out, i) => drawFrame(out, diagram.settings?.title, diagram.settings?.revision, i, sheets.length));

  // --- 母線にできる網 ---
  const railCandidates: RailCandidate[] = [...model.supplies.entries()].map(([k, s]) => {
    const info = model.terminals.get(k)!;
    return { ref: `${info.device.id}.${info.terminal.id}`, label: `${info.device.id}.${info.terminal.label ?? info.terminal.id}（${supplyLabel(s)}）`, conductor: s.conductor };
  });

  const doc: SchematicExport = {
    format: SCHEMATIC_FORMAT,
    version: SCHEMATIC_VERSION,
    unit: 'mm',
    ...(diagram.settings?.title ? { title: diagram.settings.title } : {}),
    ...(diagram.settings?.revision ? { revision: diagram.settings.revision } : {}),
    layers: SCHEMATIC_LAYERS,
    symbols: Object.fromEntries(
      sheets.flatMap((s) => s.inserts).map((ins) => [ins.symbol, symbolOfInsert(ins.symbol, byId.get(ins.element!)!)] as const),
    ),
    sheets,
  };
  return { doc, elements, byId, rows: rowOf, railCandidates, rowsPerSheet: rows, netOf: (d, t) => uf.find(key(d, t)), circuitNetOf: (d, t) => circuit.find(key(d, t)) };
}

// ---- 端子台接続図 ----

/** 表の列の幅[mm]: 接続先・線番・端子・線番・接続先 */
const TB_COLUMNS = [52, 20, 12, 20, 52];
const TB_WIDTH = TB_COLUMNS.reduce((a, b) => a + b, 0);
const TB_ROW = 6;
const TB_TITLE = 8;
const TB_GAP = 12;
/** 表を並べる範囲（y は下向き）。下は表題欄の上まで */
const TB_TOP = 20;
const TB_LEFT = 20;
const TB_TEXT = 2.5;

interface TerminalRow {
  no: string;
  left: { to: string; wireNo: string };
  right: { to: string; wireNo: string };
}

/**
 * 端子台接続図のページ。端子台ごとに、端子番号と、その端子の両側（端子 1 側 = 上段・ネジ、端子 2 側 = 下段・コネクタ）の
 * 接続先と線番の表を作り、列・ページに流して並べる。
 */
function terminalPages(
  sh: { id: string; name: string; blocks?: string[] },
  diagram: Diagram,
  model: ReturnType<typeof buildModel>,
  elements: ElementEntry[],
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  const { width: W, height: H } = paper;
  const up = (x: number, y: number): Point => [x, H - y];
  const blocks = [...new Set(elements.filter((e) => e.def.category === 'terminal').map((e) => e.device))].filter(
    (d) => !sh.blocks || sh.blocks.includes(d),
  );
  const cableName = (a: string, b: string) => {
    const [da, ta] = a.split(':');
    const [db, tb] = b.split(':');
    const ca = ta.split('#')[0];
    const cb = tb.split('#')[0];
    const w = diagram.wires.find(
      (x) =>
        (x.from.device === da && x.from.terminal === ca && x.to.device === db && x.to.terminal === cb) ||
        (x.to.device === da && x.to.terminal === ca && x.from.device === db && x.from.terminal === cb),
    );
    return w?.wireNo ?? '';
  };
  /** 接続先の名前（リンクはリンクの名前。長すぎるときは端子 ID だけ） */
  const nameOf = (k: string) => {
    const info = model.terminals.get(k);
    if (!info) return k.replace(':', '.');
    if (info.def.netLabel) return `リンク「${String(info.device.params?.[info.def.netLabel.param] ?? '').trim()}」`;
    const base = `${info.device.id}.${info.terminal.id}`;
    const label = info.terminal.label;
    const full = label && label !== info.terminal.id ? `${base}（${label}）` : base;
    return textWidth(full, TB_TEXT) <= TB_COLUMNS[0] - 4 ? full : base;
  };
  const side = (keys: string[]) => {
    const to: string[] = [];
    const nos: string[] = [];
    for (const k of keys) {
      for (const w of model.wiresAt.get(k) ?? []) {
        const other = key(w.from.device, w.from.terminal) === k ? key(w.to.device, w.to.terminal) : key(w.from.device, w.from.terminal);
        to.push(nameOf(other));
        if (w.wireNo) nos.push(w.wireNo);
      }
      for (const [a, b] of model.cablePairs) {
        if (a !== k && b !== k) continue;
        const other = a === k ? b : a;
        to.push(nameOf(other));
        const c = cableName(a, b);
        if (c) nos.push(c);
      }
    }
    return { to: [...new Set(to)].join(' / '), wireNo: [...new Set(nos)].join(',') };
  };

  const pages: SchematicSheetOut[] = [];
  const newPage = () => {
    const n = pages.length;
    const page: SchematicSheetOut = { id: n ? `${sh.id}-${n + 1}` : sh.id, name: n ? `${sh.name}（${n + 1}）` : sh.name, source: sh.id, paper, inserts: [], polylines: [], dots: [], texts: [] };
    pages.push(page);
    return page;
  };
  const columns = Math.max(1, Math.floor((W - 2 * TB_LEFT + TB_GAP) / (TB_WIDTH + TB_GAP)));
  const bottom = H - 40;
  let page = newPage();
  let column = 0;
  let y = TB_TOP;
  const nextColumn = () => {
    column++;
    y = TB_TOP;
    if (column >= columns) {
      page = newPage();
      column = 0;
    }
  };
  const x0 = () => TB_LEFT + column * (TB_WIDTH + TB_GAP);
  /** 表の見出し（端子台の名前と列の名前）を書き、表の上端の y を返す */
  const header = (title: string) => {
    const x = x0();
    page.texts.push({ at: up(x, y + TB_TITLE / 2), text: title, height: 3, align: 'left', layer: 'TAG' });
    y += TB_TITLE;
    const top = y;
    const names = ['接続先', '線番', '端子', '線番', '接続先'];
    let cx = x;
    names.forEach((n, i) => {
      page.texts.push({ at: up(cx + TB_COLUMNS[i] / 2, y + TB_ROW / 2), text: n, height: TB_TEXT, layer: 'TEXT' });
      cx += TB_COLUMNS[i];
    });
    y += TB_ROW;
    return top;
  };
  /** 表の枠と罫線（top から今の y まで） */
  const grid = (top: number) => {
    const x = x0();
    page.polylines.push({ points: [up(x, top), up(x + TB_WIDTH, top), up(x + TB_WIDTH, y), up(x, y)], closed: true, layer: 'FRAME' });
    let cx = x;
    for (const w of TB_COLUMNS.slice(0, -1)) {
      cx += w;
      page.polylines.push({ points: [up(cx, top), up(cx, y)], layer: 'FRAME' });
    }
    for (let ry = top + TB_ROW; ry < y - 0.01; ry += TB_ROW) page.polylines.push({ points: [up(x, ry), up(x + TB_WIDTH, ry)], layer: 'FRAME' });
  };

  if (!blocks.length) {
    page.texts.push({ at: up(TB_LEFT, TB_TOP + 4), text: '図面に端子台がありません', height: 3.5, align: 'left', layer: 'TEXT' });
    return pages;
  }
  for (const device of blocks) {
    const entries = elements.filter((e) => e.device === device && e.element.kind === 'terminal');
    if (!entries.length) continue;
    const def = entries[0].def;
    const rowsData: TerminalRow[] = entries.map((e) => {
      const byPin = (pin: string) => Object.entries(e.element.pinOf).filter(([, p]) => p === pin).map(([t]) => key(device, t));
      return { no: e.element.attributes.T1 ?? e.element.key, left: side(byPin('1')), right: side(byPin('2')) };
    });
    const title = `${device}  ${def.name}（${def.model}）`;
    if (y + TB_TITLE + 2 * TB_ROW > bottom) nextColumn();
    let top = header(title);
    for (const r of rowsData) {
      if (y + TB_ROW > bottom) {
        grid(top);
        nextColumn();
        top = header(`${title}（続き）`);
      }
      const x = x0();
      const cy = y + TB_ROW / 2;
      const cells: [number, string, 'left' | 'center' | 'right'][] = [
        [x + TB_COLUMNS[0] - 1, r.left.to, 'right'],
        [x + TB_COLUMNS[0] + TB_COLUMNS[1] / 2, r.left.wireNo, 'center'],
        [x + TB_COLUMNS[0] + TB_COLUMNS[1] + TB_COLUMNS[2] / 2, r.no, 'center'],
        [x + TB_WIDTH - TB_COLUMNS[4] - TB_COLUMNS[3] / 2, r.right.wireNo, 'center'],
        [x + TB_WIDTH - TB_COLUMNS[4] + 1, r.right.to, 'left'],
      ];
      for (const [cx, text, align] of cells) if (text) page.texts.push({ at: up(cx, cy), text, height: TB_TEXT, align, layer: 'TEXT' });
      y += TB_ROW;
    }
    grid(top);
    y += TB_GAP / 2;
  }
  return pages;
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

/** 配置した記号の ID から記号の定義（箱は要素が持つ定義、ほかはライブラリ） */
function symbolOfInsert(id: string, e: ElementEntry): SymbolDef {
  return id === e.element.symbol ? e.symbol : librarySymbol(id)!;
}
