/**
 * 盤内部品・開閉器の残り（富士電機 TR-0N/3・TR-5-1N/3、パナソニック BBW・BJW、三菱電機 NF400-SW、フエニックス・コンタクト CBMC、
 * オムロン XW2R、エム・システム技研 W2VS）の代表的な配線での電気チェックの動作確認（docs/mitsubishi-catalog.md・docs/power-catalog.md・docs/control-catalog.md）。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { diagramCurrentMargins } from '../check/protection';
import { proposeConnections } from '../model/bulkConnect';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { deviceElements } from '../schematic/elements';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { hasEstimates } from './estimates';
import { deviceModel } from './types';

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 5.5, wireType: 'KIV', ...extra };
};
const thin = (from: string, to: string) => w(from, to, { sizeSq: 1.25 });
const sig = (from: string, to: string) => w(from, to, { sizeSq: 0.3 });
const cable = (from: string, to: string) => w(from, to, { wireType: 'CABLE', sizeSq: 0 });
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const lookup = (t: string) => getDeviceDefinition(t);
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const rulesOf = (d: Diagram) => issues(d).map((i) => i.rule);
const pairs = (d: Diagram, a: string, b: string) => proposeConnections(d, a, b, lookup).proposals.map((p) => `${p.from.terminal}-${p.to.terminal}`);

/**
 * 三相 200V → 漏電ブレーカ（パナソニック BJW）→ 電磁接触器（富士 SC-05）→ サーマル（TR-0N/3）→ モーター。
 * 操作回路は BJW の二次の R・S 相から CP で取り、サーマルの b 接点（95-96）を通して MC のコイルへ
 */
const motorCircuit = (): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.3p200v'),
    dev('ELB1', 'panasonic.bjw.3p', { ratedCurrent: 20 }),
    dev('MC1', 'fuji.sc-05.ac200v'),
    dev('THR1', 'fuji.tr-0n3', { heater: 9 }),
    dev('M1', 'generic.motor.3p', { ratedCurrent: 8 }),
    dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 3 }),
  ],
  wires: [
    w('PS1.R', 'ELB1.1'),
    w('PS1.S', 'ELB1.3'),
    w('PS1.T', 'ELB1.5'),
    w('ELB1.2', 'MC1.1/L1'),
    w('ELB1.4', 'MC1.3/L2'),
    w('ELB1.6', 'MC1.5/L3'),
    w('MC1.2/T1', 'THR1.1/L1'),
    w('MC1.4/T2', 'THR1.3/L2'),
    w('MC1.6/T3', 'THR1.5/L3'),
    w('THR1.2/T1', 'M1.U'),
    w('THR1.4/T2', 'M1.V'),
    w('THR1.6/T3', 'M1.W'),
    w('M1.E', 'PS1.PE'),
    thin('ELB1.2', 'CP1.1'),
    thin('ELB1.4', 'CP1.3'),
    thin('CP1.2', 'THR1.95'),
    thin('THR1.96', 'MC1.A1'),
    thin('MC1.A2', 'CP1.4'),
  ],
});

