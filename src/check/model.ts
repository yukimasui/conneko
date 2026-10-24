/**
 * 配線チェックの下ごしらえ: 機器・端子の解決、電線とケーブルの整理、同電位グループの計算。
 *
 * 同電位グループは 2 種類を持つ。
 * - fixed: 電線・ケーブル・常時導通の内部経路だけでつながった範囲（ネット）
 * - all: fixed に、開閉する経路（接点・出力）をすべて閉じたものを加えた範囲（動作中の電位）
 */
import { connectorsMate, resolveDevice, type ResolvedAccept, type ResolvedDevice } from '../devices/resolve';
import { resolveNum, type Conductor, type DeviceDefinition, type InternalLink, type PowerSystem, type TerminalDef } from '../devices/types';
import { computeBus, effectiveParams, type BusLayout } from '../model/bus';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';

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
  /** 推定の値を含む機器定義が関わる指摘 */
  estimated?: boolean;
}

export type IssueInput = Omit<CheckIssue, 'key'> & { key?: string };
export type Push = (issue: IssueInput) => void;
export type DefLookup = (type: string) => DeviceDefinition | undefined;

export const CONDUCTOR_NAMES: Record<Conductor, string> = {
  R: 'R相',
  S: 'S相',
  T: 'T相',
  L: 'L（電圧側）',
  N: 'N（中性線）',
  '+': '+（プラス）',
  '-': '-（マイナス）',
  PE: '接地(PE)',
};

export const key = (device: string, terminal: string) => `${device}:${terminal}`;

