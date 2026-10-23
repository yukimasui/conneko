/**
 * 増設ユニットの連結・ベースユニットへの装着（バス）。
 *
 * 図面の機器の mount（装着先と位置）から、
 * - 装着したユニットの入出力の先頭番号（params の ioIn / ioOut）
 * - 装着したユニットから決まる親のパラメータ（bus.host.fromUnits。マニホールドの連数など）
 * - 通信タイプのマニホールドの、SI ユニットの出力とソレノイドの割付け（bus.host.serial。連の params の solA / solB）
 * - キャンバス上の位置（親の横・中に順に並べる）
 * - 内部電源の収支やスロット数などの指摘
 * を求める。
 */
import { paramsWithDefaults, resolveNum, type DeviceDefinition, type ParamValues } from '../devices/types';
import type { DiagramDevice } from './diagram';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface BusProblem {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  devices: string[];
}

export interface BusRailTotal {
  rail: string;
  supply: number;
  load: number;
}

export interface BusGroup {
  host: DiagramDevice;
  /** 装着しているユニット（位置順） */
  members: DiagramDevice[];
  rails: BusRailTotal[];
}

/** 通信タイプのマニホールドの SI ユニットの出力 1 点 */
export interface SerialPoint {
  /** SI ユニットの出力番号（0 から） */
  output: number;
  /** 連の機器ID */
  device: string;
  /** つながるソレノイド（ダブル配線のシングルの弁の B 側・ブランクプレートの連の空きの点は undefined） */
  side?: 'A' | 'B';
}

/** 通信タイプのマニホールドの出力の割付け */
export interface SerialLayout {
  /** SI ユニットの型式 */
  unitModel: string;
  /** SI ユニットの出力点数 */
  outputs: number;
  wiring: 'double' | 'specified';
  /** 連が占める出力（番号の順）。SI ユニットの点数を超えた分も含む */
  points: SerialPoint[];
}

export interface BusLayout {
  /** 機器ID → 装着で決まるパラメータ（ioIn / ioOut、通信タイプのマニホールドの連の solA / solB） */
  params: Map<string, ParamValues>;
  groups: Map<string, BusGroup>;
  /** 通信タイプのマニホールドの機器ID → 出力の割付け（連を装着したものだけ） */
  serial: Map<string, SerialLayout>;
  problems: BusProblem[];
}

/** host に unit を装着できるか */
export function busAccepts(host: DeviceDefinition, unit: DeviceDefinition): boolean {
  if (!host.bus?.host || !unit.bus || unit.bus.host) return false;
  return (host.bus.host.accepts ?? [host.bus.kind]).includes(unit.bus.kind);
}

const ROLE_NAMES: Record<string, string> = { power: '電源ユニット', cpu: 'CPU ユニット' };

const roundUp = (n: number, unit: number) => (unit > 0 ? Math.ceil(n / unit) * unit : n);

const fmt = (n: number) => `${Math.round(n * 1000) / 1000}A`;

/** 機器のソレノイドの数（空圧回路図の記号の操作方式のうち 'solenoid' の数。電磁弁でなければ 0） */
export function solenoidCount(def: DeviceDefinition | undefined, params?: ParamValues): number {
  const pn = def?.pneumatic;
  const hint = typeof pn === 'function' ? pn(paramsWithDefaults(def!, params)) : pn;
  const ops = hint?.valve?.operators;
  return ops ? [ops.a, ops.b].filter((o) => o === 'solenoid').length : 0;
}

