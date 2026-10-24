/**
 * KEYENCE 機器定義の整合性と、代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import { busAccepts, computeBus, effectiveParams } from '../../model/bus';
import type { Diagram, DiagramDevice, DiagramWire } from '../../model/diagram';
import { deviceDefinitions, getDeviceDefinition } from '../registry';
import { connectorsMate, resolveDevice } from '../resolve';
import { paramsWithDefaults, type DeviceDefinition } from '../types';

const keyence = deviceDefinitions.filter((d) => d.maker === 'KEYENCE');

describe('KEYENCE 機器定義', () => {
  it('type が一意で keyence. で始まる', () => {
    const types = keyence.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    for (const t of types) expect(t.startsWith('keyence.')).toBe(true);
  });

  it.each(keyence.map((d) => [d.type, d] as const))('%s: 端子・ピン・links が整合している', (_, def) => {
    const r = resolveDevice(def);
    const d = { ...def, terminals: r.terminals, pins: r.pins, links: r.links };
    const ids = new Set<string>();
    for (const t of d.terminals) {
      expect(ids.has(t.id), `端子ID重複 ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(t.x >= 0 && t.x <= d.width && t.y >= 0 && t.y <= d.height, `端子が範囲外 ${t.id}`).toBe(true);
      if (t.role === 'input') expect(t.accepts, `accepts なし ${t.id}`).toBeDefined();
      if (t.role === 'connector') expect(t.connector, `connector なし ${t.id}`).toBeDefined();
    }
    for (const p of d.pins) {
      const [cn, no] = p.id.split('#');
      const conn = d.terminals.find((t) => t.id === cn)?.connector;
      expect(conn && Number(no) >= 1 && Number(no) <= conn.pins, `ピンID不正 ${p.id}`).toBe(true);
      expect(ids.has(p.id), `ピンID重複 ${p.id}`).toBe(false);
      ids.add(p.id);
    }
    // MIL コネクタは全ピンを定義する
    for (const t of d.terminals) {
      if (t.connector && t.connector.pins > 0) {
        const n = d.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length;
        expect(n, `${t.id} のピン数`).toBe(t.connector.pins);
      }
    }
    for (const l of d.links) expect(ids.has(l.from) && ids.has(l.to), `links ${l.from}->${l.to}`).toBe(true);
    // SVG の id に {{uid}} が付いている（パラメータの全選択肢で確認）
    const variants = [paramsWithDefaults(d, {})];
    for (const p of d.params ?? []) for (const o of p.options) variants.push(paramsWithDefaults(d, { [p.key]: o.value }));
    for (const v of variants) {
      const svg = typeof d.svg === 'function' ? d.svg(v) : d.svg;
      for (const m of svg.matchAll(/\bid="([^"]*)"/g)) expect(m[1]).toContain('{{uid}}');
      expect(svg).not.toMatch(/undefined|NaN/);
    }
  });
});

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const lookup = (t: string) => getDeviceDefinition(t);
const errorsOf = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.severity === 'error');
const rulesAt = (d: Diagram, device: string) =>
  checkDiagram(d, lookup)
    .filter((i) => i.devices.includes(device))
    .map((i) => i.rule);

describe('KEYENCE 機器の配線チェック', () => {
  const base = (): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-b16td', x: 0, y: 0 },
      { id: 'PH1', type: 'keyence.pz-g41', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
    ],
    wires: [
      // センサーの電源と出力（NPN → PLC 入力のプラスコモン）
      w('PSU1.+V1', 'PH1.BN'),
      w('PSU1.-V1', 'PH1.BU'),
      w('PH1.BK', 'IN1.0'),
      w('PSU1.+V1', 'IN1.C0'),
      // シンク出力 → 表示灯
      w('PSU1.+V1', 'PL1.X1'),
      w('PL1.X2', 'OUT1.0'),
      w('PSU1.-V1', 'OUT1.C0'),
    ],
  });

  it('センサー → 入力ユニット、出力ユニット → 表示灯 の正しい回路でエラーが出ない', () => {
    const d = base();
    expect(errorsOf(d)).toEqual([]);
    // 表示灯の X2 にはシンク出力（出力 ON 時に COM と導通）経由で 0V が来る
    expect(rulesAt(d, 'PL1')).not.toContain('no-power');
    expect(rulesAt(d, 'PH1')).not.toContain('no-power');
  });

  it('センサーの電源を逆につなぐと極性エラーになる', () => {
    const d = base();
    d.wires = d.wires.map((x) => (x.to.device === 'PH1' && x.to.terminal === 'BN' ? { ...x, from: { device: 'PSU1', terminal: '-V2' } } : x));
    expect(errorsOf(d).map((i) => i.rule)).toContain('conductor-mismatch');
  });

  it('シンク出力ユニットの COM に +24V をつなぐと極性エラーになる', () => {
    const d = base();
    d.wires = d.wires.map((x) => (x.to.device === 'OUT1' && x.to.terminal === 'C0' ? { ...x, from: { device: 'PSU1', terminal: '+V2' } } : x));
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  it('MIL ケーブルで I/O ユニットと XC 端子台がつながり、ピンの電源条件がチェックされる', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'OUT1', type: 'keyence.kv-c32td', x: 0, y: 0 },
        { id: 'TB1', type: 'keyence.xc-t34b1', x: 0, y: 0 },
        { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
      ],
      wires: [
        w('OUT1.CN1', 'TB1.CN', { wireType: 'CABLE' }),
        // KEYENCE No.17 = COM0（端子台の端子 17）
        w('PSU1.-V1', 'TB1.17'),
        w('PSU1.+V1', 'PL1.X1'),
        // KEYENCE No.1 = OUT 000（端子台の端子 1）
        w('PL1.X2', 'TB1.1'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesAt(d, 'PL1')).not.toContain('no-power');
    // COM に +24V を入れると極性エラー
    d.wires[1] = w('PSU1.+V2', 'TB1.17');
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  it('MIL 34極と 40極のコネクタはつなげない', () => {
    const d: Diagram = {
      devices: [
        { id: 'IO1', type: 'keyence.kv-sir32xt', x: 0, y: 0 },
        { id: 'TB1', type: 'keyence.xc-t34b1', x: 0, y: 0 },
      ],
      wires: [w('IO1.CN1', 'TB1.CN', { wireType: 'CABLE' })],
    };
    expect(errorsOf(d).map((i) => i.rule)).toContain('connector-mismatch');
  });
});

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const dev = (id: string, type: string, mount?: { device: string; slot: number }): DiagramDevice => ({ id, type, x: 0, y: 0, ...(mount ? { mount } : {}) });

describe('KEYENCE PLC の装着（bus）', () => {
  const kvUnits = keyence.filter((d) => d.category === 'plc' && d.bus && !d.bus.host);

  it('拡張ユニットはすべて内部消費電流（DC24V）を持つ', () => {
    expect(kvUnits.length).toBeGreaterThan(30);
    for (const d of kvUnits) expect(d.bus!.load?.DC24V, d.type).toBeGreaterThan(0);
  });

  it('KV-8000 / KV-X の CPU は KV-8000 用ユニットを、KV-EC01 は KV-NC 系ユニットを受け入れる', () => {
    const cpu = def('keyence.kv-8000.cpu');
    const x550 = def('keyence.kv-x550');
    const ec01 = def('keyence.kv-ec01');
    for (const u of ['keyence.kv-c32xc.input', 'keyence.kv-b16td', 'keyence.kv-sad04', 'keyence.kv-xle02']) {
      expect(busAccepts(cpu, def(u)), u).toBe(true);
      expect(busAccepts(x550, def(u)), u).toBe(true);
      expect(busAccepts(ec01, def(u)), u).toBe(false);
    }
    for (const u of ['keyence.kv-nc16exe', 'keyence.kv-nc32et', 'keyence.kv-nc8er']) {
      expect(busAccepts(ec01, def(u)), u).toBe(true);
      expect(busAccepts(cpu, def(u)), u).toBe(false);
    }
  });

  it('装着順に R000 から 16 点単位で先頭番号が決まり、ピン・端子のラベルがリレー番号になる', () => {
    const devices = [
      dev('PLC1', 'keyence.kv-8000.cpu'),
      dev('IN1', 'keyence.kv-c32xc.input', { device: 'PLC1', slot: 1 }),
      dev('OUT1', 'keyence.kv-c32tc.output', { device: 'PLC1', slot: 2 }),
      dev('IO1', 'keyence.kv-b8xtd', { device: 'PLC1', slot: 3 }),
      dev('AD1', 'keyence.kv-sad04', { device: 'PLC1', slot: 4 }),
      dev('IN2', 'keyence.kv-b16xc', { device: 'PLC1', slot: 5 }),
    ];
    const layout = computeBus(devices, getDeviceDefinition);
    expect(layout.problems).toEqual([]);
    const at = (id: string) => {
      const d = devices.find((x) => x.id === id)!;
      return resolveDevice(def(d.type), effectiveParams(d, layout));
    };
    // KV-C32XC: R000〜R115（KEYENCE No.1 = MIL 標準ピン 1、No.18 = ピン 2）
    expect(at('IN1').pin('CN1#1')?.label).toBe('R000 (No.1)');
    expect(at('IN1').pin('CN1#2')?.label).toBe('R100 (No.18)');
    // KV-C32TC: R200〜R315
    expect(at('OUT1').pin('CN1#1')?.label).toBe('R200 (No.1)');
    expect(at('OUT1').pin('CN1#32')?.label).toBe('R315 (No.33)');
    // KV-B8XTD: 入力 R400〜R407、出力 R500〜R507
    expect(at('IO1').terminal('0')?.label).toBe('R400');
    expect(at('IO1').terminal('8')?.label).toBe('R500');
    // KV-SAD04（リレーを占有しない）の次の KV-B16XC は R600 から
    expect(at('IN2').terminal('0')?.label).toBe('R600');
    expect(at('IN2').terminal('15')?.label).toBe('R615');
  });

  it('装着していないユニットは先頭 R000、出力は入力の次のチャネルから', () => {
    const r = resolveDevice(def('keyence.kv-c16xtd'));
    expect(r.pin('CN1#1')?.label).toBe('R000 (No.1)');
    expect(r.pin('CN1#2')?.label).toBe('R100 (No.18)');
  });

  it('内部電源の合計を CPU の供給能力と比べる', () => {
    const devices = [dev('PLC1', 'keyence.kv-8000.cpu'), ...Array.from({ length: 7 }, (_, i) => dev(`XD${i}`, 'keyence.kv-xd02', { device: 'PLC1', slot: i + 1 }))];
    const layout = computeBus(devices, getDeviceDefinition);
    const rail = layout.groups.get('PLC1')!.rails.find((r) => r.rail === 'DC24V')!;
    expect(rail.supply).toBeCloseTo(3.2);
    expect(rail.load).toBeCloseTo(0.4 + 7 * 0.5);
    expect(layout.problems.map((p) => p.rule)).toContain('bus-overload');
  });
});

describe('KEYENCE PLC の入出力の注記', () => {
  it('入力点は DC 入力で、コモンが入力の COM（双方向）', () => {
    const r = resolveDevice(def('keyence.kv-c32xc.input'));
    expect(r.pin('CN1#1')?.signal).toEqual({ dir: 'in', kind: 'dc', common: 'CN1#33' });
    expect(r.pin('CN1#33')?.role).toBe('input');
    expect(r.accepts.get('CN1#33')?.[0].conductors).toEqual(['+', '-']);
  });

  it('入力モード（DC24V / DC5V）で入力 COM の電圧範囲が変わる', () => {
    const d = def('keyence.kv-b16xc');
    expect(resolveDevice(d).accepts.get('C0')?.[0]).toMatchObject({ minVoltage: 19, maxVoltage: 26.4 });
    expect(resolveDevice(d, { inputMode: 5 }).accepts.get('C0')?.[0]).toMatchObject({ minVoltage: 4.5, maxVoltage: 5.5 });
  });

  it('トランジスタ出力は出力点 → COM の switch: output（定格電流つき）、シンクは NPN・ソースは PNP', () => {
    const sink = resolveDevice(def('keyence.kv-b16td'));
    expect(sink.links).toContainEqual({ from: '0', to: 'C0', switch: 'output', ratedCurrent: 0.3 });
    expect(sink.terminal('0')?.signal).toEqual({ dir: 'out', kind: 'npn' });
    const source = resolveDevice(def('keyence.kv-c32tcp'));
    expect(source.pin('CN1#1')?.signal).toEqual({ dir: 'out', kind: 'pnp' });
    expect(source.links.filter((l) => l.switch === 'output')).toHaveLength(32);
  });

  it('リレー出力の COM は AC / DC のどちらも受け、コモンあたりの上限がある', () => {
    const d = def('keyence.kv-b16rc');
    const r = resolveDevice(d);
    expect(r.accepts.get('C0')?.map((a) => a.system)).toEqual(['AC', 'DC']);
    expect(r.terminal('0')?.signal).toEqual({ dir: 'out', kind: 'contact' });
    expect(r.links).toContainEqual({ from: '9', to: 'C1', switch: 'output', ratedCurrent: 2 });
    expect(d.commonLimits).toEqual([
      { common: 'C0', current: 8 },
      { common: 'C1', current: 8 },
    ]);
  });

  it('出力点（ラインドライバ以外）から出る内部経路はすべて switch: output', () => {
    for (const d of keyence.filter((x) => x.category === 'plc')) {
      const r = resolveDevice(d);
      for (const l of r.links) {
        const from = r.terminal(l.from) ?? r.pin(l.from);
        if (from?.signal?.dir === 'out' && from.signal.kind !== 'line-driver') expect(l.switch, `${d.type} ${l.from}`).toBe('output');
      }
    }
  });

  it('アナログ・位置決めユニットの信号の種類', () => {
    expect(resolveDevice(def('keyence.kv-sad04')).terminal('I0+')?.signal).toEqual({ dir: 'in', kind: 'analog-i' });
    expect(resolveDevice(def('keyence.kv-sda04')).terminal('V1')?.signal).toEqual({ dir: 'out', kind: 'analog-v' });
    const sh = resolveDevice(def('keyence.kv-sh04pl'));
    expect(sh.pin('CN1#27')?.signal?.kind).toBe('line-driver');
    expect(sh.pin('CN1#1')?.signal).toEqual({ dir: 'in', kind: 'dc', common: 'CN1#39' });
  });
});

describe('KEYENCE の通信ポートとコネクタ', () => {
  it('KV-X の PORT1/2 は Ethernet（EtherNet/IP）、PORT3 は EtherCAT', () => {
    const r = resolveDevice(def('keyence.kv-x550'));
    expect(r.terminal('PORT1')?.connector?.protocols).toEqual(['ethernet', 'ethernet-ip']);
    expect(r.terminal('PORT3')?.connector?.protocols).toEqual(['ethercat']);
    expect(r.terminal('PORT3')?.connector?.facing).toBe('front');
    expect(resolveDevice(def('keyence.kv-ec01')).terminal('IN')?.connector?.protocols).toEqual(['ethercat']);
  });

  it('PLC の MIL コネクタは正面向き', () => {
    for (const d of keyence.filter((x) => x.category === 'plc')) {
      for (const t of resolveDevice(d).terminals) {
        if (t.connector?.kind.startsWith('MIL')) expect(t.connector.facing, `${d.type} ${t.id}`).toBe('front');
      }
    }
  });
});

describe('KEYENCE センサー', () => {
  it('NPN / PNP の切換で出力の信号の種類と出力の経路が変わる', () => {
    const d = def('keyence.pz-g41');
    const npn = resolveDevice(d);
    expect(npn.terminal('BK')?.signal).toEqual({ dir: 'out', kind: 'npn' });
    expect(npn.links).toEqual([{ from: 'BK', to: 'BU', switch: 'output', ratedCurrent: 0.1 }]);
    const pnp = resolveDevice(d, { output: 'P' });
    expect(pnp.terminal('BK')?.signal).toEqual({ dir: 'out', kind: 'pnp' });
    expect(pnp.links).toEqual([{ from: 'BK', to: 'BN', switch: 'output', ratedCurrent: 0.1 }]);
  });

  it('EV（2 線式）は 2 線とも 2wire で、検出で 2 線の間が導通する', () => {
    const r = resolveDevice(def('keyence.ev'));
    expect(r.terminal('BN')?.signal?.kind).toBe('2wire');
    expect(r.terminal('BU')?.signal?.kind).toBe('2wire');
    expect(r.links[0]).toMatchObject({ from: 'BN', to: 'BU', switch: 'output' });
  });

  it('EV（2 線式）は漏れ電流・残留電圧を持ち、KV-C64XC の入力は 2 線式センサー不可', () => {
    expect(resolveDevice(def('keyence.ev')).terminal('BN')?.signal).toMatchObject({ leakCurrent: 1, residualVoltage: 3.6 });
    const c64 = resolveDevice(def('keyence.kv-c64xc'));
    const inputs = c64.pins.filter((p) => p.signal?.dir === 'in');
    expect(inputs).toHaveLength(64);
    for (const p of inputs) expect(p.signal).toMatchObject({ onVoltage: 19, twoWire: false });
  });

  it('アナログ出力の基準（GND）を、アナログ入力の基準（−側）へ戻していないと注意（analog-return）', () => {
    let n = 0;
    const wire = (a: string, b: string): DiagramWire => {
      const [fd, ft] = a.split('.');
      const [td, tt] = b.split('.');
      return { id: `A${++n}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.3, wireType: 'KIV' };
    };
    const d = (ref: 'ok' | 'none' | 'other'): Diagram => ({
      devices: [
        { id: 'AMP1', type: 'keyence.il-1000', x: 0, y: 0 },
        { id: 'AD1', type: 'keyence.kv-am40v', x: 0, y: 0 },
      ],
      wires: [
        wire('AMP1.OG', 'AD1.V0+'),
        ...(ref === 'ok' ? [wire('AMP1.SH', 'AD1.0-')] : ref === 'other' ? [wire('AMP1.SH', 'AD1.1-'), wire('AMP1.BU', 'AD1.0-')] : []),
      ],
    });
    const rules = (x: Diagram) => checkDiagram(x, (t) => getDeviceDefinition(t)).filter((i) => i.rule === 'analog-return').map((i) => i.message);
    expect(rules(d('ok'))).toEqual([]);
    expect(rules(d('none')).join()).toMatch(/基準 AD1\.ch0 アナログ入力 GND が未配線です/);
    expect(rules(d('other')).join()).toMatch(/基準 AD1\.ch0 アナログ入力 GND が、つないだ出力 AMP1\..* の基準 AMP1\..* とつながっていません/);
  });

  it('GP-M の出力2 をアナログにすると 4〜20mA 出力になり、出力の経路から外れる', () => {
    const r = resolveDevice(def('keyence.gp-m'), { out2: 'analog' });
    expect(r.terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'analog-i' });
    expect(r.links.map((l) => l.from)).toEqual(['BK']);
  });

  it('M12 コネクタの姿とセンサーケーブルがつながり、ピンと芯線が同じ並び', () => {
    const sensor = resolveDevice(def('keyence.gp-m.m12'));
    const cable = resolveDevice(def('generic.m12-4p-cable'));
    const a = sensor.terminal('CN')!.connector!;
    const b = cable.terminal('CN')!.connector!;
    expect(connectorsMate(a, b)).toBe(true);
    expect(a.style).toBe('round');
    expect(a.pinColors).toEqual({ 1: 'brown', 2: 'white', 3: 'blue', 4: 'black' });
    expect(sensor.pin('CN#1')?.role).toBe('input');
    expect(sensor.pin('CN#4')?.signal).toEqual({ dir: 'out', kind: 'npn' });
    expect(cable.links).toEqual([
      { from: 'CN#1', to: 'BN' },
      { from: 'CN#2', to: 'WH' },
      { from: 'CN#3', to: 'BU' },
      { from: 'CN#4', to: 'BK' },
    ]);
    expect(connectorsMate(resolveDevice(def('keyence.lr-zb250c.m8')).terminal('CN')!.connector!, b)).toBe(false);
  });
});

describe('MIL 変換端子台・ハーネス', () => {
  it('XC-T34B1 の端子は印字（番号）を label、つながるピンを note に書く', () => {
    const r = resolveDevice(def('keyence.xc-t34b1'));
    expect(r.terminal('18')?.label).toBe('18');
    expect(r.terminal('18')?.note).toContain('MIL 標準ピン 2');
    expect(r.links).toContainEqual({ from: 'CN#2', to: '18' });
  });

  it('XC-H34D はコネクタのピン n と芯線 n が導通する', () => {
    const r = resolveDevice(def('keyence.xc-h34d'));
    expect(r.terminal('CN')?.connector?.kind).toBe('MIL34');
    expect(r.links).toContainEqual({ from: 'CN#34', to: '34' });
  });
});
