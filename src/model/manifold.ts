/**
 * マニホールド（電磁弁を連ごとに装着するベース）の編集操作。バルブエディタ（src/editor/ValveEditor.tsx）から使う。
 *
 * マニホールドは増設ユニットの装着（bus / mount）で表す: 親がマニホールドベース、装着した機器 1 台が 1 連（電磁弁またはブランクプレート）。
 * - 連の追加・削除・並べ替え: PLC のユニット構成と同じ操作（src/model/plc.ts）を使う
 * - 連の機種の変更: 機器名・装着の位置・パラメータ・電線（新しい機種にもある端子のもの）を引き継ぐ
 * - A・B のつなぎ先: 連の A・B ポートからチューブ（シートが違えばエアのリンク）を引く
 * - ソレノイドと PLC の出力: I/O の接続（src/model/io.ts）を使う。シンク出力（NPN）は −、ソース出力（PNP）は + につなぐ
 */
import { buildModel, key, type Model } from '../check/model';
import { resolveDevice } from '../devices/resolve';
import { deviceModel, type DeviceDefinition } from '../devices/types';
import { tubeAttrs } from './air';
import { computeBus, effectiveParams } from './bus';
import { isTube, nextDeviceId, type Diagram, type DiagramDevice, type TerminalRef } from './diagram';
import { compareAddress, connectIo, disconnectIo, ioHosts, ioSystem, type IoPoint } from './io';
import { AIR_LINK_TYPE, connectTerminals, uniqueLinkName, type WireAttrs } from './ops';
import { addUnit, compatibleTypes, mountedUnits, moveUnit } from './plc';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** マニホールド（電磁弁を装着する親）か */
export function isManifold(def: DeviceDefinition | undefined): boolean {
  return !!def?.bus?.host && def.category === 'valve';
}

/** 機器がマニホールドか、マニホールドに装着した連なら、そのマニホールドの機器ID */
export function manifoldOf(d: Diagram, id: string, lookup: DefLookup): string | undefined {
  const dev = d.devices.find((x) => x.id === id);
  if (!dev) return undefined;
  const hostId = dev.mount?.device ?? dev.id;
  const host = d.devices.find((x) => x.id === hostId);
  return host && isManifold(lookup(host.type)) ? hostId : undefined;
}

/** 図面にあるマニホールドと、それに装着した連の機器ID */
export function manifoldDevices(d: Diagram, lookup: DefLookup): Set<string> {
  const out = new Set<string>();
  for (const x of d.devices) if (manifoldOf(d, x.id, lookup)) out.add(x.id);
  return out;
}

/** 連にできる機種（電磁弁とブランクプレート。ブランクプレートは端子のない機器） */
export function stationTypes(hostDef: DeviceDefinition, defs: DeviceDefinition[]): { valves: DeviceDefinition[]; blanks: DeviceDefinition[] } {
  const all = compatibleTypes(hostDef, defs).sort((a, b) => a.model.localeCompare(b.model, 'ja', { numeric: true }));
  const isBlank = (x: DeviceDefinition) => !resolveDevice(x).terminals.length;
  return { valves: all.filter((x) => !isBlank(x)), blanks: all.filter(isBlank) };
}

/** 連を追加する（slot を省略すると右端。返り値の id は追加した機器の名前） */
export function addStation(d: Diagram, hostId: string, def: DeviceDefinition, lookup: DefLookup, slot?: number): { diagram: Diagram; id: string } {
  const id = nextDeviceId(def.labelPrefix, d.devices.map((x) => x.id));
  let out = addUnit(d, hostId, def, lookup);
  if (slot !== undefined) out = moveUnit(out, hostId, id, slot, lookup);
  return { diagram: out, id };
}

/**
 * 連の機種を変える。装着の位置・パラメータ（新しい機種にもあるもの）・電線（新しい機種にもある端子のもの）・コメントを引き継ぐ。
 * 機器名の接頭辞が変わる場合（電磁弁 SOL ⇔ ブランクプレート BP）は、新しい接頭辞で名前を付け直す。
 */
