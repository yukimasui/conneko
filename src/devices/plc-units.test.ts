/**
 * PLC のユニット・HMI・リモート I/O・通信機器（iQ-R のインテリジェント機能ユニット・ネットワークユニット、iQ-F のアナログ・コネクタ式 CPU、
 * GOT2000、オムロン CP2E・CP1W、KEYENCE の IO-Link マスタ・EtherNet/IP ユニット）の、装着・入出力番号の割付け・アナログ信号のチェックの確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { busAccepts, computeBus, effectiveParams } from '../model/bus';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { compareAddress, ioSystem } from '../model/io';
import { deviceFamilies } from './families';
import { getDeviceDefinition } from './registry';
import { connectorsMate, ioName, parseIoName, resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';
import { paramVariants, validateDefinition } from './validate';

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const lookup = (t: string) => getDeviceDefinition(t);

const dev = (id: string, type: string, mount?: [string, number]): DiagramDevice => ({ id, type, x: 0, y: 0, ...(mount ? { mount: { device: mount[0], slot: mount[1] } } : {}) });

let seq = 0;
/** 'PLC1:CH1V+' のように「機器ID:端子ID」で書く（端子ID に '.' を含む機種があるため） */
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split(':');
  const [td, tt] = to.split(':');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};

/** 装着を解析し、機器ごとの確定済み定義を返す */
function mountAll(devices: DiagramDevice[]) {
  const layout = computeBus(devices, lookup);
  const resolved = new Map(devices.map((d) => [d.id, resolveDevice(def(d.type), effectiveParams(d, layout))]));
  return { layout, resolved };
}

const NEW_TYPES = [
  'mitsubishi.rj71en71',
  'mitsubishi.rj71gf11-t2',
  'mitsubishi.r60ad4',
  'mitsubishi.r60da4',
  'mitsubishi.rd62p2',
  'mitsubishi.rd75p4',
  'mitsubishi.fx5-4ad',
  'mitsubishi.fx5uc-32mt-d',
  'mitsubishi.gt2510-vtbd',
  'omron.cp2e-n30dt-d',
  'omron.cp1w-20edr1',
  'keyence.nq-ep4l',
  'keyence.kv-ep21v',
];

describe('追加した PLC ユニット・HMI・通信機器の定義', () => {
  it.each(NEW_TYPES)('%s: 定義の検査に通る（全パラメータ）', (type) => {
    const d = def(type);
    for (const p of paramVariants(d)) expect(validateDefinition(d, p)).toEqual([]);
  });

  it('iQ-R のユニットはベースユニットに装着でき、CPU・電源の位置には装着しない', () => {
    for (const t of ['mitsubishi.rj71en71', 'mitsubishi.rj71gf11-t2', 'mitsubishi.r60ad4', 'mitsubishi.r60da4', 'mitsubishi.rd62p2', 'mitsubishi.rd75p4']) {
      expect(busAccepts(def('mitsubishi.r35b'), def(t)), t).toBe(true);
      expect(def(t).bus?.role, t).toBeUndefined();
    }
  });

  it('FX5 のアナログ入力ユニット・オムロン CP1W・KEYENCE の EtherNet/IP ユニットはそれぞれの CPU に増設できる', () => {
    expect(busAccepts(def('mitsubishi.fx5u-32mt-es'), def('mitsubishi.fx5-4ad'))).toBe(true);
    expect(busAccepts(def('mitsubishi.fx5uc-32mt-d'), def('mitsubishi.fx5-16ex-es'))).toBe(true);
    expect(busAccepts(def('omron.cp2e-n30dt-d'), def('omron.cp1w-20edr1'))).toBe(true);
    expect(busAccepts(def('omron.nx1p2-1140dt'), def('omron.cp1w-20edr1'))).toBe(false);
    expect(busAccepts(def('keyence.kv-8000.cpu'), def('keyence.kv-ep21v'))).toBe(true);
  });

  it('パレットのファミリー: CPU は各メーカーの CPU、ユニットは PLC エディタ用の隠れたファミリー、GOT はタッチパネル', () => {
    const familyOf = (type: string) => deviceFamilies.find((f) => f.members.some((m) => m.type === type))!;
    expect(familyOf('mitsubishi.fx5uc-32mt-d').id).toBe('plc-cpu-mitsubishi');
    expect(familyOf('omron.cp2e-n30dt-d').id).toBe('plc-cpu-omron');
    expect(familyOf('mitsubishi.gt2510-vtbd').id).toBe('hmi');
    expect(familyOf('mitsubishi.r60ad4').id).toBe('plc-analog');
    expect(familyOf('mitsubishi.fx5-4ad').id).toBe('plc-analog');
    expect(familyOf('mitsubishi.rj71en71').id).toBe('plc-comm');
    expect(familyOf('mitsubishi.rj71gf11-t2').id).toBe('plc-comm');
    expect(familyOf('keyence.kv-ep21v').id).toBe('plc-comm');
    expect(familyOf('mitsubishi.rd62p2').id).toBe('plc-motion');
    expect(familyOf('mitsubishi.rd75p4').id).toBe('plc-motion');
    expect(familyOf('omron.cp1w-20edr1').id).toBe('plc-io');
  });
});

