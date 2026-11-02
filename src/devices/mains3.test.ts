/**
 * 主回路の残り・計器・盤内のインタフェース部品（漏電リレーと ZCT、計器と CT・切換スイッチ、電力計測ユニット、ロータリー断路器、
 * 富士電機の電磁接触器・サーマル・遮断器、I/O リレーターミナル、ヒーター用 SSR、電子サーキットプロテクタ、サージキラー）の
 * 代表的な配線での電気チェックの動作確認（docs/mitsubishi-catalog.md・docs/power-catalog.md）。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { diagramCurrentMargins } from '../check/protection';
import { proposeConnections } from '../model/bulkConnect';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { deviceElements } from '../schematic/elements';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { deviceModel } from './types';

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 5.5, wireType: 'KIV', ...extra };
};
const thin = (from: string, to: string) => w(from, to, { sizeSq: 1.25 });
const cable = (from: string, to: string) => w(from, to, { wireType: 'CABLE', sizeSq: 0 });
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const lookup = (t: string) => getDeviceDefinition(t);
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const rulesOf = (d: Diagram) => issues(d).map((i) => i.rule);

/**
 * 三相 200V → 漏電遮断器（富士 EW32AAG）→ ZCT → 電磁接触器（富士 SC-05）→ サーマル（TK-E2）→ モーター。
 * 漏電リレー NV-ZBA は CP を通した AC200V（1-3）で動き、ZCT の k・l を Z1・Z2 に受ける。漏電したら b 接点（c-b）で電磁接触器のコイルを切る
 */
const leakageCircuit = (): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.3p200v'),
    dev('ELB1', 'fuji.ew32aag.3p', { ratedCurrent: 20 }),
    dev('ZCT1', 'mitsubishi.zt-b', { model: 'ZT15B' }),
    dev('MC1', 'fuji.sc-05.ac200v'),
    dev('THR1', 'fuji.tk-e2', { heater: 8 }),
    dev('M1', 'generic.motor.3p', { ratedCurrent: 6.6 }),
    dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 3 }),
    dev('ELR1', 'mitsubishi.nv-zba'),
    dev('PB1', 'omron.a22nn-bnm-g100'),
  ],
  wires: [
    w('PS1.R', 'ELB1.1'),
    w('PS1.S', 'ELB1.3'),
    w('PS1.T', 'ELB1.5'),
    w('ELB1.2', 'ZCT1.1'),
    w('ELB1.4', 'ZCT1.3'),
    w('ELB1.6', 'ZCT1.5'),
    w('ZCT1.2', 'MC1.1/L1'),
    w('ZCT1.4', 'MC1.3/L2'),
    w('ZCT1.6', 'MC1.5/L3'),
    w('MC1.2/T1', 'THR1.1/L1'),
    w('MC1.4/T2', 'THR1.3/L2'),
    w('MC1.6/T3', 'THR1.5/L3'),
    w('THR1.2/T1', 'M1.U'),
    w('THR1.4/T2', 'M1.V'),
    w('THR1.6/T3', 'M1.W'),
    w('M1.E', 'PS1.PE'),
    // 操作回路（ELB の二次の R・S 相から CP で取る）
    thin('ELB1.2', 'CP1.1'),
    thin('ELB1.4', 'CP1.3'),
    thin('CP1.2', 'ELR1.3'),
    thin('CP1.4', 'ELR1.1'),
    thin('ZCT1.k', 'ELR1.Z1'),
    thin('ZCT1.l', 'ELR1.Z2'),
    thin('CP1.2', 'ELR1.c'),
    thin('ELR1.b', 'PB1.3'),
    thin('PB1.4', 'THR1.95'),
    thin('THR1.96', 'MC1.A1'),
    thin('MC1.A2', 'CP1.4'),
  ],
});

