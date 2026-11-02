/**
 * 空圧・真空機器（CKD・コガネイ・SMC の追加分。docs/air-catalog.md）の定義と、配管・配線のチェック。
 * - 型式の組み立て、CKD・コガネイのシリンダスイッチの端子と定格
 * - 電磁弁 → スピコン → シリンダの配管で圧力が届き、エアの指摘が出ないこと（単体・マニホールド M4GA1）
 * - PLC の出力 → 電磁弁のコイルの配線（極性あり・無極性）
 * - 2 ポート弁・電空レギュレータ・真空ユニットの空圧回路図の記号
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { buildModel } from '../check/model';
import { airPressures } from '../check/pneumatic';
import { bomRows } from '../export/reports';
import type { Diagram, DiagramWire } from '../model/diagram';
import { buildSchematic } from '../schematic/layout';
import { hasEstimates } from './estimates';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { deviceModel, type DeviceDefinition, type ParamValues } from './types';

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const model = (type: string, p: ParamValues = {}) => deviceModel(def(type), p);

/** このテストで扱う、追加した機器 */
const ADDED = [
  'ckd.4ga119',
  'ckd.4ga129',
  'ckd.4ga110',
  'ckd.4ga120',
  'ckd.4ga1-mp',
  'ckd.m4ga1',
  'ckd.scpd3',
  'ckd.ssd2',
  'ckd.cmk2',
  'ckd.sc3w',
  'koganei.f10t1',
  'koganei.f10t2',
  'koganei.cda',
  'smc.mxq',
  'smc.my1b',
  'smc.itv1000',
  'smc.vx21',
  'smc.zk2',
];

let seq = 0;
/** 'CY1.SW1.BK' のように、最初の '.' までを機器名とする */
const ref = (s: string) => ({ device: s.slice(0, s.indexOf('.')), terminal: s.slice(s.indexOf('.') + 1) });
const tube = (from: string, to: string, od = 6): DiagramWire => ({ id: `T${++seq}`, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od });
const wire = (from: string, to: string): DiagramWire => ({ id: `W${++seq}`, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0.75, wireType: 'KIV' });
const dev = (id: string, type: string, params?: ParamValues, extra: object = {}) => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}), ...extra });
const pressures = (d: Diagram) => airPressures(buildModel(d, getDeviceDefinition, () => {}));
/** エアの指摘（開放排気の注意は小さな回路で必ず出るので除く） */
const airRules = (d: Diagram) =>
  checkDiagram(d, getDeviceDefinition)
    .filter((i) => (i.rule.startsWith('air') && i.rule !== 'air-exhaust-open') || i.rule.startsWith('tube'))
    .map((i) => `${i.rule}:${i.devices.join(',')}`);
const errorRules = (d: Diagram) =>
  checkDiagram(d, getDeviceDefinition)
    .filter((i) => i.severity === 'error')
    .map((i) => i.rule);

