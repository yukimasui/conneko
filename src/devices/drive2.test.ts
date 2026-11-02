/**
 * 駆動機器の追加分（三菱電機 FR-A820・ブレーキ抵抗器 MRS・MR-J5-G、安川電機 GA500・Σ-7、オリエンタルモーター BLE2。docs/drive-catalog.md）と、
 * 安川電機のロボット（MOTOMAN-GP7・YRC1000micro・プログラミングペンダント・ユーザケーブル。docs/robot-catalog.md）の
 * 機器定義の整合性と、代表的な配線での電気チェックの確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { bomRows, ioRows } from '../export/reports';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { ioSystem } from '../model/io';
import { mateCandidates } from '../model/mates';
import { familyOf, variantLabel } from './families';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';
import { paramVariants, validateDefinition } from './validate';

let seq = 0;
const wire = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'KIV', ...extra };
};
const cable = (from: string, to: string) => wire(from, to, { wireType: 'CABLE' });
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const lookup = (t: string) => getDeviceDefinition(t);
const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const check = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => check(d).filter((i) => i.severity === 'error');
const rulesOf = (d: Diagram) => check(d).map((i) => i.rule);
/** 電源・電圧・極性・短絡・過電流など電気的な誤りの指摘（未接続の注意などを除く） */
const electrical = (d: Diagram) => check(d).filter((i) => i.severity === 'error' || /voltage|system|conductor|short|overload|phase|polarity/.test(i.rule));

const NEW_TYPES = [
  'mitsubishi.fr-a820-0.75k',
  'mitsubishi.fr-a820-1.5k',
  'mitsubishi.fr-a820-2.2k',
  'mitsubishi.fr-a820-3.7k',
  'mitsubishi.mrs',
  'mitsubishi.mr-j5-g',
  'yaskawa.ga50a2006',
  'yaskawa.ga50a2012',
  'yaskawa.ga50a2021',
  'yaskawa.sgd7s-a00a',
  'yaskawa.sgm7j',
  'oriental.ble2d',
  'oriental.blm',
  'yaskawa.gp7',
  'yaskawa.yrc1000micro',
  'yaskawa.yrc1000micro-pp',
  'yaskawa.gp7-user-cable',
];

