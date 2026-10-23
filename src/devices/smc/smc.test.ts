/**
 * SMC アクチュエータ（エアシリンダ・エアチャック・ロータリテーブル）とオートスイッチの機器定義と、
 * オートスイッチを PLC の入力へつないだときの信号のチェック。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { getDeviceDefinition } from '../registry';
import { resolveDevice } from '../resolve';
import { deviceModel, deviceSize, type DeviceDefinition, type ParamValues } from '../types';

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const ids = (type: string, p: ParamValues = {}) => resolveDevice(def(type), p).terminals.map((t) => t.id);

describe('SMC エアシリンダの型式', () => {
  it('CM2: マグネット・オートスイッチの有無、個数、リード線の長さ、単動を型式に入れる', () => {
    const cm2 = def('smc.cm2');
    expect(deviceModel(cm2, {})).toBe('CM2B25-100Z');
    expect(deviceModel(cm2, { switch: 'magnet' })).toBe('CDM2B25-100Z');
    expect(deviceModel(cm2, { switch: 'M9BW' })).toBe('CDM2B25-100Z-M9BW');
    expect(deviceModel(cm2, { switch: 'M9N', switchPos: 'head', lead: 'L' })).toBe('CDM2B25-100Z-M9NLS');
    expect(deviceModel(cm2, { bore: 40, stroke: 200, mount: 'L', action: 'S' })).toBe('CM2L40-200SZ');
  });

  it('CJ2・CQ2・MB・MGP・MHZ2・MSQ の型式', () => {
    // CJ2 のマグネット内蔵は末尾にスイッチの取付金具（φ6 はバンド取付のみ）
    expect(deviceModel(def('smc.cj2'), { switch: 'M9B' })).toBe('CDJ2B16-60Z-M9B-B');
    expect(deviceModel(def('smc.cj2'), { switch: 'magnet', switchMount: 'A', action: 'S', stroke: 45 })).toBe('CDJ2B16-45SZ-A');
    expect(deviceModel(def('smc.cj2'), { bore: 6, switch: 'M9N', switchMount: 'A', stroke: 30 })).toBe('CDJ2B6-30Z-M9N-B');
    expect(deviceModel(def('smc.cj2'), {})).toBe('CJ2B16-60Z');
    expect(deviceModel(def('smc.cq2'), { switch: 'M9NW' })).toBe('CDQ2B25-20DZ-M9NW');
    expect(deviceModel(def('smc.mb'), { switch: 'M9PW' })).toBe('MDBB40-100Z-M9PW');
    expect(deviceModel(def('smc.mgp'), { switch: 'M9BW' })).toBe('MGPM20-50Z-M9BW');
    expect(deviceModel(def('smc.mhz2'), { switch: 'M9N' })).toBe('MHZ2-16D-M9N');
    expect(deviceModel(def('smc.msq'), { adjust: 'R', switch: 'M9BW', switchPos: 'rod' })).toBe('MSQB20R-M9BWS');
    // ショックアブソーバ内蔵はサイズ 10 以上
    expect(deviceModel(def('smc.msq'), { size: 7, adjust: 'R' })).toBe('MSQB7A');
  });
});

describe('SMC エアシリンダの端子と見た目', () => {
  it('ストロークに応じて機器の長さが変わる', () => {
    const cm2 = def('smc.cm2');
    const short = deviceSize(cm2, { stroke: 25 }).width;
    const long = deviceSize(cm2, { stroke: 300 }).width;
    expect(long).toBeGreaterThan(short + 100);
    expect(resolveDevice(cm2, { stroke: 300 }).width).toBe(long);
    // ロッド側のポートもロッドカバーと一緒に動く
    const rodX = (stroke: number) => resolveDevice(cm2, { stroke }).terminal('ROD')!.x;
    expect(rodX(300)).toBeGreaterThan(rodX(25));
  });

  it('複動はヘッド側・ロッド側の 2 ポート、単動はエアを入れる側の 1 ポート', () => {
    expect(ids('smc.cm2')).toEqual(['HEAD', 'ROD']);
    expect(ids('smc.cm2', { action: 'S' })).toEqual(['HEAD']);
    expect(ids('smc.cm2', { action: 'T' })).toEqual(['ROD']);
    const r = resolveDevice(def('smc.cm2'), { bore: 40, fitting: 8 });
    expect(r.air.get('HEAD')).toEqual({ kind: 'work', thread: 'Rc1/4', tubeOD: 8, pressure: undefined, minPressure: 0.05, maxPressure: 1.0 });
    expect(resolveDevice(def('smc.cj2'), {}).air.get('ROD')).toMatchObject({ thread: 'M5', tubeOD: 4, maxPressure: 0.7 });
    // 単動の最低使用圧力は押出し・引込みで違う
    expect(resolveDevice(def('smc.cm2'), { action: 'S' }).air.get('HEAD')?.minPressure).toBe(0.18);
    expect(resolveDevice(def('smc.cm2'), { action: 'T' }).air.get('ROD')?.minPressure).toBe(0.23);
    // ショックアブソーバ内蔵の MSQ は 0.6MPa まで
    expect(resolveDevice(def('smc.msq'), { adjust: 'R' }).air.get('A')?.maxPressure).toBe(0.6);
    expect(resolveDevice(def('smc.msq'), {}).air.get('A')?.maxPressure).toBe(1.0);
  });

  it('オートスイッチのリード線が端子になり、ヘッド側は後退端・ロッド側は前進端と分かる', () => {
    const r = resolveDevice(def('smc.cm2'), { switch: 'M9N' });
    expect(r.terminals.map((t) => t.id)).toEqual(['HEAD', 'ROD', 'SW1.BN', 'SW1.BK', 'SW1.BU', 'SW2.BN', 'SW2.BK', 'SW2.BU']);
    expect(r.terminal('SW1.BK')).toMatchObject({ role: 'signal', signal: { dir: 'out', kind: 'npn' }, hint: '後退端 出力' });
    expect(r.terminal('SW2.BK')!.hint).toBe('前進端 出力');
    expect(r.terminal('SW1.BN')).toMatchObject({ role: 'input', hint: '後退端 +V' });
    expect(r.links).toEqual([
      { from: 'SW1.BK', to: 'SW1.BU', switch: 'output', ratedCurrent: 0.04 },
      { from: 'SW2.BK', to: 'SW2.BU', switch: 'output', ratedCurrent: 0.04 },
    ]);
    // PNP は黒 → 茶、2 線式は茶・青の 2 本
    expect(resolveDevice(def('smc.cm2'), { switch: 'M9P' }).links[0]).toMatchObject({ from: 'SW1.BK', to: 'SW1.BN' });
    expect(ids('smc.cm2', { switch: 'M9B', switchPos: 'rod' })).toEqual(['HEAD', 'ROD', 'SW2.BN', 'SW2.BU']);
    expect(resolveDevice(def('smc.cm2'), { switch: 'M9B' }).terminal('SW2.BU')).toMatchObject({ signal: { dir: 'out', kind: '2wire' }, hint: '前進端 OUT−' });
  });

  it('空圧回路図の情報（作動方式・マグネット・オートスイッチの出力端子）', () => {
    expect(resolveDevice(def('smc.cm2'), {}).pneumatic).toEqual({ symbol: 'cylinder', ports: { head: 'HEAD', rod: 'ROD' }, cylinder: { acting: 'double', magnet: false } });
    expect(resolveDevice(def('smc.cm2'), { switch: 'M9B', action: 'S' }).pneumatic).toEqual({
      symbol: 'cylinder',
      ports: { head: 'HEAD' },
      cylinder: { acting: 'single-push', magnet: true, switches: { head: 'SW1.BN', rod: 'SW2.BN' } },
    });
    expect(resolveDevice(def('smc.mgp'), {}).pneumatic?.cylinder?.magnet).toBe(true);
    expect(resolveDevice(def('smc.mb'), { switch: 'M9N', switchPos: 'head' }).pneumatic?.cylinder).toEqual({ acting: 'double', cushion: true, magnet: true, switches: { head: 'SW1.BK' } });
    expect(resolveDevice(def('smc.mhz2'), {}).pneumatic).toEqual({ symbol: 'gripper', ports: { open: 'OPEN', close: 'CLOSE' } });
    expect(resolveDevice(def('smc.mhz2'), { action: 'S' }).pneumatic?.ports).toEqual({ close: 'CLOSE' });
    expect(resolveDevice(def('smc.msq'), {}).pneumatic).toEqual({ symbol: 'rotary', ports: { a: 'A', b: 'B' } });
  });

  it('エアチャック・ロータリテーブルのスイッチは開側・閉側、A 側・B 側の端と分かる', () => {
    const g = resolveDevice(def('smc.mhz2'), { switch: 'M9N' });
    expect(g.terminal('SW1.BK')!.hint).toBe('開側 出力');
    expect(g.terminal('SW2.BK')!.hint).toBe('閉側 出力');
    expect(ids('smc.mhz2', { action: 'C' })).toEqual(['OPEN']);
    const r = resolveDevice(def('smc.msq'), { switch: 'M9P' });
    expect(r.terminal('SW1.BK')!.hint).toBe('A側端 出力');
  });
});

/* ------------------------------------------------------------------ */
/* オートスイッチ → KV 入力ユニットの配線チェック                         */
/* ------------------------------------------------------------------ */

