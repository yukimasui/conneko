/**
 * 配線の電気的なルールチェック。
 *
 * 考え方:
 * - 電線と機器内部の導通経路（links。接点は閉とみなす）でつながった端子の集まりを「同電位グループ」とし、
 *   グループ内の電源出力（supply）から、そのグループの電源種別・相を決める。
 * - 電源から links の向きに沿ってたどり、保護機器（protects）を通過した先の「保護電流」を求め、
 *   電線の許容電流や負荷電流と比較する。
 */
import { allowableCurrent, CIRCUIT_COLOR_RULES, getWireColor, type CircuitKind } from '../data/wires';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import {
  resolveNum,
  type Conductor,
  type DeviceDefinition,
  type PowerSystem,
  type TerminalDef,
} from '../devices/types';

export type Severity = 'error' | 'warning' | 'info';

export interface CheckIssue {
  /** 同じ指摘を識別するキー */
  key: string;
  severity: Severity;
  /** ルールの種類 */
  rule: string;
  message: string;
  devices: string[];
  wires: string[];
}

type DefLookup = (type: string) => DeviceDefinition | undefined;

interface Supply {
  system: PowerSystem;
  voltage: number;
  conductor: Conductor;
  device: string;
}

/** グループの電源状態 */
type Potential =
  | { kind: 'none' }
  | { kind: 'ok'; supply: Supply }
  | { kind: 'conflict' };

const CONDUCTOR_NAMES: Record<Conductor, string> = {
  R: 'R相',
  S: 'S相',
  T: 'T相',
  L: 'L（電圧側）',
  N: 'N（中性線）',
  '+': '+（プラス）',
  '-': '-（マイナス）',
  PE: '接地(PE)',
};

const DEFAULT_CONDUCTORS: Record<PowerSystem, Conductor[]> = {
  AC: ['R', 'S', 'T', 'L', 'N'],
  DC: ['+', '-'],
};

const key = (device: string, terminal: string) => `${device}:${terminal}`;

