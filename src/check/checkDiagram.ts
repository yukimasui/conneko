/**
 * 配線の電気的なルールチェック。
 *
 * 考え方:
 * - 電線・ケーブル・機器内部の導通経路（links）でつながった端子の集まりを「同電位グループ」とし、
 *   グループ内の電源出力（supply）から、そのグループの電源種別・相を決める（model.ts）。
 *   電源が届くか・電圧が合うかは、接点と出力をすべて閉じた状態（動作中）で確認する。
 * - 短絡は、常時の状態に加え、通常時と、機器を 1 台ずつ動作させた状態でも確認する（states.ts）。
 * - 電源から links の向きに沿ってたどり、保護機器（protects）を通過した先の「保護電流」を求め、
 *   電線の許容電流や負荷電流と比較する。
 * - 信号の種類の相性（signals.ts）と、安全回路のルール（safety.ts）も確認する。
 */
import { checkPneumatic } from './pneumatic';
import { allowableCurrent, CIRCUIT_COLOR_RULES, getWireColor, type CircuitKind } from '../data/wires';
import type { Diagram } from '../model/diagram';
import { hasEstimates } from '../devices/estimates';
import { paramLabel, paramOptions, resolveNum, unavailableParams, type Conductor, type PowerSystem } from '../devices/types';
import {
  buildModel,
  classifySupplies,
  CONDUCTOR_NAMES,
  key,
  protocolNames,
  supplyLabel,
  terminalName,
  type CheckIssue,
  type DefLookup,
  type IssueInput,
  type Model,
  type Push,
  type Severity,
} from './model';
import { checkSafety } from './safety';
import { checkSignals } from './signals';
import { checkSwitchStates } from './states';

export type { CheckIssue, Severity } from './model';

const DEFAULT_CONDUCTORS: Record<PowerSystem, Conductor[]> = {
  AC: ['R', 'S', 'T', 'L', 'N'],
  DC: ['+', '-'],
};

export function checkDiagram(diagram: Diagram, lookup: DefLookup): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const seen = new Set<string>();
  const push: Push = (issue: IssueInput) => {
    const k = issue.key ?? `${issue.rule}:${issue.devices.join(',')}:${issue.wires.join(',')}`;
    if (seen.has(k)) return;
    seen.add(k);
    issues.push({ ...issue, key: k });
  };

  const m = buildModel(diagram, lookup, push);

  for (const p of m.bus.problems) push({ ...p, wires: [], key: `${p.rule}:${p.devices.join(',')}` });

  checkUnconnected(m, push);
  checkParams(m, push);
  checkPortProtocols(m, push);
  const conflictRoots = checkSupplyConflicts(m, push);
  checkInputs(m, push);
  checkDistinctGroups(m, push);
  checkSwitchStates(m, push, conflictRoots);
  const protection = computeProtection(m);
  checkWireCurrents(m, push, protection);
  checkLoadProtection(m, push, protection);
  checkOutputCurrents(m, push);
  checkSignals(m, push);
  checkSafety(m, push);
  checkWireColors(m, push);
  checkWireNumbers(m, push);
  checkPneumatic(m, push);

  // 推定の値を含む機器定義が関わる指摘に印を付ける（電線だけの指摘は、両端の機器で判断する）
  const wireEnds = new Map(diagram.wires.map((w) => [w.id, [w.from.device, w.to.device]]));
  const estimated = (id: string) => {
    const info = m.devices.get(id);
    return !!info && hasEstimates(info.def);
  };
  for (const i of issues) {
    const ids = [...i.devices, ...i.wires.flatMap((w) => wireEnds.get(w) ?? [])];
    if (ids.some(estimated)) i.estimated = true;
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** ほかのパラメータの値では選べない値になっているパラメータ（JSON を手で書いた・AI が書いた場合など） */
function checkParams(m: Model, push: Push) {
  for (const { device, def } of m.devices.values()) {
    for (const { param, value } of unavailableParams(def, device.params)) {
      const choices = paramOptions(def, param, device.params).map((o) => o.label ?? String(o.value));
      push({
        severity: 'warning',
        rule: 'param-unavailable',
        message: `${device.id}: ${param.label}「${paramLabel(def, param.key, value)}」は、ほかのパラメータの値では選べません（選べるのは ${choices.join('、')}）`,
        devices: [device.id],
        wires: [],
        key: `param-unavailable:${device.id}:${param.key}`,
      });
    }
  }
}

/**
 * ネジ端子でつなぐ通信（DeviceNet・CC-Link など）: 電線・端子台でつながった通信線の端子どうしで、機器のポートの通信方式に共通のものがあるか。
 * 同じポート（機器・port）の組は 1 回だけ指摘する
 */
function checkPortProtocols(m: Model, push: Push) {
  for (const members of m.fixedMembers.values()) {
    const ports = new Map<string, { device: string; port: string; protocols: string[]; label: string }>();
    for (const k of members) {
      const info = m.terminals.get(k);
      const t = info?.terminal;
      if (!info || !t?.port || !t.protocols?.length) continue;
      const pk = `${info.device.id}:${t.port}`;
      if (!ports.has(pk)) ports.set(pk, { device: info.device.id, port: t.port, protocols: t.protocols, label: t.label ?? t.id });
    }
    const list = [...ports.entries()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [ka, a] = list[i];
        const [kb, b] = list[j];
        if (a.device === b.device || a.protocols.some((p) => b.protocols.includes(p))) continue;
        const [x, y] = ka < kb ? [ka, kb] : [kb, ka];
        push({
          severity: 'warning',
          rule: 'protocol-mismatch',
          message: `${a.device} の ${a.port}（${protocolNames(a.protocols)}）と ${b.device} の ${b.port}（${protocolNames(b.protocols)}）の通信線がつながっていますが、共通の通信方式がありません`,
          devices: [a.device, b.device],
          wires: [],
          key: `protocol-port:${x}:${y}`,
        });
      }
    }
  }
}

