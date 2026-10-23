/**
 * 端子から電線を引いて何もないところで離したときに出す「接続先の候補」。
 *
 * - 電源: 端子の受電条件に合う電源（リンクの名前、または電源ユニットの出力・ブレーカーの二次側）
 * - PLC の入出力: センサーの出力・接点からは空いている入力、負荷（DC で受電する端子）からは空いている出力
 *
 * 候補を選ぶと、離した位置にリンクを置いてつなぐ（電源側にリンクがなければ、電源の近くにも同じ名前のリンクを置く）。
 */
import { buildModel, key, supplyLabel, type Model } from '../check/model';
import { CIRCUIT_COLOR_RULES, type CircuitKind } from '../data/wires';
import { isLanPort, resolveDevice } from '../devices/resolve';
import { resolveNum, type Conductor, type DeviceDefinition, type PowerSystem } from '../devices/types';
import type { Diagram, TerminalRef } from './diagram';
import { compareAddress, connectIo, ioHosts, ioSystem, type IoPoint } from './io';
import { LINK_TYPE, linkNames, linkTerminal, NET_LINK_TYPE, placeLinkAt, uniqueLinkName, type WireAttrs } from './ops';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface PowerCandidate {
  kind: 'power';
  /** リンクの名前（既存のリンクの名前、なければ線番などから作った名前） */
  name: string;
  /** 電位の説明（例: 'DC24V +（PSU1）'） */
  detail: string;
  /** 電源側でリンクをつなぐ端子（電源側にまだリンクがない場合） */
  attach?: TerminalRef;
  /** 電線の色の目安 */
  circuit: CircuitKind;
}

export interface IoCandidate {
  kind: 'io';
  point: IoPoint;
  /** PLC の親の機器ID */
  host: string;
}

export interface Suggestions {
  power: PowerCandidate[];
  io: IoCandidate[];
  /** LAN ポートから引いた場合: 図面にあるネットワークリンクの名前（選ぶとネットワークリンクを置いてつなぐ） */
  networks?: string[];
  /** 新しく置くリンクの名前の案（使われていない名前） */
  defaultName: string;
}

const DEFAULT_CONDUCTORS: Record<PowerSystem, Conductor[]> = { AC: ['R', 'S', 'T', 'L', 'N'], DC: ['+', '-'] };

/** 電位にふさわしい回路の種類（電線の色を決める） */
function circuitOf(system: PowerSystem, conductor: Conductor, control: boolean): CircuitKind {
  if (conductor === 'PE') return 'ground';
  if (system === 'DC') return 'dc-control';
  return control ? 'ac-control' : 'ac-main';
}

/** 回路の種類に合う電線（色は慣例の 1 番目、太さは制御回路なら細め） */
export function wireFor(circuit: CircuitKind, base: WireAttrs): WireAttrs {
  const color = CIRCUIT_COLOR_RULES.find((r) => r.circuit === circuit)?.colors[0] ?? base.color;
  const sizeSq = circuit === 'dc-control' ? 0.75 : circuit === 'ac-control' ? 1.25 : base.sizeSq;
  return { ...base, color, sizeSq };
}