describe('追加した空圧・真空機器の定義', () => {
  it('すべて登録され、電磁弁・シリンダ・マニホールドなど既存のファミリーに入る', () => {
    for (const t of ADDED) expect(getDeviceDefinition(t), t).toBeDefined();
    expect(familyOf('ckd.4ga119')?.name).toBe('電磁弁');
    expect(familyOf('ckd.4ga120')?.name).toBe('電磁弁');
    expect(familyOf('koganei.f10t2')?.name).toBe('電磁弁');
    expect(familyOf('smc.vx21')?.name).toBe('電磁弁');
    expect(familyOf('ckd.m4ga1')?.name).toBe('マニホールド');
    for (const t of ['ckd.scpd3', 'ckd.ssd2', 'ckd.cmk2', 'koganei.cda', 'smc.mxq', 'smc.my1b']) expect(familyOf(t)?.name, t).toBe('エアシリンダ');
    expect(familyOf('ckd.sc3w')?.name).toBe('スピードコントローラ');
    expect(familyOf('smc.zk2')?.name).toBe('真空機器');
  });

  it('型式をパラメータから組み立てる', () => {
    expect(model('ckd.4ga119')).toBe('4GA119-C6-E2-3');
    expect(model('ckd.4ga129', { portAB: 4 })).toBe('4GA129-C4-E2-3');
    expect(model('ckd.scpd3')).toBe('SCPD3-00-16-50');
    expect(model('ckd.scpd3', { switch: 'T2H' })).toBe('SCPD3-L-00-16-50-T2H-D');
    expect(model('ckd.scpd3', { switch: 'T3H', switchPos: 'rod', lead: '3' })).toBe('SCPD3-L-00-16-50-T3H3-R');
    expect(model('ckd.ssd2', { switch: 'magnet', bore: 32, stroke: 30, mount: 'LB' })).toBe('SSD2-L-LB-32-30');
    expect(model('ckd.cmk2', { switch: 'T0H', switchPos: 'head' })).toBe('CMK2-L-00-25-100-T0H-H');
    expect(model('koganei.cda', { switch: 'ZE135' })).toBe('CDA16×20-B-ZE135A2');
    expect(model('koganei.cda', { switch: 'ZE155', lead: '2', switchPos: 'head' })).toBe('CDA16×20-B-ZE255A1');
    expect(model('koganei.f10t1')).toBe('F10T1-A1 DC24V');
    expect(model('ckd.sc3w', { size: '8-8' })).toBe('SC3W-8-8');
    expect(model('smc.mxq', { switch: 'M9N', lead: 'L' })).toBe('MXQ16-20-M9NL');
    expect(model('smc.my1b', { bore: 20, stroke: 500, switch: 'M9BW', switchPos: 'rod' })).toBe('MY1B20-500Z-M9BWS');
    expect(model('smc.itv1000', { range: '5', outMax: 0.5, input: '3', monitor: '1', port: '2', cable: 'L' })).toBe('ITV1050-312L');
    expect(model('smc.vx21', { port: '02' })).toBe('VX212AZ1A');
    expect(model('smc.zk2', { nozzle: '07', vacTube: 4 })).toBe('ZK2A07K5N-04');
  });

  it('資料で確かめられなかった値を含む機器は、推定を含むと示す', () => {
    for (const t of ADDED) expect(hasEstimates(def(t)), t).toBe(true);
  });

  it('電磁弁のコイルは DC24V で、消費電流を負荷電流に持つ', () => {
    const r = resolveDevice(def('ckd.4ga119'));
    expect(r.terminal('+')?.accepts).toMatchObject({ system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+'] });
    expect(def('ckd.4ga119').loadCurrent).toBe(0.025);
    expect(def('koganei.f10t1').loadCurrent).toBeCloseTo(0.023, 3);
    expect(resolveDevice(def('ckd.4ga129')).terminals.filter((t) => t.role === 'input').map((t) => t.id)).toEqual(['A+', 'A-', 'B+', 'B-']);
    // 使用圧力範囲はシングル・ダブルで違う
    expect(resolveDevice(def('ckd.4ga119')).air.get('P')).toMatchObject({ minPressure: 0.2, maxPressure: 0.7, thread: 'Rc1/8' });
    expect(resolveDevice(def('koganei.f10t1')).air.get('P')).toMatchObject({ minPressure: 0.2, thread: 'M5' });
  });
});

describe('CKD・コガネイのシリンダスイッチ', () => {
  it('種類の選択肢はメーカーのもの。端子の線色・出力の内部経路は SMC と同じ作り', () => {
    const sw = def('ckd.scpd3').params!.find((p) => p.key === 'switch')!;
    expect(sw.label).toBe('シリンダスイッチ');
    expect(sw.options.map((o) => o.value)).toEqual(['none', 'magnet', 'T2H', 'T3H', 'T3PH', 'T2YH', 'T3YH', 'T0H']);
    const r = resolveDevice(def('ckd.scpd3'), { switch: 'T3H' });
    expect(r.terminals.map((t) => t.id)).toEqual(['HEAD', 'ROD', 'SW1.BN', 'SW1.BK', 'SW1.BU', 'SW2.BN', 'SW2.BK', 'SW2.BU']);
    // T3H: 電源 DC10〜28V、負荷電流 100mA 以下
    expect(r.terminal('SW1.BN')?.accepts).toMatchObject({ minVoltage: 10, maxVoltage: 28 });
    expect(r.links[0]).toEqual({ from: 'SW1.BK', to: 'SW1.BU', switch: 'output', ratedCurrent: 0.1 });
    // T2H: 2 線式、漏れ電流 1mA・内部降下電圧 4V、負荷電流 20mA 以下
    const t2h = resolveDevice(def('ckd.scpd3'), { switch: 'T2H' });
    expect(t2h.terminal('SW1.BN')?.signal).toEqual({ dir: 'out', kind: '2wire', leakCurrent: 1, residualVoltage: 4 });
    expect(t2h.links[0].ratedCurrent).toBe(0.02);
    // T3PH は PNP（黒 → 茶）
    expect(resolveDevice(def('ckd.cmk2'), { switch: 'T3PH' }).links[0]).toMatchObject({ from: 'SW1.BK', to: 'SW1.BN' });
    // 推定の定格のスイッチは端子の説明に書く
    expect(resolveDevice(def('ckd.cmk2'), { switch: 'T3PH' }).terminal('SW1.BK')?.note).toMatch(/推定/);
    expect(resolveDevice(def('koganei.cda'), { switch: 'ZE155' }).terminal('SW2.BK')).toMatchObject({ signal: { dir: 'out', kind: 'npn' }, hint: '前進端 出力' });
    // 空圧回路図にスイッチの出力端子を書く
    expect(resolveDevice(def('ckd.ssd2'), { switch: 'T2H' }).pneumatic?.cylinder).toMatchObject({ magnet: true, switches: { head: 'SW1.BN', rod: 'SW2.BN' } });
  });

  it('SMC 以外のシリンダには SMC のスピードコントローラを直付けするパラメータを出さない', () => {
    for (const t of ['ckd.scpd3', 'ckd.ssd2', 'ckd.cmk2', 'koganei.cda']) {
      expect(def(t).params!.some((p) => p.key === 'speedController'), t).toBe(false);
      expect(def(t).maker).not.toBe('SMC');
    }
    expect(def('smc.cm2').params!.some((p) => p.key === 'speedController')).toBe(true);
  });

  it('T3H（NPN）はプラスコモンの KV 入力につなぐとエラーがなく、マイナスコモンなら極性の誤り', () => {
    const d = (com: '+V1' | '-V1'): Diagram => ({
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('IN1', 'keyence.kv-b16xc'), dev('CY1', 'ckd.ssd2', { switch: 'T3H' })],
      wires: [
        wire(`PSU1.${com}`, 'IN1.C0'),
        wire('PSU1.+V1', 'CY1.SW1.BN'),
        wire('PSU1.-V1', 'CY1.SW1.BU'),
        wire('CY1.SW1.BK', 'IN1.0'),
        wire('PSU1.+V1', 'CY1.SW2.BN'),
        wire('PSU1.-V1', 'CY1.SW2.BU'),
        wire('CY1.SW2.BK', 'IN1.1'),
      ],
    });
    expect(errorRules(d('+V1'))).toEqual([]);
    expect(errorRules(d('-V1'))).toContain('signal-polarity');
  });
});

describe('電磁弁 → シリンダの配管', () => {
  it('CKD 4GA119 → SC3W（メータアウト）→ SSD2 で圧力が届き、エアの指摘が出ない', () => {
    const d: Diagram = {
      devices: [
        dev('AIR1', 'generic.air-source', { tubeOD: 6 }),
        dev('SOL1', 'ckd.4ga119'),
        dev('SC1', 'ckd.sc3w', { size: 'M5-6' }),
        dev('SC2', 'ckd.sc3w', { size: 'M5-6' }),
        dev('CY1', 'ckd.ssd2'),
      ],
      wires: [tube('AIR1.OUT', 'SOL1.P'), tube('SOL1.A', 'SC1.TUBE'), tube('SC1.CYL', 'CY1.HEAD'), tube('SOL1.B', 'SC2.TUBE'), tube('SC2.CYL', 'CY1.ROD')],
    };
    const p = pressures(d);
    expect(p.get('SOL1:A')).toBe(0.5);
    expect(p.get('CY1:HEAD')).toBe(0.5);
    expect(p.get('CY1:ROD')).toBe(0.5);
    expect(airRules(d)).toEqual([]);
    // ねじの合わないスピコン（R1/8 のおねじを M5 のポートへ）は指摘する
    d.devices[2] = dev('SC1', 'ckd.sc3w', { size: '6-6' });
    expect(airRules(d)).toContain('air-thread-mismatch:SC1,CY1');
  });

  it('コガネイ F10T2 → CDA、SMC MXQ・MY1B も A・B に 1 本ずつつなげば指摘が出ない。同じポートにつなぐと指摘する', () => {
    for (const [cy, a, b, od] of [
      ['koganei.cda', 'HEAD', 'ROD', 6],
      ['smc.mxq', 'HEAD', 'ROD', 4],
      ['smc.my1b', 'L', 'R', 6],
    ] as const) {
      const d: Diagram = {
        devices: [dev('AIR1', 'generic.air-source', { tubeOD: 4 }), dev('SOL1', 'koganei.f10t2', { portAB: od }), dev('CY1', cy)],
        wires: [tube('AIR1.OUT', 'SOL1.P', 4), tube('SOL1.A', `CY1.${a}`, od), tube('SOL1.B', `CY1.${b}`, od)],
      };
      expect(pressures(d).get(`CY1:${a}`), cy).toBe(0.5);
      expect(airRules(d), cy).toEqual([]);
      d.wires[2] = tube('SOL1.A', `CY1.${b}`, od);
      expect(airRules(d), cy).toContain('air-cylinder-valve:CY1,SOL1');
    }
  });

  it('マニホールド M4GA1: 装着した弁の P・R はマニホールドの P・R につながり、連の A・B からシリンダへ圧力が届く', () => {
    const d: Diagram = {
      devices: [
        dev('AIR1', 'generic.air-source', { tubeOD: 8 }),
        dev('MF1', 'ckd.m4ga1'),
        dev('SOL1', 'ckd.4ga110', undefined, { mount: { device: 'MF1', slot: 1 } }),
        dev('SOL2', 'ckd.4ga120', undefined, { mount: { device: 'MF1', slot: 2 } }),
        dev('BP1', 'ckd.4ga1-mp', undefined, { mount: { device: 'MF1', slot: 3 } }),
        dev('CY1', 'ckd.cmk2'),
        dev('CY2', 'ckd.scpd3', { fitting: 6 }),
      ],
      wires: [
        tube('AIR1.OUT', 'MF1.P', 8),
        tube('SOL1.A', 'CY1.HEAD'),
        tube('SOL1.B', 'CY1.ROD'),
        tube('SOL2.A', 'CY2.HEAD'),
        tube('SOL2.B', 'CY2.ROD'),
      ],
    };
    const p = pressures(d);
    expect(p.get('SOL1:P')).toBe(0.5);
    expect(p.get('CY1:HEAD')).toBe(0.5);
    expect(p.get('CY2:ROD')).toBe(0.5);
    expect(airRules(d)).toEqual([]);
    // 連数・切換えの混在（8）が型式に入る
    const bom = bomRows(d, getDeviceDefinition);
    expect(bom.some((r) => r.model === 'M4GA180-C6-E2-3-3')).toBe(true);
    // 装着していない弁は指摘する
    const loose: Diagram = { ...d, devices: d.devices.map((x) => (x.id === 'SOL1' ? dev('SOL1', 'ckd.4ga110') : x)) };
    expect(airRules(loose)).toContain('air-not-mounted:SOL1');
  });

  it('電空レギュレータ ITV1000 の出力は、使う最大の出力圧力（outMax）に下げて届く。供給が足りなければ指摘する', () => {
    const d = (supply: number, outMax: number): Diagram => ({
      devices: [dev('AIR1', 'generic.air-source', { tubeOD: 6, pressure: supply }), dev('EPR1', 'smc.itv1000', { outMax }), dev('CY1', 'ckd.cmk2')],
      wires: [tube('AIR1.OUT', 'EPR1.IN'), tube('EPR1.OUT', 'CY1.HEAD')],
    });
    expect(pressures(d(0.5, 0.3)).get('CY1:HEAD')).toBe(0.3);
    expect(airRules(d(0.5, 0.3)).filter((r) => r.includes('EPR1'))).toEqual([]);
    expect(airRules(d(0.5, 0.5))).toContain('air-under-pressure:EPR1');
    // 0.5MPa の機種では 0.5MPa を超える出力圧力は選べない
    expect(def('smc.itv1000').params!.find((p) => p.key === 'outMax')!.optionsFor!({ range: '3' }).map((o) => o.value)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it('2 ポート電磁弁 VX21 は IN → OUT の向きだけ通し、真空ユニット ZK2 の V は圧力の計算の対象外', () => {
    const blow: Diagram = {
      devices: [dev('AIR1', 'generic.air-source', { tubeOD: 8 }), dev('SOL1', 'smc.vx21'), dev('J1', 'smc.kq2u', { tubeOD: 8 })],
      wires: [tube('AIR1.OUT', 'SOL1.IN', 8), tube('SOL1.OUT', 'J1.A', 8)],
    };
    expect(pressures(blow).get('J1:A')).toBe(0.5);
    blow.wires = [tube('AIR1.OUT', 'SOL1.OUT', 8), tube('SOL1.IN', 'J1.A', 8)];
    expect(pressures(blow).has('J1:A')).toBe(false);
    expect(airRules(blow).some((r) => r.startsWith('air-reversed:SOL1'))).toBe(true);

    const vac: Diagram = {
      devices: [dev('AIR1', 'generic.air-source', { tubeOD: 6 }), dev('EJ1', 'smc.zk2'), dev('PAD1', 'smc.zp', { tubeOD: 6 })],
      wires: [tube('AIR1.OUT', 'EJ1.SUP'), tube('EJ1.V', 'PAD1.V')],
    };
    expect(pressures(vac).get('EJ1:SUP')).toBe(0.5);
    expect(pressures(vac).has('EJ1:V')).toBe(false);
    expect(airRules(vac)).toEqual([]);
  });
});

describe('PLC の出力 → 電磁弁のコイルの配線', () => {
  /** KV-B16TCP（ソース出力: COM に +24V）の出力 0〜3 で、電磁弁のコイルを駆動する */
  function plc(sol: string, coil: [string, string], devices: ReturnType<typeof dev>[] = []): Diagram {
    return {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('OUT1', 'keyence.kv-b16tcp'), dev('SOL1', sol), ...devices],
      wires: [wire('PSU1.+V1', 'OUT1.C0'), wire('OUT1.0', `SOL1.${coil[0]}`), wire(`SOL1.${coil[1]}`, 'PSU1.-V1')],
    };
  }

  it('極性のあるコイル（CKD 4GA1・コガネイ F10・SMC ZK2）は + を出力、− を 0V につなぐとエラーがなく、逆なら極性の誤り', () => {
    for (const [type, plus, minus] of [
      ['ckd.4ga119', '+', '-'],
      ['ckd.4ga129', 'A+', 'A-'],
      ['koganei.f10t1', '+', '-'],
      ['smc.zk2', 'S+', 'S-'],
    ] as const) {
      expect(errorRules(plc(type, [plus, minus])), type).toEqual([]);
      expect(errorRules(plc(type, [minus, plus])), type).toContain('conductor-mismatch');
    }
  });

  it('マニホールドに装着した弁のコイルも、連ごとのリード線で配線を確かめる', () => {
    const d = plc('ckd.4ga120', ['B+', 'B-'], [dev('MF1', 'ckd.m4ga1')]);
    d.devices[2] = dev('SOL1', 'ckd.4ga120', undefined, { mount: { device: 'MF1', slot: 1 } });
    expect(errorRules(d)).toEqual([]);
    d.wires[1] = wire('OUT1.0', 'SOL1.B-');
    d.wires[2] = wire('SOL1.B+', 'PSU1.-V1');
    expect(errorRules(d)).toContain('conductor-mismatch');
  });

  it('VX21 のコイルは無極性（どちら向きでもエラーなし）。AC の電源につなぐと電源種別の誤り', () => {
    expect(errorRules(plc('smc.vx21', ['C1', 'C2']))).toEqual([]);
    expect(errorRules(plc('smc.vx21', ['C2', 'C1']))).toEqual([]);
    const ac: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('SOL1', 'smc.vx21')],
      wires: [wire('PS1.L', 'SOL1.C1'), wire('SOL1.C2', 'PS1.N')],
    };
    expect(errorRules(ac)).toContain('system-mismatch');
  });

  it('電空レギュレータ ITV1000: +24V・GND と、PLC のアナログ出力（電圧）を入力信号へ', () => {
    const r = resolveDevice(def('smc.itv1000'), { input: '0', monitor: '4' });
    expect(r.terminal('WH')?.signal).toEqual({ dir: 'in', kind: 'analog-i', ref: 'BU' });
    expect(r.terminal('BK')?.signal).toEqual({ dir: 'out', kind: 'analog-i', ref: 'BU' });
    expect(r.terminal('BN')?.accepts).toMatchObject({ system: 'DC', conductors: ['+'] });
    // スイッチ出力 NPN は黒 → 青
    expect(resolveDevice(def('smc.itv1000'), { monitor: '2' }).links).toEqual([{ from: 'BK', to: 'BU', switch: 'output', ratedCurrent: 0.08 }]);
    const d: Diagram = {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('EPR1', 'smc.itv1000')],
      wires: [wire('PSU1.+V1', 'EPR1.BN'), wire('PSU1.-V1', 'EPR1.BU')],
    };
    expect(errorRules(d)).toEqual([]);
    d.wires = [wire('PSU1.-V1', 'EPR1.BN'), wire('PSU1.+V1', 'EPR1.BU')];
    expect(errorRules(d)).toContain('conductor-mismatch');
  });
});

