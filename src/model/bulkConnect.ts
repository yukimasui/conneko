/**
 * 2 台の機器のあいだで、つなぐ端子の組を推定する（「まとめてつなぐ」）。
 *
 * - 電源の向き: 電源を出す側（電源出力 supply・保護機器や接点の二次側 load）から、受ける側（受電 input・一次側 line・端子台 pass）へ。
 *   どちらの機器から出すかは、組がたくさんできる向きにする
 * - 端子の組: 相（R/L1/U/1・2 → 1 相目、S/L2/V/3・4 → 2 相目、T/L3/W/5・6 → 3 相目）、単相の L・N、DC の +・-、接地 PE で合わせる。
 *   出す側の相は、電源が来ていればその電位（R・S・T など）で決める。単相の L・N と相が合わないときは、並び順で合わせる
 *   （S・T 相から取ったブレーカーの二次側 → 電源ユニットの L・N など）
 * - コネクタ: 同じ種類（または変換ケーブルが使える）コネクタどうしをケーブルでつなぐ
 * - すでに電線のある受ける側の端子にはつながない
 * - 電線の色は回路（主回路・操作回路・DC・接地）に合わせ、太さは出す側の上流の保護電流に合わせる
 */
import { buildModel, key, type Model } from '../check/model';
import { computeProtection } from '../check/protection';
import { allowableCurrent, WIRE_TYPES, type CircuitKind } from '../data/wires';
import { connectorsMate } from '../devices/resolve';
import type { Conductor, DeviceDefinition, TerminalDef } from '../devices/types';
import { CABLE_WIRE_TYPE, nextWireId, type Diagram, type DiagramWire, type TerminalRef } from './diagram';
import type { WireAttrs } from './ops';
import { wireFor } from './suggest';

type DefLookup = (type: string) => DeviceDefinition | undefined;

/** 端子を合わせる鍵 */
type Slot = 'p1' | 'p2' | 'p3' | 'L' | 'N' | '+' | '-' | 'PE';

export interface BulkProposal {
  from: TerminalRef;
  to: TerminalRef;
  /** 表示用の合わせ方（例: 'R 相'、'DC +'、'ケーブル'） */
  reason: string;
  /** ケーブル（コネクタどうし） */
  cable?: boolean;
  /** 電線の色・太さを決める回路の種類 */
  circuit?: CircuitKind;
  /** 出す側の端子の線番（新しい電線にも付ける） */
  wireNo?: string;
  /** 出す側の端子の上流の保護電流[A]（電線の太さを決める。保護がなければ省略） */
  protection?: number;
}

export interface BulkPlan {
  /** 電源を出す側の機器 */
  source: string;
  target: string;
  proposals: BulkProposal[];
}

const SLOT_NAME: Record<Slot, string> = { p1: '1 相目（R・L1・U）', p2: '2 相目（S・L2・V）', p3: '3 相目（T・L3・W）', L: 'L', N: 'N', '+': 'DC +', '-': 'DC −', PE: '接地' };
const PHASE_ORDER: Slot[] = ['p1', 'p2', 'p3', 'L', 'N'];

const fromConductor = (c: Conductor): Slot => (c === 'R' ? 'p1' : c === 'S' ? 'p2' : c === 'T' ? 'p3' : c);

/** 端子の ID・表示名から鍵を推定する */
function slotFromName(t: TerminalDef): Slot | undefined {
  for (const raw of [t.id, t.label ?? '']) {
    const s = raw.toUpperCase().replace(/\s/g, '');
    if (!s) continue;
    if (/^(PE|E|FG|⏚|GND)$/.test(s)) return 'PE';
    if (/^(\+|\+V\d*|\+24V?|24V|P24|BN|DC\+)$/.test(s)) return '+';
    if (/^(-|−|-V\d*|0V|N24|BU|DC-)$/.test(s)) return '-';
    if (s === 'L') return 'L';
    if (s === 'N') return 'N';
    // 「1/L1」「2/T1」「R/L1」のように / で区切った名前は、どれかの部分で決める。
    // 番号だけ（1・2 → 1 相目、3・4 → 2 相目、5・6 → 3 相目）は、遮断器・開閉器の一次側・二次側だけ（端子台の番号は相ではない）
    const numbered = t.role === 'line' || t.role === 'load';
    for (const part of s.split('/')) {
      if (/^(R|L1|U|T1|U1)$/.test(part) || (numbered && /^(1|2)$/.test(part))) return 'p1';
      if (/^(S|L2|V|T2|V1)$/.test(part) || (numbered && /^(3|4)$/.test(part))) return 'p2';
      if (/^(T|L3|W|T3|W1)$/.test(part) || (numbered && /^(5|6)$/.test(part))) return 'p3';
    }
  }
  return undefined;
}