/** 電線でつながった範囲（ネット）の名前: リンクの名前、なければいちばん多い線番 */
function netName(m: Model, root: string, at?: TerminalRef): { link?: string; wireNo?: string } {
  let link: string | undefined;
  const counts = new Map<string, number>();
  for (const k of m.fixedMembers.get(root) ?? []) {
    const info = m.terminals.get(k)!;
    if (info.device.type === LINK_TYPE) link ??= String(info.device.params?.name ?? '').trim() || undefined;
    for (const w of m.wiresAt.get(k) ?? []) if (w.wireNo) counts.set(w.wireNo, (counts.get(w.wireNo) ?? 0) + 1);
  }
  // 電源側のつなぎ先の端子の線番を優先する（同じネットでもブレーカーの前後で線番が変わるため）
  const atNo = at && (m.wiresAt.get(key(at.device, at.terminal)) ?? []).find((w) => w.wireNo)?.wireNo;
  const wireNo = atNo ?? [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { ...(link ? { link } : {}), ...(wireNo ? { wireNo } : {}) };
}

export function suggestConnections(d: Diagram, from: TerminalRef, lookup: DefLookup): Suggestions {
  const m = buildModel(d, lookup, () => {});
  const k = key(from.device, from.terminal);
  const info = m.terminals.get(k);
  if (!info) return { power: [], io: [], defaultName: uniqueLinkName(d, '') };
  const t = info.terminal;
  if (t.connector) {
    // LAN ポート（ピンのない RJ-45、RJ-45 とつなぐ通信コネクタ）ならネットワークの候補、ほかのコネクタは候補なし
    const lan = isLanPort(t.connector);
    // 名前の案: EtherCAT のポートなら ECAT1, ECAT2 …、ほかは LAN1, LAN2 …
    const prefix = t.connector.protocols?.length === 1 && t.connector.protocols[0] === 'ethercat' ? 'ECAT' : 'LAN';
    const used = linkNames(d, NET_LINK_TYPE);
    let n = 1;
    while (used.has(`${prefix}${n}`)) n++;
    return {
      power: [],
      io: [],
      defaultName: `${prefix}${n}`,
      ...(lan ? { networks: [...used].sort((a, b) => a.localeCompare(b, 'ja', { numeric: true })) } : {}),
    };
  }
  // 電線のリンクの名前の案: 端子にもう線番があればそれ（使われていれば番号を付ける）、なければ L1, L2 …
  const wireNo = (m.wiresAt.get(k) ?? []).find((w) => w.wireNo)?.wireNo;
  const defaultName = uniqueLinkName(d, wireNo ?? '');
  const ownRoot = m.fixed.find(k);

  // --- 電源 ---
  const power: PowerCandidate[] = [];
  const wantsPower = t.role === 'input' || t.role === 'ground' || t.role === 'line' || t.role === 'pass';
  if (wantsPower) {
    const fits = (system: PowerSystem, voltage: number, conductor: Conductor) => {
      if (t.role === 'ground') return conductor === 'PE';
      if (conductor === 'PE') return false;
      if (t.role !== 'input') return true;
      return info.accepts.some(
        (a) => a.system === system && voltage >= a.minVoltage && voltage <= a.maxVoltage && (a.conductors ?? DEFAULT_CONDUCTORS[a.system]).includes(conductor),
      );
    };
    const control = t.role === 'input' && ['contactor', 'control', 'plc', 'sensor', 'safety'].includes(info.def.category);
    // つなぎ先の候補の端子: 電源出力、保護機器の二次側（保護電流の小さいものを優先）、リンク
    const roots = new Map<string, { attach?: TerminalRef; rank: number }>();
    for (const [mk, mi] of m.terminals) {
      if (mk.includes('#')) continue;
      const root = m.fixed.find(mk);
      if (root === ownRoot) continue;
      const def = mi.def;
      let rank = -1;
      if (mi.device.type === LINK_TYPE) rank = 0;
      else if (mi.terminal.role === 'load' && def.protectionCurrent !== undefined) rank = 1000 - (resolveNum(def.protectionCurrent, def, mi.device.params) ?? 0);
      else if (mi.terminal.role === 'supply' && (mi.terminal.supply?.kind ?? 'power') === 'power') rank = 1;
      if (rank < 0) continue;
      const cur = roots.get(root);
      const attach = mi.device.type === LINK_TYPE ? undefined : { device: mi.device.id, terminal: mi.terminal.id };
      if (!cur || rank > cur.rank) roots.set(root, { ...(attach ? { attach } : {}), rank });
    }
    const usedNames = new Set<string>();
    for (const [root, c] of roots) {
      const p = m.potentialOf((m.fixedMembers.get(root) ?? [])[0]);
      if (p.kind !== 'ok' || !fits(p.supply.system, p.supply.voltage, p.supply.conductor)) continue;
      const names = netName(m, root, c.attach);
      const name = names.link ?? names.wireNo ?? (p.supply.conductor === 'PE' ? 'E' : `${p.supply.system}${p.supply.voltage}${p.supply.conductor}`);
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      power.push({
        kind: 'power',
        name,
        detail: `${supplyLabel(p.supply)}（${c.attach ? `${c.attach.device}.${c.attach.terminal}` : 'リンク'}）`,
        ...(names.link ? {} : c.attach ? { attach: c.attach } : {}),
        circuit: circuitOf(p.supply.system, p.supply.conductor, control),
      });
    }
    power.sort((a, b) => Number(!linkNames(d).has(a.name)) - Number(!linkNames(d).has(b.name)) || a.name.localeCompare(b.name, 'ja', { numeric: true }));
  }

  // --- PLC の入出力 ---
  const io: IoCandidate[] = [];
  const r = resolveDevice(info.def, info.device.params);
  const isContact = r.links.some((l) => (l.switch === 'NO' || l.switch === 'NC') && (l.from === t.id || l.to === t.id));
  const wantsInput = t.role === 'signal' && (t.signal?.dir === 'out' || isContact);
  // 出力の候補は負荷（センサーなどの電源線は除く）で、出力の形式に合う極の端子だけ（NPN は 0V 側、PNP は +V 側）
  const conductors = info.accepts.filter((a) => a.system === 'DC').flatMap((a) => a.conductors ?? ['+', '-']);
  const wantsOutput = t.role === 'input' && conductors.length > 0 && info.def.category !== 'sensor';
  const outputFits = (p: IoPoint) => (p.kind === 'npn' ? conductors.includes('-') : p.kind === 'pnp' ? conductors.includes('+') : true);
  if ((wantsInput || wantsOutput) && info.def.category !== 'plc') {
    for (const host of ioHosts(d, lookup)) {
      for (const u of ioSystem(d, host, lookup)?.units ?? []) {
        for (const p of u.points) {
          if (!p.endpoint || p.connections.length) continue;
          if ((wantsInput && p.dir === 'in') || (wantsOutput && p.dir === 'out' && outputFits(p))) io.push({ kind: 'io', point: p, host });
        }
      }
    }
    io.sort((a, b) => compareAddress(a.point.address, b.point.address));
  }
  return { power, io, defaultName };
}

/** 電源の候補を選んだときの処理: 離した位置にリンクを置き、電源側にリンクがなければそちらにも置く */
export function applyPowerCandidate(d: Diagram, from: TerminalRef, c: PowerCandidate, at: { x: number; y: number }, base: WireAttrs, lookup: DefLookup): Diagram {
  const attrs = wireFor(c.circuit, base);
  const name = c.attach && linkNames(d).has(c.name) ? uniqueLinkName(d, c.name) : c.name;
  let out = placeLinkAt(d, from, name, at, { ...attrs, ...(c.name ? { wireNo: c.name } : {}) }, lookup);
  if (c.attach) out = linkTerminal(out, c.attach, name, { ...attrs, wireNo: c.name }, lookup);
  return out;
}

/** PLC の入出力の候補を選んだときの処理（I/O の接続と同じ） */
export function applyIoCandidate(d: Diagram, from: TerminalRef, c: IoCandidate, base: WireAttrs, lookup: DefLookup): Diagram {
  return connectIo(d, c.point, from, wireFor('dc-control', base), lookup);
}

/** ネットワークを選んだ（または新しい名前を入れた）ときの処理: 離した位置にネットワークリンクを置いてつなぐ */
export function applyNetwork(d: Diagram, from: TerminalRef, name: string, at: { x: number; y: number }, lookup: DefLookup): Diagram {
  return placeLinkAt(d, from, name, at, { color: 'black', sizeSq: 0, wireType: 'CABLE', wireNo: name }, lookup, NET_LINK_TYPE);
}