describe('富士電機 TR-0N/3・TR-5-1N/3 とパナソニックの遮断器', () => {
  it('BJW → SC-05 → TR-0N/3 → モーター、サーマルの b 接点で MC のコイルを切る回路はエラーなし', () => {
    const d = motorCircuit();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-protection');
    expect(rulesOf(d)).not.toContain('overload');
  });

  it('整定範囲の上限がモーターの定格電流より小さいと過負荷の警告', () => {
    const d = motorCircuit();
    d.devices[3] = dev('THR1', 'fuji.tr-0n3', { heater: 6 });
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('M1'))).toBe(true);
  });

  it('SC-4-0 + TR-5-1N/3（16〜22A）は 15.4A のモーターを開閉できる。SC-05 では主接点の過負荷', () => {
    const d = motorCircuit();
    d.devices[1] = dev('ELB1', 'panasonic.bjw.3p', { ratedCurrent: 30 });
    d.devices[2] = dev('MC1', 'fuji.sc-4-0.ac200v');
    d.devices[3] = dev('THR1', 'fuji.tr-5-1n3', { heater: 22 });
    d.devices[4] = dev('M1', 'generic.motor.3p', { ratedCurrent: 15.4 });
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('contact-overload');
    d.devices[2] = dev('MC1', 'fuji.sc-05.ac200v');
    expect(issues(d).some((i) => i.rule === 'contact-overload' && i.devices.includes('MC1'))).toBe(true);
  });

  it('遮断器の定格を超えるモーターは breaker-capacity の警告', () => {
    const d = motorCircuit();
    d.devices[1] = dev('ELB1', 'panasonic.bjw.3p', { ratedCurrent: 10 });
    d.devices[4] = dev('M1', 'generic.motor.3p', { ratedCurrent: 11 });
    d.devices[3] = dev('THR1', 'fuji.tr-0n3', { heater: 13 });
    expect(rulesOf(d)).toContain('breaker-capacity');
  });

  it('端子 ID は三菱電機・富士電機の既存の機種とそろえたので、機種を変えても電線はつながったまま', () => {
    const d = motorCircuit();
    for (const [i, type, params] of [
      [1, 'mitsubishi.nv32-sv.3p', { ratedCurrent: 20 }],
      [1, 'panasonic.bbw.3p', { ratedCurrent: 20 }],
      [3, 'fuji.tk-e2', { heater: 9 }],
      [3, 'mitsubishi.th-t18', { heater: 9 }],
      [3, 'fuji.tr-5-1n3', { heater: 9 }],
    ] as const) {
      const next = { ...d, devices: d.devices.map((x, k) => (k === i ? dev(x.id, type, params) : x)) };
      expect(rulesOf(next), type).not.toContain('unknown-terminal');
      expect(errorsOf(next), type).toEqual([]);
    }
  });

  it('まとめてつなぐ: BJW の二次 → SC-05 の一次、SC-05 の二次 → TR-0N/3 の接続ピン、TR-0N/3 → モーターの相を合わせる', () => {
    const base = motorCircuit();
    const d: Diagram = { devices: base.devices, wires: base.wires.slice(0, 3) };
    expect(pairs(d, 'ELB1', 'MC1')).toEqual(['2-1/L1', '4-3/L2', '6-5/L3']);
    d.wires = base.wires.slice(0, 6);
    expect(pairs(d, 'MC1', 'THR1')).toEqual(['2/T1-1/L1', '4/T2-3/L2', '6/T3-5/L3']);
    d.wires = base.wires.slice(0, 9);
    expect(pairs(d, 'THR1', 'M1').slice(0, 3)).toEqual(['2/T1-U', '4/T2-V', '6/T3-W']);
  });

  it('NF400-SW を主幹に BBW を分岐に入れた回路はエラーなし。主幹の電流の余裕に分岐の負荷が入る', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.3p200v'),
        dev('MAIN', 'mitsubishi.nf400-sw.3p', { ratedCurrent: 250 }),
        dev('CB1', 'panasonic.bbw.3p', { ratedCurrent: 30 }),
        dev('M1', 'generic.motor.3p', { ratedCurrent: 15 }),
      ],
      wires: [
        w('PS1.R', 'MAIN.1', { sizeSq: 150 }),
        w('PS1.S', 'MAIN.3', { sizeSq: 150 }),
        w('PS1.T', 'MAIN.5', { sizeSq: 150 }),
        w('MAIN.2', 'CB1.1', { sizeSq: 150 }),
        w('MAIN.4', 'CB1.3', { sizeSq: 150 }),
        w('MAIN.6', 'CB1.5', { sizeSq: 150 }),
        w('CB1.2', 'M1.U'),
        w('CB1.4', 'M1.V'),
        w('CB1.6', 'M1.W'),
        w('M1.E', 'PS1.PE'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    const main = diagramCurrentMargins(d, lookup).find((x) => x.protector.id === 'MAIN');
    expect(main?.protector.rating).toBe(250);
    expect(main?.protector.devices).toContain('M1');
    // 5.5sq の電線を 400A の主幹の二次へつなぐと細すぎる
    d.devices[1] = dev('MAIN', 'mitsubishi.nf400-sw.3p', { ratedCurrent: 400 });
    d.wires[3] = w('MAIN.2', 'CB1.1');
    expect(rulesOf(d)).toContain('wire-too-thin');
  });

  it('型式・ファミリー・展開図', () => {
    expect(deviceModel(getDeviceDefinition('fuji.tr-0n3')!, { heater: 13 })).toBe('TR-0N/3 9-13A');
    expect(deviceModel(getDeviceDefinition('fuji.tr-5-1n3')!, { heater: 22 })).toBe('TR-5-1N/3 16-22A');
    expect(deviceModel(getDeviceDefinition('panasonic.bbw.3p')!, { ratedCurrent: 50 })).toBe('BBW350');
    expect(deviceModel(getDeviceDefinition('panasonic.bjw.3p')!, { ratedCurrent: 50 })).toBe('BJW3503');
    expect(familyOf('fuji.tr-0n3')?.id).toBe('thr');
    expect(familyOf('fuji.tr-5-1n3')?.id).toBe('thr');
    expect(familyOf('panasonic.bbw.3p')?.id).toBe('mccb');
    expect(familyOf('mitsubishi.nf400-sw.3p')?.id).toBe('mccb');
    expect(familyOf('panasonic.bjw.3p')?.id).toBe('elb');
    expect(deviceElements(getDeviceDefinition('panasonic.bjw.3p')!).find((e) => e.kind === 'breaker')?.symbol).toBe('elb-3p');
    expect(deviceElements(getDeviceDefinition('fuji.tr-0n3')!).map((e) => e.kind)).toEqual(expect.arrayContaining(['contact']));
    for (const t of ['fuji.tr-0n3', 'fuji.tr-5-1n3', 'panasonic.bbw.3p', 'panasonic.bjw.3p', 'mitsubishi.nf400-sw.3p']) {
      expect(hasEstimates(getDeviceDefinition(t)!), t).toBe(true);
    }
  });
});