export function changeStationType(d: Diagram, unitId: string, type: string, lookup: DefLookup): Diagram {
  const dev = d.devices.find((x) => x.id === unitId);
  const def = lookup(type);
  const oldDef = dev && lookup(dev.type);
  if (!dev || !def || dev.type === type) return d;
  const id = oldDef?.labelPrefix === def.labelPrefix ? dev.id : nextDeviceId(def.labelPrefix, d.devices.map((x) => x.id));
  // 新しい機種で選べる値だけ残す
  const params = Object.fromEntries(
    Object.entries(dev.params ?? {}).filter(([k, v]) => {
      const p = def.params?.find((x) => x.key === k);
      return p && (p.input === 'text' || p.options.some((o) => o.value === v));
    }),
  );
  const r = resolveDevice(def, params);
  const ids = new Set([...r.terminals.map((t) => t.id), ...r.pins.map((t) => t.id)]);
  const comments = Object.fromEntries(Object.entries(dev.comments ?? {}).filter(([k]) => ids.has(k)));
  const { params: _p, comments: _c, ...rest } = dev;
  const next: DiagramDevice = {
    ...rest,
    id,
    type,
    ...(Object.keys(params).length ? { params } : {}),
    ...(Object.keys(comments).length ? { comments } : {}),
  };
  const keep = (r2: TerminalRef) => r2.device !== unitId || ids.has(r2.terminal);
  const rename = (r2: TerminalRef) => (r2.device === unitId ? { ...r2, device: id } : r2);
  return {
    ...d,
    devices: d.devices.map((x) => (x.id === unitId ? next : x)),
    wires: d.wires.filter((w) => keep(w.from) && keep(w.to)).map((w) => ({ ...w, from: rename(w.from), to: rename(w.to) })),
  };
}

/** すべての電磁弁の連の A・B ポートの継手をそろえる */
export function setAllPorts(d: Diagram, hostId: string, od: number, lookup: DefLookup): Diagram {
  const ids = new Set(
    mountedUnits(d, hostId)
      .filter((u) => lookup(u.type)?.params?.some((p) => p.key === 'portAB' && p.options.some((o) => o.value === od)))
      .map((u) => u.id),
  );
  return { ...d, devices: d.devices.map((x) => (ids.has(x.id) ? { ...x, params: { ...x.params, portAB: od } } : x)) };
}

/** エアのリンクを経由した、ポートのつなぎ先 */
export interface AirPeer {
  ref: TerminalRef;
  /** 表示名（機器名.印字） */
  name: string;
  /** 経由したエアのリンクの名前 */
  via: string[];
}

/**
 * ポートからチューブとエアのリンクをたどった先（リンク以外の機器のポート）。
 * あわせて、たどったチューブとエアのリンクの機器IDを返す（つなぎ先を外すときに使う）
 */
export function airPeers(m: Model, ref: TerminalRef): { peers: AirPeer[]; tubes: string[]; links: string[] } {
  const start = key(ref.device, ref.terminal);
  const isLink = (k: string) => !!m.terminals.get(k)?.def.netLabel;
  // エアのリンクの名前ごとの端子
  const group = new Map<string, string[]>();
  for (const [a, b] of m.labelLinks) {
    const g = [...new Set([...(group.get(a) ?? [a]), ...(group.get(b) ?? [b])])];
    for (const k of g) group.set(k, g);
  }
  const seen = new Set([start]);
  const tubes = new Set<string>();
  const links = new Set<string>();
  const peers: AirPeer[] = [];
  const queue: { k: string; via: string[] }[] = [{ k: start, via: [] }];
  while (queue.length) {
    const { k, via } = queue.shift()!;
    for (const w of m.tubesAt.get(k) ?? []) {
      tubes.add(w.id);
      const other = key(w.from.device, w.from.terminal) === k ? key(w.to.device, w.to.terminal) : key(w.from.device, w.from.terminal);
      if (seen.has(other)) continue;
      seen.add(other);
      const info = m.terminals.get(other);
      if (!info) continue;
      if (isLink(other)) {
        const name = String(info.device.params?.[info.def.netLabel!.param] ?? '');
        links.add(info.device.id);
        for (const g of group.get(other) ?? [other]) {
          links.add(g.split(':')[0]);
          if (!seen.has(g) || g === other) {
            seen.add(g);
            queue.push({ k: g, via: [...via, name] });
          }
        }
        continue;
      }
      peers.push({ ref: { device: info.device.id, terminal: info.terminal.id }, name: `${info.device.id}.${info.terminal.label ?? info.terminal.id}`, via });
    }
  }
  return { peers, tubes: [...tubes], links: [...links] };
}