/** 出す側・受ける側の端子 */
interface End {
  ref: TerminalRef;
  terminal: TerminalDef;
  slot?: Slot;
  /** 並び順（左から、同じなら上から） */
  order: number;
}

const OUT_ROLES = new Set(['supply', 'load', 'pass']);
const IN_ROLES = new Set(['input', 'line', 'pass']);

function ends(m: Model, device: string, side: 'out' | 'in'): End[] {
  const info = m.devices.get(device);
  if (!info) return [];
  const roles = side === 'out' ? OUT_ROLES : IN_ROLES;
  const out: End[] = [];
  for (const t of info.r.terminals) {
    if (t.connector || t.air) continue;
    const isGround = t.role === 'ground' || (t.role === 'supply' && t.supply?.conductor === 'PE');
    if (!roles.has(t.role) && !isGround) continue;
    if (t.role === 'supply' && (t.supply?.kind ?? 'power') !== 'power') continue;
    const k = key(device, t.id);
    // 受ける側は、まだ電線のない端子だけ
    if (side === 'in' && (m.wiresAt.get(k) ?? []).length) continue;
    let slot: Slot | undefined;
    if (isGround) slot = 'PE';
    else if (t.role === 'supply' && t.supply) slot = fromConductor(t.supply.conductor);
    else if (side === 'out') {
      const p = m.potentialOf(k);
      if (p.kind === 'ok') slot = fromConductor(p.supply.conductor);
    } else {
      // 受電の条件が DC の片側の極だけなら、その極
      const cs = [...new Set(m.terminals.get(k)?.accepts.flatMap((a) => (a.system === 'DC' ? (a.conductors ?? []) : ['AC'])) ?? [])];
      if (cs.length === 1 && (cs[0] === '+' || cs[0] === '-')) slot = cs[0];
    }
    slot ??= slotFromName(t);
    out.push({ ref: { device, terminal: t.id }, terminal: t, slot, order: t.x * 1000 + t.y });
  }
  return out.sort((a, b) => a.order - b.order);
}

/** 受ける側の端子が置かれている機器の分類から、交流の回路の種類（主回路・操作回路）を決める */
const CONTROL_CATEGORIES = new Set(['contactor', 'control', 'plc', 'sensor', 'safety', 'power-supply']);

function circuitOf(slot: Slot, target: DeviceDefinition | undefined): CircuitKind {
  if (slot === 'PE') return 'ground';
  if (slot === '+' || slot === '-') return 'dc-control';
  return target && CONTROL_CATEGORIES.has(target.category) ? 'ac-control' : 'ac-main';
}

