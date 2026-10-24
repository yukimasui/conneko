import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { getDeviceDefinition } from './registry';
import { fixUnavailableParams, paramLabel, paramOptions, unavailableParams, type DeviceDefinition } from './types';

/** 電圧で選べる容量が変わる機器（テスト用） */
const dev: DeviceDefinition = {
  type: 'test.param-options',
  name: 'テスト',
  model: 'T',
  category: 'load',
  labelPrefix: 'T',
  width: 10,
  height: 10,
  svg: '',
  terminals: [],
  params: [
    { key: 'voltage', label: '電圧', options: [{ value: 100 }, { value: 200 }], default: 200 },
    {
      key: 'kw',
      label: '容量',
      unit: 'kW',
      options: [{ value: 0.4 }, { value: 0.75 }, { value: 1.5 }],
      optionsFor: (p) => (p.voltage === 100 ? [{ value: 0.4 }, { value: 0.75 }] : [{ value: 0.4 }, { value: 0.75 }, { value: 1.5 }]),
      default: 1.5,
    },
  ],
};
const lookup = (t: string) => (t === dev.type ? dev : getDeviceDefinition(t));

describe('ほかのパラメータで変わる選択肢（#24）', () => {
  it('選べる選択肢は、ほかのパラメータの値で変わる', () => {
    const kw = dev.params![1];
    expect(paramOptions(dev, kw, { voltage: 100 }).map((o) => o.value)).toEqual([0.4, 0.75]);
    expect(paramOptions(dev, kw, {}).map((o) => o.value)).toEqual([0.4, 0.75, 1.5]);
  });

  it('選べなくなった値は、選べる値（既定値が選べなければ最初の値）に直す', () => {
    expect(unavailableParams(dev, { voltage: 100 }).map((x) => x.param.key)).toEqual(['kw']);
    expect(fixUnavailableParams(dev, { voltage: 100, kw: 1.5 })).toEqual({ voltage: 100, kw: 0.4 });
    const ok = { voltage: 100, kw: 0.75 };
    expect(fixUnavailableParams(dev, ok)).toBe(ok);
  });

  it('図面に選べない値が書いてあれば警告する', () => {
    const issues = checkDiagram({ devices: [{ id: 'T1', type: dev.type, x: 0, y: 0, params: { voltage: 100, kw: 1.5 } }], wires: [] }, lookup);
    const found = issues.filter((i) => i.rule === 'param-unavailable');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('容量「1.5kW」');
  });

  it('RCP6 の適応コントローラーは、高推力タイプでは P4 / P6 と表示する', () => {
    const rcp6 = getDeviceDefinition('iai.rcp6-sa')!;
    expect(paramLabel(rcp6, 'ctrl', 'pcon', { type: 'SA6C' })).toMatch(/^P3:/);
    expect(paramLabel(rcp6, 'ctrl', 'pcon', { type: 'SA8C' })).toMatch(/^P4:/);
    expect(paramLabel(rcp6, 'ctrl', 'rcon', { type: 'SA8C' })).toMatch(/^P6:/);
  });
});