/** AC → DC24V 電源 → CBMC（4 チャンネル）→ リレーターミナル 2 台 */
const cbmcCircuit = (): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.3p200v'),
    dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 5 }),
    dev('PSU1', 'generic.psu.dc24v', { outputCurrent: 10 }),
    dev('ECP1', 'phoenix.cbmc-e4-24dc-1-4a-no', { rating: 1 }),
    dev('RT1', 'omron.g7tc-oc16.dc24'),
    dev('RT2', 'omron.g7tc-oc16.dc24'),
  ],
  wires: [
    thin('PS1.R', 'CP1.1'),
    thin('PS1.S', 'CP1.3'),
    thin('CP1.2', 'PSU1.L'),
    thin('CP1.4', 'PSU1.N'),
    thin('PSU1.PE', 'PS1.PE'),
    thin('PSU1.+V1', 'ECP1.IN+'),
    thin('PSU1.-V1', 'ECP1.GND'),
    thin('ECP1.OUT1', 'RT1.+V'),
    thin('RT1.0V', 'PSU1.-V1'),
    thin('ECP1.OUT2', 'RT2.+V'),
    thin('RT2.0V', 'PSU1.-V1'),
  ],
});

describe('フエニックス・コンタクト CBMC', () => {
  it('チャンネルごとの保護として電流の余裕に出る。エラーなし', () => {
    const d = cbmcCircuit();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-protection');
    const m = diagramCurrentMargins(d, lookup).find((x) => x.protector.id === 'ECP1');
    expect(m?.protector.rating).toBe(1);
    expect(m?.protector.devices).toEqual(expect.arrayContaining(['RT1', 'RT2']));
  });

  it('出力のプッシュイン端子（0.2〜2.5㎟）に 3.5sq の電線をつなぐと適合電線の警告、GND に +24V をつなぐと極性のエラー', () => {
    const d = cbmcCircuit();
    d.wires.push(w('ECP1.OUT3', 'RT2.+V', { sizeSq: 3.5 }));
    expect(rulesOf(d)).toContain('wire-size-terminal');
    const e = cbmcCircuit();
    e.wires[6] = thin('PSU1.+V2', 'ECP1.GND');
    expect(errorsOf(e)).toContain('conductor-mismatch');
  });

  it('S8V-CP と同じ「電子サーキットプロテクタ」のファミリーに入る', () => {
    expect(familyOf('phoenix.cbmc-e4-24dc-1-4a-no')?.id).toBe(familyOf('omron.s8v-cp0424')?.id);
    expect(deviceElements(getDeviceDefinition('phoenix.cbmc-e4-24dc-1-4a-no')!).some((e) => e.kind === 'breaker')).toBe(false);
  });
});

