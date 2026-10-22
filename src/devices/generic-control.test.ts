/**
 * 汎用の制御機器（リレー・押しボタン・表示灯・タイマー・SSR・電磁弁など。docs/generic-catalog.md）の
 * 代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramWire } from '../model/diagram';
import { deviceElements } from '../schematic/elements';
import { getDeviceDefinition } from './registry';

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};
const lookup = (t: string) => getDeviceDefinition(t);
const errorsOf = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.severity === 'error').map((i) => i.rule);

/** 停止（b 接点）・運転（a 接点）の押しボタンで MY2N を自己保持し、MY2N の a 接点で表示灯と電磁弁を点ける回路 */
const selfHold = (relay = 'omron.my2n.dc24'): Diagram => ({
  devices: [
    { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
    { id: 'PB1', type: 'omron.a22nn-bnm-g002', x: 0, y: 0 },
    { id: 'PB2', type: 'omron.a22nn-bnm-g100', x: 0, y: 0 },
    { id: 'CR1', type: relay, x: 0, y: 0 },
    { id: 'PL1', type: 'omron.m22n-bn-a-c', x: 0, y: 0 },
    { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
  ],
  wires: [
    w('PSU1.+V1', 'PB1.1'),
    w('PB1.2', 'PB2.3'),
    w('PB2.4', 'CR1.14'),
    // 自己保持（極 1 の a 接点 9-5 を運転ボタンに並列）
    w('PB1.2', 'CR1.9'),
    w('CR1.5', 'CR1.14'),
    w('CR1.13', 'PSU1.-V1'),
    // 極 2 の a 接点 12-8 で表示灯と電磁弁
    w('PSU1.+V2', 'CR1.12'),
    w('CR1.8', 'PL1.X1'),
    w('PL1.X2', 'PSU1.-V2'),
    w('CR1.8', 'SOL1.+'),
    w('SOL1.-', 'PSU1.-V2'),
  ],
});

describe('汎用の制御機器の電気チェック', () => {
  it('押しボタンで MY2N（DC24V）を自己保持する回路はエラーなし', () => {
    expect(errorsOf(selfHold())).toEqual([]);
  });

  it('MY2N の DC コイルを逆極性（13 に +24V）でつなぐと極性のエラー', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'CR1', type: 'omron.my2n.dc24', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'CR1.13'), w('CR1.14', 'PSU1.-V1')],
    };
    expect(errorsOf(d)).toContain('conductor-mismatch');
    d.wires = [w('PSU1.+V1', 'CR1.14'), w('CR1.13', 'PSU1.-V1')];
    expect(errorsOf(d)).toEqual([]);
  });

  it('AC100V コイルの MY2N に DC24V をかけると電源種別のエラー', () => {
    expect(errorsOf(selfHold('omron.my2n.ac100'))).toContain('system-mismatch');
  });

  it('電磁弁（極性あり）の + に 0V をつなぐと極性のエラー', () => {
    const d = selfHold();
    d.wires = d.wires.map((x) => (x.from.device === 'SOL1' ? { ...x, from: { device: 'SOL1', terminal: '+' } } : x.to.device === 'SOL1' ? { ...x, to: { device: 'SOL1', terminal: '-' } } : x));
    expect(errorsOf(d)).toContain('conductor-mismatch');
  });

  it('SSR の入力を PLC 出力相当の DC24V で ON し、出力でヒーター（AC100V）を開閉する回路はエラーなし', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SRC1', type: 'generic.power-source.1p100v', x: 0, y: 0 },
        { id: 'PB1', type: 'omron.a22nn-bnm-g100', x: 0, y: 0 },
        { id: 'SSR1', type: 'omron.g3na-210b', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'PB1.3'), w('PB1.4', 'SSR1.3'), w('SSR1.4', 'PSU1.-V1'), w('SRC1.L', 'SSR1.1')],
    };
    expect(errorsOf(d)).toEqual([]);
  });

  it('照光押しボタンの LED（24V AC/DC、極性なし）はどちら向きにつないでもエラーなし', () => {
    for (const [a, b] of [
      ['X1', 'X2'],
      ['X2', 'X1'],
    ]) {
      const d: Diagram = {
        devices: [
          { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
          { id: 'PB1', type: 'omron.a22nl-bnm-g100-c', x: 0, y: 0 },
        ],
        wires: [w('PSU1.+V1', `PB1.${a}`), w(`PB1.${b}`, 'PSU1.-V1')],
      };
      expect(errorsOf(d)).toEqual([]);
    }
  });
});

describe('汎用の制御機器の展開図の要素', () => {
  const kinds = (type: string) => deviceElements(getDeviceDefinition(type)!).map((e) => `${e.kind}:${Object.keys(e.pinOf).join('-')}`);

  it('リレーの受電端子 13-14 はコイル、SSR は入力がコイル・出力が主接点', () => {
    expect(kinds('omron.my2n.dc24')).toContain('coil:13-14');
    expect(kinds('omron.g3na-210b')).toEqual(['coil:3-4', 'contactor:1-2']);
  });

  it('押しボタン・リミットスイッチの接点、照光の LED、電磁弁のコイル', () => {
    expect(kinds('omron.a22nn-bnm-g102')).toEqual(['contact:1-2', 'contact:3-4']);
    expect(kinds('omron.a22nl-bnm-g100-c')).toEqual(['lamp:X1-X2', 'contact:3-4']);
    expect(kinds('omron.wlca2-2')).toEqual(['contact:1-2', 'contact:3-4']);
    expect(kinds('smc.sy3220-5lz')).toEqual(['coil:A+-A-', 'coil:B+-B-']);
  });
});