describe('iQ-R: インテリジェント機能ユニット・ネットワークユニットの入出力番号の占有', () => {
  const devices = [
    dev('BASE', 'mitsubishi.r38b'),
    dev('PS', 'mitsubishi.r61p', ['BASE', 1]),
    dev('CPU', 'mitsubishi.r04cpu', ['BASE', 2]),
    dev('IN1', 'mitsubishi.rx40c7', ['BASE', 3]), // X00〜X0F
    dev('AD', 'mitsubishi.r60ad4', ['BASE', 4]), // 16 点占有（X10〜X1F）
    dev('ETH', 'mitsubishi.rj71en71', ['BASE', 5]), // 32 点占有（X20〜X3F）
    dev('POS', 'mitsubishi.rd75p4', ['BASE', 6]), // 32 点占有（X40〜X5F）
    dev('IN2', 'mitsubishi.rx40c7', ['BASE', 7]), // X60〜
  ];

  it('占有する点数のぶん、後ろのユニットの先頭番号がずれる', () => {
    const { layout, resolved } = mountAll(devices);
    expect(layout.problems.filter((p) => p.severity === 'error')).toEqual([]);
    expect(layout.params.get('AD')).toMatchObject({ ioIn: 0x10 });
    expect(layout.params.get('ETH')).toMatchObject({ ioIn: 0x20 });
    expect(layout.params.get('POS')).toMatchObject({ ioIn: 0x40 });
    expect(layout.params.get('IN2')).toMatchObject({ ioIn: 0x60 });
    expect(resolved.get('IN2')!.terminal('X00')?.label).toBe('X60');
  });

  it('DC5V の消費電流にインテリジェント機能ユニットの分が入る', () => {
    const { layout } = mountAll(devices);
    const rail = layout.groups.get('BASE')!.rails.find((r) => r.rail === '5V')!;
    // R38B 0.71 + R04CPU 0.67 + RX40C7 0.12×2 + R60AD4 0.23 + RJ71EN71 0.82 + RD75P4 0.6
    expect(rail.load).toBeCloseTo(0.71 + 0.67 + 0.24 + 0.23 + 0.82 + 0.6, 6);
    // R61P（6.5A）の範囲に収まる
    expect(rail.supply).toBeCloseTo(6.5, 6);
    expect(layout.problems.some((p) => p.rule === 'bus-overload')).toBe(false);
  });

  it('I/O 表: アナログ入力のチャネル・アナログ出力・一致出力が I/O 点に出る', () => {
    const d: Diagram = {
      devices: [dev('BASE', 'mitsubishi.r35b'), dev('AD', 'mitsubishi.r60ad4', ['BASE', 3]), dev('DA', 'mitsubishi.r60da4', ['BASE', 4]), dev('CNT', 'mitsubishi.rd62p2', ['BASE', 5])],
      wires: [],
    };
    const sys = ioSystem(d, 'BASE', lookup)!;
    const ad = sys.units.find((u) => u.device.id === 'AD')!;
    expect(ad.points.filter((p) => p.dir === 'in').map((p) => p.terminal)).toEqual(['CH1V+', 'CH1I+', 'CH2V+', 'CH2I+', 'CH3V+', 'CH3I+', 'CH4V+', 'CH4I+']);
    const da = sys.units.find((u) => u.device.id === 'DA')!;
    expect(da.points.every((p) => p.dir === 'out')).toBe(true);
    expect(da.points).toHaveLength(8);
    const cnt = sys.units.find((u) => u.device.id === 'CNT')!;
    expect(cnt.points.filter((p) => p.dir === 'out').map((p) => p.address).sort()).toEqual(['CH1-EQU1', 'CH1-EQU2', 'CH2-EQU1', 'CH2-EQU2']);
    // パルス入力は DC24V のピンだけを入力点にする（ΦA・ΦB・プリセット・ファンクションスタート × 2ch）
    expect(cnt.points.filter((p) => p.dir === 'in')).toHaveLength(8);
    // ケーブルのない 40 ピンコネクタは変換端子台を足せる
    expect(cnt.bareConnectors).toEqual(['CN1']);
  });

  it('40 ピンコネクタ（FCN40）は MIL 40 極の変換端子台とケーブルでつなげ、ピンは変換ケーブルの千鳥番号', () => {
    const cnt = resolveDevice(def('mitsubishi.rd62p2'));
    expect(connectorsMate(cnt.terminal('CN1')!.connector!, resolveDevice(def('generic.mil-terminal-block.40p')).terminals.find((t) => t.connector)!.connector!)).toBe(true);
    // 三菱の B20 = MIL 1、A20 = MIL 2
    expect(cnt.pin('CN1#1')?.label).toBe('CH1-ΦA 24V (B20)');
    expect(cnt.pin('CN1#2')?.label).toBe('CH2-ΦA 24V (A20)');
    const pos = resolveDevice(def('mitsubishi.rd75p4'));
    // 軸 1 の PULSE F は A15 → CN1#12、PULSE COM は A16 → CN1#10
    expect(pos.pin('CN1#12')?.label).toBe('AX1-PULSE F (1A15)');
    expect(pos.links.find((l) => l.from === 'CN1#12')).toMatchObject({ to: 'CN1#10', switch: 'output' });
    expect(pos.links.filter((l) => l.switch === 'output')).toHaveLength(12);
  });
});