/** ソレノイド 1 つ（A 側・B 側）の状態 */
export interface SolenoidRow {
  side: 'A' | 'B';
  /** + 端子・− 端子の ID */
  plus: string;
  minus: string;
  /** つないだ PLC の出力 */
  outputs: IoPoint[];
  /** 出力につないでいない側の端子（コモン側）に電線があるか */
  commonWired: boolean;
}

export interface StationRow {
  slot: number;
  device: DiagramDevice;
  def: DeviceDefinition;
  /** 電磁弁でなくブランクプレート */
  blank: boolean;
  /** A・B ポートのつなぎ先 */
  ports: { port: 'A' | 'B'; peers: AirPeer[] }[];
  solenoids: SolenoidRow[];
}

/** 図面にある PLC の出力の一覧 */
export function plcOutputs(d: Diagram, lookup: DefLookup): IoPoint[] {
  return ioHosts(d, lookup)
    .flatMap((h) => (ioSystem(d, h, lookup)?.units ?? []).flatMap((u) => u.points.filter((p) => p.dir === 'out')))
    .sort((a, b) => compareAddress(a.address, b.address));
}

const solenoidSides = (r: ReturnType<typeof resolveDevice>): ('A' | 'B')[] => (['A', 'B'] as const).filter((s) => !!r.terminal(`${s}+`) && !!r.terminal(`${s}-`));

/** マニホールドの連の一覧（位置の順）。outputs を渡すと、それを使ってソレノイドの出力を探す */
export function manifoldRows(d: Diagram, hostId: string, lookup: DefLookup, outputs = plcOutputs(d, lookup)): StationRow[] {
  const m = buildModel(d, lookup, () => {});
  return mountedUnits(d, hostId).flatMap((u) => {
    const info = m.devices.get(u.id);
    if (!info) return [];
    const { r } = info;
    const ports = (['A', 'B'] as const).filter((p) => r.air.has(p)).map((port) => ({ port, peers: airPeers(m, { device: u.id, terminal: port }).peers }));
    const solenoids = solenoidSides(r).map((side) => {
      const plus = `${side}+`;
      const minus = `${side}-`;
      const outs = outputs.filter((p) => p.connections.some((c) => c.ref.device === u.id && (c.ref.terminal === plus || c.ref.terminal === minus)));
      const used = new Set(outs.flatMap((p) => p.connections.filter((c) => c.ref.device === u.id).map((c) => c.ref.terminal)));
      const common = used.has(minus) ? plus : minus;
      return { side, plus, minus, outputs: outs, commonWired: m.wiresAt.has(key(u.id, common)) };
    });
    return [{ slot: u.mount!.slot, device: u, def: info.def, blank: !r.terminals.length, ports, solenoids }];
  });
}

/** A・B のつなぎ先の候補（マニホールドの外の機器のエアのポート。作業ポートを先に） */
export function airTargets(d: Diagram, hostId: string, lookup: DefLookup): { ref: TerminalRef; name: string; detail: string; used: boolean }[] {
  const family = new Set([hostId, ...mountedUnits(d, hostId).map((u) => u.id)]);
  const used = new Set(d.wires.filter(isTube).flatMap((w) => [key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal)]));
  const out: { ref: TerminalRef; name: string; detail: string; used: boolean; rank: number }[] = [];
  const bus = computeBus(d.devices, lookup);
  for (const x of d.devices) {
    const def = lookup(x.type);
    if (!def || family.has(x.id) || def.netLabel || def.category === 'air-supply') continue;
    const r = resolveDevice(def, effectiveParams(x, bus));
    for (const t of r.terminals) {
      const a = r.air.get(t.id);
      if (t.role !== 'air' || !a || a.kind === 'supply' || a.kind === 'exhaust') continue;
      out.push({
        ref: { device: x.id, terminal: t.id },
        name: `${x.id}.${t.label ?? t.id}`,
        detail: `${def.name}${t.note ? ` — ${t.note}` : ''}`,
        used: used.has(key(x.id, t.id)),
        rank: a.kind === 'work' ? 0 : 1,
      });
    }
  }
  return out
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'ja', { numeric: true }))
    .map(({ rank: _, ...rest }) => rest);
}

