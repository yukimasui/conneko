import { describe, expect, it } from 'vitest';
import { mountedPositions } from '../model/bus';
import { getDeviceDefinition } from './registry';
import { resolveNum, type DeviceDefinition } from './types';

const base = { name: 'テスト', model: 'T', labelPrefix: 'T', svg: '', terminals: [] };
/** 親（右に 2 台まで装着できる） */
const host: DeviceDefinition = { ...base, type: 'test.host', category: 'plc', width: 50, height: 40, bus: { kind: 'test-bus', host: { slots: 2 } } };
/** 点数で幅が変わるユニット（16 点 30px・32 点 60px）。消費電流も点数で変わる */
const unit: DeviceDefinition = {
  ...base,
  type: 'test.unit',
  category: 'plc',
  width: 30,
  height: 40,
  size: (p) => ({ width: p.points === 32 ? 60 : 30, height: 40 }),
  params: [{ key: 'points', label: '点数', options: [{ value: 16 }, { value: 32 }], default: 16 }],
  bus: { kind: 'test-bus', load: { '5V': (p) => (p.points === 32 ? 0.2 : 0.1) } },
  loadCurrent: (p) => Number(p.points) / 100,
};
const lookup = (t: string) => [host, unit].find((d) => d.type === t) ?? getDeviceDefinition(t);

describe('外形・負荷電流・内部電源の消費をパラメータで変える（#1）', () => {
  it('NumOrParam は、パラメータから求める関数でも書ける（引数は既定値を補完済み）', () => {
    expect(resolveNum(unit.loadCurrent, unit, {})).toBe(0.16);
    expect(resolveNum(unit.loadCurrent, unit, { points: 32 })).toBe(0.32);
    expect(resolveNum(unit.bus!.load!['5V'], unit, { points: 32 })).toBe(0.2);
  });

  it('装着したユニットは、パラメータで変わる幅（size）で横に並べる', () => {
    const pos = mountedPositions(
      [
        { id: 'H1', type: 'test.host', x: 0, y: 0 },
        { id: 'U1', type: 'test.unit', x: 0, y: 0, mount: { device: 'H1', slot: 1 }, params: { points: 32 } },
        { id: 'U2', type: 'test.unit', x: 0, y: 0, mount: { device: 'H1', slot: 2 } },
      ],
      lookup,
    );
    expect(pos.get('U1')).toEqual({ x: 50, y: 0 });
    expect(pos.get('U2')).toEqual({ x: 110, y: 0 });
  });

  it('IAI MCON のモーター電源の電流は、既定では接続軸数から求める（1 軸あたり約 2A）', () => {
    const mcon = getDeviceDefinition('iai.mcon-c')!;
    expect(resolveNum(mcon.loadCurrent, mcon, { axes: 3 })).toBe(6);
    expect(resolveNum(mcon.loadCurrent, mcon, {})).toBe(8);
    expect(resolveNum(mcon.loadCurrent, mcon, { axes: 3, loadCurrent: 12 })).toBe(12);
  });
});