/** 未接続の端子 */
function checkUnconnected(m: Model, push: Push) {
  // ケーブルでつないだコネクタのピンは接続済み（電源が来ているかは受電条件の検査で確かめる）
  const cabled = new Set(m.cablePairs.flat());
  for (const [k, info] of m.terminals) {
    const { terminal: t, device } = info;
    // つながないと働かないコネクタ（アクチュエーターのモーター・エンコーダーなど）
    if (t.role === 'connector' && t.connector?.required && !m.wiresAt.has(k) && !m.cabled.has(k)) {
      push({
        severity: 'warning',
        rule: 'connector-unconnected',
        message: `${device.id}: コネクタ ${t.label ?? t.id} がつながっていません`,
        devices: [device.id],
        wires: [],
        key: `unconnected:${k}`,
      });
      continue;
    }
    // エアのポートはエアのチェック（pneumatic.ts）で確かめる
    if (t.optional || t.role === 'signal' || t.role === 'supply' || t.role === 'pass' || t.role === 'connector' || t.role === 'air') continue;
    if (m.wiresAt.has(k) || cabled.has(k)) continue;
    // コネクタのピン（画面に出ない）は、コネクタにケーブルがつながっていなければ、ピンごとではなくコネクタ 1 つで指摘する
    const hash = t.id.indexOf('#');
    const ck = hash > 0 ? k.slice(0, k.length - (t.id.length - hash)) : undefined;
    const cn = ck ? m.terminals.get(ck) : undefined;
    if (ck && cn && !m.wiresAt.has(ck) && !m.cabled.has(ck)) {
      push({
        severity: 'warning',
        rule: 'connector-unconnected',
        message: `${device.id}: コネクタ ${cn.terminal.label ?? cn.terminal.id} がつながっていません`,
        devices: [device.id],
        wires: [],
        key: `unconnected:${ck}`,
      });
      continue;
    }
    if (t.role === 'ground') {
      push({ severity: 'warning', rule: 'ground-missing', message: `${device.id}: 接地端子 ${t.id} が接地されていません`, devices: [device.id], wires: [], key: `unconnected:${k}` });
    } else {
      push({ severity: 'warning', rule: 'unconnected', message: `${device.id}: 端子 ${t.label ?? t.id} が未接続です`, devices: [device.id], wires: [], key: `unconnected:${k}` });
    }
  }
}

