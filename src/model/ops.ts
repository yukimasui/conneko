/**
 * 図面データ（Diagram）に対する編集操作。
 * シートの移動、シートをまたぐ電線のリンクへの置き換え、端子どうしの接続（必要ならリンク経由）など。
 * いずれも元のデータは変えず、新しい Diagram を返す。
 */
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

/**
 * 端子の近くにリンクを置いてつなぐ（リンクの機器と、リンクと端子をつなぐ電線を返す）。
 * リンクは端子から電線が出る向きに離して置き、電線をつなぐ側を端子に向ける。
 */
function linkAt(d: Diagram, ref: TerminalRef, name: string, sheet: string, attrs: WireAttrs, lookup: DefLookup, usedIds: string[], usedWires: string[]) {
  const linkDef = lookup(LINK_TYPE)!;
  const p = terminalPoint(d, ref, lookup) ?? { x: 0, y: 0, side: 'right' as TerminalSide };
  const gap = 50;
  const W = linkDef.width;
  const H = linkDef.height;
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
  const id = nextDeviceId(linkDef.labelPrefix, usedIds);
  usedIds.push(id);
  const device: DiagramDevice = { id, type: LINK_TYPE, x: Math.round(x), y: Math.round(y), params: { name, side }, sheet };
  const wid = nextWireId(usedWires);
  usedWires.push(wid);
  const wire: DiagramWire = { id: wid, from: ref, to: { device: id, terminal: 'T' }, ...attrs };
  return { device, wire };
}

/**
 * 2 つの端子をつなぐ。同じシートなら電線 1 本、違うシートなら同じ名前のリンクを両方のシートに置いてつなぐ。
 * linkName を省略すると線番（なければ「L」）からリンク名を作る。
 */
export function connectTerminals(d: Diagram, a: TerminalRef, b: TerminalRef, attrs: WireAttrs, lookup: DefLookup, linkName?: string): Diagram {
  const da = d.devices.find((x) => x.id === a.device);
  const db = d.devices.find((x) => x.id === b.device);
  if (!da || !db) return d;
  const usedIds = d.devices.map((x) => x.id);
  const usedWires = d.wires.map((w) => w.id);
  const sa = sheetOf(d, da);
  const sb = sheetOf(d, db);
  if (sa === sb) {
    return { ...d, wires: [...d.wires, { id: nextWireId(usedWires), from: a, to: b, ...attrs }] };
  }
  const name = uniqueLinkName(d, linkName ?? attrs.wireNo ?? '');
  const la = linkAt(d, a, name, sa, attrs, lookup, usedIds, usedWires);
  const lb = linkAt(d, b, name, sb, attrs, lookup, usedIds, usedWires);
  return { ...d, devices: [...d.devices, la.device, lb.device], wires: [...d.wires, la.wire, lb.wire] };
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
  let out: Diagram = { ...d, wires: d.wires.filter((w) => !cross.includes(w)) };
  for (const w of cross) {
    const { color, sizeSq, wireType, wireNo } = w;
    out = connectTerminals(out, w.from, w.to, { color, sizeSq, wireType, ...(wireNo ? { wireNo } : {}) }, lookup);
  }
  return out;
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