/**
 * 連の A・B ポートのつなぎ先を変える（target が null なら外す）。
 * 今のつなぎ先へのチューブと、その間のエアのリンクは消す。新しいつなぎ先が別のシートなら、エアのリンクを置いてつなぐ
 */
export function setPortTarget(d: Diagram, unitId: string, port: string, target: TerminalRef | null, lookup: DefLookup): Diagram {
  const m = buildModel(d, lookup, () => {});
  const ref = { device: unitId, terminal: port };
  const { tubes, links } = airPeers(m, ref);
  const dropTubes = new Set(tubes);
  const dropLinks = new Set(links);
  let out: Diagram = {
    ...d,
    devices: d.devices.filter((x) => !dropLinks.has(x.id)),
    wires: d.wires.filter((w) => !dropTubes.has(w.id) && !dropLinks.has(w.from.device) && !dropLinks.has(w.to.device)),
  };
  if (!target) return out;
  const attrs: WireAttrs = tubeAttrs(out, ref, target, lookup);
  out = connectTerminals(out, ref, target, attrs, lookup, uniqueLinkName(out, `${unitId}-${port}`, AIR_LINK_TYPE), false, AIR_LINK_TYPE);
  return out;
}

/** PLC の出力につなぐソレノイドの端子（シンク出力は −、ソース出力・リレー出力は +） */
export function solenoidTerminal(side: 'A' | 'B', point: Pick<IoPoint, 'kind'>): string {
  return point.kind === 'npn' ? `${side}-` : `${side}+`;
}

/**
 * ソレノイドにつなぐ PLC の出力を変える（point が null なら外す）。今つないでいる出力は外す。
 * 出力の電線の線番は入出力番号にする（I/O の接続と同じ）
 */
export function setSolenoidOutput(
  d: Diagram,
  unitId: string,
  side: 'A' | 'B',
  point: Pick<IoPoint, 'device' | 'terminal'> | null,
  attrs: Omit<WireAttrs, 'wireNo'>,
  lookup: DefLookup,
): Diagram {
  let out = d;
  const terms = [`${side}+`, `${side}-`];
  for (const p of plcOutputs(out, lookup)) {
    for (const c of p.connections) if (c.ref.device === unitId && terms.includes(c.ref.terminal)) out = disconnectIo(out, p, c.ref, lookup);
  }
  if (!point) return out;
  // 外したあとの状態で出力を探し直す（コメントなどが変わるため）
  const fresh = plcOutputs(out, lookup).find((p) => p.device === point.device && p.terminal === point.terminal);
  if (!fresh) return out;
  return connectIo(out, fresh, { device: unitId, terminal: solenoidTerminal(side, fresh) }, attrs, lookup);
}

/** マニホールドの概要（型式・連数・ソレノイドの数）と注意 */
export function manifoldSummary(d: Diagram, hostId: string, lookup: DefLookup): { model: string; stations: number; solenoids: number; notes: string[] } {
  const host = d.devices.find((x) => x.id === hostId);
  const def = host && lookup(host.type);
  if (!host || !def) return { model: '', stations: 0, solenoids: 0, notes: [] };
  const bus = computeBus(d.devices, lookup);
  const units = mountedUnits(d, hostId);
  const solenoids = units.reduce((n, u) => {
    const ud = lookup(u.type);
    return n + (ud ? solenoidSides(resolveDevice(ud, u.params)).length : 0);
  }, 0);
  const notes: string[] = [];
  if (units.length < 2) notes.push('連数は 2 以上にします（使わない連はブランクプレートにします）');
  if (units.length > 10) notes.push('10 連を超える場合は、両側（D 側・U 側）から給排気します');
  for (const p of bus.problems) if (p.devices.includes(hostId)) notes.push(p.message);
  return { model: deviceModel(def, effectiveParams(host, bus)), stations: units.length, solenoids, notes };
}
