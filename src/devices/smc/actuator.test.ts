/**
 * SMC アクチュエータ（エアシリンダ・エアチャック・ロータリテーブル）とオートスイッチの機器定義と、
 * オートスイッチを PLC の入力へつないだときの信号のチェック。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import { bomRows } from '../../export/reports';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { getDeviceDefinition } from '../registry';
import { resolveDevice } from '../resolve';
import { deviceAccessories, deviceModel, deviceSize, type DeviceDefinition, type ParamValues } from '../types';
import { elbowModel } from './speed-controller';

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

/* ------------------------------------------------------------------ */
/* ポートに直付けするスピードコントローラ                                 */
/* ------------------------------------------------------------------ */

const svgOf = (type: string, p: ParamValues) => {
  const d = def(type);
  return typeof d.svg === 'function' ? d.svg({ ...Object.fromEntries((d.params ?? []).map((x) => [x.key, x.default])), ...p }) : d.svg;
};
const accessoryModels = (type: string, p: ParamValues) => deviceAccessories(def(type), p).map((a) => [a.terminal, a.model]);

describe('ポートに直付けするスピードコントローラ', () => {
  it('エルボ形の型式は、ねじとチューブ外径から SMC のバリエーション表どおりに決まる', () => {
    expect(elbowModel('M5', 4, 'meter-out')).toBe('AS1201F-M5-04A');
    expect(elbowModel('M5', 3.2, 'meter-in')).toBe('AS1211F-M5-23A');
    expect(elbowModel('01', 6, 'meter-out')).toBe('AS2201F-01-06SA');
    expect(elbowModel('02', 10, 'meter-out')).toBe('AS2201F-02-10SA');
    // R1/4 の φ12 はボディサイズ 3
    expect(elbowModel('02', 12, 'meter-in')).toBe('AS3211F-02-12SA');
    expect(elbowModel('03', 8, 'meter-out')).toBe('AS3201F-03-08SA');
    expect(elbowModel('04', 16, 'meter-out')).toBe('AS4201F-04-16SA');
    // 合わない組み合わせ
    expect(elbowModel('M5', 8, 'meter-out')).toBeUndefined();
    expect(elbowModel('01', 12, 'meter-out')).toBeUndefined();
    expect(elbowModel('04', 8, 'meter-out')).toBeUndefined();
    // 別に置くエルボ形の機器も同じ型式
    expect(deviceModel(def('smc.as2201f'), { size: '04-12' })).toBe('AS4201F-04-12SA');
    expect(deviceModel(def('smc.as2211f'), { size: '02-12' })).toBe('AS3211F-02-12SA');
  });

  it('シリンダ: 使うポートごとに 1 個付き、ポートの継手はスピードコントローラのワンタッチ管継手になる', () => {
    expect(deviceAccessories(def('smc.cm2'), {})).toEqual([]);
    expect(accessoryModels('smc.cm2', { speedController: 'meter-out' })).toEqual([
      ['HEAD', 'AS2201F-01-06SA'],
      ['ROD', 'AS2201F-01-06SA'],
    ]);
    expect(accessoryModels('smc.cm2', { bore: 40, fitting: 8, speedController: 'meter-in' })).toEqual([
      ['HEAD', 'AS2211F-02-08SA'],
      ['ROD', 'AS2211F-02-08SA'],
    ]);
    // 単動はエアを入れる側だけ
    expect(accessoryModels('smc.cm2', { action: 'S', speedController: 'meter-in' })).toEqual([['HEAD', 'AS2211F-01-06SA']]);
    expect(accessoryModels('smc.cj2', { speedController: 'meter-out' })).toEqual([
      ['HEAD', 'AS1201F-M5-04A'],
      ['ROD', 'AS1201F-M5-04A'],
    ]);
    expect(accessoryModels('smc.mb', { bore: 100, fitting: 12, speedController: 'meter-out' })[0]).toEqual(['HEAD', 'AS4201F-04-12SA']);
    // シリンダの型式は変わらない（スピードコントローラは別に注文する）
    expect(deviceModel(def('smc.cm2'), { speedController: 'meter-out' })).toBe('CM2B25-100Z');

    const r = resolveDevice(def('smc.cm2'), { speedController: 'meter-out' });
    expect(r.air.get('HEAD')).toMatchObject({ kind: 'work', tubeOD: 6 });
    expect(r.air.get('HEAD')?.thread).toBeUndefined();
    expect(r.terminal('HEAD')!.note).toContain('AS2201F-01-06SA');
    expect(r.pneumatic?.speedControllers).toEqual({
      head: { control: 'meter-out', model: 'AS2201F-01-06SA' },
      rod: { control: 'meter-out', model: 'AS2201F-01-06SA' },
    });
    // 合う型式がなければ付けない（ねじは元のまま、絵に赤い文字）
    const ng = resolveDevice(def('smc.mb'), { bore: 100, fitting: 8, speedController: 'meter-out' });
    expect(ng.air.get('HEAD')?.thread).toBe('Rc1/2');
    expect(ng.pneumatic?.speedControllers).toBeUndefined();
    expect(deviceAccessories(def('smc.mb'), { bore: 100, fitting: 8, speedController: 'meter-out' })).toEqual([]);
    expect(svgOf('smc.mb', { bore: 100, fitting: 8, speedController: 'meter-out' })).toContain('スピコンの型式なし');
  });

  it('キャンバスの絵: ポートにエルボ形が付き、つまみの色でメータアウト・メータインを描き分ける', () => {
    const none = svgOf('smc.cm2', {});
    const out = svgOf('smc.cm2', { speedController: 'meter-out' });
    const inn = svgOf('smc.cm2', { speedController: 'meter-in' });
    expect(none).not.toContain('#6b7076');
    expect(out.match(/#6b7076/g)).toHaveLength(2);
    expect(inn.match(/#7cc3ea/g)).toHaveLength(2);
    expect(svgOf('smc.mhz2', { speedController: 'meter-out' })).toContain('#6b7076');
    expect(svgOf('smc.msq', { speedController: 'meter-in' })).toContain('#7cc3ea');
  });

  it('エアチャック・ロータリ: M5・Rc1/8 のポートに付く。M3 のポートには付かない', () => {
    expect(accessoryModels('smc.mhz2', { speedController: 'meter-in' })).toEqual([
      ['OPEN', 'AS1211F-M5-04A'],
      ['CLOSE', 'AS1211F-M5-04A'],
    ]);
    expect(accessoryModels('smc.mhz2', { action: 'C', fitting: 6, speedController: 'meter-out' })).toEqual([['OPEN', 'AS1201F-M5-06A']]);
    expect(accessoryModels('smc.mhz2', { size: 10, speedController: 'meter-out' })).toEqual([]);
    expect(resolveDevice(def('smc.mhz2'), { size: 10, speedController: 'meter-out' }).air.get('OPEN')?.thread).toBe('M3');
    expect(resolveDevice(def('smc.mhz2'), { speedController: 'meter-out' }).pneumatic?.speedControllers).toEqual({
      open: { control: 'meter-out', model: 'AS1201F-M5-04A' },
      close: { control: 'meter-out', model: 'AS1201F-M5-04A' },
    });
    expect(accessoryModels('smc.msq', { size: 70, fitting: 8, speedController: 'meter-out' })).toEqual([
      ['A', 'AS2201F-01-08SA'],
      ['B', 'AS2201F-01-08SA'],
    ]);
    expect(accessoryModels('smc.msq', { size: 1, speedController: 'meter-out' })).toEqual([]);
  });

  /** 電磁弁 SOL1（SY3120、A・B は φ6）→ シリンダ CY1 */
  const valveToActuator = (type: string, params: ParamValues, ports: [string, string], od = 6): Diagram => ({
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
      { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
      { id: 'CY1', type, x: 0, y: 0, params },
    ],
    wires: [
      { id: 'T1', from: { device: 'AIR1', terminal: 'OUT' }, to: { device: 'SOL1', terminal: 'P' }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: 6 },
      { id: 'T2', from: { device: 'SOL1', terminal: 'A' }, to: { device: 'CY1', terminal: ports[0] }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od },
      { id: 'T3', from: { device: 'SOL1', terminal: 'B' }, to: { device: 'CY1', terminal: ports[1] }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od },
    ],
  });

  it('チェック: スピードコントローラを付けたポートは、ねじと継手の外径の警告を出さない', () => {
    // シリンダについての指摘（エア源の継手の外径などは見ない）
    const rules = (d: Diagram) =>
      checkDiagram(d, getDeviceDefinition)
        .filter((i) => i.devices.includes('CY1'))
        .map((i) => i.rule);
    // CQ2 φ25 は M5。φ8 の継手は付かない
    expect(rules(valveToActuator('smc.cq2', { fitting: 8 }, ['HEAD', 'ROD'], 8))).toContain('air-fitting-thread');
    // φ6 のスピードコントローラ（AS1201F-M5-06A）なら出ない
    const ok = valveToActuator('smc.cq2', { fitting: 6, speedController: 'meter-out' }, ['HEAD', 'ROD']);
    expect(rules(ok)).not.toContain('air-fitting-thread');
    expect(rules(ok)).not.toContain('tube-od-mismatch');
    // M5 に φ8 のスピードコントローラはないので、付けずに継手の警告が残る
    expect(rules(valveToActuator('smc.cq2', { fitting: 8, speedController: 'meter-out' }, ['HEAD', 'ROD'], 8))).toContain('air-fitting-thread');
    // 別に置いたエルボ形スピードコントローラ（おねじ）をスピードコントローラ付きのポートにつなぐと指摘する
    const twice: Diagram = {
      devices: [
        { id: 'CY1', type: 'smc.cm2', x: 0, y: 0, params: { speedController: 'meter-out' } },
        { id: 'SC1', type: 'smc.as2201f', x: 0, y: 0 },
      ],
      wires: [{ id: 'T1', from: { device: 'SC1', terminal: 'CYL' }, to: { device: 'CY1', terminal: 'HEAD' }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: 6 }],
    };
    expect(rules(twice)).toContain('air-thread-mismatch');
  });

  it('部品表: スピードコントローラは 1 ポート 1 個で載り、そのポートにはハーフユニオンを入れない', () => {
    const rows = bomRows(valveToActuator('smc.cm2', { speedController: 'meter-out' }, ['HEAD', 'ROD']), getDeviceDefinition);
    expect(rows.find((r) => r.model === 'AS2201F-01-06SA')).toMatchObject({
      category: 'air-fitting',
      maker: 'SMC',
      name: 'スピードコントローラ（エルボ形・メータアウト）',
      qty: 2,
      ids: ['CY1.HEAD', 'CY1.ROD'],
      estimated: false,
    });
    expect(rows.find((r) => r.model.startsWith('KQ2H') && r.ids.some((id) => id.startsWith('CY1')))).toBeUndefined();
    // 付けなければシリンダのポート（Rc1/8）に KQ2H06-01AS が 2 個
    const plain = bomRows(valveToActuator('smc.cm2', {}, ['HEAD', 'ROD']), getDeviceDefinition);
    expect(plain.find((r) => r.model === 'KQ2H06-01AS')).toMatchObject({ qty: 2, ids: ['CY1.HEAD', 'CY1.ROD'] });
    expect(plain.some((r) => r.model.startsWith('AS'))).toBe(false);
    // 同じ型式は機器をまたいでまとめる
    const two: Diagram = {
      devices: [
        { id: 'CY1', type: 'smc.cm2', x: 0, y: 0, params: { speedController: 'meter-out' } },
        { id: 'CY2', type: 'smc.cm2', x: 0, y: 0, params: { bore: 32, speedController: 'meter-out' } },
        { id: 'HD1', type: 'smc.mhz2', x: 0, y: 0, params: { speedController: 'meter-in', action: 'S' } },
      ],
      wires: [],
    };
    const r2 = bomRows(two, getDeviceDefinition);
    expect(r2.find((r) => r.model === 'AS2201F-01-06SA')).toMatchObject({ qty: 4, ids: ['CY1.HEAD', 'CY1.ROD', 'CY2.HEAD', 'CY2.ROD'] });
    expect(r2.find((r) => r.model === 'AS1211F-M5-04A')).toMatchObject({ qty: 1, ids: ['HD1.CLOSE'], name: 'スピードコントローラ（エルボ形・メータイン）' });
  });
});