/**
 * 常時の状態（電線と常時導通の経路だけ）でつながった電源出力どうしの短絡・混触など。
 * 矛盾のあったグループ（fixed）を返す（接点の状態ごとの検査で同じ指摘を重ねないため）。
 */
function checkSupplyConflicts(m: Model, push: Push): Set<string> {
  const conflictRoots = new Set<string>();
  const name = (k: string) => terminalName(m, k);
  for (const [g, members] of m.fixedMembers) {
    const supplies = members.flatMap((k) => m.supplies.get(k) ?? []);
    if (!supplies.length) continue;
    const c = classifySupplies(supplies, name);
    const wires = [...new Set(members.flatMap((k) => (m.wiresAt.get(k) ?? []).map((w) => w.id)))];
    if (c.kind === 'conflict') {
      conflictRoots.add(g);
      push({ severity: 'error', rule: c.rule, message: c.message, devices: c.devices, wires, key: `${c.rule}:${g}` });
    } else if (c.kind === 'ok' && c.parallel.length > 1) {
      push({ severity: 'warning', rule: 'parallel-source', message: `複数の電源（${c.parallel.join(', ')}）の出力が並列につながっています`, devices: c.parallel, wires, key: `parallel-source:${g}` });
    }
  }
  return conflictRoots;
}

/** 受電端子・接地端子の電源条件 */
function checkInputs(m: Model, push: Push) {
  const cabled = new Set(m.cablePairs.flat());
  for (const [k, info] of m.terminals) {
    const { terminal: t, device } = info;
    const connected = (m.allMembers.get(m.all.find(k)) ?? []).some((x) => m.wiresAt.has(x) || cabled.has(x));
    if (!connected) continue;
    const p = m.potentialOf(k);
    const wires = (m.wiresAt.get(k) ?? []).map((w) => w.id);
    if (t.role === 'ground') {
      if (p.kind === 'ok' && p.supply.conductor !== 'PE') {
        push({ severity: 'error', rule: 'ground-fault', message: `地絡: ${device.id} の接地端子 ${t.id} が ${supplyLabel(p.supply)} につながっています`, devices: [device.id], wires, key: `ground-live:${k}` });
      } else if (p.kind === 'none') {
        push({ severity: 'warning', rule: 'ground-floating', message: `${device.id}: 接地端子 ${t.id} が電源の接地(PE)までつながっていません`, devices: [device.id], wires, key: `ground-floating:${k}` });
      }
      continue;
    }
    if (t.role !== 'input' || !info.accepts.length) continue;
    const where = `${device.id} の端子 ${t.label ?? t.id}`;
    if (p.kind === 'none') {
      push({ severity: 'warning', rule: 'no-power', message: `${where} に電源が来ていません`, devices: [device.id], wires, key: `no-power:${k}` });
      continue;
    }
    if (p.kind === 'conflict') continue;
    const s = p.supply;
    if (s.conductor === 'PE') {
      push({ severity: 'error', rule: 'ground-fault', message: `${where} が接地(PE)につながっています`, devices: [device.id], wires, key: `input-pe:${k}` });
      continue;
    }
    // 複数の受電条件（AC/DC 両用など）は、いずれかを満たせばよい。満たさない場合は種別の合うものとの違いを示す
    const fits = (a: (typeof info.accepts)[number]) =>
      a.system === s.system && s.voltage >= a.minVoltage && s.voltage <= a.maxVoltage && (a.conductors ?? DEFAULT_CONDUCTORS[a.system]).includes(s.conductor);
    if (info.accepts.some(fits)) continue;
    const a = info.accepts.find((x) => x.system === s.system);
    const range = (x: (typeof info.accepts)[number]) => `${x.system}${x.minVoltage}〜${x.maxVoltage}V`;
    if (!a) {
      push({ severity: 'error', rule: 'system-mismatch', message: `${where} は ${info.accepts.map((x) => x.system).join('/')} 用ですが ${s.system} が来ています`, devices: [device.id], wires, key: `system:${k}` });
    } else if (s.voltage < a.minVoltage || s.voltage > a.maxVoltage) {
      push({ severity: 'error', rule: 'voltage-mismatch', message: `${where} の定格は ${range(a)} ですが ${s.voltage}V が来ています`, devices: [device.id], wires, key: `voltage:${k}` });
    } else {
      const msg =
        a.system === 'DC'
          ? `極性が逆です: ${where} には ${(a.conductors ?? []).map((c) => CONDUCTOR_NAMES[c]).join('/')} をつなぎます（${CONDUCTOR_NAMES[s.conductor]} が来ています）`
          : `${where} に ${CONDUCTOR_NAMES[s.conductor]} はつなげません`;
      push({ severity: 'error', rule: 'conductor-mismatch', message: msg, devices: [device.id], wires, key: `conductor:${k}` });
    }
  }
}

