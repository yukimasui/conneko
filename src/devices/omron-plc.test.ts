/**
 * オムロン NX1P2・NX ユニットと、フエニックス・コンタクトの端子台の機器定義の整合性と、代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { busAccepts } from '../model/bus';
import type { Diagram, DiagramWire } from '../model/diagram';
import { parseBridges } from './phoenix/terminal';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { deviceAccessories, type DeviceDefinition } from './types';
import { paramVariants, validateDefinition } from './validate';

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const lookup = (t: string) => getDeviceDefinition(t);

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};

const TYPES = [
  'omron.nx1p2-1140dt',
  'omron.nx1p2-1140dt1',
  'omron.nx1p2-9024dt',
  'omron.nx-pf0630',
  'omron.nx-id5342',
  'omron.nx-od5121',
  'phoenix.pt-2.5',
  'phoenix.ut-2.5',
  'phoenix.pt-2.5-pe',
];

describe('オムロン PLC・フエニックス・コンタクト端子台の機器定義', () => {
  it.each(TYPES)('%s: すべてのパラメーターの組で定義が整合している', (t) => {
    const d = def(t);
    for (const v of paramVariants(d)) expect(validateDefinition(d, v), JSON.stringify(v)).toEqual([]);
  });

  it('NX1P2 の内蔵 I/O の点数とコモン', () => {
    const r = resolveDevice(def('omron.nx1p2-1140dt'));
    expect(r.terminals.filter((t) => t.signal?.dir === 'in')).toHaveLength(24);
    expect(r.links.filter((l) => l.switch === 'output')).toHaveLength(16);
    expect(r.links).toContainEqual({ from: 'OUT07', to: 'C0', switch: 'output', ratedCurrent: 0.3 });
    expect(r.links).toContainEqual({ from: 'OUT08', to: 'C1', switch: 'output', ratedCurrent: 0.3 });
    expect(r.commonLimits).toEqual([
      { common: 'C0', current: 1.8 },
      { common: 'C1', current: 1.8 },
    ]);
    const r24 = resolveDevice(def('omron.nx1p2-9024dt'));
    expect(r24.terminals.filter((t) => t.signal?.dir === 'in')).toHaveLength(14);
    expect(r24.links.filter((l) => l.switch === 'output')).toHaveLength(10);
    // PNP 出力（DT1）はコモンが +V
    const pnp = resolveDevice(def('omron.nx1p2-1140dt1'));
    expect(pnp.terminal('OUT00')?.signal?.kind).toBe('pnp');
    expect(pnp.accepts.get('C0')?.[0].conductors).toEqual(['+']);
    expect(pnp.accepts.get('0V0')?.[0].conductors).toEqual(['-']);
  });

  it('NX1P2 の型式は制御軸数のパラメータで変わる', () => {
    const d = def('omron.nx1p2-1140dt');
    expect(d.modelOf?.({ engine: '10' })).toBe('NX1P2-1040DT');
    expect(def('omron.nx1p2-1140dt1').modelOf?.({ engine: '11' })).toBe('NX1P2-1140DT1');
  });

  it('NX ユニットは NX1P2 に連結できる', () => {
    for (const t of ['omron.nx-pf0630', 'omron.nx-id5342', 'omron.nx-od5121']) {
      expect(busAccepts(def('omron.nx1p2-1140dt'), def(t)), t).toBe(true);
      expect(busAccepts(def('omron.nx1p2-9024dt'), def(t)), t).toBe(true);
    }
  });
});

describe('NX バスの I/O 電源（増設 I/O 電源ユニット NX-PF0630 から入出力ユニットへ）', () => {
  /** NX1P2 に NX-PF0630（I/O 電源を配線するかは ioPower）と NX-ID5342 を連結し、PNP のセンサーを入力 IN0 につなぐ */
  const d = (withPf: boolean, ioPower: boolean): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'PLC1', type: 'omron.nx1p2-1140dt', x: 0, y: 0 },
      ...(withPf ? [{ id: 'PLC2', type: 'omron.nx-pf0630', x: 0, y: 0, mount: { device: 'PLC1', slot: 1 } }] : []),
      { id: 'PLC3', type: 'omron.nx-id5342', x: 0, y: 0, mount: { device: 'PLC1', slot: 2 } },
      { id: 'PX1', type: 'omron.e2e-x-b1d', x: 0, y: 0 },
    ],
    wires: [
      w('PSU1.+V1', 'PLC1.+'),
      w('PSU1.-V1', 'PLC1.-'),
      ...(withPf && ioPower ? [w('PSU1.+V2', 'PLC2.IOV1'), w('PSU1.-V2', 'PLC2.IOG1')] : []),
      w('PSU1.+V1', 'PX1.BN'),
      w('PSU1.-V1', 'PX1.BU'),
      w('PX1.BK', 'PLC3.IN0'),
    ],
  });
  const polarity = (x: Diagram) => checkDiagram(x, lookup).filter((i) => i.rule === 'signal-polarity');

  it('NX-PF0630 の IOV に +24V を入れると、NX-ID5342 の入力のコモンが +V（NPN 用）になり、PNP センサーを指摘する', () => {
    expect(polarity(d(true, true))).toHaveLength(1);
  });

  it('I/O 電源がなければ入力のコモンの極性は決まらない（NX1P2 は NX ユニットへ I/O 電源を供給しない）', () => {
    expect(polarity(d(true, false))).toEqual([]);
    expect(polarity(d(false, false))).toEqual([]);
  });
});

describe('フエニックス・コンタクトの端子台の渡り（差込式ブリッジ FBS）', () => {
  it('渡りの指定を極の範囲にする（範囲外・1 極・重なりは捨てる）', () => {
    expect(parseBridges('1-4, 7-8', 10)).toEqual([
      [1, 4],
      [7, 8],
    ]);
    expect(parseBridges('3-1、9-12, 5-5, 2-3', 10)).toEqual([[1, 3]]);
    expect(parseBridges('', 10)).toEqual([]);
  });

  it('渡りの範囲の極どうしが導通し、部品表に FBS が載る', () => {
    const d = def('phoenix.pt-2.5');
    const r = resolveDevice(d, { bridge: '1-3' });
    expect(r.links).toContainEqual({ from: '1a', to: '2a' });
    expect(r.links).toContainEqual({ from: '2a', to: '3a' });
    expect(r.links).not.toContainEqual({ from: '3a', to: '4a' });
    const acc = deviceAccessories(d, { bridge: '1-3, 5-10' }).map((a) => a.model);
    expect(acc).toContain('FBS 3-5');
    expect(acc).toContain('FBS 10-5');
  });

  it('極数をパラメータで変えると端子と幅が変わる', () => {
    const d = def('phoenix.ut-2.5');
    const r4 = resolveDevice(d, { poles: 4 });
    const r20 = resolveDevice(d, { poles: 20 });
    expect(r4.terminals).toHaveLength(8);
    expect(r20.terminals).toHaveLength(40);
    expect(r20.width).toBeGreaterThan(r4.width);
  });

  it('接地端子台は全極がレールを通してつながる接地端子', () => {
    const r = resolveDevice(def('phoenix.pt-2.5-pe'));
    expect(r.terminals.every((t) => t.role === 'ground')).toBe(true);
    expect(r.links).toContainEqual({ from: '1a', to: '2a' });
  });
});
