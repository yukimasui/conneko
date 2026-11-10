/**
 * PLC・HMI・通信機器の追加分（issue #75 の残り）の確認:
 * KEYENCE KV-XH16ML・KV-CL20、三菱電機 FX5-4DA・GT2710-VTBD・NZ2GF2B1N1-16D/16T、オムロン NX102-9000・NB7W-TW01B、
 * シーメンス CPU 1214C DC/DC/DC・KTP700 Basic PN、MOXA TCC-100・EDS-G205A-4PoE。
 * 装着（bus）・入出力の割付け（I/O 表）・信号と通信方式のチェック。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { busAccepts, computeBus, effectiveParams } from '../model/bus';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { compareAddress, ioSystem } from '../model/io';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { resolveNum, type DeviceDefinition } from './types';
import { paramVariants, validateDefinition } from './validate';

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const lookup = (t: string) => getDeviceDefinition(t);
const dev = (id: string, type: string, mount?: [string, number]): DiagramDevice => ({ id, type, x: 0, y: 0, ...(mount ? { mount: { device: mount[0], slot: mount[1] } } : {}) });

let seq = 0;
/** 'PLC1:I0.0' のように「機器ID:端子ID」で書く（端子ID に '.' を含む機種があるため） */
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split(':');
  const [td, tt] = to.split(':');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};
/** LAN・D-sub などのケーブル */
const cable = (from: string, to: string): DiagramWire => ({ ...w(from, to), wireType: 'CABLE' });
const issues = (d: Diagram, rule: string) => checkDiagram(d, lookup).filter((i) => i.rule === rule);

const NEW_TYPES = [
  'keyence.kv-xh16ml',
  'keyence.kv-cl20',
  'mitsubishi.fx5-4da',
  'mitsubishi.gt2710-vtbd',
  'mitsubishi.nz2gf2b1n1-16d',
  'mitsubishi.nz2gf2b1n1-16t',
  'omron.nx102-9000',
  'omron.nb7w-tw01b',
  'siemens.cpu1214c.dc-dc-dc',
  'siemens.ktp700-basic-pn',
  'moxa.tcc-100',
  'moxa.eds-g205a-4poe',
];

describe('追加した機器の定義', () => {
  it.each(NEW_TYPES)('%s: 定義の検査に通る（全パラメータ）', (type) => {
    const d = def(type);
    for (const p of paramVariants(d)) expect(validateDefinition(d, p)).toEqual([]);
  });

  it('パレットのファミリー', () => {
    expect(familyOf('siemens.cpu1214c.dc-dc-dc')?.id).toBe('plc-cpu-siemens');
    expect(familyOf('omron.nx102-9000')?.id).toBe('plc-cpu-omron');
    expect(familyOf('mitsubishi.nz2gf2b1n1-16d')?.id).toBe('remote-io');
    expect(familyOf('mitsubishi.nz2gf2b1n1-16t')?.id).toBe('remote-io');
    expect(familyOf('keyence.kv-ec01')?.id).toBe('remote-io');
    for (const t of ['mitsubishi.gt2710-vtbd', 'omron.nb7w-tw01b', 'siemens.ktp700-basic-pn']) expect(familyOf(t)?.id, t).toBe('hmi');
    expect(familyOf('moxa.eds-g205a-4poe')?.id).toBe('hub');
    expect(familyOf('keyence.kv-cl20')?.id).toBe('plc-comm');
    expect(familyOf('keyence.kv-xh16ml')?.id).toBe('plc-motion');
    expect(familyOf('mitsubishi.fx5-4da')?.id).toBe('plc-analog');
  });

  it('GT2510-VTBD は GOT2000 の共通部品に移しても端子・消費電流が変わらない', () => {
    const r = resolveDevice(def('mitsubishi.gt2510-vtbd'));
    expect(r.terminals.map((t) => t.id)).toEqual(['FG', '+24V', '0V', 'LAN', 'RS232', 'RS422']);
    expect(def('mitsubishi.gt2510-vtbd').loadCurrent).toBe(0.5);
    expect(def('mitsubishi.gt2510-vtbd').estimated).toBeUndefined();
  });
});