export class UnionFind {
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

export interface DeviceInfo {
  /** params は装着で決まる値を加えたもの */
  device: DiagramDevice;
  def: DeviceDefinition;
  r: ResolvedDevice;
}

export interface TerminalInfo {
  key: string;
  device: DiagramDevice;
  def: DeviceDefinition;
  terminal: TerminalDef;
  accepts: ResolvedAccept[];
}

export interface Supply {
  system: PowerSystem;
  voltage: number;
  conductor: Conductor;
  device: string;
  /** 電源出力の端子キー */
  terminal: string;
  kind: 'power' | 'ossd' | 'test';
}

/** グループの電源状態 */
export type Potential = { kind: 'none' } | { kind: 'ok'; supply: Supply } | { kind: 'conflict' };

/** 開閉する内部経路 */
export interface SwitchLink {
  device: string;
  link: InternalLink;
  a: string;
  b: string;
}

export interface Model {
  diagram: Diagram;
  devices: Map<string, DeviceInfo>;
  terminals: Map<string, TerminalInfo>;
  /** 端子どうしをつなぐ電線（ケーブル・エアのチューブを除く） */
  wires: DiagramWire[];
  /** エアのポートどうしをつなぐチューブ */
  tubes: DiagramWire[];
  /** ポートの端子キー → つないだチューブ */
  tubesAt: Map<string, DiagramWire[]>;
  /** ケーブルで導通するピンの組 */
  cablePairs: [string, string][];
  /** ケーブルでつないだコネクタの端子 */
  cabled: Set<string>;
  wiresAt: Map<string, DiagramWire[]>;
  /** 常時導通の内部経路（端子キーの組。リンクによる導通も含む） */
  fixedLinks: [string, string][];
  /** 同じ名前のリンクによる導通（端子キーの組） */
  labelLinks: [string, string][];
  switchLinks: SwitchLink[];
  fixed: UnionFind;
  all: UnionFind;
  /** fixed のグループ → 端子キー */
  fixedMembers: Map<string, string[]>;
  /** all のグループ → 端子キー */
  allMembers: Map<string, string[]>;
  /** 電源出力のある端子 */
  supplies: Map<string, Supply>;
  /** all の電位 */
  potentialOf(k: string): Potential;
  bus: BusLayout;
}

/** 通信方式の表示名（チェック結果に出す） */
const PROTOCOL_NAMES: Record<string, string> = {
  ethernet: 'Ethernet',
  'ethernet-ip': 'EtherNet/IP',
  ethercat: 'EtherCAT',
  profinet: 'PROFINET',
  'cc-link-ie-field': 'CC-Link IE Field',
  'cc-link-ie-field-basic': 'CC-Link IE Field Basic',
  'mechatrolink-iii': 'MECHATROLINK-III',
  'modbus-tcp': 'Modbus/TCP',
  slmp: 'SLMP',
  'rs-232c': 'RS-232C',
  'rs-485': 'RS-485',
  usb: 'USB',
};
const protocolNames = (ps: string[]) => ps.map((p) => PROTOCOL_NAMES[p] ?? p).join('・');

export function supplyLabel(s: Supply): string {
  if (s.conductor === 'PE') return CONDUCTOR_NAMES.PE;
  return `${s.system}${s.voltage}V ${CONDUCTOR_NAMES[s.conductor]}`;
}

/** 端子の表示名（機器名.印字） */
export function terminalName(m: Model, k: string): string {
  const info = m.terminals.get(k);
  if (!info) return k;
  return `${info.device.id}.${info.terminal.label ?? info.terminal.id}`;
}

export type Classified =
  | { kind: 'none' }
  | { kind: 'ok'; supply: Supply; parallel: string[] }
  | { kind: 'conflict'; rule: string; message: string; devices: string[] };

/** 同じグループにある電源出力の組み合わせから、電位と短絡などの矛盾を判定する */
export function classifySupplies(supplies: Supply[], name: (k: string) => string): Classified {
  if (supplies.length === 0) return { kind: 'none' };
  const devices = [...new Set(supplies.map((s) => s.device))];
  const conflict = (rule: string, message: string): Classified => ({ kind: 'conflict', rule, message, devices });
  const first = supplies[0];
  const hasPE = supplies.some((s) => s.conductor === 'PE');
  const nonPE = supplies.filter((s) => s.conductor !== 'PE');
  const safety = supplies.filter((s) => s.kind !== 'power');
  if (hasPE && nonPE.length) return conflict('ground-fault', `地絡: 接地(PE)と ${supplyLabel(nonPE[0])} がつながっています`);
  if (supplies.some((s) => s.system !== first.system)) return conflict('mixed-system', '混触: 交流(AC)と直流(DC)の電源がつながっています');
  if (supplies.some((s) => s.conductor !== first.conductor)) {
    if (safety.length) {
      const other = supplies.find((s) => s.conductor !== safety[0].conductor)!;
      return conflict('ossd-short', `短絡: ${kindName(safety[0])} ${name(safety[0].terminal)} が ${supplyLabel(other)} とつながっています`);
    }
    const names = [...new Set(supplies.map((s) => CONDUCTOR_NAMES[s.conductor]))].join(' と ');
    return conflict('short-circuit', `短絡: ${names} がつながっています`);
  }
  if (supplies.some((s) => s.voltage !== first.voltage) && !hasPE) {
    return conflict('voltage-conflict', `電圧の異なる電源（${[...new Set(supplies.map((s) => s.voltage + 'V'))].join('/')}）がつながっています`);
  }
  // 同じ極・電圧でも、安全出力・テスト出力は他の出力とつながってはいけない
  const distinctTerminals = new Set(supplies.map((s) => s.terminal));
  if (safety.length && distinctTerminals.size > 1) {
    const others = supplies.filter((s) => s.terminal !== safety[0].terminal);
    const o = others[0];
    if (safety.every((s) => s.kind === 'test') && others.every((s) => s.kind === 'test')) {
      return conflict(
        'safety-channel-cross',
        `テスト出力 ${name(safety[0].terminal)} と ${name(o.terminal)} がつながっています（チャンネル間の短絡。接点を共用していないか確認してください）`,
      );
    }
    const msg =
      o.kind === 'power'
        ? `${kindName(safety[0])} ${name(safety[0].terminal)} が電源（${o.device}）の ${supplyLabel(o)} に直結されています`
        : `${kindName(safety[0])} ${name(safety[0].terminal)} と ${kindName(o)} ${name(o.terminal)} がつながっています`;
    return conflict('ossd-short', `短絡: ${msg}`);
  }
  const powerDevices = [...new Set(supplies.filter((s) => s.conductor !== 'PE').map((s) => s.device))];
  return { kind: 'ok', supply: first, parallel: hasPE ? [] : powerDevices.length > 1 ? powerDevices : [] };
}

function kindName(s: Supply): string {
  return s.kind === 'ossd' ? '安全出力（OSSD）' : s.kind === 'test' ? 'テスト出力' : '電源出力';
}

function groupMembers(uf: UnionFind, keys: Iterable<string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const k of keys) {
    const g = uf.find(k);
    const list = out.get(g);
    if (list) list.push(k);
    else out.set(g, [k]);
  }
  return out;
}

