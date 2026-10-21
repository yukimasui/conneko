/**
 * PLC の入出力（I/O）の一覧と、I/O と現場の機器の接続。
 *
 * - I/O 点: PLC（category: 'plc'）の機器の、信号入力の端子・ピン（signal.dir === 'in'）と出力（switch: 'output' の経路の from）
 * - 接続先: I/O 点から電線・ケーブル・変換端子台・リンクでつながった先にある、PLC と端子台・リンク以外の機器の端子
 * - 電線をつなぐ端子: I/O 点そのものがネジ端子ならそこ、MIL コネクタのピンなら変換端子台のネジ端子
 */
import { buildModel, key } from '../check/model';
import { functionsOf, resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, SignalKind } from '../devices/types';
import { CABLE_WIRE_TYPE, nextDeviceId, nextWireId, sheetOf, type Diagram, type DiagramDevice, type TerminalRef } from './diagram';
import { connectTerminals, LINK_TYPE, mountFamily, type WireAttrs } from './ops';

type DefLookup = (type: string) => DeviceDefinition | undefined;

export interface IoConnection {
  ref: TerminalRef;
  /** 表示名（機器名.端子ID） */
  name: string;
  /** 端子の印字（端子IDと違う場合） */
  label?: string;
  sheet: string;
}

export interface IoPoint {
  device: string;
  /** 端子IDまたはピンID */
  terminal: string;
  dir: 'in' | 'out';
  /** 入出力番号（ラベルの先頭。例: 'R000'、'X20'） */
  address: string;
  label: string;
  kind?: SignalKind;
  comment: string;
  /** 電線をつなぐ端子（なければ変換端子台が必要） */
  endpoint?: TerminalRef;
  connections: IoConnection[];
  /** 経由する端子台・リンク（表示用） */
  via: string[];
}

export interface IoUnit {
  device: DiagramDevice;
  def: DeviceDefinition;
  points: IoPoint[];
  /** I/O 点のあるコネクタで、ケーブルがつながっていないもの（変換端子台を追加できる） */
  bareConnectors: string[];
}

export interface IoSystem {
  host: DiagramDevice;
  units: IoUnit[];
}

const noop = () => {};

/** 機器が I/O を持つ PLC か */
export function hasIo(def: DeviceDefinition | undefined, params?: Record<string, number | string>): boolean {
  if (!def || def.category !== 'plc') return false;
  const r = resolveDevice(def, params);
  return [...r.terminals, ...r.pins].some((t) => t.signal?.dir === 'in') || r.links.some((l) => l.switch === 'output');
}