describe('KEYENCE: KV-XH16ML・KV-CL20', () => {
  it('KV-XH16ML は KV-X の CPU だけに装着でき、リレー 2112 点を占有して後ろのユニットの番号をずらす', () => {
    expect(busAccepts(def('keyence.kv-x550'), def('keyence.kv-xh16ml'))).toBe(true);
    expect(busAccepts(def('keyence.kv-8000.cpu'), def('keyence.kv-xh16ml'))).toBe(false);
    const devices = [dev('CPU', 'keyence.kv-x550'), dev('MC', 'keyence.kv-xh16ml', ['CPU', 1]), dev('IN', 'keyence.kv-b16xc', ['CPU', 2])];
    const layout = computeBus(devices, lookup);
    expect(layout.problems.filter((p) => p.severity === 'error')).toEqual([]);
    expect(layout.params.get('IN')).toMatchObject({ ioIn: 2112 });
    // 内部消費電流: CPU 0.6A + KV-XH16ML 0.4A + KV-B16XC
    const rail = layout.groups.get('CPU')!.rails.find((r) => r.rail === 'DC24V')!;
    expect(rail.unitLoad).toBeGreaterThanOrEqual(0.4);
  });

  it('KV-CL20 は KV-8000・KV-X の CPU に装着でき、内部消費電流 170mA', () => {
    expect(busAccepts(def('keyence.kv-8000.cpu'), def('keyence.kv-cl20'))).toBe(true);
    expect(busAccepts(def('keyence.kv-x530'), def('keyence.kv-cl20'))).toBe(true);
    const layout = computeBus([dev('CPU', 'keyence.kv-8000.cpu'), dev('CCL', 'keyence.kv-cl20', ['CPU', 1])], lookup);
    expect(layout.groups.get('CPU')!.rails.find((r) => r.rail === 'DC24V')!.unitLoad).toBeCloseTo(0.17, 6);
  });

  it('KV-CL20 の DA・DB を DeviceNet の通信線とつなぐと通信方式の違いを指摘し、CC-Link どうしは指摘しない', () => {
    const base = [dev('CPU', 'keyence.kv-8000.cpu'), dev('CCL', 'keyence.kv-cl20', ['CPU', 1])];
    const bad: Diagram = { devices: [...base, dev('DN', 'keyence.kv-dn20', ['CPU', 2])], wires: [w('CCL:DA', 'DN:CAN_H'), w('CCL:DB', 'DN:CAN_L')] };
    expect(issues(bad, 'protocol-mismatch')).toHaveLength(1);
    const ok: Diagram = {
      devices: [...base, dev('CPU2', 'keyence.kv-8000.cpu'), dev('CCL2', 'keyence.kv-cl20', ['CPU2', 1])],
      wires: [w('CCL:DA', 'CCL2:DA'), w('CCL:DB', 'CCL2:DB'), w('CCL:DG', 'CCL2:DG')],
    };
    expect(issues(ok, 'protocol-mismatch')).toEqual([]);
  });
});