describe('追加した機器定義の整合性', () => {
  it.each(NEW_TYPES)('%s: すべてのパラメーターの組で定義が整合し、コネクタのピンがそろっていて、推定を書いている', (type) => {
    const d = def(type);
    for (const v of paramVariants(d)) {
      expect(validateDefinition(d, v), JSON.stringify(v)).toEqual([]);
      const r = resolveDevice(d, v);
      for (const t of r.terminals) {
        if (!t.connector || t.connector.pins === 0) continue;
        expect(r.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length, `${t.id} のピン数`).toBe(t.connector.pins);
      }
      // 出力点から出る内部経路はすべて switch: output
      for (const l of r.links) {
        const from = r.terminal(l.from) ?? r.pin(l.from);
        if (from?.signal?.dir === 'out') expect(l.switch, `${type} ${l.from}`).toBe('output');
      }
    }
    expect(d.estimated, type).toBeTruthy();
  });

  it('既存の機器と type が重ならない', () => {
    const types = deviceDefinitions.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

/** 三相 200V → ブレーカー → インバーター → モーター */
function inverterCircuit(inv: string, motorAmp = 3.5, breaker = 20): Diagram {
  return {
    devices: [
      dev('PS1', 'generic.power-source.3p200v'),
      dev('CB1', 'mitsubishi.nf32-sv.3p', { ratedCurrent: breaker }),
      dev('INV1', inv),
      dev('M1', 'generic.motor.3p', { ratedCurrent: motorAmp }),
    ],
    wires: [
      wire('PS1.R', 'CB1.1'),
      wire('PS1.S', 'CB1.3'),
      wire('PS1.T', 'CB1.5'),
      wire('CB1.2', 'INV1.R/L1'),
      wire('CB1.4', 'INV1.S/L2'),
      wire('CB1.6', 'INV1.T/L3'),
      wire('INV1.U', 'M1.U'),
      wire('INV1.V', 'M1.V'),
      wire('INV1.W', 'M1.W'),
      wire('PS1.PE', 'INV1.E', { color: 'green' }),
      wire('INV1.E2', 'M1.E', { color: 'green' }),
    ],
  };
}

describe('インバーター FR-A820（三菱電機）・GA500（安川電機）', () => {
  const ids = (t: string) => resolveDevice(def(t)).terminals.map((x) => x.id);

  it('FR-A820 は容量で端子の ID が変わらない。FR-E820 と共通の端子は同じ ID（機種を変えても配線が残る）', () => {
    const base = ids('mitsubishi.fr-a820-0.75k');
    for (const t of ['mitsubishi.fr-a820-1.5k', 'mitsubishi.fr-a820-2.2k', 'mitsubishi.fr-a820-3.7k']) expect(ids(t), t).toEqual(base);
    const common = ['R/L1', 'S/L2', 'T/L3', 'U', 'V', 'W', 'N/-', 'P1', 'P/+', 'PR', 'E', 'E2', 'STF', 'STR', 'RH', 'RM', 'RL', 'MRS', 'RES', 'SD', 'PC', 'S1', 'S2', 'A', 'B', 'C', 'RUN', 'FU', 'SE', 'SO', 'SOC', 'FM', 'SD2', '10', '2', '5', '4'];
    expect(ids('mitsubishi.fr-e820-0.75k')).toEqual(expect.arrayContaining(common));
    expect(base).toEqual(expect.arrayContaining(common));
    // A800 にだけある端子
    expect(base).toEqual(expect.arrayContaining(['R1/L11', 'S1/L21', 'PX', 'JOG', 'AU', 'A2', 'B2', 'C2', 'SU', 'IPF', 'OL', 'AM', '1', '10E', 'SIC']));
    // 異常出力の印字は A1・B1・C1
    expect(resolveDevice(def('mitsubishi.fr-a820-0.75k')).terminal('A')?.label).toBe('A1');
  });

  it('GA500 は容量で端子の ID が変わらない。主回路の ID は三菱電機のインバーターとそろう', () => {
    const base = ids('yaskawa.ga50a2006');
    expect(ids('yaskawa.ga50a2012')).toEqual(base);
    expect(ids('yaskawa.ga50a2021')).toEqual(base);
    expect(base).toEqual(expect.arrayContaining(['R/L1', 'S/L2', 'T/L3', 'U', 'V', 'W', 'E', 'E2', 'S1', 'SC', 'SP', 'SN', 'MA', 'MB', 'MC', 'P1', 'C1', 'A1', 'A2', '+V', 'AC', 'B1', 'B2']));
    expect(resolveDevice(def('yaskawa.ga50a2006')).terminal('U')?.label).toBe('U/T1');
  });

  it.each(['mitsubishi.fr-a820-1.5k', 'yaskawa.ga50a2012'])('%s: 三相 200V からモーターを回す回路に電気的な誤りがない', (inv) => {
    expect(electrical(inverterCircuit(inv))).toEqual([]);
  });

  it('容量で出力の定格電流と入力電流が変わる', () => {
    expect(resolveDevice(def('mitsubishi.fr-a820-3.7k')).terminal('U')?.supply?.limitCurrent).toBe(17.5);
    expect(def('mitsubishi.fr-a820-3.7k').loadCurrent).toBe(22.6);
    expect(resolveDevice(def('mitsubishi.fr-a820-3.7k')).width).toBe(300);
    expect(resolveDevice(def('yaskawa.ga50a2021')).terminal('U')?.supply?.limitCurrent).toBe(17.6);
    expect(def('yaskawa.ga50a2006').loadCurrent).toBe(5.8);
  });

  it('インバーターの出力の定格電流を超えるモーターをつなぐと overload（出力の定格電流を上流の保護として比べる）', () => {
    // FR-A820-0.75K（ND 5A）に 6.6A のモーター
    const over = (amp: number) => check(inverterCircuit('mitsubishi.fr-a820-0.75k', amp)).filter((i) => i.rule === 'overload' && i.devices.includes('M1'));
    expect(over(6.6).length).toBe(1);
    expect(over(3.5)).toEqual([]);
  });

  it('上流のブレーカーより入力電流が大きいと breaker-capacity（FR-A820-3.7K の 22.6A を 20A で保護）', () => {
    expect(rulesOf(inverterCircuit('mitsubishi.fr-a820-3.7k', 15, 20))).toContain('breaker-capacity');
    expect(rulesOf(inverterCircuit('mitsubishi.fr-a820-3.7k', 15, 30))).not.toContain('breaker-capacity');
  });

  it('GA500 の多機能接点入力・フォトカプラ出力・異常出力', () => {
    const r = resolveDevice(def('yaskawa.ga50a2006'));
    expect(r.terminal('S1')?.signal).toMatchObject({ dir: 'in', kind: 'dry' });
    expect(r.terminal('A2')?.signal).toMatchObject({ dir: 'in', kind: 'analog-i', ref: 'AC' });
    expect(r.links).toEqual(
      expect.arrayContaining([
        { from: 'MC', to: 'MA', switch: 'NO', ratedCurrent: 1 },
        { from: 'MC', to: 'MB', switch: 'NC', ratedCurrent: 1 },
        { from: 'P1', to: 'C1', switch: 'output', ratedCurrent: 0.05 },
      ]),
    );
  });

  it('ファミリー「インバーター」に入り、メーカー・シリーズ・電源・容量で機種を見分けられる', () => {
    const f = familyOf('yaskawa.ga50a2012')!;
    expect(f.name).toBe('インバーター');
    expect(familyOf('mitsubishi.fr-a820-2.2k')?.id).toBe(f.id);
    expect(f.facets.map((x) => x.value(def('yaskawa.ga50a2012')))).toEqual(['安川電機', 'GA500', '三相 200V', '2.2kW']);
    expect(f.facets.map((x) => x.value(def('mitsubishi.fr-a820-2.2k')))).toEqual(['三菱電機', 'FR-A800', '三相 200V', '2.2kW']);
    // 同じ容量の FR-E820 と FR-A820 も観点の値で区別できる
    const sig = (d: DeviceDefinition) => f.facets.map((x) => x.value(d) ?? '').join('/');
    expect(new Set(f.members.map(sig)).size).toBe(f.members.length);
    expect(variantLabel(f, def('yaskawa.ga50a2021'))).toBe('三相 200V・3.7kW');
  });
});

describe('ブレーキ抵抗器 MRS', () => {
  it('FR-A820 の P/+・PR につないでも電気的な誤りがなく、抵抗値で型式が変わる', () => {
    const d = inverterCircuit('mitsubishi.fr-a820-0.75k');
    d.devices.push(dev('R1', 'mitsubishi.mrs', { ohm: '100' }));
    d.wires.push(wire('R1.P', 'INV1.P/+'), wire('R1.PR', 'INV1.PR'));
    expect(electrical(d)).toEqual([]);
    expect(check(d).filter((i) => i.devices.includes('R1') && i.rule === 'unconnected')).toEqual([]);
    expect(def('mitsubishi.mrs').modelOf!({ ohm: '40' })).toBe('MRS120W40');
    expect(bomRows(d, lookup).some((r) => r.model === 'MRS120W100')).toBe(true);
  });

  it('FR-A820・FR-E820・GA500 の P/+・PR（GA500 は +2・B1）と同じ「信号」の端子として扱う（電源のチェックの対象外）', () => {
    const r = resolveDevice(def('mitsubishi.mrs'));
    expect(r.terminals.map((t) => [t.id, t.role])).toEqual([
      ['P', 'signal'],
      ['PR', 'signal'],
    ]);
    expect(resolveDevice(def('mitsubishi.fr-a820-0.75k')).terminal('PR')?.role).toBe('signal');
  });
});

/** サーボアンプとサーボモーター（ブレーキ付き） */
function servoCircuit(amp: string, motor: string, ampParams: DiagramDevice['params'], motorParams: DiagramDevice['params'], ctl: [string, string], brake: 'dc24' | 'ac200' = 'dc24'): Diagram {
  const d: Diagram = {
    devices: [
      dev('PS1', 'generic.power-source.3p200v'),
      dev('CB1', 'mitsubishi.nf32-sv.3p', { ratedCurrent: 10 }),
      dev('SA1', amp, ampParams),
      dev('SM1', motor, motorParams),
      dev('PSU1', 'generic.psu.dc24v'),
    ],
    wires: [
      wire('PS1.R', 'CB1.1'),
      wire('PS1.S', 'CB1.3'),
      wire('PS1.T', 'CB1.5'),
      wire('CB1.2', 'SA1.L1'),
      wire('CB1.4', 'SA1.L2'),
      wire('CB1.6', 'SA1.L3'),
      wire('CB1.2', `SA1.${ctl[0]}`),
      wire('CB1.4', `SA1.${ctl[1]}`),
      wire('SA1.U', 'SM1.U'),
      wire('SA1.V', 'SM1.V'),
      wire('SA1.W', 'SM1.W'),
      wire('PS1.PE', 'SA1.PE', { color: 'green' }),
      wire('SA1.PE', 'SM1.E', { color: 'green' }),
      cable('SA1.CN2', 'SM1.ENC'),
      wire('CB1.2', 'PSU1.L'),
      wire('CB1.4', 'PSU1.N'),
      wire('PS1.PE', 'PSU1.PE', { color: 'green' }),
    ],
  };
  if (brake === 'dc24') d.wires.push(wire('PSU1.+V1', 'SM1.B1', { sizeSq: 0.75 }), wire('PSU1.-V1', 'SM1.B2', { sizeSq: 0.75 }));
  else d.wires.push(wire('CB1.2', 'SM1.B1'), wire('CB1.4', 'SM1.B2'));
  return d;
}

describe('サーボ MR-J5-G（CC-Link IE TSN）・Σ-7（SGD7S-□A00A と SGM7J）', () => {
  const j5g = (brake: 'dc24' | 'ac200' = 'dc24') => servoCircuit('mitsubishi.mr-j5-g', 'mitsubishi.hk-kt', { capacity: '40' }, { capacity: '43', brake: 'B' }, ['L11', 'L21'], brake);
  const s7 = (brake: 'dc24' | 'ac200' = 'dc24') => servoCircuit('yaskawa.sgd7s-a00a', 'yaskawa.sgm7j', { capacity: '2R8' }, { capacity: '04', brake: 'C' }, ['L1C', 'L2C'], brake);

  it.each([
    ['MR-J5-40G ＋ HK-KT43WB', j5g],
    ['SGD7S-2R8A00A ＋ SGM7J-04A（ブレーキ付き）', s7],
  ])('%s: 主回路・制御電源・モーター・エンコーダー・ブレーキの配線に電気的な誤りがなく、エンコーダーの未接続もない', (_, make) => {
    const d = make();
    expect(electrical(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('connector-mismatch');
    expect(rulesOf(d)).not.toContain('connector-unconnected');
  });

  it.each([
    ['MR-J5-G', j5g],
    ['Σ-7', s7],
  ])('%s: 電磁ブレーキに AC200V をつなぐと指摘する', (_, make) => {
    expect(electrical(make('ac200')).filter((i) => i.devices.includes('SM1')).length).toBeGreaterThan(0);
  });

  it('メーカーの違うサーボアンプとサーボモーターのエンコーダーはつながらない（connector-mismatch）', () => {
    const d = s7();
    d.devices = d.devices.map((x) => (x.id === 'SM1' ? dev('SM1', 'mitsubishi.hk-kt', { capacity: '43', brake: 'B' }) : x));
    expect(rulesOf(d)).toContain('connector-mismatch');
    const enc = (t: string, id: string) => resolveDevice(def(t)).terminal(id)!.connector!;
    expect(connectorsMate(enc('yaskawa.sgd7s-a00a', 'CN2'), enc('yaskawa.sgm7j', 'ENC'))).toBe(true);
    expect(connectorsMate(enc('mitsubishi.mr-j5-g', 'CN2'), enc('mitsubishi.hk-kt', 'ENC'))).toBe(true);
    expect(connectorsMate(enc('yaskawa.sgd7s-a00a', 'CN2'), enc('mitsubishi.hk-kt', 'ENC'))).toBe(false);
  });

  it('保持ブレーキは端子ごとの消費電流（0.25A）で数え、0.2A の保護では過負荷になる', () => {
    const withCp = (amp: number): Diagram => {
      const d = s7();
      d.wires = d.wires.filter((w) => w.to.terminal !== 'B1');
      d.devices.push(dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: amp }));
      d.wires.push(wire('PSU1.+V2', 'CP1.1', { sizeSq: 0.75 }), wire('CP1.2', 'SM1.B1', { sizeSq: 0.75 }));
      return d;
    };
    expect(check(withCp(0.5)).filter((i) => i.rule === 'overload')).toEqual([]);
    expect(check(withCp(0.2)).filter((i) => i.rule === 'overload').map((i) => i.key)).toEqual(['overload:SM1:B1']);
  });

  it('MR-J5-G の CN1A・CN1B は CC-Link IE TSN。Ethernet だけの機器とつなぐと protocol-mismatch', () => {
    const r = resolveDevice(def('mitsubishi.mr-j5-g'));
    expect(r.terminal('CN1A')?.connector?.protocols).toEqual(['cc-link-ie-tsn']);
    const ok: Diagram = { devices: [dev('SA1', 'mitsubishi.mr-j5-g'), dev('SA2', 'mitsubishi.mr-j5-g')], wires: [cable('SA1.CN1B', 'SA2.CN1A')] };
    expect(rulesOf(ok)).not.toContain('protocol-mismatch');
    const ng: Diagram = { devices: [dev('SA1', 'mitsubishi.mr-j5-g'), dev('HMI1', 'keyence.vt5-w07')], wires: [cable('SA1.CN1A', 'HMI1.LAN')] };
    expect(rulesOf(ng)).toContain('protocol-mismatch');
  });

  it('入出力: MR-J5-G は DICOM / DOCOM、SGD7S は +24VIN を共通にした入力と、+ − の組のフォトカプラ出力', () => {
    const g = resolveDevice(def('mitsubishi.mr-j5-g'));
    expect(g.terminal('EM2')?.signal).toMatchObject({ dir: 'in', kind: 'dc', common: 'DICOM' });
    expect(g.links.every((l) => l.to === 'DOCOM' && l.switch === 'output')).toBe(true);
    const s = resolveDevice(def('yaskawa.sgd7s-a00a'));
    expect(s.terminal('/S-ON')?.signal).toMatchObject({ dir: 'in', kind: 'dc', common: '+24VIN' });
    expect(s.terminal('/PULS')?.signal).toMatchObject({ common: 'PL1' });
    expect(s.links).toContainEqual({ from: 'ALM+', to: 'ALM-', switch: 'output', ratedCurrent: 0.05 });
    expect(def('yaskawa.sgm7j').modelOf!({ capacity: '08', brake: 'C' })).toBe('SGM7J-08A7AC1');
  });

  it('サーボアンプ・サーボモーターのファミリーに入る', () => {
    expect(familyOf('mitsubishi.mr-j5-g')?.id).toBe('servo-amp');
    expect(familyOf('yaskawa.sgd7s-a00a')?.id).toBe('servo-amp');
    expect(familyOf('yaskawa.sgm7j')?.id).toBe('servo-motor');
  });
});

describe('ブラシレスモーター BLE2（オリエンタルモーター）', () => {
  const circuit = (power: string, src = 'generic.power-source.1p100v'): Diagram => ({
    devices: [dev('PS1', src), dev('DRV1', 'oriental.ble2d', { watt: '120', power }), dev('M1', 'oriental.blm', { watt: '120' })],
    wires: [wire('PS1.L', 'DRV1.L1'), wire('PS1.N', 'DRV1.L2'), wire('PS1.PE', 'DRV1.PE', { color: 'green' }), cable('DRV1.CN2', 'M1.CN')],
  });

  it('単相 100V で BLE2D120-A を給電し、モーターをつなぐ回路に誤りがない', () => {
    const d = circuit('100');
    expect(electrical(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('connector-unconnected');
    expect(def('oriental.ble2d').modelOf!({ watt: '120', power: '100' })).toBe('BLE2D120-A');
  });

  it('200V 用（-C）に単相 100V をつなぐと指摘する', () => {
    expect(electrical(circuit('200-1')).some((i) => i.devices.includes('DRV1'))).toBe(true);
  });

  it('三相 200V のときだけ L3 があり、入力電流が変わる。200W は 200V 用だけ', () => {
    const d = def('oriental.ble2d');
    expect(resolveDevice(d, { power: '200-3' }).terminals.map((t) => t.id)).toContain('L3');
    expect(resolveDevice(d, { power: '100' }).terminals.map((t) => t.id)).not.toContain('L3');
    const load = d.loadCurrent as (p: Record<string, string>) => number;
    expect(load({ watt: '120', power: '200-3' })).toBe(1.02);
    expect(load({ watt: '30', power: '100' })).toBe(1.1);
    const power = d.params!.find((p) => p.key === 'power')!;
    expect(power.optionsFor!({ watt: '200', power: '200-1' }).map((o) => o.value)).toEqual(['200-1', '200-3']);
  });

  it('ドライバーの CN2 とモーターのコネクタは BLE2 どうしだけ合う（AZ シリーズのモーターとは合わない）', () => {
    const c = (t: string, id: string) => resolveDevice(def(t)).terminal(id)!.connector!;
    expect(connectorsMate(c('oriental.ble2d', 'CN2'), c('oriental.blm', 'CN'))).toBe(true);
    expect(connectorsMate(c('oriental.ble2d', 'CN2'), c('oriental.azm', 'MOTOR'))).toBe(false);
    const d = circuit('100');
    d.devices = d.devices.map((x) => (x.id === 'M1' ? dev('M1', 'oriental.azm') : x));
    d.wires = d.wires.map((w) => (w.to.device === 'M1' ? { ...w, to: { device: 'M1', terminal: 'MOTOR' } } : w));
    expect(rulesOf(d)).toContain('connector-mismatch');
  });
});

/** YRC1000micro（単相 200V）と GP7 をマニピュレータケーブルでつなぎ、プログラミングペンダントをつなぐ。安全信号は短絡線 */
const cell = (): Diagram => ({
  devices: [dev('SRC1', 'generic.power-source.3p200v'), dev('RC1', 'yaskawa.yrc1000micro'), dev('RB1', 'yaskawa.gp7'), dev('PP1', 'yaskawa.yrc1000micro-pp')],
  wires: [
    wire('SRC1.R', 'RC1.L'),
    wire('SRC1.S', 'RC1.N'),
    wire('SRC1.PE', 'RC1.PE', { color: 'green' }),
    cable('RC1.X1', 'RB1.X1'),
    cable('RC1.PP', 'PP1.PP'),
    wire('RC1.EXESP1+', 'RC1.EXESP1-', { sizeSq: 0.75 }),
    wire('RC1.EXESP2+', 'RC1.EXESP2-', { sizeSq: 0.75 }),
    wire('RC1.SAF_F1+', 'RC1.SAF_F1-', { sizeSq: 0.75 }),
    wire('RC1.SAF_F2+', 'RC1.SAF_F2-', { sizeSq: 0.75 }),
  ],
});

describe('安川電機 MOTOMAN-GP7 と YRC1000micro（マニピュレータケーブル）', () => {
  it('GP7 と YRC1000micro を X1 でつなぎ、PP をつなぐとエラー・コネクタの指摘はない', () => {
    const d = cell();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('connector-mismatch');
    expect(rulesOf(d)).not.toContain('connector-unconnected');
  });

  it('ファナックのコントローラーにつなぐ・ファナックのロボットをつなぐと connector-mismatch', () => {
    const toFanuc: Diagram = { devices: [dev('RC1', 'fanuc.r-30ib-mini-plus'), dev('RB1', 'yaskawa.gp7')], wires: [cable('RC1.RM1', 'RB1.X1')] };
    expect(rulesOf(toFanuc)).toContain('connector-mismatch');
    const fromFanuc: Diagram = { devices: [dev('RC1', 'yaskawa.yrc1000micro'), dev('RB1', 'fanuc.lr-mate-200id')], wires: [cable('RC1.X1', 'RB1.RM1')] };
    expect(rulesOf(fromFanuc)).toContain('connector-mismatch');
    const pp: Diagram = { devices: [dev('RC1', 'fanuc.r-30ib-mini-plus'), dev('PP1', 'yaskawa.yrc1000micro-pp')], wires: [cable('RC1.TP', 'PP1.PP')] };
    expect(rulesOf(pp)).toContain('connector-mismatch');
  });

  it('マニピュレータケーブルをつなぎ忘れると、ロボットとコントローラーの両方に connector-unconnected', () => {
    const d = cell();
    d.wires = d.wires.filter((x) => x.to.device !== 'RB1');
    expect(check(d).filter((i) => i.rule === 'connector-unconnected').map((i) => i.key).sort()).toEqual(['unconnected:RB1:X1', 'unconnected:RC1:X1']);
  });

  it('ロボットの X1 から引くと候補は YRC1000micro だけ。PP からはプログラミングペンダント、ユーザ配線からはユーザケーブル', () => {
    const d: Diagram = { devices: [dev('RB1', 'yaskawa.gp7')], wires: [] };
    expect(mateCandidates(d, { device: 'RB1', terminal: 'X1' }, deviceDefinitions, lookup).map((c) => c.type)).toEqual(['yaskawa.yrc1000micro']);
    expect(mateCandidates(d, { device: 'RB1', terminal: 'UC' }, deviceDefinitions, lookup).map((c) => c.type)).toEqual(['yaskawa.gp7-user-cable']);
    const rc: Diagram = { devices: [dev('RC1', 'yaskawa.yrc1000micro')], wires: [] };
    expect(mateCandidates(rc, { device: 'RC1', terminal: 'PP' }, deviceDefinitions, lookup).map((c) => c.type)).toEqual(['yaskawa.yrc1000micro-pp']);
  });

  it('部品表にマニピュレータケーブルが 1 本載る', () => {
    const rows = bomRows(cell(), lookup).filter((r) => r.maker === '安川電機');
    expect(rows.map((r) => r.model)).toEqual(expect.arrayContaining(['MOTOMAN-GP7', 'YRC1000micro', 'マニピュレータケーブル（GP7・YRC1000micro 用）']));
    expect(rows.find((r) => r.model === 'マニピュレータケーブル（GP7・YRC1000micro 用）')?.qty).toBe(1);
  });

  it('ロボット・ロボットコントローラー・ティーチングペンダントのファミリーに入る', () => {
    expect(familyOf('yaskawa.gp7')?.id).toBe('robot');
    expect(familyOf('yaskawa.yrc1000micro')?.id).toBe('robot-controller');
    expect(familyOf('yaskawa.yrc1000micro-pp')?.id).toBe(familyOf('fanuc.ipendant')?.id);
    expect(familyOf('yaskawa.gp7-user-cable')?.id).toBe('harness');
  });

  it('直流を電源につなぐと電源の種類の指摘になる', () => {
    const d = cell();
    d.devices.push(dev('PSU1', 'generic.psu.dc24v'));
    d.wires = d.wires.filter((x) => !(x.to.device === 'RC1' && (x.to.terminal === 'L' || x.to.terminal === 'N')));
    d.wires.push(wire('PSU1.+V1', 'RC1.L'), wire('PSU1.-V1', 'RC1.N'));
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });
});

describe('YRC1000micro の入出力（PLC との受け渡し・I/O 表）', () => {
  /**
   * KEYENCE KV-C32TC（NPN 出力）の No.1（MIL 1）→ 34 極の変換端子台 1 → 40 極の変換端子台 12（IN01）。
   * PLC の 0V とコントローラーの 0VU をそろえる。
   */
  const plc = (): Diagram => {
    const d = cell();
    d.devices.push(
      dev('PSU1', 'generic.psu.dc24v'),
      dev('OUT1', 'keyence.kv-c32tc.output'),
      dev('TB1', 'generic.mil-terminal-block.34p'),
      dev('TB2', 'generic.mil-terminal-block.40p'),
    );
    d.wires.push(
      cable('OUT1.CN1', 'TB1.CN'),
      cable('RC1.IO', 'TB2.CN'),
      wire('PSU1.-V1', 'TB1.33', { sizeSq: 0.75 }),
      wire('TB1.1', 'TB2.12', { sizeSq: 0.75 }),
      wire('TB2.3', 'PSU1.-V2', { sizeSq: 0.75 }),
    );
    return d;
  };

  it('ピンの割付け: +24VU・0VU・専用入力・汎用入力・汎用出力・専用出力が並ぶ（入力 15 点・出力 9 点）', () => {
    const r = resolveDevice(def('yaskawa.yrc1000micro'));
    expect(r.pin('IO#1')).toMatchObject({ label: '+24VU（1）', role: 'supply' });
    expect(r.pin('IO#12')).toMatchObject({ label: 'IN01（12）', signal: { dir: 'in', kind: 'dc', common: 'IO#1' } });
    expect(r.pin('IO#21')).toMatchObject({ label: 'OUT01（21）', signal: { dir: 'out', kind: 'npn' } });
    expect(r.pin('IO#5')?.label).toBe('SIN1 外部起動（5）');
    const io = r.pins.filter((p) => p.id.startsWith('IO#'));
    expect(io.filter((p) => p.signal?.dir === 'in').length).toBe(15);
    expect(io.filter((p) => p.signal?.dir === 'out').length).toBe(9);
    const tb = resolveDevice(def('generic.mil-terminal-block.40p')).terminal('CN')!.connector!;
    expect(connectorsMate(r.terminal('IO')!.connector!, tb)).toBe(true);
  });

  it('PLC の NPN 出力で IN01 を駆動しても極性の指摘はなく、I/O 表に PLC の出力とのつながりが出る', () => {
    const d = plc();
    expect(errorsOf(d).filter((i) => i.rule === 'signal-polarity')).toEqual([]);
    const points = ioSystem(d, 'RC1', lookup)!.units[0].points;
    const in01 = points.find((p) => p.address === 'IN01')!;
    expect(in01).toMatchObject({ dir: 'in', kind: 'dc' });
    expect(in01.connections.map((c) => c.name)).toContain('OUT1.CN1#1');
    expect(points.find((p) => p.address === 'OUT01')?.dir).toBe('out');
    expect(points.find((p) => p.address === 'SIN1')?.label).toBe('SIN1 外部起動（5）');
    const rows = ioRows(d, lookup).filter((r) => r.host === 'RC1');
    expect(rows.filter((r) => r.dir === '入力').length).toBe(15);
    expect(rows.filter((r) => r.dir === '出力').length).toBe(9);
    expect(rows.find((r) => r.address === 'IN01')?.connections).toContain('OUT1.CN1#1');
  });

  it('PNP のセンサーをプラスコモンの入力につなぐと signal-polarity', () => {
    const d = cell();
    d.devices.push(dev('TB2', 'generic.mil-terminal-block.40p'), dev('S1', 'keyence.pz-g41', { output: 'P' }));
    d.wires.push(cable('RC1.IO', 'TB2.CN'), wire('TB2.2', 'S1.BN', { sizeSq: 0.3 }), wire('TB2.4', 'S1.BU', { sizeSq: 0.3 }), wire('S1.BK', 'TB2.13', { sizeSq: 0.3 }));
    expect(errorsOf(d).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('汎用出力 OUT01 でリレーを駆動: +24VU から受電でき、電源が来ている', () => {
    const d = cell();
    d.devices.push(dev('TB2', 'generic.mil-terminal-block.40p'), dev('K1', 'omron.my2n.dc24'));
    d.wires.push(cable('RC1.IO', 'TB2.CN'), wire('TB2.37', 'K1.14', { sizeSq: 0.3 }), wire('K1.13', 'TB2.21', { sizeSq: 0.3 }));
    expect(check(d).filter((i) => i.devices.includes('K1') && (i.severity === 'error' || i.rule === 'no-power'))).toEqual([]);
  });

  it('ハンドのセンサーを内部ユーザ配線（U アーム側 → ベース側）で IN01 へつなぐと、I/O 表にセンサーが出る', () => {
    const d = cell();
    d.devices.push(
      dev('TB2', 'generic.mil-terminal-block.40p'),
      dev('CBU', 'yaskawa.gp7-user-cable'),
      dev('CBB', 'yaskawa.gp7-user-cable'),
      dev('S1', 'keyence.pz-g41'),
    );
    d.wires.push(
      cable('RC1.IO', 'TB2.CN'),
      cable('RB1.UC', 'CBU.CN'),
      cable('RB1.BC', 'CBB.CN'),
      // ベース側: 1 = +24V、2 = 0V、3 = センサーの出力
      wire('CBB.1', 'TB2.2', { sizeSq: 0.3 }),
      wire('CBB.2', 'TB2.4', { sizeSq: 0.3 }),
      wire('CBB.3', 'TB2.12', { sizeSq: 0.3 }),
      // U アーム側: センサー（NPN）
      wire('CBU.1', 'S1.BN', { sizeSq: 0.3 }),
      wire('CBU.2', 'S1.BU', { sizeSq: 0.3 }),
      wire('S1.BK', 'CBU.3', { sizeSq: 0.3 }),
    );
    expect(errorsOf(d)).toEqual([]);
    const points = ioSystem(d, 'RC1', lookup)!.units[0].points;
    expect(points.find((p) => p.address === 'IN01')?.connections.map((c) => c.name)).toContain('S1.BK');
  });
});

describe('YRC1000micro の安全信号（外部非常停止 EXESP・安全柵 SAF_F）', () => {
  const estop = (): Diagram => {
    const d = cell();
    d.devices.push(dev('ES1', 'idec.xw1e-bv402mr'));
    d.wires = d.wires.filter((x) => !x.from.terminal.startsWith('EXESP'));
    d.wires.push(wire('RC1.EXESP1+', 'ES1.21'), wire('ES1.22', 'RC1.EXESP1-'), wire('RC1.EXESP2+', 'ES1.41'), wire('ES1.42', 'RC1.EXESP2-'));
    return d;
  };
  const safetyRules = (d: Diagram) => check(d).filter((i) => i.devices.includes('RC1') && /safety|estop|direct/.test(i.rule));

  it('非常停止スイッチの b 接点 2 回路を EXESP に入れるとエラー・注意なし。使わない信号の短絡線も指摘なし', () => {
    expect(safetyRules(estop())).toEqual([]);
    expect(errorsOf(estop())).toEqual([]);
    expect(safetyRules(cell())).toEqual([]);
  });

  it('片側（EXESP2）だけを配線すると safety-channel-partial のエラー', () => {
    const d = cell();
    d.wires = d.wires.filter((x) => x.from.terminal !== 'EXESP1+');
    const found = check(d).filter((i) => i.rule === 'safety-channel-partial');
    expect(found.map((i) => i.severity)).toEqual(['error']);
  });

  it('チャンネルを取り違えると safety-channel-cross、安全柵に a 接点を入れると estop-not-nc', () => {
    const cross = cell();
    cross.wires = cross.wires.filter((x) => !x.from.terminal.startsWith('EXESP'));
    cross.wires.push(wire('RC1.EXESP1+', 'RC1.EXESP2-'), wire('RC1.EXESP2+', 'RC1.EXESP1-'));
    expect(rulesOf(cross)).toContain('safety-channel-cross');

    const ano = cell();
    ano.devices.push(dev('MC1', 'mitsubishi.s-t10.ac200v'));
    ano.wires = ano.wires.filter((x) => x.from.terminal !== 'SAF_F1+');
    ano.wires.push(wire('RC1.SAF_F1+', 'MC1.13'), wire('MC1.14', 'RC1.SAF_F1-'));
    expect(rulesOf(ano)).toContain('estop-not-nc');
  });
});
