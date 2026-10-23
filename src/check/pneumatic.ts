/**
 * エア回路のチェック: ポートの未接続、チューブの外径、エアの届く範囲と圧力。
 *
 * 圧力は、エア源（kind: 'supply' のポート）から、チューブ・エアのリンク・機器の中の通り道（airLinks）を通って求める。
 * - 電磁弁の切り換わる通り道（valve）は、すべての位置の通り道を合わせて届く範囲を求める
 * - レギュレータ（regulate）は、二次側を設定圧力までに下げる
 * - 排気ポートへ向かう機器の中の通り道は、圧力の計算に使わない（排気は大気へ逃がす）
 * ポートの圧力は、届く経路のうちいちばん高いもの（レギュレータを通ればその設定圧力まで）とする。
 */
import { getTubeType } from '../data/tubes';
import type { ResolvedAirPort } from '../devices/resolve';
import { key, type Model, type Push } from './model';

interface Edge {
  to: string;
  /** この経路で通せる圧力の上限[MPa]（レギュレータの設定圧力） */
  limit: number;
}

const mpa = (v: number) => `${Math.round(v * 1000) / 1000}MPa`;

/** ポートの端子キー → 仕様 */
interface Port {
  device: string;
  id: string;
  label: string;
  spec: ResolvedAirPort;
  optional: boolean;
  /** エアのリンクのポート（未接続・圧力の指摘はリンクのチェックに任せる） */
  link: boolean;
}

function airPorts(m: Model): Map<string, Port> {
  const out = new Map<string, Port>();
  for (const { device, def, r } of m.devices.values()) {
    for (const t of r.terminals) {
      const spec = r.air.get(t.id);
      if (t.role !== 'air' || !spec) continue;
      out.set(key(device.id, t.id), { device: device.id, id: t.id, label: t.label ?? t.id, spec, optional: !!t.optional, link: !!def.netLabel });
    }
  }
  return out;
}

/** エアの届く範囲と圧力を求める。返り値はポートの端子キー → 圧力[MPa] */
export function airPressures(m: Model): Map<string, number> {
  const ports = airPorts(m);
  const edges = new Map<string, Edge[]>();
  const add = (a: string, e: Edge) => edges.set(a, [...(edges.get(a) ?? []), e]);
  for (const w of m.tubes) {
    const a = key(w.from.device, w.from.terminal);
    const b = key(w.to.device, w.to.terminal);
    add(a, { to: b, limit: Infinity });
    add(b, { to: a, limit: Infinity });
  }
  // 同じ名前のエアのリンク
  for (const [a, b] of m.labelLinks) {
    if (!ports.has(a) || !ports.has(b)) continue;
    add(a, { to: b, limit: Infinity });
    add(b, { to: a, limit: Infinity });
  }
  for (const { device, r } of m.devices.values()) {
    for (const l of r.airLinks) {
      const a = key(device.id, l.from);
      const b = key(device.id, l.to);
      const limit = l.regulate ?? Infinity;
      const toExhaust = (k: string) => ports.get(k)?.spec.kind === 'exhaust';
      if (!toExhaust(b)) add(a, { to: b, limit });
      if (!l.directed && !toExhaust(a)) add(b, { to: a, limit });
    }
  }
  const pressure = new Map<string, number>();
  const queue: string[] = [];
  for (const [k, p] of ports) {
    if (p.spec.kind === 'supply' && p.spec.pressure !== undefined) {
      pressure.set(k, p.spec.pressure);
      queue.push(k);
    }
  }
  while (queue.length) {
    const u = queue.shift()!;
    const pu = pressure.get(u)!;
    for (const e of edges.get(u) ?? []) {
      const v = Math.min(pu, e.limit);
      if (v > (pressure.get(e.to) ?? -1)) {
        pressure.set(e.to, v);
        queue.push(e.to);
      }
    }
  }
  return pressure;
}

/**
 * 真空の配管: 真空のポート（kind: 'vacuum'）から、チューブ・エアのリンク・機器の中の向きのない通り道でつながるポート。
 * 真空エジェクタと吸着パッドの間のティなどは圧力のあるエアが届かないが、エアの届かない機器として指摘しない
 */
function vacuumNet(m: Model, ports: Map<string, Port>): Set<string> {
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  };
  for (const w of m.tubes) add(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of m.labelLinks) if (ports.has(a) && ports.has(b)) add(a, b);
  for (const { device, r } of m.devices.values()) for (const l of r.airLinks) if (!l.directed) add(key(device.id, l.from), key(device.id, l.to));
  const seen = new Set<string>();
  const stack = [...ports].filter(([, p]) => p.spec.kind === 'vacuum').map(([k]) => k);
  while (stack.length) {
    const u = stack.pop()!;
    if (seen.has(u)) continue;
    seen.add(u);
    stack.push(...(adj.get(u) ?? []));
  }
  return seen;
}