describe('アナログ信号のチェック（R60DA4 の出力 → R60AD4 の入力）', () => {
  const diagram = (wires: DiagramWire[]): Diagram => ({
    devices: [dev('BASE', 'mitsubishi.r35b'), dev('AD', 'mitsubishi.r60ad4', ['BASE', 3]), dev('DA', 'mitsubishi.r60da4', ['BASE', 4])],
    wires,
  });
  const issues = (d: Diagram, rule: string) => checkDiagram(d, lookup).filter((i) => i.rule === rule);

  it('電圧出力を電圧入力へ、基準もつなげば指摘しない', () => {
    const d = diagram([w('DA:CH1V+', 'AD:CH1V+'), w('DA:CH1COM', 'AD:CH1V-')]);
    expect(issues(d, 'signal-kind')).toEqual([]);
    expect(issues(d, 'analog-return')).toEqual([]);
  });

  it('電流出力を電圧入力へつなぐと指摘する', () => {
    const d = diagram([w('DA:CH1I+', 'AD:CH1V+'), w('DA:CH1COM', 'AD:CH1V-')]);
    expect(issues(d, 'signal-kind')).toHaveLength(1);
  });

  it('基準（V−・COM）をつながないと電流ループの帰り道がないと指摘する', () => {
    const d = diagram([w('DA:CH2V+', 'AD:CH2V+')]);
    expect(issues(d, 'analog-return').length).toBeGreaterThan(0);
  });

  it('FX5-4AD の入力も同じくチェックする', () => {
    const d: Diagram = {
      devices: [dev('BASE', 'mitsubishi.r35b'), dev('DA', 'mitsubishi.r60da4', ['BASE', 3]), dev('CPU', 'mitsubishi.fx5u-32mt-es'), dev('AD', 'mitsubishi.fx5-4ad', ['CPU', 1])],
      wires: [w('DA:CH1I+', 'AD:CH1I+'), w('DA:CH1COM', 'AD:CH1COM')],
    };
    expect(issues(d, 'signal-kind')).toEqual([]);
    expect(issues(d, 'analog-return')).toEqual([]);
  });
});