describe('空圧回路図の記号', () => {
  it('2 ポート弁・電空レギュレータ・CKD の電磁弁とシリンダを描ける', () => {
    expect(resolveDevice(def('smc.vx21')).pneumatic).toMatchObject({ symbol: 'valve', ports: { '1': 'IN', '2': 'OUT' }, valve: { ways: 2 } });
    expect(resolveDevice(def('smc.itv1000')).pneumatic).toEqual({ symbol: 'regulator', ports: { in: 'IN', out: 'OUT' } });
    expect(resolveDevice(def('smc.zk2')).pneumatic).toEqual({ symbol: 'vacuum-ejector', ports: { in: 'SUP', vac: 'V', exh: 'EXH' } });
    expect(resolveDevice(def('ckd.4ga129')).pneumatic?.valve).toMatchObject({ ways: 5, operators: { a: 'solenoid', b: 'solenoid' }, solenoids: { a: 'A+', b: 'B+' } });
    const d: Diagram = {
      devices: [
        dev('AIR1', 'generic.air-source', { tubeOD: 8 }),
        dev('EPR1', 'smc.itv1000', { tubeOD: 8 }),
        dev('SOL1', 'smc.vx21'),
        dev('SOL2', 'ckd.4ga119'),
        dev('CY1', 'ckd.ssd2', { switch: 'T2H' }),
        dev('EJ1', 'smc.zk2'),
      ],
      wires: [
        tube('AIR1.OUT', 'EPR1.IN', 8),
        tube('EPR1.OUT', 'SOL1.IN', 8),
        tube('AIR1.OUT', 'SOL2.P'),
        tube('SOL2.A', 'CY1.HEAD'),
        tube('SOL2.B', 'CY1.ROD'),
        tube('AIR1.OUT', 'EJ1.SUP'),
      ],
      schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] },
    };
    const page = buildSchematic(d, getDeviceDefinition).doc.sheets[0];
    const texts = page.texts.map((t) => t.text);
    // 真空エジェクタの記号は空圧回路図の対象外（既存の ZH と同じ。置いても描画で落ちないことだけ確かめる）
    for (const id of ['EPR1', 'SOL1', 'SOL2', 'CY1']) expect(texts, id).toContain(id);
    expect(texts).toContain('SSD2-L-00-25-20-T2H-D');
  });
});
