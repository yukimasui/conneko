/**
 * 表示・操作機器と盤内の制御補助機器（docs/control-catalog.md）の代表的な配線での電気チェック・展開図・ファミリーの確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramWire } from '../model/diagram';
import { deviceElements } from '../schematic/elements';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { deviceModel, deviceSize, resolveNum } from './types';

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};
const lookup = (t: string) => getDeviceDefinition(t);
const errorsOf = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.severity === 'error').map((i) => i.rule);
const def = (type: string) => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

describe('温度調節器 E5CC', () => {
  it('電圧出力形（QX）の制御出力 1(+)・2(−) で SSR の入力を直接駆動し、SSR でヒーター（AC100V）を開閉する回路はエラーなし', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SRC1', type: 'generic.power-source.1p100v', x: 0, y: 0 },
        { id: 'TIC1', type: 'omron.e5cc-qx2dsm-800', x: 0, y: 0 },
        { id: 'TE1', type: 'generic.thermocouple-k', x: 0, y: 0 },
        { id: 'SSR1', type: 'omron.g3na-210b', x: 0, y: 0 },
      ],
      wires: [
        w('PSU1.+V1', 'TIC1.11'),
        w('TIC1.12', 'PSU1.-V1'),
        w('TE1.+', 'TIC1.6'),
        w('TE1.-', 'TIC1.5'),
        w('TIC1.1', 'SSR1.3'),
        w('TIC1.2', 'SSR1.4'),
        w('SRC1.L', 'SSR1.1'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
  });

  it('SSR の入力を逆（制御出力 1(+) を SSR の 4(−)）につなぐと極性のエラー', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'TIC1', type: 'omron.e5cc-qx2dsm-800', x: 0, y: 0 },
        { id: 'SSR1', type: 'omron.g3na-210b', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'TIC1.11'), w('TIC1.12', 'PSU1.-V1'), w('TIC1.1', 'SSR1.4'), w('TIC1.2', 'SSR1.3')],
    };
    expect(errorsOf(d)).toContain('conductor-mismatch');
  });

  it('リレー出力形（RX、AC100〜240V）に DC24V をかけると電源種別のエラー、AC100V ならエラーなし', () => {
    const dc: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'TIC1', type: 'omron.e5cc-rx2asm-800', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'TIC1.11'), w('TIC1.12', 'PSU1.-V1')],
    };
    expect(errorsOf(dc)).toContain('system-mismatch');
    const ac: Diagram = {
      devices: [
        { id: 'SRC1', type: 'generic.power-source.1p100v', x: 0, y: 0 },
        { id: 'TIC1', type: 'omron.e5cc-rx2asm-800', x: 0, y: 0 },
      ],
      wires: [w('SRC1.L', 'TIC1.11'), w('TIC1.12', 'SRC1.N')],
    };
    expect(errorsOf(ac)).toEqual([]);
  });

  it('リレー出力形の制御出力・補助出力は a 接点、電圧出力形の制御出力は電源の出力', () => {
    const rx = resolveDevice(def('omron.e5cc-rx2asm-800'));
    expect(rx.links.map((l) => `${l.from}-${l.to}:${l.switch}`)).toEqual(['1-2:NO', '9-10:NO', '7-8:NO']);
    const qx = resolveDevice(def('omron.e5cc-qx2dsm-800'));
    expect(qx.terminal('1')?.supply).toMatchObject({ system: 'DC', voltage: 12, conductor: '+' });
    expect(qx.links.some((l) => l.from === '1')).toBe(false);
  });
});

describe('タイマー H3CR-A8・H3DT-N2', () => {
  it('H3CR-A8（AC24-48/DC12-48）を DC24V で 7(+)・2(−) につなぐとエラーなし、逆につなぐと極性のエラー', () => {
    const d = (plus: string, minus: string): Diagram => ({
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'TR1', type: 'omron.h3cr-a8.ac24-48', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', `TR1.${plus}`), w(`TR1.${minus}`, 'PSU1.-V1')],
    });
    expect(errorsOf(d('7', '2'))).toEqual([]);
    expect(errorsOf(d('2', '7'))).toContain('conductor-mismatch');
  });

  it('H3CR-A8（AC100-240V）に DC24V をかけると電圧のエラー', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'TR1', type: 'omron.h3cr-a8.ac100-240', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'TR1.7'), w('TR1.2', 'PSU1.-V1')],
    };
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  it('展開図では電源がコイル、接点は限時接点（オンディレー）になる', () => {
    const kinds = (type: string, params = {}) => deviceElements(def(type), params).map((e) => `${e.kind}:${Object.keys(e.pinOf).join('-')}`);
    // 端子の並びは pinOf のキーの順（数字の端子は小さい順）
    expect(kinds('omron.h3cr-a8.ac100-240')).toEqual(expect.arrayContaining(['coil:2-7', 'contact:1-3-4', 'contact:5-6-8']));
    expect(kinds('omron.h3dt-n2')).toEqual(expect.arrayContaining(['coil:A1-A2', 'contact:15-16-18', 'contact:25-26-28']));
    expect(resolveDevice(def('omron.h3cr-a8.ac24-48')).links.every((l) => l.timed === 'on-delay')).toBe(true);
    // H3DT-N2 の R2 は瞬時接点にもできる
    const instant = resolveDevice(def('omron.h3dt-n2'), { r2: 'instant' }).links;
    expect(instant.filter((l) => l.from === '25').every((l) => !l.timed)).toBe(true);
    expect(instant.filter((l) => l.from === '15').every((l) => l.timed === 'on-delay')).toBe(true);
  });
});

describe('積層信号灯 LR6 / LR4', () => {
  it('段数・ブザーで型式・端子・大きさ・消費電流が変わる', () => {
    const lr6 = def('patlite.lr6');
    expect(deviceModel(lr6, {})).toBe('LR6-302WJNW-RYG');
    expect(deviceModel(lr6, { colors: 'RYGBC', buzzer: 'B' })).toBe('LR6-502WJBW-RYGBC');
    expect(resolveDevice(lr6).terminals.map((t) => t.id)).toEqual(['COM', 'L1', 'L2', 'L3']);
    expect(resolveDevice(lr6, { colors: 'RYGB', buzzer: 'B' }).terminals.map((t) => t.id)).toEqual(['COM', 'L1', 'L2', 'L3', 'L4', 'BZ']);
    expect(deviceSize(lr6, { colors: 'RYGBC' }).height).toBeGreaterThan(deviceSize(lr6, {}).height);
    expect(resolveNum(lr6.loadCurrent, lr6, {})).toBeCloseTo(0.126);
    expect(deviceModel(def('patlite.lr4'), { colors: 'RG' })).toBe('LR4-202WJNW-RG');
  });

  it('コモンを 0V、各段を押しボタン経由で +24V につなぐ（PNP 相当）回路も、コモンを +24V にする（NPN 相当）回路もエラーなし', () => {
    for (const [com, sig] of [
      ['PSU1.-V1', 'PSU1.+V1'],
      ['PSU1.+V1', 'PSU1.-V1'],
    ]) {
      const d: Diagram = {
        devices: [
          { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
          { id: 'PB1', type: 'omron.a22nn-bnm-g100', x: 0, y: 0 },
          { id: 'SL1', type: 'patlite.lr6', x: 0, y: 0, params: { colors: 'R' } },
        ],
        wires: [w(sig, 'PB1.3'), w('PB1.4', 'SL1.L1'), w('SL1.COM', com)],
      };
      expect(errorsOf(d)).toEqual([]);
    }
  });
});

describe('ファミリー', () => {
  it('追加した機器は現場の大くくりの名前でまとまる', () => {
    expect(familyOf('patlite.lr6')?.name).toBe('積層信号灯');
    expect(familyOf('patlite.lr4')?.name).toBe('積層信号灯');
    expect(familyOf('omron.h3cr-a8.ac100-240')?.name).toBe('タイマー');
    expect(familyOf('omron.h3dt-n2')?.name).toBe('タイマー');
    expect(familyOf('omron.h3y-2.dc24')?.defaultType).toBe('omron.h3y-2.dc24');
    expect(familyOf('omron.e5cc-rx2asm-800')?.name).toBe('温度調節器');
    expect(familyOf('generic.thermocouple-k')?.name).toBe('温度センサ');
    expect(familyOf('generic.rtd-pt100')?.name).toBe('温度センサ');
    expect(familyOf('fuji.ar22f0r-11')?.name).toBe('押しボタンスイッチ');
    expect(familyOf('fuji.ar22f0l-11e3')?.name).toBe('押しボタンスイッチ');
    expect(familyOf('fuji.dr22d0l-e3')?.name).toBe('表示灯');
    expect(familyOf('generic.foot-switch')?.name).toBe('フットスイッチ');
  });
});