describe('iQ-F: コネクタ式 CPU FX5UC-32MT/D と増設', () => {
  it('本体の X0〜X17 / Y0〜Y17 の後ろから増設の番号が続き、FX5-4AD は番号を消費しない', () => {
    const { layout, resolved } = mountAll([
      dev('CPU', 'mitsubishi.fx5uc-32mt-d'),
      dev('AD', 'mitsubishi.fx5-4ad', ['CPU', 1]),
      dev('IN', 'mitsubishi.fx5-16ex-es', ['CPU', 2]),
      dev('OUT', 'mitsubishi.fx5-16eyt-es', ['CPU', 3]),
    ]);
    expect(layout.params.get('IN')).toMatchObject({ ioIn: 16 });
    expect(resolved.get('IN')!.terminal('X0')?.label).toBe('X20');
    expect(resolved.get('OUT')!.terminal('Y0')?.label).toBe('Y20');
    // 5V・24V の消費に FX5-4AD の分が入る
    const r24 = layout.groups.get('CPU')!.rails.find((r) => r.rail === '24V')!;
    expect(r24.unitLoad).toBeCloseTo(0.04 + 0.085 + 0.125, 6);
  });

  it('入力・出力のコネクタは MIL 20 極で、出力はコモン COM0 へのシンク出力', () => {
    const r = resolveDevice(def('mitsubishi.fx5uc-32mt-d'));
    expect(r.terminal('X')?.connector).toMatchObject({ kind: 'MIL20', pins: 20 });
    const outs = r.links.filter((l) => l.switch === 'output');
    expect(outs).toHaveLength(16);
    expect(outs.every((l) => l.to === 'Y#17')).toBe(true);
    expect(r.pins.filter((p) => p.signal?.dir === 'in').every((p) => p.signal?.common === 'X#17')).toBe(true);
  });
});