/** 指定した機器を含む PLC（親と装着したユニット）の I/O 一覧 */
export function ioSystem(d: Diagram, id: string, lookup: DefLookup): IoSystem | undefined {
  const family = mountFamily(d, id);
  const host = d.devices.find((x) => x.id === family[0]);
  if (!host) return undefined;
  const members = d.devices.filter((x) => x.mount?.device === host.id).sort((a, b) => a.mount!.slot - b.mount!.slot);
  const m = buildModel(d, lookup, noop);
  const units: IoUnit[] = [];
  for (const dev of [host, ...members]) {
    const info = m.devices.get(dev.id);
    if (!info || !hasIo(info.def, info.device.params)) continue;
    const { r } = info;
    const outputs = new Set(r.links.filter((l) => l.switch === 'output').map((l) => l.from));
    const points: IoPoint[] = [];
    for (const t of [...r.terminals, ...r.pins]) {
      const dir = t.signal?.dir === 'in' ? 'in' : outputs.has(t.id) ? 'out' : undefined;
      if (!dir || functionsOf(t).length) continue;
      const label = t.label ?? t.id;
      const k = key(dev.id, t.id);
      const net = m.fixedMembers.get(m.fixed.find(k)) ?? [k];
      const family = new Set([host.id, ...members.map((x) => x.id)]);
      const connections: IoConnection[] = [];
      const via = new Set<string>();
      let endpoint: TerminalRef | undefined = t.id.includes('#') ? undefined : { device: dev.id, terminal: t.id };
      for (const x of net) {
        const ti = m.terminals.get(x)!;
        const cat = ti.def.category;
        if (family.has(ti.device.id)) continue;
        if (cat === 'terminal' || cat === 'link') {
          if (!x.split(':')[1].includes('#')) {
            via.add(cat === 'link' ? `リンク ${String(ti.device.params?.name ?? '')}` : `${ti.device.id}.${ti.terminal.label ?? ti.terminal.id}`);
            if (!endpoint && cat === 'terminal') endpoint = { device: ti.device.id, terminal: ti.terminal.id };
          }
          continue;
        }
        connections.push({
          ref: { device: ti.device.id, terminal: ti.terminal.id },
          name: `${ti.device.id}.${ti.terminal.id}`,
          ...(ti.terminal.label && ti.terminal.label !== ti.terminal.id ? { label: ti.terminal.label } : {}),
          sheet: sheetOf(d, ti.device),
        });
      }
      points.push({
        device: dev.id,
        terminal: t.id,
        dir,
        address: label.split(/[\s(（]/)[0] || label,
        label,
        ...(t.signal ? { kind: t.signal.kind } : {}),
        comment: dev.comments?.[t.id] ?? '',
        ...(endpoint ? { endpoint } : {}),
        connections,
        via: [...via],
      });
    }
    // ケーブルをつないでいない、I/O 点のあるコネクタ
    const cabled = new Set(d.wires.filter((w) => w.wireType === CABLE_WIRE_TYPE).flatMap((w) => [w.from, w.to]).filter((x) => x.device === dev.id).map((x) => x.terminal));
    const bareConnectors = r.terminals
      .filter((t) => t.connector && t.connector.pins > 0 && !cabled.has(t.id) && points.some((p) => p.terminal.startsWith(`${t.id}#`)))
      .map((t) => t.id);
    units.push({ device: dev, def: info.def, points, bareConnectors });
  }
  return { host, units };
}

/** 図面にある PLC（I/O を持つ機器の親）の一覧 */
export function ioHosts(d: Diagram, lookup: DefLookup): string[] {
  const hosts = new Set<string>();
  for (const dev of d.devices) {
    if (hasIo(lookup(dev.type), dev.params)) hosts.add(mountFamily(d, dev.id)[0]);
  }
  return [...hosts];
}

/** I/O 点のコメントを変える（空なら消す） */
export function setComment(d: Diagram, device: string, terminal: string, text: string): Diagram {
  return {
    ...d,
    devices: d.devices.map((x) => {
      if (x.id !== device) return x;
      const comments = { ...x.comments };
      if (text.trim()) comments[terminal] = text;
      else delete comments[terminal];
      const { comments: _, ...rest } = x;
      return Object.keys(comments).length ? { ...rest, comments } : rest;
    }),
  };
}

/**
 * I/O 点を現場の機器の端子につなぐ。電線の線番は入出力番号にする。
 * 別のシートの機器なら、入出力番号を名前にしたリンクを両方のシートに置いてつなぐ。
 * 現場の機器の名前をコメントにする（コメントが空のとき）。
 */
export function connectIo(d: Diagram, point: IoPoint, target: TerminalRef, attrs: Omit<WireAttrs, 'wireNo'>, lookup: DefLookup): Diagram {
  if (!point.endpoint) return d;
  let out = connectTerminals(d, point.endpoint, target, { ...attrs, wireNo: point.address }, lookup, point.address);
  if (!point.comment) {
    const dev = d.devices.find((x) => x.id === target.device);
    const def = dev && lookup(dev.type);
    if (def) out = setComment(out, point.device, point.terminal, `${target.device} ${def.name}`);
  }
  return out;
}

/** I/O 点と現場の機器の端子の接続を外す（間にあるリンクも、使われなくなれば消す） */
export function disconnectIo(d: Diagram, point: IoPoint, target: TerminalRef, lookup: DefLookup): Diagram {
  if (!point.endpoint) return d;
  const m = buildModel(d, lookup, noop);
  const root = m.fixed.find(key(point.endpoint.device, point.endpoint.terminal));
  const at = (r: TerminalRef, t: TerminalRef) => r.device === t.device && r.terminal === t.terminal;
  const inNet = (r: TerminalRef) => m.fixed.find(key(r.device, r.terminal)) === root;
  // 現場の機器の端子につながる、この I/O のネットの電線を消す
  let wires = d.wires.filter((w) => !((at(w.from, target) && inNet(w.to)) || (at(w.to, target) && inNet(w.from))));
  let devices = d.devices;
  // 電線のなくなったリンクを消し、相手がいなくなったリンク（I/O 側に残ったもの）も消す
  for (let changed = true; changed; ) {
    changed = false;
    const wired = new Set(wires.flatMap((w) => [w.from.device, w.to.device]));
    const links = devices.filter((x) => x.type === LINK_TYPE);
    const byName = new Map<string, DiagramDevice[]>();
    for (const l of links) {
      const n = String(l.params?.name ?? '');
      byName.set(n, [...(byName.get(n) ?? []), l]);
    }
    const remove = new Set<string>();
    for (const l of links) {
      const alone = (byName.get(String(l.params?.name ?? '')) ?? []).length === 1;
      if (!wired.has(l.id) || (alone && wires.some((w) => (w.from.device === l.id && inNet(w.to)) || (w.to.device === l.id && inNet(w.from))))) remove.add(l.id);
    }
    if (remove.size) {
      changed = true;
      devices = devices.filter((x) => !remove.has(x.id));
      wires = wires.filter((w) => !remove.has(w.from.device) && !remove.has(w.to.device));
    }
  }
  return { ...d, devices, wires };
}

/**
 * ユニットのコネクタに、合う変換端子台をケーブルでつないで置く（ユニットの下に配置）。
 */
export function addTerminalBlock(d: Diagram, unitId: string, connectorId: string, defs: DeviceDefinition[], lookup: DefLookup): Diagram {
  const unit = d.devices.find((x) => x.id === unitId);
  const def = unit && lookup(unit.type);
  const conn = def && resolveDevice(def, unit.params).terminal(connectorId)?.connector;
  if (!unit || !def || !conn) return d;
  const tbDef = defs.find((x) => {
    if (x.category !== 'terminal') return false;
    const c = resolveDevice(x).terminals.find((t) => t.connector)?.connector;
    return !!c && (c.kind === conn.kind || !!conn.mates?.includes(c.kind) || !!c.mates?.includes(conn.kind));
  });
  if (!tbDef) return d;
  const tbConn = resolveDevice(tbDef).terminals.find((t) => t.connector)!;
  const id = nextDeviceId(tbDef.labelPrefix, d.devices.map((x) => x.id));
  // 同じユニットに置いた端子台と重ならないよう、横にずらす
  const others = d.devices.filter((x) => x.type === tbDef.type && sheetOf(d, x) === sheetOf(d, unit) && Math.abs(x.y - (unit.y + def.height + 180)) < 10).length;
  const tb: DiagramDevice = {
    id,
    type: tbDef.type,
    x: Math.round(unit.x + (def.width - tbDef.width) / 2 + others * (tbDef.width + 30)),
    y: Math.round(unit.y + def.height + 180),
    ...(unit.sheet ? { sheet: unit.sheet } : {}),
  };
  const cable = {
    id: nextWireId(d.wires.map((w) => w.id)),
    from: { device: unit.id, terminal: connectorId },
    to: { device: id, terminal: tbConn.id },
    color: 'black',
    sizeSq: 0,
    wireType: CABLE_WIRE_TYPE,
    wireNo: `CBL-${unit.id}`,
  };
  return { ...d, devices: [...d.devices, tb], wires: [...d.wires, cable] };
}