/** 通信タイプのマニホールドの、連の順に SI ユニットの出力を割り付ける */
function serialLayout(hostDef: DeviceDefinition, host: DiagramDevice, members: DiagramDevice[], lookup: DefLookup): SerialLayout | undefined {
  const spec = hostDef.bus?.host?.serial;
  if (!spec) return undefined;
  const hp = paramsWithDefaults(hostDef, host.params);
  const wiring = (typeof spec.wiring === 'string' ? spec.wiring : String(hp[spec.wiring.param])) === 'specified' ? 'specified' : 'double';
  const points: SerialPoint[] = [];
  for (const m of members) {
    const n = solenoidCount(lookup(m.type), m.params);
    // ダブル配線はどの連も 2 点、配線指定はソレノイドの数（ブランクプレートは 1 点）
    const size = wiring === 'double' ? 2 : Math.max(1, n);
    for (let i = 0; i < size; i++) points.push({ output: points.length, device: m.id, ...(i < n ? { side: i === 0 ? ('A' as const) : ('B' as const) } : {}) });
  }
  return { unitModel: spec.unitModel(hp), outputs: typeof spec.outputs === 'function' ? spec.outputs(hp) : spec.outputs, wiring, points };
}

/** 装着関係を解析する */
export function computeBus(devices: DiagramDevice[], lookup: DefLookup): BusLayout {
  const byId = new Map(devices.map((d) => [d.id, d]));
  const params = new Map<string, ParamValues>();
  const groups = new Map<string, BusGroup>();
  const serial = new Map<string, SerialLayout>();
  const problems: BusProblem[] = [];

  for (const d of devices) {
    if (!d.mount) continue;
    const def = lookup(d.type);
    const host = byId.get(d.mount.device);
    const hostDef = host && lookup(host.type);
    if (!def || !host || !hostDef || host.id === d.id) {
      problems.push({ severity: 'error', rule: 'mount-invalid', message: `${d.id}: 装着先 ${d.mount.device} が見つかりません`, devices: [d.id] });
      continue;
    }
    if (!hostDef.bus?.host) {
      problems.push({ severity: 'error', rule: 'mount-invalid', message: `${d.id}: ${host.id}（${hostDef.model}）にはユニットを装着できません`, devices: [d.id, host.id] });
      continue;
    }
    if (!def.bus || !busAccepts(hostDef, def)) {
      problems.push({
        severity: 'error',
        rule: 'mount-mismatch',
        message: `${d.id}（${def.model}）は ${host.id}（${hostDef.model}）に装着できない機種です`,
        devices: [d.id, host.id],
      });
      continue;
    }
    if (d.mount && byId.get(host.id)?.mount) {
      problems.push({ severity: 'error', rule: 'mount-invalid', message: `${d.id}: 装着先 ${host.id} 自体が別の機器に装着されています`, devices: [d.id, host.id] });
      continue;
    }
    const g = groups.get(host.id) ?? { host, members: [], rails: [] };
    g.members.push(d);
    groups.set(host.id, g);
  }

  for (const g of groups.values()) {
    g.members.sort((a, b) => a.mount!.slot - b.mount!.slot || a.id.localeCompare(b.id));
    const hostDef = lookup(g.host.type)!;
    const hostSpec = hostDef.bus!.host!;

    // スロット
    if (hostSpec.slots !== undefined && g.members.length > hostSpec.slots) {
      problems.push({
        severity: 'error',
        rule: 'mount-slot-over',
        message: `${g.host.id}: 装着できるユニットは ${hostSpec.slots} 台までです（${g.members.length} 台装着）`,
        devices: [g.host.id, ...g.members.map((m) => m.id)],
      });
    }
    const bySlot = new Map<number, string[]>();
    for (const m of g.members) bySlot.set(m.mount!.slot, [...(bySlot.get(m.mount!.slot) ?? []), m.id]);
    for (const [slot, ids] of bySlot) {
      if (ids.length > 1) {
        problems.push({ severity: 'warning', rule: 'mount-slot-duplicate', message: `${g.host.id}: 位置 ${slot} に ${ids.join(' と ')} が重なっています`, devices: ids });
      }
    }

    // 専用の位置（電源ユニット・CPU など）
    const roles = hostSpec.slotRoles ?? {};
    for (const m of g.members) {
      const role = lookup(m.type)?.bus?.role;
      const want = roles[m.mount!.slot];
      if (want ? role !== want : role && Object.values(roles).includes(role)) {
        const where = Object.entries(roles).filter(([, r]) => r === role).map(([n]) => n);
        problems.push({
          severity: 'warning',
          rule: 'mount-slot-role',
          message: want
            ? `${g.host.id}: 位置 ${m.mount!.slot} は${ROLE_NAMES[want] ?? want}用です（${m.id} は装着できません）`
            : `${m.id}: ${ROLE_NAMES[role!] ?? role}は位置 ${where.join('・')} に装着します`,
          devices: [g.host.id, m.id],
        });
      }
    }

    // 入出力の先頭番号
    const numbering = hostSpec.numbering;
    if (numbering) {
      const hostIo = hostDef.bus!.io;
      const hostIn = roundUp(hostIo?.inputs ?? 0, numbering.unit);
      const hostOut = roundUp(hostIo?.outputs ?? 0, numbering.unit);
      let cin = numbering.start?.input ?? (numbering.mode === 'shared' ? hostIn + hostOut : hostIn);
      let cout = numbering.start?.output ?? (numbering.mode === 'shared' ? cin : hostOut);
      // 空きスロットの点数を数える場合は、入出力用の位置のうち装着されていないものを足す
      const occupied = new Set(g.members.map((m) => m.mount!.slot));
      let lastSlot = Math.min(...g.members.map((m) => m.mount!.slot)) - 1;
      for (const m of g.members) {
        if (numbering.emptySlot) {
          for (let s = lastSlot + 1; s < m.mount!.slot; s++) {
            if (occupied.has(s) || roles[s]) continue;
            cin += numbering.emptySlot;
            if (numbering.mode === 'separate') cout += numbering.emptySlot;
          }
          lastSlot = Math.max(lastSlot, m.mount!.slot);
        }
        const io = lookup(m.type)?.bus?.io;
        if (!io) continue;
        const nIn = roundUp(io.inputs ?? 0, numbering.unit);
        const nOut = roundUp(io.outputs ?? 0, numbering.unit);
        if (numbering.mode === 'shared') {
          params.set(m.id, { ioIn: cin, ioOut: cin + nIn });
          cin += nIn + nOut;
        } else {
          params.set(m.id, { ioIn: cin, ioOut: cout });
          cin += nIn;
          cout += nOut;
        }
      }
    }

    // 通信タイプのマニホールド: SI ユニットの出力をソレノイドに割り付ける
    const sl = serialLayout(hostDef, g.host, g.members, lookup);
    if (sl) {
      serial.set(g.host.id, sl);
      for (const p of sl.points) {
        if (p.side) params.set(p.device, { ...params.get(p.device), [`sol${p.side}`]: p.output });
      }
      if (sl.points.length > sl.outputs) {
        problems.push({
          severity: 'error',
          rule: 'manifold-outputs-over',
          message: `${g.host.id}: SI ユニット ${sl.unitModel} の出力は ${sl.outputs} 点までです（連の割付けで ${sl.points.length} 点。${
            sl.wiring === 'double' ? 'ダブル配線はどの連も 2 点を使います。シングルの弁が多ければ配線指定にします' : '連を減らすか、32 点の SI ユニットにします'
          }）`,
          devices: [g.host.id, ...g.members.map((m) => m.id)],
        });
      }
    }

    // 内部電源の収支
    const totals = new Map<string, BusRailTotal>();
    const rail = (name: string) => totals.get(name) ?? (totals.set(name, { rail: name, supply: 0, load: 0 }), totals.get(name)!);
    for (const d of [g.host, ...g.members]) {
      const def = lookup(d.type);
      if (!def?.bus) continue;
      const p = { ...d.params, ...params.get(d.id) };
      for (const [r, v] of Object.entries(def.bus.supply ?? {})) rail(r).supply += resolveNum(v, def, p) ?? 0;
      for (const [r, v] of Object.entries(def.bus.load ?? {})) rail(r).load += resolveNum(v, def, p) ?? 0;
    }
    g.rails = [...totals.values()];
    const everyone = [g.host.id, ...g.members.map((m) => m.id)];
    for (const t of g.rails) {
      if (t.load <= 0) continue;
      if (t.supply <= 0) {
        problems.push({
          severity: 'warning',
          rule: 'bus-no-supply',
          message: `${g.host.id}: 内部電源 ${t.rail} を供給するユニット（電源ユニットなど）が装着されていません（消費 ${fmt(t.load)}）`,
          devices: everyone,
        });
      } else if (t.load > t.supply + 1e-9) {
        problems.push({
          severity: 'warning',
          rule: 'bus-overload',
          message: `${g.host.id}: 内部電源 ${t.rail} の消費電流の合計 ${fmt(t.load)} が供給能力 ${fmt(t.supply)} を超えています`,
          devices: everyone,
        });
      }
    }
  }
  // 装着したユニットから決まる親のパラメータ（マニホールドの連数など。ユニットがなくても求める）
  for (const d of devices) {
    const from = lookup(d.type)?.bus?.host?.fromUnits;
    if (!from || d.mount) continue;
    const units = (groups.get(d.id)?.members ?? []).flatMap((m) => {
      const def = lookup(m.type);
      return def ? [{ type: m.type, def, params: paramsWithDefaults(def, { ...params.get(m.id), ...m.params }) }] : [];
    });
    params.set(d.id, { ...params.get(d.id), ...from(units) });
  }
  return { params, groups, serial, problems };
}

