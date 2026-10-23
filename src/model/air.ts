/**
 * エア配管（チューブ）の編集の補助: 新しく引くチューブの属性、読み込んだデータのチューブの補完。
 */
import { DEFAULT_TUBE, getTubeColor, isTubeType } from '../data/tubes';
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, TerminalDef } from '../devices/types';
import type { Diagram, DiagramWire, TerminalRef } from './diagram';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** エアのポートか */
export const isAirPort = (t: Pick<TerminalDef, 'role'> | undefined) => t?.role === 'air';

/** ポートの適合チューブ外径[mm] */
export function portTubeOD(d: Diagram, ref: TerminalRef, lookup: DefLookup): number | undefined {
  const dev = d.devices.find((x) => x.id === ref.device);
  const def = dev && lookup(dev.type);
  return def ? resolveDevice(def, dev.params).air.get(ref.terminal)?.tubeOD : undefined;
}

/**
 * 2 つのポートをつなぐチューブの属性。外径は両端のポートの適合チューブ外径（違う場合は接続元に合わせる）、
 * 種類・色は前回引いたチューブ（prev）か既定のもの
 */
export function tubeAttrs(
  d: Diagram,
  a: TerminalRef,
  b: TerminalRef,
  lookup: DefLookup,
  prev?: Pick<DiagramWire, 'wireType' | 'color'>,
): Pick<DiagramWire, 'wireType' | 'color' | 'sizeSq' | 'tubeOD'> {
  const od = portTubeOD(d, a, lookup) ?? portTubeOD(d, b, lookup) ?? DEFAULT_TUBE.tubeOD;
  const wireType = prev && isTubeType(prev.wireType) ? prev.wireType : DEFAULT_TUBE.wireType;
  const color = prev && getTubeColor(prev.color) ? prev.color : DEFAULT_TUBE.color;
  return { wireType, color, sizeSq: 0, tubeOD: od };
}

/**
 * エアのポートどうしをつないだ電線を、チューブの属性にそろえる（AI が書いたデータで wireType・外径を省いた場合など）。
 * 種類がチューブでなければポリウレタンチューブ、外径がなければポートの適合外径、色がチューブの色でなければ青にする
 */
export function normalizeTubes(d: Diagram, lookup: DefLookup): Diagram {
  const portOf = (r: TerminalRef) => {
    const dev = d.devices.find((x) => x.id === r.device);
    const def = dev && lookup(dev.type);
    return def ? resolveDevice(def, dev.params).terminal(r.terminal) : undefined;
  };
  let changed = false;
  const wires = d.wires.map((w) => {
    if (!isAirPort(portOf(w.from)) || !isAirPort(portOf(w.to))) return w;
    const tube = isTubeType(w.wireType);
    const od = w.tubeOD ?? portTubeOD(d, w.from, lookup) ?? portTubeOD(d, w.to, lookup) ?? DEFAULT_TUBE.tubeOD;
    const color = getTubeColor(w.color) ? w.color : DEFAULT_TUBE.color;
    if (tube && w.tubeOD === od && color === w.color && w.sizeSq === 0) return w;
    changed = true;
    return { ...w, wireType: tube ? w.wireType : DEFAULT_TUBE.wireType, tubeOD: od, color, sizeSq: 0 };
  });
  return changed ? { ...d, wires } : d;
}
