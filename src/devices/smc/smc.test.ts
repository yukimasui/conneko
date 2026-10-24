import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import { buildModel } from '../../check/model';
import { airPressures } from '../../check/pneumatic';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { deviceDefinitions, getDeviceDefinition } from '../registry';
import { resolveDevice } from '../resolve';
import { deviceModel, type DeviceDefinition, type ParamValues, type TerminalDef } from '../types';

const port = (id: string, air: TerminalDef['air']): TerminalDef => ({ id, x: 0, y: 0, side: 'top', role: 'air', air });
/** 複動シリンダ（ポート 2 つ、φ6、0.05〜0.7MPa）。シリンダはアクチュエータ担当の機器を使わず、テスト用に置く */
const cylinder: DeviceDefinition = {
  type: 'test.cylinder',
  name: '',
  model: '',
  labelPrefix: 'CY',
  width: 10,
  height: 10,
  svg: '',
  category: 'actuator',
  terminals: [port('H', { kind: 'work', tubeOD: 6, thread: 'Rc1/8', minPressure: 0.05, maxPressure: 0.7 }), port('R', { kind: 'work', tubeOD: 6, thread: 'Rc1/8', minPressure: 0.05, maxPressure: 0.7 })],
};
const lookup = (type: string) => (type === cylinder.type ? cylinder : getDeviceDefinition(type));