/** 通信タイプのマニホールドに装着した連の、ソレノイドの SI ユニットの出力（親の機器ID と出力番号）。割り付けていなければ undefined */
export function serialOutputOf(layout: BusLayout, device: string, side: 'A' | 'B'): { host: string; output: number } | undefined {
  for (const [host, s] of layout.serial) {
    const p = s.points.find((x) => x.device === device && x.side === side);
    if (p) return { host, output: p.output };
  }
  return undefined;
}

/** ソレノイドの SI ユニットの出力の表記（例: 'MF2 出力3'） */
export function serialOutputName(layout: BusLayout, device: string, side: 'A' | 'B'): string | undefined {
  const o = serialOutputOf(layout, device, side);
  return o ? `${o.host} 出力${o.output}` : undefined;
}

/** 図面の機器の、装着で決まるパラメータを加えた params（明示した params が優先） */
export function effectiveParams(device: DiagramDevice, layout: BusLayout): ParamValues | undefined {
  const auto = layout.params.get(device.id);
  if (!auto) return device.params;
  return { ...auto, ...device.params };
}

/**
 * 装着したユニットのキャンバス上の位置（左上）を求める。親の origin（省略時は右隣）から位置順に横へ並べる。
 */
export function mountedPositions(devices: DiagramDevice[], lookup: DefLookup): Map<string, { x: number; y: number }> {
  const layout = computeBus(devices, lookup);
  const out = new Map<string, { x: number; y: number }>();
  for (const g of layout.groups.values()) {
    const hostDef = lookup(g.host.type);
    if (!hostDef) continue;
    const origin = hostDef.bus?.host?.origin ?? { x: hostDef.width, y: 0 };
    const slotX = hostDef.bus?.host?.slotX;
    let x = g.host.x + origin.x;
    for (const m of g.members) {
      // スロットの位置が決まっていればその位置、なければ前のユニットの右隣
      const fixed = slotX?.[m.mount!.slot - 1];
      if (fixed !== undefined) x = g.host.x + origin.x + fixed;
      out.set(m.id, { x, y: g.host.y + origin.y });
      x += lookup(m.type)?.width ?? 0;
    }
  }
  return out;
}
