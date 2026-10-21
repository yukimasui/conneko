/**
 * 図面データ（Diagram）に対する編集操作。
 * シートの移動、シートをまたぐ電線のリンクへの置き換え、端子どうしの接続（必要ならリンク経由）など。
 * いずれも元のデータは変えず、新しい Diagram を返す。
 */
import { buildModel, key } from '../check/model';
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, TerminalSide } from '../devices/types';
import { CABLE_WIRE_TYPE, nextDeviceId, nextWireId, sheetOf, type Diagram, type DiagramDevice, type DiagramWire, type TerminalRef } from './diagram';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export const LINK_TYPE = 'generic.link';

export type WireAttrs = Pick<DiagramWire, 'color' | 'sizeSq' | 'wireType'> & { wireNo?: string };

/** 端子のキャンバス上の位置と向き */
export function terminalPoint(d: Diagram, ref: TerminalRef, lookup: DefLookup): { x: number; y: number; side: TerminalSide } | undefined {
  const dev = d.devices.find((x) => x.id === ref.device);
  const def = dev && lookup(dev.type);
  const t = def && resolveDevice(def, dev.params).terminal(ref.terminal);
  return dev && t ? { x: dev.x + t.x, y: dev.y + t.y, side: t.side } : undefined;
}

/** 図面で使われているリンクの名前 */
export function linkNames(d: Diagram): Set<string> {
  return new Set(d.devices.filter((x) => x.type === LINK_TYPE).map((x) => String(x.params?.name ?? '').trim()).filter(Boolean));
}

/** 使われていないリンク名（base、base-2、base-3 …） */
export function uniqueLinkName(d: Diagram, base: string): string {
  const used = linkNames(d);
  const b = base.trim();
  if (!b) {
    for (let n = 1; ; n++) if (!used.has(`L${n}`)) return `L${n}`;
  }
  if (!used.has(b)) return b;
  for (let n = 2; ; n++) if (!used.has(`${b}-${n}`)) return `${b}-${n}`;
}

/** 同じ名前のリンクを、この距離[px]以内にあれば新しく置かずに使う */
const REUSE_DISTANCE = 320;

/**
 * 端子の近くにリンクを置いてつなぐ（置いたリンクの機器と、リンクと端子をつなぐ電線を返す）。
 * リンクは端子から電線が出る向きに離して置き、電線をつなぐ側を端子に向ける。ほかの機器と重なる場合はずらす。
 * 同じシートの近くに同じ名前のリンクがあれば、それにつなぐ（device は undefined）。
 */
function linkAt(d: Diagram, placed: DiagramDevice[], ref: TerminalRef, name: string, sheet: string, attrs: WireAttrs, lookup: DefLookup, usedIds: string[], usedWires: string[]) {
  const linkDef = lookup(LINK_TYPE)!;
  const p = terminalPoint(d, ref, lookup) ?? { x: 0, y: 0, side: 'right' as TerminalSide };
  const W = linkDef.width;
  const H = linkDef.height;
  const all = [...d.devices, ...placed].filter((x) => sheetOf(d, x) === sheet);
  const wire = (to: string): DiagramWire => {
    const wid = nextWireId(usedWires);
    usedWires.push(wid);
    return { id: wid, from: ref, to: { device: to, terminal: 'T' }, ...attrs };
  };

  const near = all
    .filter((x) => x.type === LINK_TYPE && String(x.params?.name ?? '').trim() === name)
    .map((x) => ({ x, dist: Math.hypot(x.x + W / 2 - p.x, x.y + H / 2 - p.y) }))
    .filter((c) => c.dist <= REUSE_DISTANCE)
    .sort((a, b) => a.dist - b.dist)[0];
  if (near) return { device: undefined, wire: wire(near.x.id) };

  const gap = 50;
  let x = p.x + gap;
  let y = p.y - H / 2;
  let side: 'left' | 'right' = 'left';
  if (p.side === 'left') {
    x = p.x - gap - W;
    side = 'right';
  } else if (p.side === 'top' || p.side === 'bottom') {
    x = p.x + 20;
    y = p.side === 'top' ? p.y - gap - H : p.y + gap;
  }
  // ほかの機器と重ならない位置まで、縦にずらす（上向きの端子なら上へ）
  const rects = all.map((o) => {
    const def = lookup(o.type);
    return { x: o.x, y: o.y, w: def?.width ?? 0, h: def?.height ?? 0 };
  });
  const hits = (yy: number) => rects.some((r) => x < r.x + r.w + 8 && x + W + 8 > r.x && yy < r.y + r.h + 6 && yy + H + 6 > r.y);
  const step = (p.side === 'top' ? -1 : 1) * (H + 18);
  for (let i = 0; i < 40 && hits(y); i++) y += step;

  const id = nextDeviceId(linkDef.labelPrefix, usedIds);
  usedIds.push(id);
  const device: DiagramDevice = { id, type: LINK_TYPE, x: Math.round(x), y: Math.round(y), params: { name, side }, sheet };
  return { device, wire: wire(id) };
}