describe('三菱電機: FX5-4DA・NZ2GF2B1N1・GT2710', () => {
  it('FX5-4DA は FX5U に増設でき、入出力番号を消費せず DC5V 100mA を消費する', () => {
    expect(busAccepts(def('mitsubishi.fx5u-32mt-es'), def('mitsubishi.fx5-4da'))).toBe(true);
    const devices = [dev('CPU', 'mitsubishi.fx5u-32mt-es'), dev('DA', 'mitsubishi.fx5-4da', ['CPU', 1]), dev('IN', 'mitsubishi.fx5-16ex-es', ['CPU', 2])];
    const layout = computeBus(devices, lookup);
    expect(layout.params.get('IN')).toMatchObject({ ioIn: 16 });
    expect(resolveDevice(def('mitsubishi.fx5-16ex-es'), effectiveParams(devices[2], layout)).terminal('X0')?.label).toBe('X20');
    expect(layout.groups.get('CPU')!.rails.find((r) => r.rail === '5V')!.unitLoad).toBeCloseTo(0.1 + 0.1, 6);
  });

  it('FX5-4DA の出力は I/O 表の出力点に出て、FX5-4AD の入力につなぐとアナログ信号をチェックする', () => {
    const d: Diagram = {
      devices: [dev('CPU', 'mitsubishi.fx5u-32mt-es'), dev('DA', 'mitsubishi.fx5-4da', ['CPU', 1]), dev('AD', 'mitsubishi.fx5-4ad', ['CPU', 2])],
      wires: [],
    };
    const sys = ioSystem(d, 'CPU', lookup)!;
    const da = sys.units.find((u) => u.device.id === 'DA')!;
    expect(da.points).toHaveLength(8);
    expect(da.points.every((p) => p.dir === 'out')).toBe(true);
    // 電流出力を電圧入力へ → 指摘
    expect(issues({ ...d, wires: [w('DA:CH1I+', 'AD:CH1V+'), w('DA:CH1COM', 'AD:CH1COM')] }, 'signal-kind')).toHaveLength(1);
    // 電圧出力を電圧入力へ、基準もつなぐ → 指摘なし
    const ok = { ...d, wires: [w('DA:CH2V+', 'AD:CH2V+'), w('DA:CH2COM', 'AD:CH2COM')] };
    expect(issues(ok, 'signal-kind')).toEqual([]);
    expect(issues(ok, 'analog-return')).toEqual([]);
  });

  it('NZ2GF2B1N1-16D・16T の入出力は I/O 表に出て、16T は 0.5A/点・4A/コモン', () => {
    const d: Diagram = { devices: [dev('RIO1', 'mitsubishi.nz2gf2b1n1-16d'), dev('RIO2', 'mitsubishi.nz2gf2b1n1-16t')], wires: [] };
    const inSys = ioSystem(d, 'RIO1', lookup)!;
    expect(inSys.units[0].points.map((p) => p.address).sort(compareAddress)).toEqual(Array.from({ length: 16 }, (_, i) => `X${i.toString(16).toUpperCase()}`));
    const outSys = ioSystem(d, 'RIO2', lookup)!;
    expect(outSys.units[0].points.filter((p) => p.dir === 'out')).toHaveLength(16);
    const r = resolveDevice(def('mitsubishi.nz2gf2b1n1-16t'));
    expect(r.links.find((l) => l.from === 'YF')).toMatchObject({ to: 'COM', switch: 'output', ratedCurrent: 0.5 });
    expect(def('mitsubishi.nz2gf2b1n1-16t').commonLimits).toEqual([{ common: 'COM', current: 4 }]);
  });

  it('NZ2GF2B1N1-16D の COM を +24V にすると NPN 用（プラスコモン）になり、PNP のセンサーを指摘する', () => {
    const d = (com: '+V1' | '-V1'): Diagram => ({
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('RIO', 'mitsubishi.nz2gf2b1n1-16d'), dev('PX1', 'omron.e2e-x-b1d')],
      wires: [w('PSU1:+V1', 'RIO:24V'), w('PSU1:-V1', 'RIO:24G'), w(`PSU1:${com}`, 'RIO:COM'), w('PSU1:+V1', 'PX1:BN'), w('PSU1:-V1', 'PX1:BU'), w('PX1:BK', 'RIO:X0')],
    });
    expect(issues(d('+V1'), 'signal-polarity')).toHaveLength(1);
    expect(issues(d('-V1'), 'signal-polarity')).toEqual([]);
  });

  it('NZ2GF2B1N1 のポートは RJ71GF11-T2 とつなげ、EtherNet/IP のポートやスイッチングハブとは通信方式の違いを指摘する', () => {
    const devices = [dev('BASE', 'mitsubishi.r35b'), dev('GF', 'mitsubishi.rj71gf11-t2', ['BASE', 3]), dev('RIO', 'mitsubishi.nz2gf2b1n1-16d'), dev('KV', 'keyence.kv-x550'), dev('HUB', 'moxa.eds-g205a-4poe')];
    expect(issues({ devices, wires: [cable('GF:P1', 'RIO:P1')] }, 'protocol-mismatch')).toEqual([]);
    expect(issues({ devices, wires: [cable('KV:PORT1', 'RIO:P2')] }, 'protocol-mismatch')).toHaveLength(1);
    // CC-Link IE フィールドは一般のスイッチングハブを通せない
    expect(issues({ devices, wires: [cable('HUB:P1', 'RIO:P1')] }, 'protocol-mismatch')).toHaveLength(1);
  });

  it('GT2710-VTBD は推定の消費電力を示し、Ethernet で iQ-R の CPU とつなげる', () => {
    expect(def('mitsubishi.gt2710-vtbd').estimated).toMatch(/消費電力/);
    const d: Diagram = { devices: [dev('BASE', 'mitsubishi.r35b'), dev('CPU', 'mitsubishi.r04cpu', ['BASE', 2]), dev('GOT', 'mitsubishi.gt2710-vtbd')], wires: [] };
    const port = resolveDevice(def('mitsubishi.r04cpu')).terminals.find((t) => t.connector?.kind === 'RJ45')!;
    expect(issues({ ...d, wires: [cable(`CPU:${port.id}`, 'GOT:LAN')] }, 'protocol-mismatch')).toEqual([]);
  });
});