function plan(m: Model, source: string, target: string, protection: Map<string, number>): BulkProposal[] {
  const outs = ends(m, source, 'out');
  const ins = ends(m, target, 'in');
  const proposals: BulkProposal[] = [];
  const usedIn = new Set<End>();
  const usedOut = new Set<End>();
  const targetDef = m.devices.get(target)?.def;
  const wireNoOf = (e: End) => (m.wiresAt.get(key(e.ref.device, e.ref.terminal)) ?? []).find((w) => w.wireNo)?.wireNo;
  const push = (o: End, i: End, slot: Slot, reason: string) => {
    usedIn.add(i);
    usedOut.add(o);
    const wireNo = wireNoOf(o);
    const prot = protection.get(key(o.ref.device, o.ref.terminal));
    proposals.push({
      from: o.ref,
      to: i.ref,
      reason,
      circuit: circuitOf(slot, targetDef),
      ...(wireNo ? { wireNo } : {}),
      ...(prot !== undefined && Number.isFinite(prot) ? { protection: prot } : {}),
    });
  };

  const wireCount = (e: End) => (m.wiresAt.get(key(e.ref.device, e.ref.terminal)) ?? []).length;
  // 1. 同じ鍵どうし（出す側のまだ使っていない端子、電線の少ない端子を先に使う）
  for (const i of ins) {
    if (!i.slot) continue;
    const same = outs.filter((o) => o.slot === i.slot).sort((x, y) => wireCount(x) - wireCount(y));
    const o = same.find((x) => !usedOut.has(x)) ?? (i.slot === 'PE' || i.slot === '+' || i.slot === '-' ? same[0] : undefined);
    if (o) push(o, i, i.slot, SLOT_NAME[i.slot]);
  }
  // 2. 相と L・N が合わないときは、残った交流の端子を並び順で合わせる（数が同じとき）
  const restOut = outs.filter((o) => !usedOut.has(o) && o.slot && PHASE_ORDER.includes(o.slot));
  const restIn = ins.filter((i) => !usedIn.has(i) && i.slot && PHASE_ORDER.includes(i.slot));
  if (restOut.length && restOut.length === restIn.length) {
    const byPhase = (a: End, b: End) => PHASE_ORDER.indexOf(a.slot!) - PHASE_ORDER.indexOf(b.slot!) || a.order - b.order;
    restOut.sort(byPhase);
    restIn.sort(byPhase);
    restIn.forEach((i, n) => push(restOut[n], i, i.slot!, `${SLOT_NAME[restOut[n].slot!]} → ${i.terminal.label ?? i.terminal.id}`));
  }
  // 2b. 受ける側が端子台（上下の端子が導通する組）なら、残った交流の端子を、空いている組の片側へ並び順で
  const left = outs.filter((o) => !usedOut.has(o) && o.slot && PHASE_ORDER.includes(o.slot));
  if (left.length) {
    const free = new Map(ins.filter((i) => !usedIn.has(i) && !i.slot && i.terminal.role === 'pass').map((i) => [i.ref.terminal, i]));
    const pairs = (m.devices.get(target)?.r.links ?? [])
      .filter((l) => !l.switch && free.has(l.from) && free.has(l.to))
      .map((l) => free.get(l.from)!)
      .sort((x, y) => x.order - y.order);
    if (pairs.length >= left.length) {
      left.sort((x, y) => PHASE_ORDER.indexOf(x.slot!) - PHASE_ORDER.indexOf(y.slot!) || x.order - y.order);
      left.forEach((o, n) => push(o, pairs[n], o.slot!, `${SLOT_NAME[o.slot!]} → 端子台 ${pairs[n].terminal.label ?? pairs[n].terminal.id}`));
    }
  }
  // 3. コネクタどうし（ケーブル）
  const conns = (device: string) =>
    (m.devices.get(device)?.r.terminals ?? []).filter((t) => t.connector && !(m.wiresAt.get(key(device, t.id)) ?? []).length);
  const used = new Set<string>();
  for (const a of conns(source)) {
    const b = conns(target).find((t) => !used.has(t.id) && connectorsMate(a.connector!, t.connector!));
    if (!b) continue;
    used.add(b.id);
    proposals.push({ from: { device: source, terminal: a.id }, to: { device: target, terminal: b.id }, reason: 'ケーブル', cable: true });
  }
  return proposals;
}

/** a と b のあいだの接続案。組がたくさんできる向きを選ぶ（同じなら a から b へ。fixed なら a から b へ決める） */
export function proposeConnections(d: Diagram, a: string, b: string, lookup: DefLookup, fixed = false): BulkPlan {
  const m = buildModel(d, lookup, () => {});
  const protection = computeProtection(m);
  const ab = plan(m, a, b, protection);
  if (fixed) return { source: a, target: b, proposals: ab };
  const ba = plan(m, b, a, protection);
  return ba.length > ab.length ? { source: b, target: a, proposals: ba } : { source: a, target: b, proposals: ab };
}

/**
 * 接続案の電線の色・種類・太さ。色は回路に合わせ、太さは上流の保護電流を許容電流が下回らない細さにする
 * （新しく引く電線の太さより細くはしない）
 */
export function proposalWire(p: BulkProposal, base: WireAttrs): WireAttrs {
  if (p.cable) return { color: 'black', sizeSq: 0, wireType: CABLE_WIRE_TYPE };
  const attrs = wireFor(p.circuit ?? 'ac-main', base);
  if (p.protection === undefined) return attrs;
  const sizes = WIRE_TYPES.find((t) => t.id === attrs.wireType)?.sizes ?? [];
  const fit = sizes.find((sq) => sq >= attrs.sizeSq && (allowableCurrent(attrs.wireType, sq) ?? 0) >= p.protection!);
  return fit !== undefined ? { ...attrs, sizeSq: fit } : attrs;
}

/** 選んだ接続案の電線を足す（base は新しく引く電線の色・種類・太さ） */
export function applyProposals(d: Diagram, proposals: BulkProposal[], base: WireAttrs): Diagram {
  const wires: DiagramWire[] = [...d.wires];
  for (const p of proposals) {
    const attrs = proposalWire(p, base);
    wires.push({ id: nextWireId(wires.map((w) => w.id)), from: p.from, to: p.to, ...attrs, ...(p.wireNo ? { wireNo: p.wireNo } : {}) });
  }
  return { ...d, wires };
}
