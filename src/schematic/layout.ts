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
import type { Diagram, DiagramSettings } from '../model/diagram';
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
import { pinDirection, pinPoint, placedBounds } from './place';
import { librarySymbol } from './symbols';
import { bomPages } from './sheets/bom';
import { coverPageCount, coverPages, type CoverEntry } from './sheets/cover';
import { ioPages, ioPlcHosts } from './sheets/io';
import { rackHosts, rackPages } from './sheets/rack';
import { ioSystem } from '../model/io';
import { terminalPages } from './sheets/terminal';
import { junctions, r3, railRoute, RAIL_DETOURS, route, spanningTree, STUB, wireNoAt, type PinAt, type Segment } from './wiring';

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
  /** シートの段の数（用紙で変わる） */
  rowsOf(sheetId: string): number;
  /** 端子の網（同じ網の端子は同じ値）。展開図の今の配置で求めたもの */
  netOf(device: string, terminal: string): string;
  /**
   * 主回路の機器（一次電源・遮断器・電磁接触器・熱動素子・電動機）の中の経路を素通しにしない網。
   * 配置によらない（主回路を並べるときに、機器の一次側と二次側を分けて見るため）
   */
  circuitNetOf(device: string, terminal: string): string;
  /** I/O 図にできる PLC（I/O を持つ親）と、そのユニット */
  ioHosts: { id: string; model: string; units: { id: string; model: string }[] }[];
  /** ユニット構成図にできる PLC（ユニットを装着できる親） */
  rackHosts: { id: string; model: string }[];
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