describe('漏電リレーと ZCT・富士電機の主回路の電気チェック', () => {
  it('漏電遮断器 → ZCT → SC-05 → TK-E2 → モーター、漏電リレーの b 接点で MC のコイルを切る回路はエラーなし', () => {
    const d = leakageCircuit();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-protection');
    expect(rulesOf(d)).not.toContain('no-power');
  });

  it('漏電リレーの操作電源の 200V 端子（3）に AC100V をつなぐと電圧の誤り', () => {
    const d = leakageCircuit();
    d.devices.push(dev('SRC1', 'generic.power-source.1p100v'));
    d.wires = d.wires.filter((x) => !(x.to.device === 'ELR1' && ['1', '3'].includes(x.to.terminal)));
    d.wires.push(thin('SRC1.L', 'ELR1.3'), thin('SRC1.N', 'ELR1.1'));
    expect(errorsOf(d)).toContain('voltage-mismatch');
  });

  it('ZCT の貫通する主回路は常時導通で、下流のモーターまで電源と保護が届く（ヒーターが小さいと過負荷の警告）', () => {
    const d = leakageCircuit();
    d.devices[4] = dev('THR1', 'fuji.tk-e2', { heater: 6 });
    d.devices[5] = dev('M1', 'generic.motor.3p', { ratedCurrent: 11 });
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('M1'))).toBe(true);
  });

  it('SC-05 の主接点の定格（AC-3 13A）を超えるモーターは接点の過負荷、SC-4-0（18A）なら出ない', () => {
    const d = leakageCircuit();
    d.devices[1] = dev('ELB1', 'fuji.ew32aag.3p', { ratedCurrent: 30 });
    d.devices[4] = dev('THR1', 'fuji.tk-e2', { heater: 18 });
    d.devices[5] = dev('M1', 'generic.motor.3p', { ratedCurrent: 15.4 });
    expect(issues(d).some((i) => i.rule === 'contact-overload' && i.devices.includes('MC1'))).toBe(true);
    d.devices[3] = dev('MC1', 'fuji.sc-4-0.ac200v');
    expect(rulesOf(d)).not.toContain('contact-overload');
  });

  it('富士電機の遮断器・接触器は三菱電機の機種と同じ端子 ID なので、機種を変えても電線はつながったまま', () => {
    const d = leakageCircuit();
    d.devices[1] = dev('ELB1', 'mitsubishi.nv32-sv.3p', { ratedCurrent: 20 });
    d.devices[3] = dev('MC1', 'mitsubishi.s-t20.ac200v');
    d.devices[4] = dev('THR1', 'mitsubishi.th-t18', { heater: 6.6 });
    expect(rulesOf(d)).not.toContain('unknown-terminal');
    expect(errorsOf(d)).toEqual([]);
  });

  it('まとめてつなぐ: 遮断器の二次側 → ZCT の 1・3・5 → 電磁接触器の一次側へ相を合わせる', () => {
    const d: Diagram = { devices: leakageCircuit().devices, wires: [w('PS1.R', 'ELB1.1'), w('PS1.S', 'ELB1.3'), w('PS1.T', 'ELB1.5')] };
    const a = proposeConnections(d, 'ELB1', 'ZCT1', lookup).proposals.map((p) => `${p.from.terminal}-${p.to.terminal}`);
    expect(a).toEqual(['2-1', '4-3', '6-5']);
    const b = proposeConnections(d, 'ZCT1', 'MC1', lookup).proposals.map((p) => `${p.from.terminal}-${p.to.terminal}`);
    expect(b).toEqual(['2-1/L1', '4-3/L2', '6-5/L3']);
  });

  it('ロータリー断路器: 定格電流を超える負荷を開閉すると接点の過負荷', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.3p200v'),
        dev('CB1', 'fuji.bw32aag.3p', { ratedCurrent: 32 }),
        dev('DS1', 'generic.rotary-disconnector.3p', { ratedCurrent: 16 }),
        dev('M1', 'generic.motor.3p', { ratedCurrent: 11 }),
        dev('M2', 'generic.motor.3p', { ratedCurrent: 11 }),
      ],
      wires: [
        w('PS1.R', 'CB1.1'),
        w('PS1.S', 'CB1.3'),
        w('PS1.T', 'CB1.5'),
        w('CB1.2', 'DS1.1'),
        w('CB1.4', 'DS1.3'),
        w('CB1.6', 'DS1.5'),
        ...['M1', 'M2'].flatMap((m) => [w('DS1.2', `${m}.U`), w('DS1.4', `${m}.V`), w('DS1.6', `${m}.W`), w(`${m}.E`, 'PS1.PE')]),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(issues(d).some((i) => i.rule === 'contact-overload' && i.devices.includes('DS1'))).toBe(true);
    d.devices[2] = dev('DS1', 'generic.rotary-disconnector.3p', { ratedCurrent: 25 });
    expect(rulesOf(d)).not.toContain('contact-overload');
  });
});