/** 図面から検査用のモデルを組み立てる。未知の機器・端子、コネクタの不一致などはここで指摘する */
export function buildModel(diagram: Diagram, lookup: DefLookup, push: Push): Model {
  const bus = computeBus(diagram.devices, lookup);
  const terminals = new Map<string, TerminalInfo>();
  const devices = new Map<string, DeviceInfo>();
  for (const raw of diagram.devices) {
    const def = lookup(raw.type);
    if (!def) {
      push({ severity: 'error', rule: 'unknown-device', message: `${raw.id}: 機器種別 "${raw.type}" が見つかりません`, devices: [raw.id], wires: [] });
      continue;
    }
    const params = effectiveParams(raw, bus);
    const device = { ...raw, ...(params ? { params } : {}) };
    const r = resolveDevice(def, params);
    devices.set(device.id, { device, def, r });
    for (const t of r.terminals) {
      const k = key(device.id, t.id);
      terminals.set(k, { key: k, device, def, terminal: t, accepts: r.accepts.get(t.id) ?? [] });
    }
    // コネクタのピンも端子として扱う（画面上には表示しない）
    for (const p of r.pins) {
      const k = key(device.id, p.id);
      terminals.set(k, { key: k, device, def, terminal: { ...p, x: 0, y: 0, side: 'top' }, accepts: r.accepts.get(p.id) ?? [] });
    }
  }

  const wires: DiagramWire[] = [];
  const tubes: DiagramWire[] = [];
  const cablePairs: [string, string][] = [];
  /** ケーブルでつないだコネクタの組（通信ポートも含む） */
  const cables: { a: string; b: string; wire: string }[] = [];
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
    // エアのポートどうしはチューブ。エアのポートと電気の端子はつなげない
    const airA = terminals.get(key(w.from.device, w.from.terminal))!.terminal.role === 'air';
    const airB = terminals.get(key(w.to.device, w.to.terminal))!.terminal.role === 'air';
    if (airA && airB) {
      tubes.push(w);
      continue;
    }
    if (airA || airB) {
      const [air, elec] = airA ? [w.from, w.to] : [w.to, w.from];
      push({
        severity: 'error',
        rule: 'air-electric-mismatch',
        message: `${w.id}: エアのポート ${air.device}.${air.terminal} と電気の端子 ${elec.device}.${elec.terminal} がつながっています`,
        devices: [w.from.device, w.to.device],
        wires: [w.id],
      });
      continue;
    }
    const a = terminals.get(key(w.from.device, w.from.terminal))!.terminal.connector;
    const b = terminals.get(key(w.to.device, w.to.terminal))!.terminal.connector;
    if (a || b) {
      if (a && b && connectorsMate(a, b)) {
        cables.push({ a: key(w.from.device, w.from.terminal), b: key(w.to.device, w.to.terminal), wire: w.id });
        // ケーブル: 両端の同じ番号のピンどうしが導通する
        for (let i = 1; i <= Math.min(a.pins, b.pins); i++) {
          cablePairs.push([key(w.from.device, `${w.from.terminal}#${i}`), key(w.to.device, `${w.to.terminal}#${i}`)]);
        }
        if (a.protocols?.length && b.protocols?.length && !a.protocols.some((p) => b.protocols!.includes(p))) {
          push({
            severity: 'warning',
            rule: 'protocol-mismatch',
            message: `ケーブル ${w.id}: ${w.from.device}.${w.from.terminal}（${protocolNames(a.protocols)}）と ${w.to.device}.${w.to.terminal}（${protocolNames(b.protocols)}）に共通の通信方式がありません`,
            devices: [w.from.device, w.to.device],
            wires: [w.id],
          });
        }
      } else {
        push({
          severity: 'error',
          rule: 'connector-mismatch',
          message:
            a && b
              ? `ケーブル ${w.id}: コネクタの種類が違います（${a.kind} と ${b.kind}）`
              : `電線 ${w.id}: コネクタ（${(a ?? b)!.kind}）には同じ種類のコネクタからケーブルでつなぎます`,
          devices: [w.from.device, w.to.device],
          wires: [w.id],
        });
      }
      continue;
    }
    wires.push(w);
  }

  const wiresAt = new Map<string, DiagramWire[]>();
  for (const w of wires) {
    for (const r of [w.from, w.to]) {
      const k = key(r.device, r.terminal);
      wiresAt.set(k, [...(wiresAt.get(k) ?? []), w]);
    }
  }

  const tubesAt = new Map<string, DiagramWire[]>();
  for (const w of tubes) {
    for (const r of [w.from, w.to]) {
      const k = key(r.device, r.terminal);
      tubesAt.set(k, [...(tubesAt.get(k) ?? []), w]);
    }
  }

  const fixedLinks: [string, string][] = [];
  const switchLinks: SwitchLink[] = [];
  for (const { device, r } of devices.values()) {
    for (const l of r.links) {
      const a = key(device.id, l.from);
      const b = key(device.id, l.to);
      if (l.switch) switchLinks.push({ device: device.id, link: l, a, b });
      else fixedLinks.push([a, b]);
    }
  }

  // リンク: 名前が同じリンクの端子どうしを常時導通とみなす（リンクの種類ごとに別の名前の空間）
  const cabled = new Set(cables.flatMap((c) => [c.a, c.b]));
  const linkNets = new Map<string, { name: string; kind: string; keys: string[] }>();
  const labelLinks: [string, string][] = [];
  for (const { device, def, r } of devices.values()) {
    if (!def.netLabel) continue;
    const name = String(r.params[def.netLabel.param] ?? '').trim();
    const k = key(device.id, def.netLabel.terminal);
    if (!name) {
      push({ severity: 'warning', rule: 'link-unnamed', message: `${device.id}: ${def.name}に名前がありません（同じ名前の${def.name}どうしがつながります）`, devices: [device.id], wires: [] });
      continue;
    }
    const net = linkNets.get(`${def.type}|${name}`) ?? { name, kind: def.name, keys: [] };
    net.keys.push(k);
    linkNets.set(`${def.type}|${name}`, net);
    if (!wiresAt.has(k) && !cabled.has(k) && !tubesAt.has(k)) {
      const port = r.terminal(def.netLabel.terminal);
      const what = port?.connector ? 'ケーブル' : port?.role === 'air' ? 'チューブ' : '電線';
      push({ severity: 'warning', rule: 'link-unwired', message: `${device.id}: ${def.name}「${name}」に${what}がつながっていません`, devices: [device.id], wires: [] });
    }
  }
  for (const { name, kind, keys: ks } of linkNets.values()) {
    if (ks.length === 1) {
      const id = ks[0].split(':')[0];
      push({ severity: 'warning', rule: 'link-alone', message: `${id}: ${kind}「${name}」の相手がありません（同じ名前の${kind}を置きます）`, devices: [id], wires: [] });
    }
    // 通信ポートのネットワーク: 同じ名前のリンクにケーブルでつないだポートどうしの通信方式を確かめる
    const ports = ks.flatMap((lk) =>
      cables
        .filter((c) => c.a === lk || c.b === lk)
        .map((c) => (c.a === lk ? c.b : c.a))
        .map((pk) => ({ key: pk, protocols: terminals.get(pk)?.terminal.connector?.protocols ?? [] }))
        .filter((p) => p.protocols.length && !ks.includes(p.key)),
    );
    for (let i = 0; i < ports.length; i++) {
      const bad = ports.slice(i + 1).find((q) => !q.protocols.some((x) => ports[i].protocols.includes(x)));
      if (!bad) continue;
      const [a, b] = [ports[i], bad];
      push({
        severity: 'warning',
        rule: 'protocol-mismatch',
        message: `${kind}「${name}」: ${a.key.replace(':', '.')}（${protocolNames(a.protocols)}）と ${b.key.replace(':', '.')}（${protocolNames(b.protocols)}）に共通の通信方式がありません`,
        devices: [a.key.split(':')[0], b.key.split(':')[0]],
        wires: [],
        key: `protocol-network:${name}:${a.key}:${b.key}`,
      });
      break;
    }
    for (let i = 1; i < ks.length; i++) {
      fixedLinks.push([ks[0], ks[i]]);
      labelLinks.push([ks[0], ks[i]]);
    }
  }

  const fixed = new UnionFind();
  for (const w of wires) fixed.union(key(w.from.device, w.from.terminal), key(w.to.device, w.to.terminal));
  for (const [a, b] of cablePairs) fixed.union(a, b);
  for (const [a, b] of fixedLinks) fixed.union(a, b);
  const all = new UnionFind();
  for (const k of terminals.keys()) all.union(k, fixed.find(k));
  for (const s of switchLinks) all.union(s.a, s.b);

  const supplies = new Map<string, Supply>();
  for (const [k, info] of terminals) {
    const t = info.terminal;
    if (t.role !== 'supply' || !t.supply) continue;
    supplies.set(k, {
      system: t.supply.system,
      voltage: resolveNum(t.supply.voltage, info.def, info.device.params) ?? 0,
      conductor: t.supply.conductor,
      device: info.device.id,
      terminal: k,
      kind: t.supply.kind ?? 'power',
    });
  }

  const fixedMembers = groupMembers(fixed, terminals.keys());
  const allMembers = groupMembers(all, terminals.keys());
  const name = (k: string) => terminalName(model, k);
  const potentials = new Map<string, Potential>();
  const model: Model = {
    diagram,
    devices,
    terminals,
    wires,
    tubes,
    tubesAt,
    cablePairs,
    cabled,
    wiresAt,
    fixedLinks,
    labelLinks,
    switchLinks,
    fixed,
    all,
    fixedMembers,
    allMembers,
    supplies,
    potentialOf: (k) => {
      const g = all.find(k);
      let p = potentials.get(g);
      if (!p) {
        const c = classifySupplies((allMembers.get(g) ?? []).flatMap((m) => supplies.get(m) ?? []), name);
        p = c.kind === 'ok' ? { kind: 'ok', supply: c.supply } : c;
        potentials.set(g, p.kind === 'conflict' ? { kind: 'conflict' } : p);
      }
      return p.kind === 'conflict' ? { kind: 'conflict' } : p;
    },
    bus,
  };
  return model;
}

/** fixed のグループに電線が 1 本でもつながっているか */
export function netIsWired(m: Model, k: string): boolean {
  return (m.fixedMembers.get(m.fixed.find(k)) ?? []).some((x) => m.wiresAt.has(x));
}

/** 電線（または fixed グループ内の電線）の ID 一覧 */
export function wiresOfNet(m: Model, k: string): string[] {
  const ids = new Set<string>();
  for (const x of m.fixedMembers.get(m.fixed.find(k)) ?? []) for (const w of m.wiresAt.get(x) ?? []) ids.add(w.id);
  return [...ids];
}