/**
 * 2 つの端子をつなぐ。同じシートなら電線 1 本、違うシートなら同じ名前のリンクを両方のシートに置いてつなぐ。
 * linkName を省略すると線番（なければ「L」）からリンク名を作る。
 */
export function connectTerminals(d: Diagram, a: TerminalRef, b: TerminalRef, attrs: WireAttrs, lookup: DefLookup, linkName?: string, forceLink = false): Diagram {
  const da = d.devices.find((x) => x.id === a.device);
  const db = d.devices.find((x) => x.id === b.device);
  if (!da || !db) return d;
  const usedIds = d.devices.map((x) => x.id);
  const usedWires = d.wires.map((w) => w.id);
  const sa = sheetOf(d, da);
  const sb = sheetOf(d, db);
  if (sa === sb && !forceLink) {
    return { ...d, wires: [...d.wires, { id: nextWireId(usedWires), from: a, to: b, ...attrs }] };
  }
  // 名前を指定した場合はそのまま使う（同じネットのリンクにまとめるため）。指定しなければ線番から重ならない名前を作る
  const name = linkName ?? uniqueLinkName(d, attrs.wireNo ?? '');
  const placed: DiagramDevice[] = [];
  const la = linkAt(d, placed, a, name, sa, attrs, lookup, usedIds, usedWires);
  if (la.device) placed.push(la.device);
  const lb = linkAt(d, placed, b, name, sb, attrs, lookup, usedIds, usedWires);
  if (lb.device) placed.push(lb.device);
  return { ...d, devices: [...d.devices, ...placed], wires: [...d.wires, la.wire, lb.wire] };
}

/**
 * シートをまたぐ電線を、両端のシートに置いたリンクの組に置き換える（ケーブルはそのまま）。
 * AI が書いた JSON の読み込み時や、機器を別のシートへ移したときに使う。
 */
export function splitCrossSheetWires(d: Diagram, lookup: DefLookup): Diagram {
  if (!lookup(LINK_TYPE)) return d;
  const sheet = new Map(d.devices.map((x) => [x.id, sheetOf(d, x)]));
  const cross = d.wires.filter((w) => w.wireType !== CABLE_WIRE_TYPE && sheet.get(w.from.device) !== sheet.get(w.to.device));
  if (!cross.length) return d;
  // 同じネット（置き換える前に電線でつながっている範囲）の電線は、同じ名前のリンクにまとめる
  const m = buildModel(d, lookup, () => {});
  const netOf = (r: TerminalRef) => m.fixed.find(key(r.device, r.terminal));
  const nameNet = new Map<string, string>();
  for (const x of d.devices) {
    const name = x.type === LINK_TYPE ? String(x.params?.name ?? '').trim() : '';
    if (name) nameNet.set(name, netOf({ device: x.id, terminal: 'T' }));
  }
  let out: Diagram = { ...d, wires: d.wires.filter((w) => !cross.includes(w)) };
  for (const w of cross) {
    const { color, sizeSq, wireType, wireNo } = w;
    const net = netOf(w.from);
    const base = wireNo ?? '';
    const name = base && nameNet.get(base) === net ? base : uniqueLinkName(out, base);
    nameNet.set(name, net);
    out = connectTerminals(out, w.from, w.to, { color, sizeSq, wireType, ...(wireNo ? { wireNo } : {}) }, lookup, name, true);
  }
  return out;
}

/** 電線を、両端に置いた同じ名前のリンクの組に置き換える（長い電線を図から消して見やすくする） */
export function splitWireWithLinks(d: Diagram, wireId: string, lookup: DefLookup): Diagram {
  const w = d.wires.find((x) => x.id === wireId);
  if (!w || w.wireType === CABLE_WIRE_TYPE) return d;
  const { color, sizeSq, wireType, wireNo } = w;
  const rest = { ...d, wires: d.wires.filter((x) => x !== w) };
  return connectTerminals(rest, w.from, w.to, { color, sizeSq, wireType, ...(wireNo ? { wireNo } : {}) }, lookup, uniqueLinkName(rest, wireNo ?? ''), true);
}

/** 装着の親・子を含めて、一緒に動く機器の ID */
export function mountFamily(d: Diagram, id: string): string[] {
  const dev = d.devices.find((x) => x.id === id);
  const host = dev?.mount ? dev.mount.device : id;
  return [host, ...d.devices.filter((x) => x.mount?.device === host).map((x) => x.id)];
}