let seq = 0;
/** 'CY1.SW1.BK' のように、最初の '.' までを機器名とする */
const ref = (s: string) => ({ device: s.slice(0, s.indexOf('.')), terminal: s.slice(s.indexOf('.') + 1) });
const w = (from: string, to: string): DiagramWire => ({ id: `W${++seq}`, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0.75, wireType: 'KIV' });
const errorRules = (d: Diagram) =>
  checkDiagram(d, getDeviceDefinition)
    .filter((i) => i.severity === 'error')
    .map((i) => i.rule);
const twoWire = (d: Diagram) => checkDiagram(d, getDeviceDefinition).filter((i) => i.rule === 'two-wire');

function cylinderToKv(params: ParamValues, com: '+V1' | '-V1', wires: [string, string][]): Diagram {
  return {
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      { id: 'CY1', type: 'smc.cm2', x: 0, y: 0, params },
    ],
    wires: [w(`PSU1.${com}`, 'IN1.C0'), ...wires.map(([a, b]) => w(a, b))],
  };
}

describe('オートスイッチ → KV 入力ユニットの配線チェック', () => {
  it('D-M9N（NPN）はプラスコモンなら OK、マイナスコモンなら極性の誤り', () => {
    const wires: [string, string][] = [
      ['PSU1.+V1', 'CY1.SW1.BN'],
      ['PSU1.-V1', 'CY1.SW1.BU'],
      ['CY1.SW1.BK', 'IN1.0'],
      ['PSU1.+V1', 'CY1.SW2.BN'],
      ['PSU1.-V1', 'CY1.SW2.BU'],
      ['CY1.SW2.BK', 'IN1.1'],
    ];
    expect(errorRules(cylinderToKv({ switch: 'M9N' }, '+V1', wires))).toEqual([]);
    expect(errorRules(cylinderToKv({ switch: 'M9N' }, '-V1', wires))).toContain('signal-polarity');
    expect(errorRules(cylinderToKv({ switch: 'M9P' }, '-V1', wires))).toEqual([]);
    expect(errorRules(cylinderToKv({ switch: 'M9P' }, '+V1', wires))).toContain('signal-polarity');
  });

  it('D-M9B（2 線式）を 2 個付けても、スイッチごとに入力回路との直列を確かめる', () => {
    // プラスコモン: 茶を入力、青を 0V
    const ok = cylinderToKv({ switch: 'M9B' }, '+V1', [
      ['CY1.SW1.BN', 'IN1.0'],
      ['PSU1.-V1', 'CY1.SW1.BU'],
      ['CY1.SW2.BN', 'IN1.1'],
      ['PSU1.-V1', 'CY1.SW2.BU'],
    ]);
    expect(twoWire(ok)).toEqual([]);
    expect(errorRules(ok)).toEqual([]);
    // SW2 の青を +24V（コモンと同じ極）につなぐと、SW2 だけ指摘する
    const ng = cylinderToKv({ switch: 'M9B' }, '+V1', [
      ['CY1.SW1.BN', 'IN1.0'],
      ['PSU1.-V1', 'CY1.SW1.BU'],
      ['CY1.SW2.BN', 'IN1.1'],
      ['PSU1.+V2', 'CY1.SW2.BU'],
    ]);
    const issues = twoWire(ng);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('SW2');
  });
});