describe('オムロン XW2R（MIL コネクタ端子台）', () => {
  /** KV-C32TC（シンク出力、MIL 34 極）→ ケーブル → XW2R-J34G-T。KEYENCE No.1 = MIL ピン 1、No.17（COM0）= MIL ピン 33 */
  const circuit = (): Diagram => ({
    devices: [
      dev('PSU1', 'generic.psu.dc24v'),
      dev('OUT1', 'keyence.kv-c32tc.output'),
      dev('TB1', 'omron.xw2r-j34g-t'),
      dev('PL1', 'generic.pilot-lamp.dc24v'),
    ],
    wires: [cable('OUT1.CN1', 'TB1.CN'), sig('PSU1.-V1', 'TB1.33'), sig('PSU1.+V1', 'PL1.X1'), sig('PL1.X2', 'TB1.1')],
  });

  it('MIL ケーブルで I/O ユニットとつながり、ピンの電源条件がチェックされる', () => {
    const d = circuit();
    expect(errorsOf(d)).toEqual([]);
    expect(issues(d).filter((i) => i.devices.includes('PL1')).map((i) => i.rule)).not.toContain('no-power');
    // COM に +24V を入れると極性のエラー
    d.wires[1] = sig('PSU1.+V2', 'TB1.33');
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  it('適合電線（〜1.25sq）より太い電線は警告。34 極と 40 極はつなげない', () => {
    const d = circuit();
    d.wires[3] = w('PL1.X2', 'TB1.1', { sizeSq: 2 });
    expect(rulesOf(d)).toContain('wire-size-terminal');
    const e = circuit();
    e.devices[2] = dev('TB1', 'omron.xw2r-j40g-t');
    expect(rulesOf(e)).toContain('connector-mismatch');
  });

  it('端子の定格 1A を超える保護（CP 3A）の下流につなぐと警告', () => {
    const d = circuit();
    d.devices.push(dev('CP1', 'mitsubishi.cp30-ba.1p', { ratedCurrent: 3 }));
    d.wires[2] = sig('PSU1.+V1', 'CP1.1');
    d.wires.push(sig('CP1.2', 'PL1.X1'));
    expect(issues(d).some((i) => i.rule === 'terminal-overcurrent' && i.devices.includes('TB1') && i.message.includes('端子 1:'))).toBe(true);
  });

  it('MIL 変換端子台のファミリーで、極数で選べる', () => {
    expect(familyOf('omron.xw2r-j34g-t')?.id).toBe('mil-terminal');
    expect(familyOf('omron.xw2r-j20gd-t')?.id).toBe('mil-terminal');
    expect(familyOf('omron.xw2r-j40g-t')?.id).toBe('mil-terminal');
  });
});

describe('エム・システム技研 W2VS（信号変換器）', () => {
  /** KV-AM40V の電圧出力（ch2）→ W2VS（0〜10V → 4〜20mA）→ KV-AM40V の電流入力（ch0） */
  const circuit = (params: DiagramDevice['params'] = { input: '4', out1: 'A', out2: 'A', power: 'R' }): Diagram => ({
    devices: [dev('PSU1', 'generic.psu.dc24v'), dev('AM1', 'keyence.kv-am40v'), dev('SC1', 'msystem.w2vs', params)],
    wires: [
      sig('PSU1.+V1', 'SC1.7'),
      sig('PSU1.-V1', 'SC1.8'),
      sig('AM1.V2+', 'SC1.5'),
      sig('AM1.V2-', 'SC1.6'),
      sig('SC1.1', 'AM1.I0+'),
      sig('SC1.2', 'AM1.0-'),
    ],
  });

  it('電圧出力 → 0〜10V 入力、4〜20mA 出力 → 電流入力はエラー・信号の警告なし', () => {
    const d = circuit();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('signal-kind');
    expect(rulesOf(d)).not.toContain('analog-return');
    expect(deviceModel(getDeviceDefinition('msystem.w2vs')!, d.devices[2].params)).toBe('W2VS-4AA-R');
  });

  it('電流出力を電圧入力へ、電圧の信号を 4〜20mA 入力の形式へつなぐと信号の種類の警告', () => {
    const d = circuit();
    d.wires[4] = sig('SC1.1', 'AM1.V0+');
    d.wires[5] = sig('SC1.2', 'AM1.0-');
    expect(rulesOf(d)).toContain('signal-kind');
    const e = circuit({ input: 'A', out1: 'A', out2: 'A', power: 'R' });
    expect(rulesOf(e)).toContain('signal-kind');
  });

  it('出力の基準（2）をつながないと帰り道の警告、DC24V 電源を逆につなぐと極性のエラー、M2 品に DC をつなぐと種類のエラー', () => {
    const d = circuit();
    d.wires.splice(5, 1);
    expect(rulesOf(d)).toContain('analog-return');
    const e = circuit();
    e.wires[0] = sig('PSU1.-V1', 'SC1.7');
    e.wires[1] = sig('PSU1.+V1', 'SC1.8');
    expect(errorsOf(e)).toContain('conductor-mismatch');
    const f = circuit({ input: '4', out1: 'A', out2: 'A', power: 'M2' });
    expect(errorsOf(f).length).toBeGreaterThan(0);
  });

  it('信号変換器のファミリー', () => {
    expect(familyOf('msystem.w2vs')?.id).toBe('signal-converter');
  });
});