/** 機器を別のシートへ移す（装着した親・子も一緒に移し、シートをまたぐことになった電線はリンクに置き換える） */
export function moveToSheet(d: Diagram, ids: string[], sheetId: string, lookup: DefLookup): Diagram {
  const move = new Set(ids.flatMap((id) => mountFamily(d, id)));
  const moved: Diagram = { ...d, devices: d.devices.map((x) => (move.has(x.id) ? { ...x, sheet: sheetId } : x)) };
  return splitCrossSheetWires(moved, lookup);
}

/** シートを削除する（そのシートの機器と、それにつながる電線も消す） */
export function removeSheet(d: Diagram, sheetId: string): Diagram {
  const gone = new Set(d.devices.filter((x) => sheetOf(d, x) === sheetId).map((x) => x.id));
  const sheets = (d.sheets ?? []).filter((s) => s.id !== sheetId);
  return {
    ...d,
    sheets,
    devices: d.devices.filter((x) => !gone.has(x.id)),
    wires: d.wires.filter((w) => !gone.has(w.from.device) && !gone.has(w.to.device)),
  };
}

/** 未使用のシートID（S1, S2, …） */
export function nextSheetId(d: Diagram): string {
  const used = new Set((d.sheets ?? []).map((s) => s.id));
  let n = 1;
  while (used.has(`S${n}`)) n++;
  return `S${n}`;
}

/** 端子の近くにリンクを置いてつなぐ（近くに同じ名前のリンクがあればそれにつなぐ） */
export function linkTerminal(d: Diagram, ref: TerminalRef, name: string, attrs: WireAttrs, lookup: DefLookup): Diagram {
  const dev = d.devices.find((x) => x.id === ref.device);
  if (!dev || !lookup(LINK_TYPE)) return d;
  const r = linkAt(d, [], ref, name, sheetOf(d, dev), attrs, lookup, d.devices.map((x) => x.id), d.wires.map((w) => w.id));
  return { ...d, devices: r.device ? [...d.devices, r.device] : d.devices, wires: [...d.wires, r.wire] };
}

/**
 * 指定した位置（キャンバス上の点。リンクの中心）にリンクを置き、端子とつなぐ。
 * リンクの電線をつなぐ側は、端子のある側に向ける。
 */
export function placeLinkAt(d: Diagram, ref: TerminalRef, name: string, at: { x: number; y: number }, attrs: WireAttrs, lookup: DefLookup): Diagram {
  const dev = d.devices.find((x) => x.id === ref.device);
  const linkDef = lookup(LINK_TYPE);
  if (!dev || !linkDef) return d;
  const p = terminalPoint(d, ref, lookup);
  const side = p && p.x > at.x ? 'right' : 'left';
  const id = nextDeviceId(linkDef.labelPrefix, d.devices.map((x) => x.id));
  const device: DiagramDevice = {
    id,
    type: LINK_TYPE,
    x: Math.round(at.x - linkDef.width / 2),
    y: Math.round(at.y - linkDef.height / 2),
    params: { name, side },
    sheet: sheetOf(d, dev),
  };
  const wire: DiagramWire = { id: nextWireId(d.wires.map((w) => w.id)), from: ref, to: { device: id, terminal: 'T' }, ...attrs };
  return { ...d, devices: [...d.devices, device], wires: [...d.wires, wire] };
}

/** 「名前-番号」の形の名前の、元の名前と番号 */
function splitSuffix(name: string): { base: string; n: number } | undefined {
  const m = /^(.*)-(\d+)$/.exec(name);
  return m && m[1] ? { base: m[1], n: Number(m[2]) } : undefined;
}

/**
 * なくなったリンク名（removed）について、同じ名前のリンクが残っていなければ、
 * 「名前-2」のように番号を付けて作ったリンクのうち番号のいちばん小さいものを元の名前に戻す（電線の線番も戻す）。
 */
export function promoteLinkNames(d: Diagram, removed: Iterable<string>): Diagram {
  let out = d;
  for (const base of new Set(removed)) {
    if (!base || linkNames(out).has(base)) continue;
    const candidates = [...linkNames(out)]
      .map((name) => ({ name, s: splitSuffix(name) }))
      .filter((x) => x.s?.base === base)
      .sort((a, b) => a.s!.n - b.s!.n);
    const from = candidates[0]?.name;
    if (!from) continue;
    const ids = new Set(out.devices.filter((x) => x.type === LINK_TYPE && String(x.params?.name ?? '').trim() === from).map((x) => x.id));
    out = {
      ...out,
      devices: out.devices.map((x) => (ids.has(x.id) ? { ...x, params: { ...x.params, name: base } } : x)),
      wires: out.wires.map((w) => (w.wireNo === from && (ids.has(w.from.device) || ids.has(w.to.device)) ? { ...w, wireNo: base } : w)),
    };
  }
  return out;
}
