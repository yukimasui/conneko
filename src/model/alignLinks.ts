/**
 * リンクを端子の横にそろえる。
 *
 * 機器の端子につないだリンクを、端子の並び順のまま機器の横に一列に並べ直す。端子の間隔より詰められないぶんは
 * 列を上下に広げる（並びの中心は端子の並びの中心）。並び順が端子と同じなら、電線の重なりを避けるレーンの
 * 割り当て（src/editor/routing.ts の assignLanes）で電線が交差しない。
 * 左右の端子だけを対象にする（リンクは左右に電線をつなぐ形のため、上下の端子のリンクは動かさない）。
 */
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition } from '../devices/types';
import { sheetOf, type Diagram, type DiagramDevice } from './diagram';
import { spread } from './spread';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** リンクの縦の間隔（リンクの高さと、下に出る相手の一覧のぶん） */
export const LINK_PITCH = 50;
/** 機器の外形からリンクまでの最小の距離（両端のスタブと、電線が折り返す余白） */
const COLUMN_GAP = 90;
/** 電線 1 本ごとに足す距離（重なりを避けるレーンの間隔。routing.ts の LANE_GAP） */
const LANE_GAP = 9;

/** 機器 deviceId の端子につないだリンク（その端子とだけつながっているもの）と、つないだ端子 */
function attachedLinks(d: Diagram, deviceId: string, lookup: DefLookup) {
  const dev = d.devices.find((x) => x.id === deviceId);
  const def = dev && lookup(dev.type);
  if (!dev || !def) return [];
  const resolved = resolveDevice(def, dev.params);
  const sheet = sheetOf(d, dev);
  const out: { link: DiagramDevice; wire: string; side: 'left' | 'right'; y: number }[] = [];
  for (const w of d.wires) {
    const [mine, other] = w.from.device === deviceId ? [w.from, w.to] : w.to.device === deviceId ? [w.to, w.from] : [];
    if (!mine || !other) continue;
    const link = d.devices.find((x) => x.id === other.device);
    if (!link || !lookup(link.type)?.netLabel || sheetOf(d, link) !== sheet) continue;
    // ほかの機器ともつないだリンクは動かさない
    if (d.wires.some((x) => x.id !== w.id && (x.from.device === link.id || x.to.device === link.id))) continue;
    const t = resolved.terminal(mine.terminal);
    if (!t || (t.side !== 'left' && t.side !== 'right')) continue;
    out.push({ link, wire: w.id, side: t.side, y: dev.y + t.y });
  }
  return out;
}

/** 機器 deviceId の端子につないだリンクで、並べ直せるものの数 */
export function alignableLinkCount(d: Diagram, deviceId: string, lookup: DefLookup): number {
  return attachedLinks(d, deviceId, lookup).length;
}

/**
 * 機器 deviceId の端子につないだリンクを、端子の横に並べ直す。
 * リンクの向きは「自動」（相手の端子の側）に戻し、つないだ電線の手で曲げた経路・向きの指定は自動に戻す
 */
export function alignLinks(d: Diagram, deviceId: string, lookup: DefLookup): Diagram {
  const dev = d.devices.find((x) => x.id === deviceId);
  const def = dev && lookup(dev.type);
  const items = attachedLinks(d, deviceId, lookup);
  if (!dev || !def || !items.length) return d;
  const moved = new Map<string, { x: number; y: number }>();
  for (const side of ['left', 'right'] as const) {
    const group = items.filter((it) => it.side === side).sort((a, b) => a.y - b.y || a.link.y - b.link.y);
    if (!group.length) continue;
    const centers = spread(group.map((it) => ({ want: it.y, size: LINK_PITCH })));
    const gap = COLUMN_GAP + group.length * LANE_GAP;
    group.forEach((it, i) => {
      const ldef = lookup(it.link.type)!;
      const x = side === 'left' ? dev.x - gap - ldef.width : dev.x + def.width + gap;
      moved.set(it.link.id, { x: Math.round(x), y: Math.round(centers[i] - ldef.height / 2) });
    });
  }
  const wires = new Set(items.map((it) => it.wire));
  return {
    ...d,
    devices: d.devices.map((x) => {
      const p = moved.get(x.id);
      return p ? { ...x, ...p, params: { ...x.params, side: 'auto' } } : x;
    }),
    wires: d.wires.map((w) => {
      if (!wires.has(w.id)) return w;
      const { bend: _b, route: _r, fromSide: _f, toSide: _t, ...rest } = w;
      return rest;
    }),
  };
}
