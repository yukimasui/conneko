/**
 * エア回路のチェック: ポートの未接続、チューブの外径、エアの届く範囲と圧力。
 *
 * 圧力は、エア源（kind: 'supply' のポート）から、チューブ・エアのリンク・機器の中の通り道（airLinks）を通って求める。
 * - 電磁弁の切り換わる通り道（valve）は、すべての位置の通り道を合わせて届く範囲を求める
 * - レギュレータ（regulate）は、二次側を設定圧力までに下げる
 * - 排気ポートへ向かう機器の中の通り道は、圧力の計算に使わない（排気は大気へ逃がす）
 * - マニホールドに装着した電磁弁のポート（P・EA・EB）は、親の bus.host.airGallery で親のポート（SUP・EXH）とつながる
 * ポートの圧力は、届く経路のうちいちばん高いもの（レギュレータを通ればその設定圧力まで）とする。
 */
import { fittingODs, threadSize } from '../data/threads';
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
  /** 画面に出さないポート（role: 'air' のピン。マニホールドの中で親のポートにつながる） */
  hidden: boolean;
}

function airPorts(m: Model): Map<string, Port> {
  const out = new Map<string, Port>();
  for (const { device, def, r } of m.devices.values()) {
    for (const [t, hidden] of [...r.terminals.map((x) => [x, false] as const), ...r.pins.map((x) => [x, true] as const)]) {
      const spec = r.air.get(t.id);
      if (t.role !== 'air' || !spec) continue;
      out.set(key(device.id, t.id), { device: device.id, id: t.id, label: t.label ?? t.id, spec, optional: !!t.optional, link: !!def.netLabel, hidden });
    }
  }
  return out;
}

/**
 * 装着したユニットのポートと親のポートをつなぐ通路（マニホールドの SUP・EXH）。返り値は [ユニットのポート, 親のポート] の端子キーの組。
 * どちらかのポートがなければ組にしない
 */