/** 異相であるべき端子 */
function checkDistinctGroups(m: Model, push: Push) {
  for (const { device, def } of m.devices.values()) {
    for (const group of def.distinctGroups ?? []) {
      const seen = new Map<Conductor, string[]>();
      for (const tid of group) {
        const p = m.potentialOf(key(device.id, tid));
        if (p.kind !== 'ok' || p.supply.conductor === 'PE') continue;
        seen.set(p.supply.conductor, [...(seen.get(p.supply.conductor) ?? []), tid]);
      }
      for (const [c, tids] of seen) {
        if (tids.length > 1) {
          push({ severity: 'error', rule: 'same-phase', message: `${device.id}: 端子 ${tids.join(' と ')} に同じ ${CONDUCTOR_NAMES[c]} が来ています（電圧がかかりません）`, devices: [device.id], wires: [], key: `same-phase:${device.id}:${tids.join(',')}` });
        }
      }
    }
  }
}

/**
 * 電源から links の向きに沿ってたどり、各端子の保護電流[A]を求める（接点・出力は閉とみなす）。
 * 保護機器を通っていない端子は Infinity。複数経路がある場合は大きい方（安全側）を採用する。
 */
function computeProtection(m: Model): Map<string, number> {
  type Edge = { to: string; protects?: number };
  const adj = new Map<string, Edge[]>();
  const add = (a: string, e: Edge) => adj.set(a, [...(adj.get(a) ?? []), e]);
  for (const w of m.wires) {
    const a = key(w.from.device, w.from.terminal);
    const b = key(w.to.device, w.to.terminal);
    add(a, { to: b });
    add(b, { to: a });
  }
  for (const [a, b] of [...m.cablePairs, ...m.labelLinks]) {
    add(a, { to: b });
    add(b, { to: a });
  }
  for (const { device, def, r } of m.devices.values()) {
    const rating = resolveNum(def.protectionCurrent, def, device.params);
    for (const l of r.links) {
      const a = key(device.id, l.from);
      const b = key(device.id, l.to);
      const e: Edge = { to: b, ...(l.protects && rating !== undefined ? { protects: rating } : {}) };
      add(a, e);
      if (!l.directed) add(b, { to: a, ...(e.protects !== undefined ? { protects: e.protects } : {}) });
    }
  }

  const result = new Map<string, number>();
  const queue: [string, number][] = [];
  for (const [k, s] of m.supplies) {
    if (s.conductor === 'PE' || m.potentialOf(k).kind !== 'ok') continue;
    const info = m.terminals.get(k)!;
    const limit = resolveNum(info.terminal.supply!.limitCurrent, info.def, info.device.params) ?? Infinity;
    queue.push([k, limit]);
  }
  while (queue.length) {
    const [k, prot] = queue.shift()!;
    const prev = result.get(k);
    if (prev !== undefined && prev >= prot) continue;
    result.set(k, prot);
    for (const e of adj.get(k) ?? []) queue.push([e.to, e.protects !== undefined ? Math.min(prot, e.protects) : prot]);
  }
  return result;
}