describe('計器（CT・電流計・電圧計・切換スイッチ・電力計測ユニット）', () => {
  /** 主幹の下流の R・T 相に CT、AS で 1 台の電流計に切り換え、VS で電圧計に線間電圧を出す。EMU4 で電力を計る */
  const meters = (vmScale = 300): Diagram => ({
    devices: [
      dev('PS1', 'generic.power-source.3p200v'),
      dev('CB1', 'mitsubishi.nf63-cv.3p', { ratedCurrent: 50 }),
      dev('CT1', 'generic.ct.window', { ratio: 50 }),
      dev('CT2', 'generic.ct.window', { ratio: 50 }),
      dev('AS1', 'generic.ammeter-switch.3p3w'),
      dev('AM1', 'generic.ammeter.ct5a', { scale: 50 }),
      dev('CP1', 'mitsubishi.cp30-ba.3p', { ratedCurrent: 3 }),
      dev('VS1', 'generic.voltmeter-switch.3p3w'),
      dev('VM1', 'generic.voltmeter.ac', { scale: vmScale }),
      dev('EMU1', 'mitsubishi.emu4-bd1-mb'),
      dev('M1', 'generic.motor.3p', { ratedCurrent: 15.4 }),
    ],
    wires: [
      w('PS1.R', 'CB1.1', { sizeSq: 14 }),
      w('PS1.S', 'CB1.3', { sizeSq: 14 }),
      w('PS1.T', 'CB1.5', { sizeSq: 14 }),
      w('CB1.2', 'CT1.P1', { sizeSq: 14 }),
      w('CB1.6', 'CT2.P1', { sizeSq: 14 }),
      w('CT1.P2', 'M1.U', { sizeSq: 14 }),
      w('CB1.4', 'M1.V', { sizeSq: 14 }),
      w('CT2.P2', 'M1.W', { sizeSq: 14 }),
      w('M1.E', 'PS1.PE', { sizeSq: 14 }),
      // CT の二次 → AS → 電流計
      thin('CT1.k', 'AS1.R'),
      thin('CT2.k', 'AS1.T'),
      thin('CT1.l', 'AS1.N'),
      thin('CT2.l', 'AS1.N'),
      thin('AS1.A1', 'AM1.k'),
      thin('AS1.A2', 'AM1.l'),
      // 計器用の CP → VS → 電圧計、EMU4 の電圧入力・補助電源
      thin('CB1.2', 'CP1.1'),
      thin('CB1.4', 'CP1.3'),
      thin('CB1.6', 'CP1.5'),
      thin('CP1.2', 'VS1.R'),
      thin('CP1.4', 'VS1.S'),
      thin('CP1.6', 'VS1.T'),
      thin('VS1.V1', 'VM1.P1'),
      thin('VS1.V2', 'VM1.P2'),
      thin('CP1.2', 'EMU1.P1'),
      thin('CP1.4', 'EMU1.P2'),
      thin('CP1.6', 'EMU1.P3'),
      thin('CP1.2', 'EMU1.MA'),
      thin('CP1.4', 'EMU1.MB'),
    ],
  });

  it('CT・AS・電流計、CP・VS・電圧計、EMU4 の回路はエラーなし', () => {
    const d = meters();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-power');
    expect(rulesOf(d)).not.toContain('no-protection');
  });

  it('目盛り 0〜150V（AC100V 用）の電圧計を AC200V の回路につなぐと電圧の誤り', () => {
    expect(errorsOf(meters(150))).toContain('voltage-mismatch');
  });

  it('VS の R・S に同じ相をつなぐと同相のエラー', () => {
    const d = meters();
    d.wires = d.wires.map((x) => (x.to.device === 'VS1' && x.to.terminal === 'S' ? { ...x, from: { device: 'CP1', terminal: '2' } } : x));
    expect(errorsOf(d)).toContain('same-phase');
  });

  it('VS・電圧計は計器用の CP（保護）を通さないと保護がないと指摘する', () => {
    const d = meters();
    // VS の R・S・T を一次電源から直接取る
    d.wires = d.wires.map((x) => (x.to.device === 'VS1' ? { ...x, from: { device: 'PS1', terminal: x.to.terminal } } : x));
    expect(issues(d).some((i) => i.rule === 'no-protection' && i.devices.includes('VS1'))).toBe(true);
  });

  it('AS の位置ごとの接点は短絡の検査で誤検出しない（CT の二次は電源ではない）', () => {
    const els = deviceElements(getDeviceDefinition('generic.ammeter-switch.3p3w')!);
    expect(els.filter((e) => e.kind === 'contact').length).toBeGreaterThan(0);
    expect(errorsOf(meters())).not.toContain('short-circuit');
  });

  it('CT・電流計の型式は変流比から作る', () => {
    expect(deviceModel(getDeviceDefinition('generic.ct.window')!, { ratio: 75 })).toBe('変流器 貫通形 75/5A');
    expect(deviceModel(getDeviceDefinition('generic.ammeter.ct5a')!, { scale: 75 })).toBe('交流電流計 0-75A（CT 75/5A）');
    expect(deviceModel(getDeviceDefinition('mitsubishi.zt-b')!, { model: 'ZT60B' })).toBe('ZT60B');
  });
});

