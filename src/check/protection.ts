/**
 * 保護機器（遮断器・サーキットプロテクタ・ヒューズ）と、その下流の負荷の電流。
 * - computeProtection: 各端子の保護電流（電線の太さ・負荷との整合のチェックに使う）
 * - protectors: 遮断器ごとに、極（負荷側の端子）から下流へたどって受電端子のある機器と電流を集める
 * - currentProfile: 運転の工程（settings.operation）ごとの電流の合計と、動き始める機器の始動電流の山（概算）
 * - checkBreakerCapacity: 工程ごとの電流の合計を遮断器の定格と比べる（breaker-capacity）
 */
import type { Diagram, OperationStep } from '../model/diagram';
import { resolveNum } from '../devices/types';
import { buildModel, key, loadCurrentOf, type DefLookup, type Model, type Push } from './model';

/**
 * 電源から links の向きに沿ってたどり、各端子の保護電流[A]を求める（接点・出力は閉とみなす）。
 * 保護機器を通っていない端子は Infinity。複数経路がある場合は大きい方（安全側）を採用する。
 */
export function computeProtection(m: Model): Map<string, number> {
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

/** 遮断器の下流の負荷（極ごと） */
export interface Protector {
  id: string;
  rating: number;
  /** 極（負荷側の端子）ごとの、受電する機器と電流[A] */
  poles: { terminal: string; loads: { device: string; current: number }[] }[];
  /** どれかの極から受電する機器（図面の順） */
  devices: string[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * 遮断器（category: 'breaker' で protects の経路を持つ機器）ごとに、下流の負荷を集める。
 * 極の負荷側の端子から、電線・ケーブル・リンク・機器の中の経路（向きのある経路は向きのとおり）をたどり、
 * 着いた受電端子（role: 'input'）の機器の消費電流を数える。遮断器自身の経路は通らない。下流の遮断器の先も数える
 */
export function protectors(m: Model, protection: Map<string, number>): Protector[] {
  type Edge = { to: string; owner?: string };
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
  for (const { device, r } of m.devices.values()) {
    for (const l of r.links) {
      const a = key(device.id, l.from);
      const b = key(device.id, l.to);
      add(a, { to: b, owner: device.id });
      if (!l.directed) add(b, { to: a, owner: device.id });
    }
  }

  const bondedAt = (k: string) => {
    const p = m.potentialOf(k);
    return p.kind === 'ok' && !!p.bonded;
  };
  const out: Protector[] = [];
  const order = [...m.devices.keys()];
  for (const { device, def, r } of m.devices.values()) {
    if (def.category !== 'breaker') continue;
    const rating = resolveNum(def.protectionCurrent, def, device.params);
    if (rating === undefined) continue;
    const poles: Protector['poles'] = [];
    for (const l of r.links.filter((x) => x.protects)) {
      // 負荷側: 向きのある経路は to、ない経路は保護電流の小さい（電源から遠い）側
      const pf = protection.get(key(device.id, l.from)) ?? Infinity;
      const pt = protection.get(key(device.id, l.to)) ?? Infinity;
      const side = l.directed || pt <= pf ? l.to : l.from;
      const start = key(device.id, side);
      const seen = new Set([start]);
      const queue = [start];
      const main = new Set<string>();
      const own = new Map<string, number>();
      while (queue.length) {
        const k = queue.shift()!;
        const info = m.terminals.get(k);
        if (info && info.device.id !== device.id && info.terminal.role === 'input') {
          const t = info.terminal.loadCurrent;
          if (t !== undefined) own.set(info.device.id, Math.max(own.get(info.device.id) ?? 0, t));
          else main.add(info.device.id);
        }
        for (const e of adj.get(k) ?? []) {
          if (e.owner === device.id || seen.has(e.to)) continue;
          // 片側接地した導体（接地を通してほかの電源の回路ともつながる）には進まない（その極の負荷は電圧側の極で数える）
          if (bondedAt(e.to)) continue;
          seen.add(e.to);
          queue.push(e.to);
        }
      }
      const loads = [...new Set([...main, ...own.keys()])]
        .map((id) => ({ device: id, current: round((main.has(id) ? (loadCurrentOf(m, m.devices.get(id)!) ?? 0) : 0) + (own.get(id) ?? 0)) }))
        .filter((x) => x.current > 0)
        .sort((a, b) => order.indexOf(a.device) - order.indexOf(b.device));
      poles.push({ terminal: side, loads });
    }
    const devices = [...new Set(poles.flatMap((p) => p.loads.map((x) => x.device)))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (devices.length) out.push({ id: device.id, rating, poles, devices });
  }
  return out;
}

/** 工程ごとの電流 */
export interface CurrentStep {
  name: string;
  /** 工程の始まり[s] */
  start: number;
  seconds: number;
  /** 動いている機器の電流の合計（いちばん大きい極）[A] */
  current: number;
  /** 工程の始めに動き始める機器の始動電流を加えた山（いちばん大きい極）[A]。動き始める機器がなければ current と同じ */
  peak: number;
  /** 山の続く時間[s]（動き始める機器のうちいちばん長いもの） */
  peakSeconds: number;
  /** いちばん大きい極で動いている機器と電流 */
  loads: { device: string; current: number }[];
  /** この工程の始めに動き始める機器（始動電流のあるもの） */
  starting: string[];
}

/** 工程を書いていないときの、すべての機器を同時に使う 1 つの工程 */
export const ALL_ON: OperationStep = { name: 'すべて同時', seconds: 10 };

/**
 * 遮断器の工程ごとの電流。動き始め（前の工程で止まっていて、この工程で動く。最初の工程は動いている機器すべて）の機器は、
 * 始動電流（inrush）の山を加える
 */
export function currentProfile(p: Protector, steps: OperationStep[] | undefined, inrush: (device: string) => { ratio: number; seconds: number } | undefined): CurrentStep[] {
  const list = steps?.length ? steps : [ALL_ON];
  let start = 0;
  return list.map((step, i) => {
    const on = (s: OperationStep | undefined, d: string) => !!s && !s.off?.includes(d);
    const starting = p.devices.filter((d) => on(step, d) && (i === 0 || !on(list[i - 1], d)) && inrush(d));
    let current = 0;
    let peak = 0;
    let loads: CurrentStep['loads'] = [];
    for (const pole of p.poles) {
      const running = pole.loads.filter((x) => on(step, x.device));
      const c = running.reduce((s, x) => s + x.current, 0);
      const extra = running.filter((x) => starting.includes(x.device)).reduce((s, x) => s + x.current * (inrush(x.device)!.ratio - 1), 0);
      if (c > current || (c === current && running.length > loads.length)) {
        current = c;
        loads = running;
      }
      peak = Math.max(peak, c + extra);
    }
    const peakSeconds = Math.max(0, ...starting.map((d) => inrush(d)!.seconds));
    const out: CurrentStep = { name: step.name, start, seconds: step.seconds, current: round(current), peak: round(peak), peakSeconds, loads, starting };
    start += step.seconds;
    return out;
  });
}

/** 余裕が少ないとみなす割合（定格のこの割合を超えたら知らせる） */
export const MARGIN_RATIO = 0.8;

/** 遮断器ごとの、工程ごとの電流と定格 */
export interface CurrentMargin {
  protector: Protector;
  steps: CurrentStep[];
  /** 工程を書いたか（書いていなければ、すべての機器を同時に使うとみなした） */
  assumed: boolean;
}

export function currentMargins(m: Model, protection: Map<string, number>): CurrentMargin[] {
  const steps = m.diagram.settings?.operation;
  const inrush = (id: string) => m.devices.get(id)?.def.inrush;
  return protectors(m, protection).map((p) => ({ protector: p, steps: currentProfile(p, steps, inrush), assumed: !steps?.length }));
}

/** 図面から遮断器ごとの電流を求める（「電流の余裕」の画面用） */
export function diagramCurrentMargins(diagram: Diagram, lookup: DefLookup): CurrentMargin[] {
  const m = buildModel(diagram, lookup, () => {});
  return currentMargins(m, computeProtection(m));
}

/**
 * 遮断器の定格と、工程ごとの電流の合計を比べる（breaker-capacity）。
 * 工程を書いていなければ、下流の負荷をすべて同時に使うとみなし、超えるときだけ知らせる（info）。
 * 工程を書いたときは、超えれば警告、定格の 80% を超えれば余裕が少ないと知らせる
 */
export function checkBreakerCapacity(m: Model, push: Push, protection: Map<string, number>) {
  for (const { protector: p, steps, assumed } of currentMargins(m, protection)) {
    const worst = steps.reduce((a, b) => (b.current > a.current ? b : a));
    const names = worst.loads.map((x) => `${x.device} ${x.current}A`).join('、');
    const base = { rule: 'breaker-capacity', devices: [p.id, ...worst.loads.map((x) => x.device)], wires: [], key: `breaker-capacity:${p.id}` };
    if (worst.current > p.rating) {
      push(
        assumed
          ? { ...base, severity: 'info', message: `${p.id}: 下流の負荷をすべて同時に使うと、電流の合計 ${worst.current}A が定格 ${p.rating}A を超えます（${names}）。同時に使う機器は「電流の余裕」で工程として設定できます` }
          : { ...base, severity: 'warning', message: `${p.id}: 工程「${worst.name}」で電流の合計 ${worst.current}A が定格 ${p.rating}A を超えています（${names}）` },
      );
    } else if (!assumed && worst.current > p.rating * MARGIN_RATIO) {
      push({ ...base, severity: 'info', message: `${p.id}: 工程「${worst.name}」で電流の合計 ${worst.current}A が定格 ${p.rating}A の ${Math.round((worst.current / p.rating) * 100)}% です（余裕が 20% 未満）` });
    }
  }
}