export function airGalleryPairs(m: Model): [string, string][] {
  const out: [string, string][] = [];
  for (const g of m.bus.groups.values()) {
    const host = m.devices.get(g.host.id);
    const gallery = host?.def.bus?.host?.airGallery;
    if (!host || !gallery) continue;
    for (const member of g.members) {
      const unit = m.devices.get(member.id);
      if (!unit) continue;
      for (const [unitPort, hostPort] of Object.entries(gallery)) {
        if (unit.r.air.has(unitPort) && host.r.air.has(hostPort)) out.push([key(member.id, unitPort), key(g.host.id, hostPort)]);
      }
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
  // マニホールドの通路（排気ポートへ向かう向きは使わない）
  for (const [a, b] of airGalleryPairs(m)) {
    const toExhaust = (k: string) => ports.get(k)?.spec.kind === 'exhaust';
    if (!toExhaust(b)) add(a, { to: b, limit: Infinity });
    if (!toExhaust(a)) add(b, { to: a, limit: Infinity });
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
  /** マニホールドの通路で親のポートとつながったユニットのポート */
  const joined = new Set(airGalleryPairs(m).map(([a]) => a));

  // 未接続のポート（排気ポート・任意のポート・マニホールドの中でつながるポートは除く）
  for (const [k, p] of ports) {
    if (p.hidden || p.optional || p.link || p.spec.kind === 'exhaust' || m.tubesAt.has(k) || joined.has(k)) continue;
    push({ severity: 'warning', rule: 'air-unconnected', message: `${p.device}: ポート ${p.label} が未接続です（チューブをつなぎます）`, devices: [p.device], wires: [], key: `air-unconnected:${k}` });
  }

  // 開放排気: 電磁弁・マニホールドなどの排気ポートに、サイレンサも排気の配管もつないでいない
  // （任意のポート・内蔵サイレンサの排気・サイレンサ自身・エアを 1 本もつないでいない機器は除く）
  const openExhaust = new Map<string, string[]>();
  const used = new Set([...ports].filter(([k]) => m.tubesAt.has(k)).map(([, p]) => p.device));
  for (const [k, p] of ports) {
    if (p.spec.kind !== 'exhaust' || p.hidden || p.optional || p.link || m.tubesAt.has(k) || joined.has(k) || !used.has(p.device)) continue;
    if (m.devices.get(p.device)?.r.pneumatic?.symbol === 'silencer') continue;
    openExhaust.set(p.device, [...(openExhaust.get(p.device) ?? []), p.label]);
  }
  for (const [device, labels] of openExhaust) {
    push({
      severity: 'info',
      rule: 'air-exhaust-open',
      message: `${device}: 排気ポート ${labels.join('・')} が開放です（サイレンサを付けるか、集合排気の配管にします。開放のままだと排気音が大きく、ごみが入ります）`,
      devices: [device],
      wires: [],
      key: `air-exhaust-open:${device}`,
    });
  }

  // 画面に出さないポート（マニホールドの中でつながるもの）が、どの親にもつながっていない
  const unjoined = new Map<string, string[]>();
  for (const [k, p] of ports) if (p.hidden && !joined.has(k)) unjoined.set(p.device, [...(unjoined.get(p.device) ?? []), p.label]);
  for (const [device, labels] of unjoined) {
    push({
      severity: 'warning',
      rule: 'air-not-mounted',
      message: `${device}: マニホールドに装着されていません（${labels.join('・')} はマニホールドの中で SUP・EXH につながります）`,
      devices: [device],
      wires: [],
    });
  }

  // チューブの外径と継手、チューブの最高使用圧力。おねじのポートをつないだものは直結（ねじの呼びを確かめる）
  const fittingChecked = new Set<string>();
  for (const w of m.tubes) {
    const pa = ports.get(key(w.from.device, w.from.terminal));
    const pb = ports.get(key(w.to.device, w.to.terminal));
    if (pa?.spec.male || pb?.spec.male) {
      const [male, other] = pa?.spec.male ? [pa, pb] : [pb!, pa];
      if (!other) continue;
      const name = (p: Port) => `${p.device}.${p.label}`;
      if (other.spec.male) {
        push({ severity: 'warning', rule: 'air-thread-mismatch', message: `${w.id}: おねじどうし（${name(male)} と ${name(other)}）はつなげません`, devices: [male.device, other.device], wires: [w.id] });
      } else if (!other.spec.thread) {
        push({
          severity: 'warning',
          rule: 'air-thread-mismatch',
          message: `${w.id}: ${name(male)}（${male.spec.thread ?? 'おねじ'}）はめねじのポートにねじ込む部品ですが、${name(other)} はワンタッチ管継手のポートです`,
          devices: [male.device, other.device],
          wires: [w.id],
        });
      } else if (male.spec.thread && threadSize(male.spec.thread) !== threadSize(other.spec.thread)) {
        push({
          severity: 'warning',
          rule: 'air-thread-mismatch',
          message: `${w.id}: ${name(male)}（${male.spec.thread}）と ${name(other)}（${other.spec.thread}）のねじの大きさが合いません`,
          devices: [male.device, other.device],
          wires: [w.id],
        });
      }
      continue;
    }
    for (const [r, p] of [
      [w.from, pa],
      [w.to, pb],
    ] as const) {
      // ねじのポートに付ける継手は、ねじの大きさで付けられる外径が決まる（M5 なら φ6 まで）
      const ods = fittingODs(p?.spec.thread);
      const k = key(r.device, r.terminal);
      if (p && ods && p.spec.tubeOD !== undefined && !ods.includes(p.spec.tubeOD) && !fittingChecked.has(k)) {
        fittingChecked.add(k);
        push({
          severity: 'warning',
          rule: 'air-fitting-thread',
          message: `${p.device}: ポート ${p.label}（${p.spec.thread}）に φ${p.spec.tubeOD} のワンタッチ管継手は付きません（${p.spec.thread} に付くのは φ${ods.join('・φ')}）`,
          devices: [p.device],
          wires: [w.id],
          key: `air-fitting-thread:${k}`,
        });
      }
    }
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

  // 排気ポートへの給気（チューブ・リンクでエアが入ってくる）。下流の「届かない」をまとめるため、指摘はあとで出す
  const exhaustFed = [...ports].filter(([k, p]) => p.spec.kind === 'exhaust' && pressure.has(k));

  checkCylinderValves(m, ports, push);
  checkMeterIn(m, push);

  // 機器ごとの圧力: 届かない・使用圧力範囲の外・向きの逆
  const vacuum = vacuumNet(m, ports);
  const byDevice = new Map<string, string[]>();
  for (const [k, p] of ports) if (!p.link) byDevice.set(p.device, [...(byDevice.get(p.device) ?? []), k]);
  // エアの届かない機器と、一次側・二次側を逆につないだ機器（逆につないだ機器より下流の「届かない」はまとめて 1 件にする）
  const reversedAt: { device: string; from: string; to: string }[] = [];
  const noSupply: string[] = [];
  for (const [device, ks] of byDevice) {
    const info = m.devices.get(device)!;
    // 一次側・作業ポートにチューブがあるのに、どこにもエアが届いていない
    const fed = ks.filter((k) => ['in', 'work'].includes(ports.get(k)!.spec.kind) && (m.tubesAt.has(k) || linked.has(k) || joined.has(k)));
    if (fed.length && !fed.some((k) => pressure.has(k)) && !fed.some((k) => vacuum.has(k))) {
      // 向きのある通り道の出口側だけにエアが来ているなら、つなぐ向きが逆
      // 排気ポートへ向かう通り道は除く（排気ポートへの給気は別に指摘する）
      const reversed = info.r.airLinks.find(
        (l) => l.directed && ports.get(key(device, l.to))?.spec.kind !== 'exhaust' && pressure.has(key(device, l.to)) && !pressure.has(key(device, l.from)),
      );
      if (reversed) reversedAt.push({ device, from: reversed.from, to: reversed.to });
      else noSupply.push(device);
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
        // レギュレータの一次側は、設定圧力に対して言う（一次側の最低使用圧力は設定圧力 + 0.05MPa など）
        const reg = info.r.airLinks.find((l) => l.regulate !== undefined && l.from === p.id);
        push({
          severity: 'warning',
          rule: 'air-under-pressure',
          message: reg
            ? `${device}: 設定圧力 ${mpa(reg.regulate!)} に対して一次側（${p.label}）の圧力 ${mpa(v)} が足りません（一次側は ${mpa(lo)} 以上にします）`
            : `${device}: ${p.label} の圧力 ${mpa(v)} が最低使用圧力 ${mpa(lo)} に届きません`,
          devices: [device],
          wires: [],
          key: `air-under-pressure:${device}`,
        });
      }
    }
  }
  // 逆につないだ機器から（向きを問わず）配管でつながる機器の「届かない」は、逆につないだ指摘にまとめる
  const undirected = new Map<string, string[]>();
  const join = (a: string, b: string) => {
    undirected.set(a, [...(undirected.get(a) ?? []), b]);
    undirected.set(b, [...(undirected.get(b) ?? []), a]);
  };
  for (const w of m.tubes) join(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of m.labelLinks) join(a, b);
  for (const [a, b] of airGalleryPairs(m)) join(a, b);
  for (const { device, r } of m.devices.values()) for (const l of r.airLinks) join(key(device.id, l.from), key(device.id, l.to));
  const suppressed = new Set<string>();
  for (const rv of reversedAt) {
    const seen = new Set<string>([key(rv.device, rv.from)]);
    const queue = [key(rv.device, rv.from)];
    while (queue.length) for (const n of undirected.get(queue.shift()!) ?? []) if (!seen.has(n)) (seen.add(n), queue.push(n));
    const downstream = noSupply.filter((d) => d !== rv.device && [...seen].some((k) => k.startsWith(`${d}:`)));
    downstream.forEach((d) => suppressed.add(d));
    push({
      severity: 'warning',
      rule: 'air-reversed',
      message:
        `${rv.device}: ${rv.to} 側からエアが来ています。${rv.from}（一次側）と ${rv.to}（二次側）を逆につないでいないか確かめてください` +
        (downstream.length ? `（このため ${downstream.join('・')} にもエアが届いていません）` : ''),
      devices: [rv.device, ...downstream],
      wires: [],
    });
  }
  // 排気ポートに給気した機器から配管でつながる機器の「届かない」は、排気ポートへの給気の指摘にまとめる
  for (const [k, p] of exhaustFed) {
    const seen = new Set<string>([k]);
    const queue = [k];
    while (queue.length) for (const n of undirected.get(queue.shift()!) ?? []) if (!seen.has(n)) (seen.add(n), queue.push(n));
    const downstream = noSupply.filter((d) => d !== p.device && !suppressed.has(d) && [...seen].some((x) => x.startsWith(`${d}:`)));
    downstream.forEach((d) => suppressed.add(d));
    suppressed.add(p.device);
    push({
      severity: 'error',
      rule: 'air-exhaust-pressurized',
      message:
        `${p.device}: 排気ポート ${p.label} にエアが供給されています（排気ポートは大気へ逃がします）` +
        (downstream.length ? `。このため ${downstream.join('・')} にもエアが届いていません` : ''),
      devices: [p.device, ...downstream],
      wires: (m.tubesAt.get(k) ?? []).map((w) => w.id),
    });
  }
  for (const device of noSupply.filter((d) => !suppressed.has(d))) {
    push({ severity: 'warning', rule: 'air-no-supply', message: `${device}: エアが届いていません（エア源から配管がつながっているか確かめてください）`, devices: [device], wires: [] });
  }
}

/**
 * アクチュエータ（シリンダ・エアチャック・ロータリ）の 2 つの作業ポートが、同じ電磁弁の別々の作業ポート（A・B）につながっているか。
 * チューブ・エアのリンク・電磁弁でない機器の中の通り道（スピードコントローラ・分岐継手など）をたどって、行き着く電磁弁の作業ポートを求める。
 * - 2 つのポートが同じ電磁弁の同じポートに行き着く: シリンダが動かないため警告
 * - 別々の電磁弁、または片方だけが電磁弁に行き着く: 注意（3 ポート弁 2 台で動かす回路など、意図したものなら問題ない）
 */
function checkCylinderValves(m: Model, ports: Map<string, Port>, push: Push) {
  const next = new Map<string, string[]>();
  const add = (a: string, b: string) => next.set(a, [...(next.get(a) ?? []), b]);
  for (const w of m.tubes) {
    const a = key(w.from.device, w.from.terminal);
    const b = key(w.to.device, w.to.terminal);
    add(a, b);
    add(b, a);
  }
  for (const [a, b] of m.labelLinks) {
    if (!ports.has(a) || !ports.has(b)) continue;
    add(a, b);
    add(b, a);
  }
  // 電磁弁・アクチュエータ以外の機器の中の通り道（向きは問わない）
  for (const { device, def, r } of m.devices.values()) {
    if (def.category === 'valve' || def.category === 'actuator') continue;
    for (const l of r.airLinks) {
      add(key(device.id, l.from), key(device.id, l.to));
      add(key(device.id, l.to), key(device.id, l.from));
    }
  }
  /** start から行き着く電磁弁の作業ポート */
  const valvesFrom = (start: string): Set<string> => {
    const seen = new Set([start]);
    const found = new Set<string>();
    const queue = [start];
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of next.get(u) ?? []) {
        if (seen.has(v)) continue;
        seen.add(v);
        const p = ports.get(v);
        if (p && m.devices.get(p.device)?.def.category === 'valve') {
          if (p.spec.kind === 'work') found.add(v);
          continue;
        }
        // ほかのアクチュエータの中は通り抜けない
        if (p && m.devices.get(p.device)?.def.category === 'actuator') continue;
        queue.push(v);
      }
    }
    return found;
  };
  const label = (k: string) => {
    const p = ports.get(k)!;
    return `${p.device}.${p.label}`;
  };

  for (const { device, def } of m.devices.values()) {
    if (def.category !== 'actuator') continue;
    const work = [...ports.entries()].filter(([, p]) => p.device === device.id && !p.link && p.spec.kind === 'work').map(([k]) => k);
    if (work.length !== 2 || !work.every((k) => m.tubesAt.has(k))) continue;
    const [a, b] = work.map(valvesFrom);
    if (!a.size && !b.size) continue;
    const name = (k: string) => ports.get(k)!.label;
    const shared = [...a].filter((k) => b.has(k));
    if (shared.length) {
      push({
        severity: 'warning',
        rule: 'air-cylinder-valve',
        message: `${device.id}: ${name(work[0])} と ${name(work[1])} が同じ電磁弁のポート ${label(shared[0])} につながっています（両側に同じエアが入るため動きません。A と B に 1 本ずつつなぎます）`,
        devices: [device.id, ports.get(shared[0])!.device],
        wires: [],
        key: `air-cylinder-valve:${device.id}`,
      });
      continue;
    }
    const valveOf = (set: Set<string>) => new Set([...set].map((k) => ports.get(k)!.device));
    const va = valveOf(a);
    const vb = valveOf(b);
    if ([...va].some((v) => vb.has(v))) continue;
    const describe = (k: string, set: Set<string>) => `${name(k)} → ${set.size ? [...set].map(label).join('・') : '電磁弁なし'}`;
    push({
      severity: 'info',
      rule: 'air-cylinder-valve',
      message: `${device.id}: 2 つのポートが同じ電磁弁の A・B につながっていません（${describe(work[0], a)}、${describe(work[1], b)}）。3 ポート弁 2 台で動かすなど意図した回路なら問題ありません`,
      devices: [device.id, ...va, ...vb],
      wires: [],
      key: `air-cylinder-valve:${device.id}`,
    });
  }
}

/**
 * 複動シリンダの速度制御がメータイン（給気を絞る）になっていたら注意する。
 * 複動シリンダは、負荷が変わっても速度が安定するメータアウト（排気を絞る）が基本（SMC のスピードコントローラの選定の説明）。
 * - ポートに直付けしたスピードコントローラ（pneumatic.speedControllers）がメータイン
 * - シリンダのポートにチューブで直接つないだスピードコントローラの自由流れの入口（記号の in）がシリンダ側（＝シリンダへの給気を絞る）
 * 単動シリンダ・エアチャックなどは対象外（メータインを使うことがある）
 */
function checkMeterIn(m: Model, push: Push) {
  for (const { device, r } of m.devices.values()) {
    const hint = r.pneumatic;
    if (hint?.symbol !== 'cylinder' || hint.cylinder?.acting !== 'double') continue;
    const found: string[] = [];
    for (const [sym, sc] of Object.entries(hint.speedControllers ?? {})) if (sc.control === 'meter-in') found.push(`${hint.ports[sym] ?? sym}（${sc.model}）`);
    for (const t of Object.values(hint.ports)) {
      for (const w of m.tubesAt.get(key(device.id, t)) ?? []) {
        const other = w.from.device === device.id && w.from.terminal === t ? w.to : w.from;
        const sc = m.devices.get(other.device);
        const sh = sc?.r.pneumatic;
        if (sh?.symbol === 'speed-controller' && sh.ports.in === other.terminal) found.push(`${t}（${other.device}）`);
      }
    }
    if (!found.length) continue;
    push({
      severity: 'info',
      rule: 'air-meter-in',
      message: `${device.id}: ${found.join('・')} のスピードコントローラがメータイン（給気を絞る）です。複動シリンダは、負荷が変わっても速度が安定するメータアウト（排気を絞る）が基本です（意図したものなら問題ありません）`,
      devices: [device.id],
      wires: [],
      key: `air-meter-in:${device.id}`,
    });
  }
}