describe('I/O リレーターミナル G7TC・ヒーター用 SSR G3PE・電子サーキットプロテクタ・サージキラー', () => {
  /** KV-NC16ET（シンク出力）→ MIL 20 極ケーブル → G7TC-OC16。G7TC の接点 0 で AC200V の電磁接触器のコイルを入れる */
  const relayTerminal = (): Diagram => ({
    devices: [
      dev('PS1', 'generic.power-source.3p200v'),
      dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 3 }),
      dev('PSU1', 'generic.psu.dc24v'),
      dev('Y1', 'keyence.kv-nc16et'),
      dev('RT1', 'omron.g7tc-oc16.dc24'),
      dev('MC1', 'fuji.sc-05.ac200v'),
      dev('SK1', 'generic.surge-killer.cr'),
    ],
    wires: [
      thin('PS1.R', 'CP1.1'),
      thin('PS1.S', 'CP1.3'),
      thin('CP1.2', 'PSU1.L'),
      thin('CP1.4', 'PSU1.N'),
      thin('PSU1.PE', 'PS1.PE'),
      thin('PSU1.+V1', 'RT1.+V'),
      thin('PSU1.-V1', 'RT1.0V'),
      cable('Y1.CN1', 'RT1.CN'),
      thin('CP1.2', 'RT1.C0'),
      thin('RT1.0', 'MC1.A1'),
      thin('MC1.A2', 'CP1.4'),
      thin('SK1.1', 'MC1.A1'),
      thin('SK1.2', 'MC1.A2'),
    ],
  });

  it('PLC のシンク出力からケーブルでつないだ G7TC の接点で AC200V のコイルを開閉する回路は、電源・極性・短絡のエラーなし', () => {
    const errs = errorsOf(relayTerminal());
    for (const r of ['short-circuit', 'conductor-mismatch', 'voltage-mismatch', 'system-mismatch', 'mixed-system']) expect(errs).not.toContain(r);
    const rs = rulesOf(relayTerminal());
    expect(rs).not.toContain('output-overload');
    // リレーのコイル（ピン）に電源が届いている
    expect(issues(relayTerminal()).some((i) => i.rule === 'no-power' && i.devices.includes('RT1'))).toBe(false);
  });

  it('G7TC は 16 個のリレーを別々に動かす（短絡の検査はリレーごと）。接点の定格 2A を超えると接点の過負荷', () => {
    const def = getDeviceDefinition('omron.g7tc-oc16.dc24')!;
    const r = resolveDevice(def);
    expect(r.links.filter((l) => l.switch === 'NO').map((l) => l.actor)).toHaveLength(16);
    const d = relayTerminal();
    // 接点 1 で 5A の負荷（三相モーターの U・V 相を単相の負荷に見立てた）を開閉する
    d.devices.push(dev('M2', 'generic.motor.3p', { ratedCurrent: 5 }));
    d.wires.push(thin('CP1.2', 'RT1.C1'), thin('RT1.1', 'M2.U'), thin('CP1.4', 'M2.V'));
    expect(issues(d).some((i) => i.rule === 'contact-overload' && i.devices.includes('RT1'))).toBe(true);
  });

  it('G7TC の電源の + / − を逆につなぐと極性のエラー', () => {
    const d = relayTerminal();
    d.wires = d.wires.map((x) => (x.to.terminal === '+V' && x.to.device === 'RT1' ? { ...x, from: { device: 'PSU1', terminal: '-V1' } } : x.to.terminal === '0V' && x.to.device === 'RT1' ? { ...x, from: { device: 'PSU1', terminal: '+V1' } } : x));
    expect(errorsOf(d)).toContain('conductor-mismatch');
  });

  it('ダイオードのサージキラーを DC コイルに逆につなぐと極性のエラー、正しい向きならエラーなし', () => {
    const base = (plus: string, minus: string): Diagram => ({
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('CR1', 'omron.my2n.dc24'), dev('SK1', 'generic.surge-killer.diode')],
      wires: [thin('PSU1.+V1', 'CR1.14'), thin('CR1.13', 'PSU1.-V1'), thin(`SK1.${plus}`, 'CR1.14'), thin(`SK1.${minus}`, 'CR1.13')],
    });
    const ok = errorsOf(base('+', '-'));
    expect(ok).not.toContain('conductor-mismatch');
    expect(errorsOf(base('-', '+'))).toContain('conductor-mismatch');
  });

  it('G3PE（三相）を温度調節器の電圧出力で駆動する回路はエラーなし、直流を開閉すると電源の種類のエラー', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.3p200v'),
        dev('CB1', 'fuji.bw32aag.3p', { ratedCurrent: 20 }),
        dev('PSU1', 'generic.psu.dc24v'),
        dev('TIC1', 'omron.e5cc-qx2dsm-800'),
        dev('SSR1', 'omron.g3pe-3n', { current: 25 }),
      ],
      wires: [
        w('PS1.R', 'CB1.1'),
        w('PS1.S', 'CB1.3'),
        w('PS1.T', 'CB1.5'),
        w('CB1.2', 'SSR1.1/L1'),
        w('CB1.4', 'SSR1.3/L2'),
        w('CB1.6', 'SSR1.5/L3'),
        thin('PSU1.+V1', 'TIC1.11'),
        thin('TIC1.12', 'PSU1.-V1'),
        thin('TIC1.1', 'SSR1.A1'),
        thin('TIC1.2', 'SSR1.A2'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    const dc: Diagram = {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('SSR1', 'omron.g3pe', { current: 15 })],
      wires: [thin('PSU1.+V1', 'SSR1.1/L1'), thin('PSU1.+V1', 'SSR1.A1'), thin('PSU1.-V1', 'SSR1.A2')],
    };
    expect(errorsOf(dc)).toContain('switch-system');
  });

  it('G3PE の大きさ・型式は定格負荷電流で変わる', () => {
    const def = getDeviceDefinition('omron.g3pe')!;
    expect(resolveDevice(def, { current: 45 }).width).toBeGreaterThan(resolveDevice(def, { current: 15 }).width);
    expect(deviceModel(def, { current: 35 })).toBe('G3PE-235B DC12-24');
    expect(deviceModel(getDeviceDefinition('omron.g3pe-3n')!, { current: 45 })).toBe('G3PE-245B-3N DC12-24');
  });

  it('S8V-CP は分岐ごとの保護として電流の余裕に出て、分岐の電線の太さを定格出力電流で確かめる', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.3p200v'),
        dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 5 }),
        dev('PSU1', 'generic.psu.dc24v', { outputCurrent: 10 }),
        dev('ECP1', 'omron.s8v-cp0424', { rating: 2 }),
        dev('RT1', 'omron.g7tc-oc16.dc24'),
        dev('RT2', 'omron.g7tc-oc16.dc24'),
      ],
      wires: [
        thin('PS1.R', 'CP1.1'),
        thin('PS1.S', 'CP1.3'),
        thin('CP1.2', 'PSU1.L'),
        thin('CP1.4', 'PSU1.N'),
        thin('PSU1.PE', 'PS1.PE'),
        thin('PSU1.+V1', 'ECP1.+V'),
        thin('PSU1.-V1', 'ECP1.-V'),
        thin('ECP1.+VO1', 'RT1.+V'),
        thin('RT1.0V', 'PSU1.-V1'),
        thin('ECP1.+VO2', 'RT2.+V'),
        thin('RT2.0V', 'PSU1.-V1'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-protection');
    const m = diagramCurrentMargins(d, lookup).find((x) => x.protector.id === 'ECP1');
    expect(m?.protector.rating).toBe(2);
    expect(m?.protector.devices).toEqual(expect.arrayContaining(['RT1', 'RT2']));
    // 0.5sq の電線は 10A の保護には細い
    d.devices[3] = dev('ECP1', 'omron.s8v-cp0424', { rating: 10 });
    d.wires.push(w('ECP1.+VO3', 'RT2.+V', { sizeSq: 0.5 }));
    expect(rulesOf(d)).toContain('wire-too-thin');
  });
});