export function checkPneumatic(m: Model, push: Push) {
  const ports = airPorts(m);
  if (!ports.size) return;
  const pressure = airPressures(m);
  const linked = new Set(m.labelLinks.flat());

  // 未接続のポート（排気ポート・任意のポートは除く）
  for (const [k, p] of ports) {
    if (p.optional || p.link || p.spec.kind === 'exhaust' || m.tubesAt.has(k)) continue;
    push({ severity: 'warning', rule: 'air-unconnected', message: `${p.device}: ポート ${p.label} が未接続です（チューブをつなぎます）`, devices: [p.device], wires: [], key: `air-unconnected:${k}` });
  }

  // チューブの外径と継手、チューブの最高使用圧力
  for (const w of m.tubes) {
    for (const r of [w.from, w.to]) {
      const p = ports.get(key(r.device, r.terminal));
      const od = p?.spec.tubeOD;
      if (!p || od === undefined || w.tubeOD === undefined || od === w.tubeOD) continue;
      push({
        severity: 'warning',
        rule: 'tube-od-mismatch',
        message: `チューブ ${w.id}（φ${w.tubeOD}）と ${p.device}.${p.label}（φ${od} 用の継手）の外径が合いません（チューブを合わせるか、異径の継手を使います）`,
        devices: [p.device],
        wires: [w.id],
        key: `tube-od-mismatch:${w.id}:${r.device}.${r.terminal}`,
      });
    }
    const t = getTubeType(w.wireType);
    const p = Math.max(pressure.get(key(w.from.device, w.from.terminal)) ?? 0, pressure.get(key(w.to.device, w.to.terminal)) ?? 0);
    if (t && p > t.maxPressure) {
      push({
        severity: 'warning',
        rule: 'tube-pressure',
        message: `チューブ ${w.id}: ${t.name}の最高使用圧力 ${mpa(t.maxPressure)} を超える ${mpa(p)} がかかります`,
        devices: [w.from.device, w.to.device],
        wires: [w.id],
      });
    }
  }

  // 排気ポートへの給気（チューブ・リンクでエアが入ってくる）
  for (const [k, p] of ports) {
    if (p.spec.kind !== 'exhaust' || !pressure.has(k)) continue;
    push({
      severity: 'error',
      rule: 'air-exhaust-pressurized',
      message: `${p.device}: 排気ポート ${p.label} にエアが供給されています（排気ポートは大気へ逃がします）`,
      devices: [p.device],
      wires: (m.tubesAt.get(k) ?? []).map((w) => w.id),
    });
  }

  // 機器ごとの圧力: 届かない・使用圧力範囲の外・向きの逆
  const vacuum = vacuumNet(m, ports);
  const byDevice = new Map<string, string[]>();
  for (const [k, p] of ports) if (!p.link) byDevice.set(p.device, [...(byDevice.get(p.device) ?? []), k]);
  for (const [device, ks] of byDevice) {
    const info = m.devices.get(device)!;
    // 一次側・作業ポートにチューブがあるのに、どこにもエアが届いていない
    const fed = ks.filter((k) => ['in', 'work'].includes(ports.get(k)!.spec.kind) && (m.tubesAt.has(k) || linked.has(k)));
    if (fed.length && !fed.some((k) => pressure.has(k)) && !fed.some((k) => vacuum.has(k))) {
      // 向きのある通り道の出口側だけにエアが来ているなら、つなぐ向きが逆
      const reversed = info.r.airLinks.find((l) => l.directed && pressure.has(key(device, l.to)) && !pressure.has(key(device, l.from)));
      push(
        reversed
          ? {
              severity: 'warning',
              rule: 'air-reversed',
              message: `${device}: ${reversed.to} 側からエアが来ています。${reversed.from}（一次側）と ${reversed.to}（二次側）を逆につないでいないか確かめてください`,
              devices: [device],
              wires: [],
            }
          : { severity: 'warning', rule: 'air-no-supply', message: `${device}: エアが届いていません（エア源から配管がつながっているか確かめてください）`, devices: [device], wires: [] },
      );
      continue;
    }
    // 使用圧力範囲（ポートごとに、届く圧力と比べる。指摘は機器ごとに 1 件）
    for (const k of ks) {
      const p = ports.get(k)!;
      const v = pressure.get(k);
      if (v === undefined || p.spec.kind === 'supply' || p.spec.kind === 'exhaust') continue;
      const { minPressure: lo, maxPressure: hi } = p.spec;
      if (hi !== undefined && v > hi + 1e-9) {
        push({
          severity: 'warning',
          rule: 'air-over-pressure',
          message: `${device}: ${p.label} に使用圧力の上限 ${mpa(hi)} を超える ${mpa(v)} がかかります（レギュレータで下げます）`,
          devices: [device],
          wires: [],
          key: `air-over-pressure:${device}`,
        });
      } else if (lo !== undefined && v < lo - 1e-9) {
        push({
          severity: 'warning',
          rule: 'air-under-pressure',
          message: `${device}: ${p.label} の圧力 ${mpa(v)} が最低使用圧力 ${mpa(lo)} に届きません`,
          devices: [device],
          wires: [],
          key: `air-under-pressure:${device}`,
        });
      }
    }
  }
}