export function buildSchematic(diagram: Diagram, lookup: DefLookup): SchematicBuild {
  const model = buildModel(diagram, lookup, () => {});
  const schematic = diagram.schematic ?? { sheets: [] };
  // 用紙はシートごと
  const paperBySheet = new Map(schematic.sheets.map((s) => [s.id, paperOf(schematic, s)]));
  const rowsBySheet = new Map(schematic.sheets.map((s) => [s.id, rowsPerSheet(paperBySheet.get(s.id)!.height)]));

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
  // 行番号は展開接続図のシートだけで通し番号にする（シートごとの段の数を足していく）
  const ladderSheets = schematic.sheets.filter((s) => !s.kind);
  const rowBase = new Map<string, number>();
  let base = 0;
  for (const sh of ladderSheets) {
    rowBase.set(sh.id, base);
    base += rowsBySheet.get(sh.id)!;
  }
  const rowOf = new Map<string, number>();
  for (const sh of ladderSheets) {
    for (const it of sh.items) {
      const e = byId.get(it.element);
      if (!e || e.placed) continue;
      e.placed = { sheet: sh.id, item: it };
      rowOf.set(e.id, rowBase.get(sh.id)! + localRow(it.y, rowsBySheet.get(sh.id)!) + 1);
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
    const at: Point = [item.x, paperBySheet.get(e.placed.sheet)!.height - item.y];
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
    const paper = paperBySheet.get(sh.id)!;
    const { width: W, height: H } = paper;
    const up = (x: number, y: number): Point => [x, H - y];
    const out: SchematicSheetOut = { id: sh.id, name: sh.name, source: sh.id, paper, inserts: [], polylines: [], dots: [], texts: [] };
    for (let r = 0; r < rowsBySheet.get(sh.id)!; r++) {
      out.texts.push({ at: up(ROW_NO_X, ROW_TOP + r * ROW_PITCH), text: String(rowBase.get(sh.id)! + r + 1), height: WIRE_NO_TEXT, layer: 'FRAME' });
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

  // --- 内容を自動で作るシート ---
  const extraSymbols = new Map<string, SymbolDef>();
  const circuitWireNos = new Map<string, Set<string>>();
  for (const w of model.wires) {
    if (!w.wireNo) continue;
    const root = circuit.find(key(w.from.device, w.from.terminal));
    circuitWireNos.set(root, (circuitWireNos.get(root) ?? new Set()).add(w.wireNo));
  }
  const ioContext = {
    diagram,
    lookup,
    model,
    elements,
    netOf: (d: string, t: string) => circuit.find(key(d, t)),
    wireNoOf: (net: string) => [...(circuitWireNos.get(net) ?? [])].sort((a, b) => a.localeCompare(b, 'ja', { numeric: true })).join(','),
    addSymbol: (id: string, def: SymbolDef) => extraSymbols.set(id, def),
  };
  const generated = schematic.sheets.map((sh): SchematicSheetOut[] | null => {
    const p = paperBySheet.get(sh.id)!;
    switch (sh.kind) {
      case undefined:
        return [ladderOut(sh)];
      case 'terminal':
        return terminalPages(sh, diagram, model, elements, p);
      case 'io':
        return ioPages(sh, ioContext, p);
      case 'rack':
        return rackPages(sh, model, lookup, p);
      case 'bom':
        return bomPages(sh, diagram, lookup, p);
      case 'cover':
        return null;
    }
  });
  // 表紙: 目次のページ番号は表紙のページ数で変わるので、ページ数が落ち着くまで数え直す
  const otherPages = generated.reduce((n, g) => n + (g?.length ?? 0), 0);
  const coverCounts: number[] = schematic.sheets.map((sh) => (sh.kind === 'cover' ? 1 : 0));
  for (let k = 0; k < 3; k++) {
    const total = otherPages + coverCounts.reduce((a, b) => a + b, 0);
    schematic.sheets.forEach((sh, i) => {
      if (sh.kind === 'cover') coverCounts[i] = coverPageCount(total, paperBySheet.get(sh.id)!);
    });
  }
  const entries: CoverEntry[] = [];
  let pageNo = 1;
  schematic.sheets.forEach((sh, i) => {
    const pages = generated[i];
    const count = pages ? pages.length : coverCounts[i];
    for (let j = 0; j < count; j++) entries.push({ page: pageNo++, name: pages ? pages[j].name : j ? `${sh.name}（${j + 1}）` : sh.name, kind: sheetKindName(sh) });
  });
  const sheets: SchematicSheetOut[] = schematic.sheets.flatMap((sh, i) => generated[i] ?? coverPages(sh, diagram.settings, entries, paperBySheet.get(sh.id)!));
  sheets.forEach((out, i) => drawFrame(out, diagram.settings, i, sheets.length));

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
      sheets
        .flatMap((s) => s.inserts)
        .map((ins) => [ins.symbol, ins.element ? symbolOfInsert(ins.symbol, byId.get(ins.element)!) : extraSymbols.get(ins.symbol)!] as const),
    ),
    sheets,
  };
  const modelOf = (id: string) => model.devices.get(id)?.def.model ?? id;
  const ioHosts = ioPlcHosts(diagram, lookup).map((id) => ({
    id,
    model: modelOf(id),
    units: (ioSystem(diagram, id, lookup)?.units ?? []).map((u) => ({ id: u.device.id, model: u.def.model })),
  }));
  const racks = rackHosts(model).map((id) => ({ id, model: modelOf(id) }));
  return { doc, elements, byId, rows: rowOf, ioHosts, rackHosts: racks, railCandidates, rowsOf: (id) => rowsBySheet.get(id) ?? rowsPerSheet(paperOf(schematic).height), netOf: (d, t) => uf.find(key(d, t)), circuitNetOf: (d, t) => circuit.find(key(d, t)) };
}

/** 図面枠と表題欄（図面名・作成者・版・シート名・ページ） */
function drawFrame(out: SchematicSheetOut, settings: DiagramSettings | undefined, index: number, count: number) {
  const { width: W, height: H } = out.paper;
  const x1 = W - 130;
  out.polylines.push(
    { points: [[10, 10], [W - 10, 10], [W - 10, H - 10], [10, H - 10]], closed: true, layer: 'FRAME' },
    { points: [[x1, 10], [W - 10, 10], [W - 10, 30], [x1, 30]], closed: true, layer: 'FRAME' },
    { points: [[x1, 20], [W - 10, 20]], layer: 'FRAME' },
    { points: [[W - 35, 10], [W - 35, 30]], layer: 'FRAME' },
  );
  const author = settings?.author ? `　作成 ${settings.author}` : '';
  out.texts.push(
    { at: [x1 + 3, 25], text: `${settings?.title || 'Conneko'}${author}`, height: 3, align: 'left', layer: 'FRAME' },
    { at: [x1 + 3, 15], text: out.name, height: 3, align: 'left', layer: 'FRAME' },
    { at: [W - 22.5, 25], text: settings?.revision ? `版 ${settings.revision}` : '', height: 2.5, layer: 'FRAME' },
    { at: [W - 22.5, 15], text: `${index + 1} / ${count}`, height: 2.5, layer: 'FRAME' },
  );
}

/** シートの種類の名前（表紙の目次・エディタ） */
export function sheetKindName(sh: { kind?: string; rails?: Rails }): string {
  switch (sh.kind) {
    case 'terminal':
      return '端子台接続図';
    case 'io':
      return 'PLC の I/O 図';
    case 'rack':
      return 'PLC のユニット構成図';
    case 'bom':
      return '部品表';
    case 'cover':
      return '表紙・図面目次';
    default:
      return sh.rails?.supply ? '展開接続図（制御回路）' : '展開接続図（主回路）';
  }
}

/** 配置した記号の ID から記号の定義（箱は要素が持つ定義、ほかはライブラリ） */
function symbolOfInsert(id: string, e: ElementEntry): SymbolDef {
  return id === e.element.symbol ? e.symbol : librarySymbol(id)!;
}
