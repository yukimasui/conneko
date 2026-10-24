/**
 * 機器名のラベルの左右の位置。ラベルは機器の上に出すので、上から来る電線・チューブが横切りやすい。
 * 候補（機器の左端・上の端子のいちばん右より右・機器の左の外）のうち、横切る線と重なる機器のいちばん少ない位置を選ぶ。
 * 画面（DeviceNode）とシートの画像（sheetSvg）で同じ位置にする。
 */
import { resolveDevice } from '../devices/resolve';
import { deviceModel, deviceSize, type DeviceDefinition, type ParamValues, type TerminalSide } from '../devices/types';
import { labelBelow, labelOffset, labelWidth } from './DeviceNode';
import type { WireGeometry } from './EditorContext';
import { wirePoints, type LayoutDevice, type LayoutWire } from './geometry';
import type { Point } from './routing';

export interface LabelDevice extends LayoutDevice {
  mount?: { device: string };
}

/** ラベルの高さ[px]と、機器の上端からラベルの下端までの間（親の機器はユニットのラベルの上に出す） */
const LABEL_H = 18;
const GAP = 4;
const HOST_GAP = 26;

/** 線分 a-b が長方形と重なるか（線は縦・横の折れ線） */
function segmentHits(a: Point, b: Point, r: { x1: number; y1: number; x2: number; y2: number }): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return maxX >= r.x1 && minX <= r.x2 && maxY >= r.y1 && minY <= r.y2;
}

/**
 * 機器ID → ラベルの左の位置（機器の左端からの px）。左端（0）のままの機器は入れない。
 * devices は同じシートの機器（位置つき。装着したユニットも位置を入れておく）、wires はそのシートの電線
 */
export function labelLefts(
  devices: LabelDevice[],
  wires: LayoutWire[],
  geometry: Map<string, WireGeometry>,
  lanes: Map<string, number>,
  lookup: (type: string) => DeviceDefinition | undefined,
  paramsOf: (id: string) => ParamValues | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  const paths = wires.flatMap((w) => {
    const geo = geometry.get(w.id);
    return geo ? [wirePoints(w, geo, lanes)] : [];
  });
  const boxes = devices.flatMap((d) => {
    const def = lookup(d.type);
    if (!def) return [];
    const s = deviceSize(def, paramsOf(d.id));
    return [{ id: d.id, x1: d.x, y1: d.y, x2: d.x + s.width, y2: d.y + s.height }];
  });
  const hosts = new Set(devices.flatMap((d) => (d.mount ? [d.mount.device] : [])));
  for (const d of devices) {
    const def = lookup(d.type);
    if (!def || def.netLabel || d.mount) continue;
    const terminals = resolveDevice(def, paramsOf(d.id)).terminals;
    if (labelBelow(terminals)) continue;
    // 親の機器は、装着したユニットの上の端子も避ける
    const extra: { side: TerminalSide; x: number }[] = [];
    if (hosts.has(d.id)) {
      for (const m of devices) {
        const mdef = m.mount?.device === d.id ? lookup(m.type) : undefined;
        if (!mdef) continue;
        for (const t of resolveDevice(mdef, paramsOf(m.id)).terminals) if (t.side === 'top') extra.push({ side: 'top', x: m.x - d.x + t.x });
      }
    }
    const width = labelWidth(d.id, deviceModel(def, paramsOf(d.id)));
    const right = labelOffset([...terminals, ...extra], width);
    if (!right) continue;
    const bottom = d.y - (hosts.has(d.id) ? HOST_GAP : GAP);
    const score = (left: number) => {
      const r = { x1: d.x + left, y1: bottom - LABEL_H, x2: d.x + left + width, y2: bottom };
      let n = 0;
      for (const pts of paths) for (let i = 1; i < pts.length; i++) if (segmentHits(pts[i - 1], pts[i], r)) n++;
      for (const b of boxes) if (b.id !== d.id && b.x2 >= r.x1 && b.x1 <= r.x2 && b.y2 >= r.y1 && b.y1 <= r.y2) n++;
      return n;
    };
    // 同じ数なら、左端 → 上の端子の右 → 機器の左の外の順に選ぶ
    const candidates = [0, right, -(width + 6)];
    let best = candidates[0];
    let bestScore = score(best);
    for (const c of candidates.slice(1)) {
      const s = score(c);
      if (s < bestScore) {
        best = c;
        bestScore = s;
      }
    }
    if (best) out.set(d.id, best);
  }
  return out;
}