describe('オムロン: NX102-9000・NB7W-TW01B', () => {
  it('NX102 は NX ユニットを 32 台まで連結でき、NX-PF0630 の I/O 電源で入力のコモンの極性が決まる', () => {
    expect(def('omron.nx102-9000').bus?.host?.slots).toBe(32);
    for (const t of ['omron.nx-pf0630', 'omron.nx-id5342', 'omron.nx-od5121']) expect(busAccepts(def('omron.nx102-9000'), def(t)), t).toBe(true);
    const d: Diagram = {
      devices: [
        dev('PSU1', 'generic.psu.dc24v'),
        dev('PLC1', 'omron.nx102-9000'),
        dev('PLC2', 'omron.nx-pf0630', ['PLC1', 1]),
        dev('PLC3', 'omron.nx-id5342', ['PLC1', 2]),
        dev('PX1', 'omron.e2e-x-b1d'),
      ],
      wires: [w('PSU1:+V1', 'PLC1:+'), w('PSU1:-V1', 'PLC1:-'), w('PSU1:+V2', 'PLC2:IOV1'), w('PSU1:-V2', 'PLC2:IOG1'), w('PSU1:+V1', 'PX1:BN'), w('PSU1:-V1', 'PX1:BU'), w('PX1:BK', 'PLC3:IN0')],
    };
    expect(issues(d, 'signal-polarity')).toHaveLength(1);
    expect(issues(d, 'no-power').filter((i) => i.devices.includes('PLC1'))).toEqual([]);
  });

  it('NX102 の PORT3（EtherCAT）に EtherNet/IP の機器をつなぐと指摘し、PORT1 は NB7W の LAN とつなげる', () => {
    const devices = [dev('PLC', 'omron.nx102-9000'), dev('PT', 'omron.nb7w-tw01b')];
    expect(issues({ devices, wires: [cable('PLC:PORT1', 'PT:LAN')] }, 'protocol-mismatch')).toEqual([]);
    expect(issues({ devices, wires: [cable('PLC:PORT3', 'PT:LAN')] }, 'protocol-mismatch')).toHaveLength(1);
  });
});