/** 電線の許容電流 */
function checkWireCurrents(m: Model, push: Push, protection: Map<string, number>) {
  for (const w of m.wires) {
    const kf = key(w.from.device, w.from.terminal);
    const kt = key(w.to.device, w.to.terminal);
    const p = m.potentialOf(kf);
    if (p.kind !== 'ok' || p.supply.conductor === 'PE') continue;
    const prot = Math.max(protection.get(kf) ?? -1, protection.get(kt) ?? -1);
    if (!Number.isFinite(prot) || prot < 0) continue;
    const allowable = allowableCurrent(w.wireType, w.sizeSq);
    if (allowable === undefined) {
      push({ severity: 'info', rule: 'wire-unknown', message: `電線 ${w.id}: ${w.wireType} ${w.sizeSq}sq の許容電流データがないため太さを確認できません`, devices: [], wires: [w.id], key: `wire-unknown:${w.id}` });
    } else if (allowable < prot) {
      push({ severity: 'warning', rule: 'wire-too-thin', message: `電線 ${w.id}${w.wireNo ? `（${w.wireNo}）` : ''}: ${w.wireType} ${w.sizeSq}sq の許容電流 ${allowable}A が保護電流 ${prot}A を下回っています（太い電線にするか、保護機器の定格を下げてください）`, devices: [], wires: [w.id], key: `wire-too-thin:${w.id}` });
    }
  }
}

/** 負荷電流と保護 */
function checkLoadProtection(m: Model, push: Push, protection: Map<string, number>) {
  for (const { device, def, r } of m.devices.values()) {
    const powered = r.terminals.filter((t) => t.role === 'input' && m.potentialOf(key(device.id, t.id)).kind === 'ok');
    if (!powered.length) continue;
    const worst = Math.max(...powered.map((t) => protection.get(key(device.id, t.id)) ?? Infinity));
    if (!Number.isFinite(worst)) {
      push({ severity: 'warning', rule: 'no-protection', message: `${device.id}: 上流に保護機器（ブレーカー・サーキットプロテクタなど）がありません`, devices: [device.id], wires: [], key: `no-protection:${device.id}` });
      continue;
    }
    const load = resolveNum(def.loadCurrent, def, device.params);
    if (load !== undefined && load > worst) {
      push({ severity: 'warning', rule: 'overload', message: `${device.id}: 定格電流 ${load}A が上流の保護電流 ${worst}A を超えています（保護機器が動作します）`, devices: [device.id], wires: [], key: `overload:${device.id}` });
    }
  }
}

/** 出力点につないだ負荷（受電端子が同じネットにある他の機器）の定格電流の合計 */
function outputLoad(m: Model, owner: string, point: string): { current: number; devices: string[] } {
  const ids = new Set<string>();
  for (const k of m.fixedMembers.get(m.fixed.find(point)) ?? []) {
    const info = m.terminals.get(k)!;
    if (info.device.id !== owner && info.terminal.role === 'input') ids.add(info.device.id);
  }
  let current = 0;
  for (const id of ids) {
    const d = m.devices.get(id)!;
    current += resolveNum(d.def.loadCurrent, d.def, d.device.params) ?? 0;
  }
  return { current, devices: [...ids] };
}

const amp = (n: number) => `${Math.round(n * 1000) / 1000}A`;

/** 出力 1 点の定格とコモンあたりの上限 */
function checkOutputCurrents(m: Model, push: Push) {
  for (const { device, def, r } of m.devices.values()) {
    const outputs = m.switchLinks.filter((s) => s.device === device.id && s.link.switch === 'output');
    if (!outputs.length) continue;
    const loads = new Map(outputs.map((s) => [s, outputLoad(m, device.id, s.a)]));
    for (const s of outputs) {
      const rated = resolveNum(s.link.ratedCurrent, def, device.params);
      const load = loads.get(s)!;
      if (rated !== undefined && load.current > rated + 1e-9) {
        push({
          severity: 'warning',
          rule: 'output-overload',
          message: `${terminalName(m, s.a)}: つないだ負荷（${load.devices.join(', ')}）の定格電流の合計 ${amp(load.current)} が出力の定格 ${amp(rated)} を超えています`,
          devices: [device.id, ...load.devices],
          wires: [],
          key: `output-overload:${s.a}`,
        });
      }
    }
    for (const c of r.commonLimits) {
      const limit = resolveNum(c.current, def, device.params);
      if (limit === undefined) continue;
      // コモンごと、または出力点のグループごとに合計する
      const members = outputs.filter((s) => (c.outputs ? c.outputs.includes(s.link.from) : s.link.to === c.common));
      const total = members.reduce((sum, s) => sum + loads.get(s)!.current, 0);
      if (total > limit + 1e-9) {
        const where = c.outputs
          ? `${device.id} の${c.label ?? `出力 ${c.outputs.join('・')}`}: このグループ`
          : `${terminalName(m, key(device.id, c.common!))}: このコモン`;
        push({
          severity: 'warning',
          rule: 'common-overload',
          message: `${where}の出力につないだ負荷の合計 ${amp(total)} が${c.outputs ? 'グループの' : 'コモンあたりの'}上限 ${amp(limit)} を超えています`,
          devices: [device.id, ...new Set(members.flatMap((s) => loads.get(s)!.devices))],
          wires: [],
          key: `common-overload:${device.id}:${c.common ?? c.outputs!.join(',')}`,
        });
      }
    }
  }
}