let n = 0;
const tube = (from: string, to: string, od = 8): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `T${++n}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od };
};
const dev = (id: string, type: string, params?: ParamValues) => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const pressures = (d: Diagram) => airPressures(buildModel(d, lookup, () => {}));
// 開放排気の注意（air-exhaust-open）は、排気を省いた小さな回路で出るので、専用のテスト以外では見ない
const air = (d: Diagram) => checkDiagram(d, lookup).filter((i) => (i.rule.startsWith('air') && i.rule !== 'air-exhaust-open') || i.rule.startsWith('tube'));
const rules = (d: Diagram) => air(d).map((i) => `${i.rule}:${i.devices.join(',')}`);

const smc = deviceDefinitions.filter((d) => d.type.startsWith('smc.') && (d.category === 'air-supply' || d.category === 'air-fitting'));

describe('SMC の 3 点セット・エア周辺機器の定義', () => {
  it('エアの通り道・空圧回路図のポートは、どのパラメータでも存在するエアのポートを指す', () => {
    expect(smc.length).toBeGreaterThanOrEqual(24);
    for (const def of smc) {
      const variants: ParamValues[] = [{}];
      for (const p of def.params ?? []) for (const o of p.options) variants.push({ [p.key]: o.value });
      for (const v of variants) {
        const r = resolveDevice(def, v);
        const airIds = new Set(r.terminals.filter((t) => t.role === 'air').map((t) => t.id));
        for (const l of r.airLinks) {
          expect(airIds.has(l.from) && airIds.has(l.to), `${def.type} airLinks ${l.from}→${l.to}`).toBe(true);
        }
        expect(r.pneumatic, `${def.type} に pneumatic がない`).toBeDefined();
        for (const id of Object.values(r.pneumatic!.ports)) expect(airIds.has(id), `${def.type} pneumatic.ports ${id}`).toBe(true);
        expect(deviceModel(def, v)).not.toMatch(/undefined|NaN/);
      }
      expect(['air-supply', 'air-fitting']).toContain(def.category);
    }
  });

  it('型式をパラメータから組み立てる', () => {
    const m = (type: string, p?: ParamValues) => deviceModel(getDeviceDefinition(type)!, p);
    expect(m('smc.ac')).toBe('AC20-02G-B');
    expect(m('smc.ac', { body: '30-03', drain: 'C', gauge: 'E' })).toBe('AC30-03CE-B');
    expect(m('smc.ac-a')).toBe('AC20A-02G-B');
    expect(m('smc.ac-b', { body: '40-04' })).toBe('AC40B-04G-B');
    expect(m('smc.ac-d')).toBe('AC20D-02G-B');
    expect(m('smc.aw', { body: '30-02' })).toBe('AW30-02G-B');
    expect(m('smc.ar')).toBe('AR20-02G-B');
    expect(m('smc.af', { drain: 'C' })).toBe('AF20-02C-A');
    expect(m('smc.al')).toBe('AL20-02-A');
    expect(m('smc.afm')).toBe('AFM20-02-A');
    expect(m('smc.vhs', { body: '30-03' })).toBe('VHS30-03A');
    expect(m('smc.as2201f', { size: '02-08' })).toBe('AS2201F-02-08SA');
    expect(m('smc.as2201f', { size: 'M5-04' })).toBe('AS1201F-M5-04A');
    expect(m('smc.as2211f')).toBe('AS2211F-01-06SA');
    expect(m('smc.as-f.inline', { tubeOD: 4 })).toBe('AS1002F-04');
    expect(m('smc.kq2t', { tubeOD: 8 })).toBe('KQ2T08-00A');
    expect(m('smc.kq2u')).toBe('KQ2U06-00A');
    expect(m('smc.kq2r', { size: '4-6' })).toBe('KQ2R04-06A');
    expect(m('smc.an', { thread: '01' })).toBe('AN110-01');
    expect(m('smc.vhk2', { tubeOD: 8 })).toBe('VHK2-08F-08F');
    expect(m('smc.akh')).toBe('AKH06-00');
    expect(m('smc.ise20', { output: 'P', piping: 'C4H' })).toBe('ISE20-P-M-C4H-L');
    expect(m('smc.zse20')).toBe('ZSE20-N-M-C6H-L');
    expect(m('smc.zh', { nozzle: '07', supTube: 4, vacTube: 4 })).toBe('ZH07BS-04-04');
    expect(m('smc.zp', { dia: 32, form: 'B', material: 'S' })).toBe('ZP32BS');
  });

  it('空圧回路図の記号: 3 点セットの構成、スピードコントローラの自由流れの向き', () => {
    expect(resolveDevice(getDeviceDefinition('smc.ac')!).pneumatic).toMatchObject({ symbol: 'frl', units: ['filter', 'regulator', 'lubricator'], gauge: true });
    expect(resolveDevice(getDeviceDefinition('smc.ac-d')!).pneumatic).toMatchObject({ symbol: 'frl', units: ['filter-regulator', 'mist-separator'] });
    expect(resolveDevice(getDeviceDefinition('smc.aw')!).pneumatic).toMatchObject({ symbol: 'filter-regulator', gauge: true });
    expect(resolveDevice(getDeviceDefinition('smc.af')!).pneumatic).toEqual({ symbol: 'filter', ports: { in: 'IN', out: 'OUT' } });
    // メータアウト: チューブ（電磁弁）→ シリンダが自由流れ。メータイン: シリンダ → チューブが自由流れ
    expect(resolveDevice(getDeviceDefinition('smc.as2201f')!).pneumatic!.ports).toEqual({ in: 'TUBE', out: 'CYL' });
    expect(resolveDevice(getDeviceDefinition('smc.as2211f')!).pneumatic!.ports).toEqual({ in: 'CYL', out: 'TUBE' });
    expect(resolveDevice(getDeviceDefinition('smc.vhs')!).pneumatic).toEqual({ symbol: 'residual-valve', ports: { in: 'IN', out: 'OUT', exh: 'EXH' } });
  });
});

describe('SMC の機器を通るエアの圧力', () => {
  /** エア源（0.5MPa）→ 3 点セット → 残圧排気弁 → ティ → 電磁弁 → スピコン → シリンダ（ティの分岐に圧力スイッチ） */
  function line(frl = 'smc.aw', frlParams?: ParamValues): Diagram {
    return {
      devices: [
        dev('AIR1', 'generic.air-source'),
        dev('FR1', frl, frlParams),
        dev('VHS1', 'smc.vhs'),
        dev('SL1', 'smc.an', { thread: '01' }),
        dev('J1', 'smc.kq2t', { tubeOD: 8 }),
        dev('PS1', 'smc.ise20', { piping: 'C6H' }),
        dev('J2', 'smc.kq2r', { size: '6-8' }),
        dev('J3', 'smc.kq2r', { size: '6-8' }),
        dev('SOL1', 'smc.sy3120-5lz'),
        dev('SC1', 'smc.as2201f'),
        dev('SC2', 'smc.as2201f'),
        dev('CY1', 'test.cylinder'),
      ],
      wires: [
        tube('AIR1.OUT', 'FR1.IN'),
        tube('FR1.OUT', 'VHS1.IN'),
        tube('VHS1.EXH', 'SL1.IN', 8),
        tube('VHS1.OUT', 'J1.A'),
        tube('J1.C', 'J2.PLUG'),
        tube('J2.TUBE', 'PS1.P', 6),
        tube('J1.B', 'J3.PLUG'),
        tube('J3.TUBE', 'SOL1.P', 6),
        tube('SOL1.A', 'SC1.TUBE', 6),
        tube('SC1.CYL', 'CY1.H', 6),
        tube('SOL1.B', 'SC2.TUBE', 6),
        tube('SC2.CYL', 'CY1.R', 6),
      ],
    };
  }

  it('フィルタレギュレータ AW の設定圧力が、残圧排気弁・ティ・電磁弁・スピコンを通ってシリンダまで伝わる', () => {
    const p = pressures(line());
    expect(p.get('FR1:IN')).toBe(0.5);
    expect(p.get('FR1:OUT')).toBe(0.4);
    expect(p.get('VHS1:OUT')).toBe(0.4);
    expect(p.get('PS1:P')).toBe(0.4);
    expect(p.get('CY1:H')).toBe(0.4);
    expect(p.get('CY1:R')).toBe(0.4);
    // 残圧排気弁の EXH・サイレンサへは届かない
    expect(p.has('VHS1:EXH')).toBe(false);
    expect(p.has('SL1:IN')).toBe(false);
    const p2 = pressures(line('smc.aw', { setPressure: 0.25 }));
    expect(p2.get('CY1:H')).toBe(0.25);
  });

  it('つながった回路（φ8 の主管から異径継手で φ6 に落とす）では、エアの指摘が出ない', () => {
    expect(rules(line())).toEqual([]);
  });

  it('3 点セット AC の各組み合わせでも設定圧力が二次側に伝わる。ルブリケータ・フィルタだけなら減圧しない', () => {
    for (const t of ['smc.ac', 'smc.ac-a', 'smc.ac-b', 'smc.ac-c', 'smc.ac-d', 'smc.ar']) {
      expect(pressures(line(t, { setPressure: 0.35 })).get('CY1:H'), t).toBe(0.35);
    }
    for (const t of ['smc.af', 'smc.al', 'smc.afm']) expect(pressures(line(t)).get('CY1:H'), t).toBe(0.5);
  });

  it('レギュレータの一次側が設定圧力 + 0.05MPa に届かなければ指摘する', () => {
    expect(rules(line('smc.aw', { setPressure: 0.5 }))).toContain('air-under-pressure:FR1');
    expect(rules(line('smc.aw', { setPressure: 0.45 }))).not.toContain('air-under-pressure:FR1');
  });

  it('残圧排気弁・逆止弁を逆向きにつなぐと指摘する', () => {
    const d = line();
    d.wires[1] = tube('FR1.OUT', 'VHS1.OUT');
    d.wires[3] = tube('VHS1.IN', 'J1.A');
    expect(rules(d).some((r) => r.startsWith('air-reversed:VHS1'))).toBe(true);
    // 逆につないだ機器より下流の「届かない」は、逆につないだ指摘にまとめる
    expect(rules(d).some((r) => r.startsWith('air-no-supply'))).toBe(false);

    const cv = (from: string, to: string): Diagram => ({
      devices: [dev('AIR1', 'generic.air-source', { tubeOD: 6 }), dev('CV1', 'smc.akh'), dev('CY1', 'test.cylinder')],
      wires: [tube('AIR1.OUT', from, 6), tube(to, 'CY1.H', 6)],
    });
    expect(pressures(cv('CV1.IN', 'CV1.OUT')).get('CY1:H')).toBe(0.5);
    expect(pressures(cv('CV1.OUT', 'CV1.IN')).has('CY1:H')).toBe(false);
    expect(rules(cv('CV1.OUT', 'CV1.IN')).some((r) => r.startsWith('air-reversed:CV1'))).toBe(true);
  });

  it('スピコン・フィンガバルブ・ユニオン Y はどちら向きにも通す', () => {
    for (const [type, a, b] of [
      ['smc.as-f.inline', 'IN', 'OUT'],
      ['smc.vhk2', 'IN', 'OUT'],
      ['smc.kq2u', 'B', 'A'],
    ]) {
      for (const [x, y] of [
        [a, b],
        [b, a],
      ]) {
        const d: Diagram = {
          devices: [dev('AIR1', 'generic.air-source', { tubeOD: 6 }), dev('X1', type), dev('CY1', 'test.cylinder')],
          wires: [tube('AIR1.OUT', `X1.${x}`, 6), tube(`X1.${y}`, 'CY1.H', 6)],
        };
        expect(pressures(d).get('CY1:H'), `${type} ${x}→${y}`).toBe(0.5);
      }
    }
  });

  it('真空エジェクタ: SUP にエアを入れ、V を吸着パッド・真空用圧力スイッチとつなぐ（真空は圧力の計算の対象外）', () => {
    const d: Diagram = {
      devices: [
        dev('AIR1', 'generic.air-source', { tubeOD: 6 }),
        dev('EJ1', 'smc.zh'),
        dev('J1', 'smc.kq2t', { tubeOD: 6 }),
        dev('PAD1', 'smc.zp', { tubeOD: 6 }),
        dev('VS1', 'smc.zse20'),
      ],
      wires: [tube('AIR1.OUT', 'EJ1.SUP', 6), tube('EJ1.V', 'J1.A', 6), tube('J1.B', 'PAD1.V', 6), tube('J1.C', 'VS1.P', 6)],
    };
    const p = pressures(d);
    expect(p.get('EJ1:SUP')).toBe(0.5);
    expect(p.has('EJ1:V')).toBe(false);
    expect(rules(d)).toEqual([]);
  });
});

describe('デジタル圧力スイッチ ISE20 の電気の端子', () => {
  it('茶 DC+・青 DC−・黒 OUT1。出力は NPN なら黒 → 青、PNP なら黒 → 茶', () => {
    const def = getDeviceDefinition('smc.ise20')!;
    const npn = resolveDevice(def, { output: 'N' });
    expect(npn.terminals.filter((t) => t.role !== 'air').map((t) => t.id)).toEqual(['BN', 'BK', 'BU']);
    expect(npn.terminal('BN')?.accepts).toMatchObject({ system: 'DC', conductors: ['+'] });
    expect(npn.terminal('BK')?.signal).toEqual({ dir: 'out', kind: 'npn' });
    expect(npn.links).toEqual([{ from: 'BK', to: 'BU', switch: 'output', ratedCurrent: 0.08 }]);
    const pnp = resolveDevice(def, { output: 'P' });
    expect(pnp.terminal('BK')?.signal).toEqual({ dir: 'out', kind: 'pnp' });
    expect(pnp.links[0].to).toBe('BN');
    // 配管仕様でポートの継手が変わる
    expect(resolveDevice(def, { piping: 'C4H' }).air.get('P')?.tubeOD).toBe(4);
    expect(resolveDevice(def, { piping: '01' }).air.get('P')).toMatchObject({ kind: 'in', thread: 'R1/8' });
  });
});