describe('定義・ファミリー・展開図', () => {
  it('ファミリーにまとまる', () => {
    expect(familyOf('fuji.sc-05.ac200v')?.name).toBe('電磁接触器');
    expect(familyOf('fuji.sc-4-0.ac200v')?.name).toBe('電磁接触器');
    expect(familyOf('fuji.tk-e2')?.name).toBe('サーマルリレー');
    expect(familyOf('fuji.bw32aag.3p')?.name).toBe('ノーヒューズブレーカー');
    expect(familyOf('fuji.ew32aag.3p')?.name).toBe('漏電ブレーカー');
    expect(familyOf('omron.g3pe')?.name).toBe('ソリッドステートリレー');
    expect(familyOf('omron.g7tc-oc16.dc24')?.name).toBe(familyOf('generic.relay-terminal.8p')?.name);
    expect(familyOf('generic.surge-killer.diode')?.name).toBe('サージキラー');
    expect(familyOf('generic.surge-killer.diode')?.id).toBe(familyOf('generic.surge-killer.cr')?.id);
  });

  it('展開図: 漏電遮断器は漏電検出付きの遮断器、漏電リレーは c 接点、S8V-CP は箱（極で端子を共有するため）', () => {
    const elb = deviceElements(getDeviceDefinition('fuji.ew32aag.3p')!);
    expect(elb.find((e) => e.kind === 'breaker')?.symbol).toBe('elb-3p');
    const elr = deviceElements(getDeviceDefinition('mitsubishi.nv-zba')!);
    expect(elr.some((e) => e.kind === 'contact' && e.symbol === 'contact-c')).toBe(true);
    const ecp = deviceElements(getDeviceDefinition('omron.s8v-cp0424')!);
    expect(ecp.some((e) => e.kind === 'breaker')).toBe(false);
    const mc = deviceElements(getDeviceDefinition('fuji.sc-05.ac200v')!);
    expect(mc.map((e) => e.kind)).toEqual(expect.arrayContaining(['coil', 'contactor', 'contact']));
  });
});