describe('オムロン CP2E: チャネル.ビットの入出力番号', () => {
  it('ioName / parseIoName（omron）', () => {
    expect(ioName('omron', 'in', 21)).toBe('1.05');
    expect(ioName('omron', 'out', 102 * 16 + 7)).toBe('102.07');
    expect(parseIoName('omron', '102.07')).toBe(102 * 16 + 7);
    expect(parseIoName('omron', '3')).toBe(48);
    expect(parseIoName('omron', '1.16')).toBeUndefined();
    expect(parseIoName('omron', 'X20')).toBeUndefined();
  });

  it('CP1W の増設 I/O は入力 CIO 2・出力 CIO 102 から 1 台ごとに 1 チャネルずつ続く', () => {
    const { layout, resolved } = mountAll([dev('CPU', 'omron.cp2e-n30dt-d'), dev('EX1', 'omron.cp1w-20edr1', ['CPU', 1]), dev('EX2', 'omron.cp1w-20edr1', ['CPU', 2])]);
    expect(layout.problems).toEqual([]);
    expect(resolved.get('EX1')!.terminal('IN00')?.label).toBe('2.00');
    expect(resolved.get('EX1')!.terminal('IN11')?.label).toBe('2.11');
    expect(resolved.get('EX1')!.terminal('OUT07')?.label).toBe('102.07');
    expect(resolved.get('EX2')!.terminal('IN00')?.label).toBe('3.00');
    expect(resolved.get('EX2')!.terminal('OUT00')?.label).toBe('103.00');
    // 本体の入出力
    const cpu = resolved.get('CPU')!;
    expect(cpu.terminals.filter((t) => t.signal?.dir === 'in')).toHaveLength(18);
    expect(cpu.links.filter((l) => l.switch === 'output')).toHaveLength(12);
    expect(cpu.terminal('OUT101.03')?.label).toBe('101.03');
  });

  it('未装着の CP1W は 1 台目の位置（CIO 2 / 102）の番号で表示する', () => {
    const r = resolveDevice(def('omron.cp1w-20edr1'));
    expect(r.terminal('IN00')?.label).toBe('2.00');
    expect(r.terminal('OUT00')?.label).toBe('102.00');
  });

  it('I/O 表の並び: チャネルの順（0 → 1 → 100 → 101 → 2 → 102 の数値順）', () => {
    const d: Diagram = { devices: [dev('CPU', 'omron.cp2e-n30dt-d'), dev('EX1', 'omron.cp1w-20edr1', ['CPU', 1])], wires: [] };
    const sys = ioSystem(d, 'CPU', lookup)!;
    const addrs = sys.units.flatMap((u) => u.points.map((p) => p.address));
    expect(addrs).toContain('0.11');
    expect(addrs).toContain('102.07');
    const sorted = [...addrs].sort(compareAddress);
    expect(sorted.indexOf('1.05')).toBeLessThan(sorted.indexOf('2.00'));
    expect(sorted.indexOf('2.11')).toBeLessThan(sorted.indexOf('100.00'));
  });

  it('入力の COM に +24V を入れると NPN 用（プラスコモン）になり、PNP の出力を指摘する', () => {
    const d: Diagram = {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('CPU', 'omron.cp2e-n30dt-d'), dev('PX1', 'omron.e2e-x-b1d')],
      wires: [w('PSU1:+V1', 'CPU:+'), w('PSU1:-V1', 'CPU:-'), w('PSU1:+V1', 'CPU:COM'), w('PSU1:+V1', 'PX1:BN'), w('PSU1:-V1', 'PX1:BU'), w('PX1:BK', 'CPU:IN0.00')],
    };
    expect(checkDiagram(d, lookup).filter((i) => i.rule === 'signal-polarity')).toHaveLength(1);
  });
});

describe('KEYENCE NQ-EP4L（IO-Link マスタ）', () => {
  it('IO-Link ポート（M12 5 ピン）に M12 4 ピンのセンサーをつなげる', () => {
    const r = resolveDevice(def('keyence.nq-ep4l'));
    const port = r.terminal('X1')!.connector!;
    expect(connectorsMate(port, { kind: 'M12-4', pins: 4, width: 20 })).toBe(true);
    // Ethernet ポートは LAN（RJ-45）と変換ケーブルでつなぐ
    expect(connectorsMate(r.terminal('P1')!.connector!, { kind: 'RJ45', pins: 0, width: 22 })).toBe(true);
  });

  it('ポートの C/Q・DI は PNP 用の入力（NPN のセンサーは指摘する）', () => {
    const r = resolveDevice(def('keyence.nq-ep4l'));
    for (const n of [1, 2, 3, 4]) {
      expect(r.pin(`X${n}#4`)?.signal).toMatchObject({ dir: 'in', kind: 'dc', commonPolarity: '-' });
      expect(r.pin(`X${n}#2`)?.signal).toMatchObject({ dir: 'in', kind: 'dc', commonPolarity: '-' });
    }
  });

  it('ポートのセンサー電源（L+・L−）は電源コネクタの V2 から出る', () => {
    const r = resolveDevice(def('keyence.nq-ep4l'));
    expect(r.links).toContainEqual({ from: 'PWR#2', to: 'X3#1' });
    expect(r.links).toContainEqual({ from: 'PWR#4', to: 'X3#3' });
  });
});
