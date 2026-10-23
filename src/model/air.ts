/**
 * エア配管（チューブ）の編集の補助: 新しく引くチューブの属性、読み込んだデータのチューブの補完。
 */
import { DEFAULT_TUBE, getTubeColor, isTubeType } from '../data/tubes';
import { resolveDevice } from '../devices/resolve';
import type { AirPortKind, DeviceCategory, DeviceDefinition, TerminalDef } from '../devices/types';
import { sheetOf, type Diagram, type DiagramWire, type TerminalRef } from './diagram';
import type { MateCandidate } from './mates';

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

/**
 * エアのポートから引いて何もないところで離したときの「つなげる機器」の候補（ConnectPicker で選ぶ）。
 * 流れの向きが合うポートを持つ機器: エア源・二次側 → 一次側、一次側 → 二次側・エア源、作業ポート → 作業ポート、排気 → サイレンサ。
 * 図面にある同じシートの機器の空いているポートと、カタログの機器（新しく置く）を候補にする
 */
export function airCandidates(d: Diagram, from: TerminalRef, defs: DeviceDefinition[], lookup: DefLookup): MateCandidate[] {
  const src = d.devices.find((x) => x.id === from.device);
  const srcDef = src && lookup(src.type);
  const kind = srcDef ? resolveDevice(srcDef, src.params).air.get(from.terminal)?.kind : undefined;
  if (!src || !srcDef || !kind) return [];
  const fits = (def: DeviceDefinition, k: AirPortKind | undefined): boolean => {
    if (!k) return false;
    if (kind === 'exhaust') return resolveDevice(def).pneumatic?.symbol === 'silencer';
    if (kind === 'supply' || kind === 'out') return k === 'in';
    if (kind === 'in') return k === 'out' || k === 'supply';
    return k === kind;
  };
  const busy = new Set(d.wires.flatMap((w) => [w.from, w.to]).map((r) => `${r.device}:${r.terminal}`));
  const sheet = sheetOf(d, src);
  const placed: MateCandidate[] = [];
  for (const other of d.devices) {
    const def = other.id === src.id ? undefined : lookup(other.type);
    if (!def || def.netLabel || sheetOf(d, other) !== sheet) continue;
    const r = resolveDevice(def, other.params);
    const hit = r.terminals.find((t) => t.role === 'air' && !busy.has(`${other.id}:${t.id}`) && fits(def, r.air.get(t.id)?.kind));
    if (hit) placed.push({ device: other.id, type: other.type, pairs: [{ from: from.terminal, to: hit.id }] });
  }
  // 新しく置く機器: 作業ポートからはアクチュエータを先に、ほかはエア機器の分類の順
  const order: DeviceCategory[] = kind === 'work' ? ['actuator', 'air-fitting', 'valve', 'air-supply'] : ['air-supply', 'valve', 'air-fitting', 'actuator'];
  const fresh: MateCandidate[] = [];
  for (const def of defs) {
    // 親に装着して使う機器（マニホールドに装着する電磁弁など）は、単独では置かない
    if (def.netLabel || !order.includes(def.category) || (def.bus && !def.bus.host)) continue;
    const r = resolveDevice(def);
    const hit = r.terminals.find((t) => t.role === 'air' && fits(def, r.air.get(t.id)?.kind));
    if (hit) fresh.push({ type: def.type, pairs: [{ from: from.terminal, to: hit.id }] });
  }
  const rank = (c: MateCandidate) => order.indexOf(lookup(c.type)?.category ?? 'air-fitting');
  fresh.sort((a, b) => rank(a) - rank(b) || (lookup(a.type)?.model ?? '').localeCompare(lookup(b.type)?.model ?? '', 'ja', { numeric: true }));
  return [...placed, ...fresh];
}