/** 電線色（回路の種類ごとの慣例） */
function checkWireColors(m: Model, push: Push) {
  // 電線だけでつながった端子の集まり（ネット）単位で、制御回路かどうかを判定する
  const nets = new Map<string, string>();
  const find = (k: string): string => {
    const p = nets.get(k) ?? k;
    if (p === k) return k;
    const r = find(p);
    nets.set(k, r);
    return r;
  };
  for (const w of m.wires) {
    const a = find(key(w.from.device, w.from.terminal));
    const b = find(key(w.to.device, w.to.terminal));
    if (a !== b) nets.set(a, b);
  }
  const controlNets = new Set<string>();
  for (const w of m.wires) {
    for (const r of [w.from, w.to]) {
      const info = m.terminals.get(key(r.device, r.terminal))!;
      const cat = info.def.category;
      const isControl =
        (info.terminal.role === 'input' && (cat === 'contactor' || cat === 'control' || cat === 'plc' || cat === 'sensor' || cat === 'safety' || cat === 'network')) ||
        info.terminal.role === 'signal';
      if (isControl) controlNets.add(find(key(r.device, r.terminal)));
    }
  }

  for (const w of m.wires) {
    const k = key(w.from.device, w.from.terminal);
    const p = m.potentialOf(k);
    let circuit: CircuitKind | undefined;
    if (p.kind === 'ok') {
      if (p.supply.conductor === 'PE') circuit = 'ground';
      else if (p.supply.system === 'DC') circuit = 'dc-control';
      else circuit = controlNets.has(find(k)) ? 'ac-control' : 'ac-main';
    } else {
      const toGround = [w.from, w.to].some((r) => m.terminals.get(key(r.device, r.terminal))?.terminal.role === 'ground');
      if (toGround) circuit = 'ground';
    }
    if (!circuit) continue;
    const rule = CIRCUIT_COLOR_RULES.find((r) => r.circuit === circuit);
    if (!rule || rule.colors.length === 0 || rule.colors.includes(w.color)) continue;
    const expected = rule.colors.map((c) => getWireColor(c)?.name ?? c).join('または');
    const actual = getWireColor(w.color)?.name ?? w.color;
    push({
      severity: circuit === 'ground' ? 'warning' : 'info',
      rule: 'wire-color',
      message: `電線 ${w.id}${w.wireNo ? `（${w.wireNo}）` : ''}: ${rule.name}は一般に${expected}を使います（現在: ${actual}）`,
      devices: [],
      wires: [w.id],
      key: `wire-color:${w.id}`,
    });
  }
}

/** 線番の重複（常時導通の範囲が違う電線に同じ線番） */
function checkWireNumbers(m: Model, push: Push) {
  const byNo = new Map<string, Set<string>>();
  const wiresByNo = new Map<string, string[]>();
  for (const w of m.wires) {
    if (!w.wireNo) continue;
    byNo.set(w.wireNo, (byNo.get(w.wireNo) ?? new Set()).add(m.fixed.find(key(w.from.device, w.from.terminal))));
    wiresByNo.set(w.wireNo, [...(wiresByNo.get(w.wireNo) ?? []), w.id]);
  }
  for (const [no, gs] of byNo) {
    if (gs.size > 1) {
      push({ severity: 'warning', rule: 'wire-no-duplicate', message: `線番 ${no} が電位の異なる電線に使われています`, devices: [], wires: wiresByNo.get(no)!, key: `wire-no:${no}` });
    }
  }
}