describe('シーメンス: CPU 1214C DC/DC/DC・KTP700 Basic PN', () => {
  it('I/O 表に入力 14 点・アナログ入力 2 点・出力 10 点が既定のアドレスで出る', () => {
    const sys = ioSystem({ devices: [dev('PLC', 'siemens.cpu1214c.dc-dc-dc')], wires: [] }, 'PLC', lookup)!;
    const pts = sys.units[0].points;
    expect(pts.filter((p) => p.dir === 'in').map((p) => p.address)).toEqual([...['0', '1', '2', '3', '4', '5', '6', '7'].map((b) => `I0.${b}`), ...['0', '1', '2', '3', '4', '5'].map((b) => `I1.${b}`), 'IW64', 'IW66']);
    expect(pts.filter((p) => p.dir === 'out').map((p) => p.address)).toEqual([...['0', '1', '2', '3', '4', '5', '6', '7'].map((b) => `Q0.${b}`), 'Q1.0', 'Q1.1']);
  });

  it('出力はソース（3L+ へ）で、0.5A/点', () => {
    const r = resolveDevice(def('siemens.cpu1214c.dc-dc-dc'));
    const outs = r.links.filter((l) => l.switch === 'output');
    expect(outs).toHaveLength(10);
    expect(outs.every((l) => l.to === '3L+' && l.ratedCurrent === 0.5)).toBe(true);
    expect(r.terminal('Q0.0')?.signal).toMatchObject({ dir: 'out', kind: 'pnp' });
  });

  it('1M を 0V にすると PNP 用（NPN のセンサーを指摘）、センサー電源出力の L+・M からセンサーに電源が届く', () => {
    const d = (sensor: string): Diagram => ({
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('PLC', 'siemens.cpu1214c.dc-dc-dc'), dev('PX1', sensor)],
      wires: [w('PSU1:+V1', 'PLC:L+'), w('PSU1:-V1', 'PLC:M'), w('PLC:SM', 'PLC:1M'), w('PLC:SL+', 'PX1:BN'), w('PLC:SM', 'PX1:BU'), w('PX1:BK', 'PLC:I0.0')],
    });
    expect(issues(d('omron.e2e-x-b1d'), 'signal-polarity')).toEqual([]);
    expect(issues(d('omron.e2e-x-c1'), 'signal-polarity')).toHaveLength(1);
    expect(issues(d('omron.e2e-x-b1d'), 'no-power').filter((i) => i.devices.includes('PX1'))).toEqual([]);
  });

  it('KTP700 の PROFINET ポートは S7-1200 とつなげ、EtherCAT のポートとは指摘する', () => {
    const devices = [dev('PLC', 'siemens.cpu1214c.dc-dc-dc'), dev('HMI', 'siemens.ktp700-basic-pn'), dev('NX', 'omron.nx102-9000')];
    expect(issues({ devices, wires: [cable('PLC:X1P1', 'HMI:X1')] }, 'protocol-mismatch')).toEqual([]);
    expect(issues({ devices, wires: [cable('NX:PORT3', 'HMI:X1')] }, 'protocol-mismatch')).toHaveLength(1);
  });
});

describe('MOXA: TCC-100・EDS-G205A-4PoE', () => {
  it('TCC-100 の RS-232 側はタッチパネルの RS-232 とつなげ、RS-422/485 側は RS-485 の機器（Modbus RTU）とつなげる', () => {
    const devices = [dev('CNV', 'moxa.tcc-100'), dev('GOT', 'mitsubishi.gt2510-vtbd'), dev('EM', 'mitsubishi.emu4-bd1-mb')];
    expect(issues({ devices, wires: [cable('GOT:RS232', 'CNV:RS232')] }, 'protocol-mismatch')).toEqual([]);
    expect(issues({ devices, wires: [cable('GOT:RS422', 'CNV:RS232')] }, 'protocol-mismatch')).toHaveLength(1);
    expect(issues({ devices, wires: [w('CNV:R+', 'EM:485+'), w('CNV:R-', 'EM:485-')] }, 'protocol-mismatch')).toEqual([]);
  });

  it('TCC-100 の RS-485 を DeviceNet の通信線につなぐと指摘する', () => {
    const d: Diagram = {
      devices: [dev('CNV', 'moxa.tcc-100'), dev('CPU', 'keyence.kv-8000.cpu'), dev('DN', 'keyence.kv-dn20', ['CPU', 1])],
      wires: [w('CNV:R+', 'DN:CAN_H')],
    };
    expect(issues(d, 'protocol-mismatch')).toHaveLength(1);
  });

  it('EDS-G205A-4PoE の消費電流は PoE 給電の合計で増える', () => {
    const d = def('moxa.eds-g205a-4poe');
    expect(resolveNum(d.loadCurrent, d, {})).toBeCloseTo(0.3, 6);
    // 0.3 + 60 / 24 / 0.9 = 3.08
    expect(resolveNum(d.loadCurrent, d, { poe: 60 })).toBeCloseTo(3.08, 6);
  });
});