class UnionFind {
  private parent = new Map<string, string>();
  find(a: string): string {
    let p = this.parent.get(a) ?? a;
    if (p !== a) {
      p = this.find(p);
      this.parent.set(a, p);
    }
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

interface TerminalInfo {
  device: DiagramDevice;
  def: DeviceDefinition;
  terminal: TerminalDef;
}

function supplyLabel(s: Supply): string {
  if (s.conductor === 'PE') return CONDUCTOR_NAMES.PE;
  return `${s.system}${s.voltage}V ${CONDUCTOR_NAMES[s.conductor]}`;
}

export function checkDiagram(diagram: Diagram, lookup: DefLookup): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const push = (issue: Omit<CheckIssue, 'key'> & { key?: string }) => {
    issues.push({ key: issue.key ?? `${issue.rule}:${issue.devices.join(',')}:${issue.wires.join(',')}`, ...issue });
  };

  // --- 機器と端子の解決 ---
  const terminals = new Map<string, TerminalInfo>();
  const devices = new Map<string, { device: DiagramDevice; def: DeviceDefinition }>();
  for (const device of diagram.devices) {
    const def = lookup(device.type);
    if (!def) {
      push({ severity: 'error', rule: 'unknown-device', message: `${device.id}: 機器種別 "${device.type}" が見つかりません`, devices: [device.id], wires: [] });
      continue;
    }
    devices.set(device.id, { device, def });
    for (const t of def.terminals) terminals.set(key(device.id, t.id), { device, def, terminal: t });
    // コネクタのピンも端子として扱う（画面上には表示しない）
    for (const p of def.pins ?? []) {
      terminals.set(key(device.id, p.id), { device, def, terminal: { ...p, x: 0, y: 0, side: 'top' } });
    }
  }

  const validWires: DiagramWire[] = [];
  /** ケーブルで導通するピンの組 */
  const cablePairs: [string, string][] = [];
  for (const w of diagram.wires) {
    const bad = [w.from, w.to].filter((r) => !terminals.has(key(r.device, r.terminal)));
    if (bad.length) {
      push({
        severity: 'error',
        rule: 'unknown-terminal',
        message: `電線 ${w.id}: 接続先 ${bad.map((r) => `${r.device}.${r.terminal}`).join(', ')} が存在しません`,
        devices: bad.map((r) => r.device).filter((d) => devices.has(d)),
        wires: [w.id],
      });
      continue;
    }
    if (w.from.device === w.to.device && w.from.terminal === w.to.terminal) continue;
    const a = terminals.get(key(w.from.device, w.from.terminal))!.terminal.connector;
    const b = terminals.get(key(w.to.device, w.to.terminal))!.terminal.connector;
    if (a || b) {
      if (a && b && a.kind === b.kind) {
        // ケーブル: 両端の同じ番号のピンどうしが導通する
        for (let i = 1; i <= Math.min(a.pins, b.pins); i++) {
          cablePairs.push([key(w.from.device, `${w.from.terminal}#${i}`), key(w.to.device, `${w.to.terminal}#${i}`)]);
        }
      } else {
        push({
          severity: 'error',
          rule: 'connector-mismatch',
          message: a && b
            ? `ケーブル ${w.id}: コネクタの種類が違います（${a.kind} と ${b.kind}）`
            : `電線 ${w.id}: コネクタ（${(a ?? b)!.kind}）には同じ種類のコネクタからケーブルでつなぎます`,
          devices: [w.from.device, w.to.device],
          wires: [w.id],
        });
      }
      continue;
    }
    validWires.push(w);
  }

  const wiresAt = new Map<string, DiagramWire[]>();
  for (const w of validWires) {
    for (const r of [w.from, w.to]) {
      const k = key(r.device, r.terminal);
      wiresAt.set(k, [...(wiresAt.get(k) ?? []), w]);
    }
  }

  // --- 未接続 ---
  for (const [k, info] of terminals) {
    const { terminal: t, device } = info;
    if (t.optional || t.role === 'signal' || t.role === 'supply' || t.role === 'pass' || t.role === 'connector') continue;
    if (wiresAt.has(k)) continue;
    if (t.role === 'ground') {
      push({ severity: 'warning', rule: 'ground-missing', message: `${device.id}: 接地端子 ${t.id} が接地されていません`, devices: [device.id], wires: [], key: `unconnected:${k}` });
    } else {
      push({ severity: 'warning', rule: 'unconnected', message: `${device.id}: 端子 ${t.label ?? t.id} が未接続です`, devices: [device.id], wires: [], key: `unconnected:${k}` });
    }
  }

  // --- 同電位グループ ---
  const uf = new UnionFind();
  for (const w of validWires) uf.union(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of cablePairs) uf.union(a, b);
  for (const { device, def } of devices.values()) {
    for (const l of def.links ?? []) uf.union(key(device.id, l.from), key(device.id, l.to));
  }
  const groups = new Map<string, string[]>();
  for (const k of terminals.keys()) {
    const g = uf.find(k);
    groups.set(g, [...(groups.get(g) ?? []), k]);
  }

  const potentials = new Map<string, Potential>();
  for (const [g, members] of groups) {
    const supplies: Supply[] = [];
    for (const k of members) {
      const { terminal: t, device, def } = terminals.get(k)!;
      if (t.role === 'supply' && t.supply) {
        supplies.push({
          system: t.supply.system,
          voltage: resolveNum(t.supply.voltage, def, device.params) ?? 0,
          conductor: t.supply.conductor,
          device: device.id,
        });
      }
    }
    if (supplies.length === 0) {
      potentials.set(g, { kind: 'none' });
      continue;
    }
    const wiresInGroup = validWires.filter((w) => uf.find(key(w.from.device, w.from.terminal)) === g).map((w) => w.id);
    const involved = [...new Set(supplies.map((s) => s.device))];
    const conflict = (rule: string, message: string) => {
      push({ severity: 'error', rule, message, devices: involved, wires: wiresInGroup, key: `${rule}:${g}` });
      potentials.set(g, { kind: 'conflict' });
    };
    const first = supplies[0];
    const hasPE = supplies.some((s) => s.conductor === 'PE');
    const nonPE = supplies.filter((s) => s.conductor !== 'PE');
    if (hasPE && nonPE.length) {
      conflict('ground-fault', `地絡: 接地(PE)と ${supplyLabel(nonPE[0])} がつながっています`);
    } else if (supplies.some((s) => s.system !== first.system)) {
      conflict('mixed-system', `混触: 交流(AC)と直流(DC)の電源がつながっています`);
    } else if (supplies.some((s) => s.conductor !== first.conductor)) {
      const names = [...new Set(supplies.map((s) => CONDUCTOR_NAMES[s.conductor]))].join(' と ');
      conflict('short-circuit', `短絡: ${names} がつながっています`);
    } else if (supplies.some((s) => s.voltage !== first.voltage) && !hasPE) {
      conflict('voltage-conflict', `電圧の異なる電源（${[...new Set(supplies.map((s) => s.voltage + 'V'))].join('/')}）がつながっています`);
    } else {
      if (involved.length > 1 && !hasPE) {
        push({ severity: 'warning', rule: 'parallel-source', message: `複数の電源（${involved.join(', ')}）の出力が並列につながっています`, devices: involved, wires: wiresInGroup, key: `parallel-source:${g}` });
      }
      potentials.set(g, { kind: 'ok', supply: first });
    }
  }
  const potentialOf = (k: string): Potential => potentials.get(uf.find(k)) ?? { kind: 'none' };

  // --- 受電端子の電源条件 ---
  for (const [k, info] of terminals) {
    const { terminal: t, device } = info;
    if (!wiresAt.has(k) && !groupHasOtherConnection(k, groups, uf, wiresAt)) continue;
    const p = potentialOf(k);
    if (t.role === 'ground') {
      if (p.kind === 'ok' && p.supply.conductor !== 'PE') {
        push({ severity: 'error', rule: 'ground-fault', message: `地絡: ${device.id} の接地端子 ${t.id} が ${supplyLabel(p.supply)} につながっています`, devices: [device.id], wires: (wiresAt.get(k) ?? []).map((w) => w.id), key: `ground-live:${k}` });
      } else if (p.kind === 'none') {
        push({ severity: 'warning', rule: 'ground-floating', message: `${device.id}: 接地端子 ${t.id} が電源の接地(PE)までつながっていません`, devices: [device.id], wires: (wiresAt.get(k) ?? []).map((w) => w.id), key: `ground-floating:${k}` });
      }
      continue;
    }
    if (t.role !== 'input' || !t.accepts) continue;
    const a = t.accepts;
    const where = `${device.id} の端子 ${t.label ?? t.id}`;
    const wires = (wiresAt.get(k) ?? []).map((w) => w.id);
    if (p.kind === 'none') {
      push({ severity: 'warning', rule: 'no-power', message: `${where} に電源が来ていません`, devices: [device.id], wires, key: `no-power:${k}` });
      continue;
    }
    if (p.kind === 'conflict') continue;
    const s = p.supply;
    if (s.conductor === 'PE') {
      push({ severity: 'error', rule: 'ground-fault', message: `${where} が接地(PE)につながっています`, devices: [device.id], wires, key: `input-pe:${k}` });
    } else if (s.system !== a.system) {
      push({ severity: 'error', rule: 'system-mismatch', message: `${where} は ${a.system} 用ですが ${s.system} が来ています`, devices: [device.id], wires, key: `system:${k}` });
    } else if (s.voltage < a.minVoltage || s.voltage > a.maxVoltage) {
      push({ severity: 'error', rule: 'voltage-mismatch', message: `${where} の定格は ${a.system}${a.minVoltage}〜${a.maxVoltage}V ですが ${s.voltage}V が来ています`, devices: [device.id], wires, key: `voltage:${k}` });
    } else if (!(a.conductors ?? DEFAULT_CONDUCTORS[a.system]).includes(s.conductor)) {
      const msg =
        a.system === 'DC'
          ? `極性が逆です: ${where} には ${(a.conductors ?? []).map((c) => CONDUCTOR_NAMES[c]).join('/')} をつなぎます（${CONDUCTOR_NAMES[s.conductor]} が来ています）`
          : `${where} に ${CONDUCTOR_NAMES[s.conductor]} はつなげません`;
      push({ severity: 'error', rule: 'conductor-mismatch', message: msg, devices: [device.id], wires, key: `conductor:${k}` });
    }
  }

  // --- 異相であるべき端子 ---
  for (const { device, def } of devices.values()) {
    for (const group of def.distinctGroups ?? []) {
      const seen = new Map<Conductor, string[]>();
      for (const tid of group) {
        const p = potentialOf(key(device.id, tid));
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

  // --- 保護電流の伝搬 ---
  const protection = computeProtection(devices, terminals, validWires, cablePairs, potentialOf);

  // 電線の許容電流
  for (const w of validWires) {
    const kf = key(w.from.device, w.from.terminal);
    const kt = key(w.to.device, w.to.terminal);
    const p = potentialOf(kf);
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

  // 負荷電流と保護
  for (const { device, def } of devices.values()) {
    const inputs = def.terminals.filter((t) => t.role === 'input');
    const powered = inputs.filter((t) => potentialOf(key(device.id, t.id)).kind === 'ok');
    if (!powered.length) continue;
    const prots = powered.map((t) => protection.get(key(device.id, t.id)) ?? Infinity);
    const worst = Math.max(...prots);
    if (!Number.isFinite(worst)) {
      push({ severity: 'warning', rule: 'no-protection', message: `${device.id}: 上流に保護機器（ブレーカー・サーキットプロテクタなど）がありません`, devices: [device.id], wires: [], key: `no-protection:${device.id}` });
      continue;
    }
    const load = resolveNum(def.loadCurrent, def, device.params);
    if (load !== undefined && load > worst) {
      push({ severity: 'warning', rule: 'overload', message: `${device.id}: 定格電流 ${load}A が上流の保護電流 ${worst}A を超えています（保護機器が動作します）`, devices: [device.id], wires: [], key: `overload:${device.id}` });
    }
  }

  // --- 電線色 ---
  checkWireColors(validWires, terminals, potentialOf, push);

  // --- 線番 ---
  const byNo = new Map<string, Set<string>>();
  const wiresByNo = new Map<string, string[]>();
  for (const w of validWires) {
    if (!w.wireNo) continue;
    byNo.set(w.wireNo, (byNo.get(w.wireNo) ?? new Set()).add(uf.find(key(w.from.device, w.from.terminal))));
    wiresByNo.set(w.wireNo, [...(wiresByNo.get(w.wireNo) ?? []), w.id]);
  }
  for (const [no, gs] of byNo) {
    if (gs.size > 1) {
      push({ severity: 'warning', rule: 'wire-no-duplicate', message: `線番 ${no} が電位の異なる電線に使われています`, devices: [], wires: wiresByNo.get(no)!, key: `wire-no:${no}` });
    }
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** 端子が電線につながっていなくても、機器内部の経路で何かにつながっていれば true */
function groupHasOtherConnection(k: string, groups: Map<string, string[]>, uf: UnionFind, wiresAt: Map<string, DiagramWire[]>) {
  return (groups.get(uf.find(k)) ?? []).some((m) => wiresAt.has(m));
}

/**
 * 電源から links の向きに沿ってたどり、各端子の保護電流[A]を求める。
 * 保護機器を通っていない端子は Infinity。複数経路がある場合は大きい方（安全側）を採用する。
 */
function computeProtection(
  devices: Map<string, { device: DiagramDevice; def: DeviceDefinition }>,
  terminals: Map<string, TerminalInfo>,
  wires: DiagramWire[],
  cablePairs: [string, string][],
  potentialOf: (k: string) => Potential,
): Map<string, number> {
  type Edge = { to: string; protects?: number };
  const adj = new Map<string, Edge[]>();
  const add = (a: string, e: Edge) => adj.set(a, [...(adj.get(a) ?? []), e]);
  for (const w of wires) {
    const a = key(w.from.device, w.from.terminal);
    const b = key(w.to.device, w.to.terminal);
    add(a, { to: b });
    add(b, { to: a });
  }
  for (const [a, b] of cablePairs) {
    add(a, { to: b });
    add(b, { to: a });
  }
  for (const { device, def } of devices.values()) {
    const rating = resolveNum(def.protectionCurrent, def, device.params);
    for (const l of def.links ?? []) {
      const a = key(device.id, l.from);
      const b = key(device.id, l.to);
      const e: Edge = { to: b, ...(l.protects && rating !== undefined ? { protects: rating } : {}) };
      add(a, e);
      if (!l.directed) add(b, { to: a, ...(e.protects !== undefined ? { protects: e.protects } : {}) });
    }
  }

  const result = new Map<string, number>();
  const queue: [string, number][] = [];
  for (const [k, info] of terminals) {
    const t = info.terminal;
    if (t.role !== 'supply' || !t.supply || t.supply.conductor === 'PE') continue;
    if (potentialOf(k).kind !== 'ok') continue;
    const limit = resolveNum(t.supply.limitCurrent, info.def, info.device.params) ?? Infinity;
    queue.push([k, limit]);
  }
  while (queue.length) {
    const [k, prot] = queue.shift()!;
    const prev = result.get(k);
    if (prev !== undefined && prev >= prot) continue;
    result.set(k, prot);
    for (const e of adj.get(k) ?? []) {
      queue.push([e.to, e.protects !== undefined ? Math.min(prot, e.protects) : prot]);
    }
  }
  return result;
}

function checkWireColors(
  wires: DiagramWire[],
  terminals: Map<string, TerminalInfo>,
  potentialOf: (k: string) => Potential,
  push: (issue: Omit<CheckIssue, 'key'> & { key?: string }) => void,
) {
  // 電線だけでつながった端子の集まり（ネット）単位で、制御回路かどうかを判定する
  const uf = new UnionFind();
  for (const w of wires) uf.union(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  const controlNets = new Set<string>();
  for (const w of wires) {
    for (const r of [w.from, w.to]) {
      const info = terminals.get(key(r.device, r.terminal))!;
      const cat = info.def.category;
      const isControl =
        (info.terminal.role === 'input' && (cat === 'contactor' || cat === 'control' || cat === 'plc' || cat === 'sensor' || cat === 'safety')) ||
        info.terminal.role === 'signal';
      if (isControl) controlNets.add(uf.find(key(r.device, r.terminal)));
    }
  }

  for (const w of wires) {
    const k = key(w.from.device, w.from.terminal);
    const p = potentialOf(k);
    let circuit: CircuitKind | undefined;
    if (p.kind === 'ok') {
      if (p.supply.conductor === 'PE') circuit = 'ground';
      else if (p.supply.system === 'DC') circuit = 'dc-control';
      else circuit = controlNets.has(uf.find(k)) ? 'ac-control' : 'ac-main';
    } else {
      const toGround = [w.from, w.to].some((r) => terminals.get(key(r.device, r.terminal))?.terminal.role === 'ground');
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
