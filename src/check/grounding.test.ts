/**
 * 片側接地（絶縁された電源の片側の導体を PE につなぐ機能接地）と地絡の判定。
 * - 絶縁された電源（SupplySpec.isolated。トランスの二次・スイッチング電源の出力など）の 1 つの導体を接地: エラーにせず info（one-side-ground）
 * - 同じ電源の 2 つの導体をどちらも接地: 短絡のエラー
 * - 商用電源（R・S・T・L・N）・絶縁されていない電源・安全出力を接地: 今までどおり地絡のエラー
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { DeviceDefinition } from '../devices/types';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { checkDiagram } from './checkDiagram';
import { diagramCurrentMargins } from './protection';

let seq = 0;
const w = (from: string, to: string, color = 'blue'): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color, sizeSq: 1.25, wireType: 'KIV' };
};
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });

/** 絶縁を書いていない DC 電源（テスト用） */
const plainDc: DeviceDefinition = {
  type: 'test.plain-dc',
  name: '',
  model: '',
  labelPrefix: 'X',
  width: 10,
  height: 10,
  svg: '',
  category: 'power-supply',
  terminals: [
    { id: '+V', x: 0, y: 0, side: 'top', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+' } },
    { id: '-V', x: 0, y: 0, side: 'top', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-' } },
  ],
};
const lookup = (t: string) => (t === plainDc.type ? plainDc : getDeviceDefinition(t));
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const rulesOf = (d: Diagram) => issues(d).map((i) => i.rule);

/** 単相 100V → CP → DC24V 電源 → リレー（MY2N）・表示灯。電源の 0V を PE に接地する */
const dcGrounded = (psu = 'generic.psu.dc24v'): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.1p100v'),
    dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 3 }),
    dev('PSU1', psu),
    dev('CR1', 'omron.my2n.dc24'),
    dev('PL1', 'omron.m22n-bn-a-c'),
  ],
  wires: [
    w('PS1.L', 'CP1.1', 'black'),
    w('PS1.N', 'CP1.3', 'black'),
    w('CP1.2', 'PSU1.L', 'black'),
    w('CP1.4', 'PSU1.N', 'black'),
    w('PSU1.PE', 'PS1.PE', 'green'),
    w('PSU1.+V1', 'CR1.14'),
    w('CR1.13', 'PSU1.-V1'),
    w('PSU1.+V1', 'PL1.X1'),
    w('PL1.X2', 'PSU1.-V1'),
    // 片側接地（0V を PE へ）
    w('PSU1.-V2', 'PS1.PE', 'green'),
  ],
});

/** 三相 200V → CP → 制御用トランス → CP（1P、電圧側だけ）→ 盤内照明。二次の 0 を PE に接地する */
const acGrounded = (): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.3p200v'),
    dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 5 }),
    dev('TR1', 'generic.control-transformer.1p200-100v', { capacity: 300 }),
    dev('CP2', 'mitsubishi.cp30-ba.1p', { ratedCurrent: 3 }),
    dev('LT1', 'generic.panel-light.led'),
  ],
  wires: [
    w('PS1.R', 'CP1.1', 'black'),
    w('PS1.S', 'CP1.3', 'black'),
    w('CP1.2', 'TR1.IN200', 'black'),
    w('CP1.4', 'TR1.IN0', 'black'),
    w('TR1.E', 'PS1.PE', 'green'),
    w('TR1.OUT100', 'CP2.1', 'red'),
    w('CP2.2', 'LT1.L', 'red'),
    // 接地側（0）は保護せずに照明へ
    w('TR1.OUT0', 'LT1.N', 'red'),
    w('TR1.OUT0', 'PS1.PE', 'green'),
  ],
});

describe('片側接地（機能接地）', () => {
  it('スイッチング電源の 0V を PE に接地してもエラーにせず、片側接地として知らせる', () => {
    const d = dcGrounded();
    expect(errorsOf(d)).toEqual([]);
    const info = issues(d).filter((i) => i.rule === 'one-side-ground');
    expect(info).toHaveLength(1);
    expect(info[0].severity).toBe('info');
    expect(info[0].message).toContain('PSU1');
    // 0V の青い電線・接地線の緑はどちらも色の指摘をしない
    expect(rulesOf(d)).not.toContain('wire-color');
  });

  it('S8VK-G・PS5R-V・IAI PSA-24 の 0V の片側接地もエラーにしない', () => {
    for (const psu of ['omron.s8vk-g.dc24v', 'idec.ps5r-v.dc24v']) expect(errorsOf(dcGrounded(psu)), psu).toEqual([]);
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('PSU1', 'iai.psa-24')],
      wires: [w('PS1.L', 'PSU1.L'), w('PS1.N', 'PSU1.N'), w('PSU1.-V1', 'PS1.PE')],
    };
    if (getDeviceDefinition('iai.psa-24')) expect(errorsOf(d).filter((r) => r === 'ground-fault' || r === 'short-circuit')).toEqual([]);
  });

  it('同じ電源の +V と 0V をどちらも接地すると短絡のエラー', () => {
    const d = dcGrounded();
    d.wires.push(w('PSU1.+V2', 'PS1.PE', 'green'));
    expect(errorsOf(d)).toContain('short-circuit');
    expect(rulesOf(d)).not.toContain('one-side-ground');
  });

  it('トランスの二次の 0 を接地し、電圧側だけを CP で保護する回路はエラー・保護の警告なし', () => {
    const d = acGrounded();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).toContain('one-side-ground');
    // 接地側の導体は保護しなくてよい
    expect(rulesOf(d)).not.toContain('no-protection');
  });

  it('トランスの二次の 0 と 100 をどちらも接地すると短絡のエラー', () => {
    const d = acGrounded();
    d.wires.push(w('CP2.2', 'PS1.PE', 'green'));
    expect(errorsOf(d)).toContain('short-circuit');
  });

  it('トランスの二次の 0 と DC 電源の 0V を同じ接地につないでも（AC と DC の混触とはせず）エラーなし', () => {
    const ac = acGrounded();
    const dc = dcGrounded();
    const d: Diagram = {
      devices: [...ac.devices, ...dc.devices.filter((x) => x.id !== 'PS1').map((x) => (x.id === 'CP1' ? { ...x, id: 'CP9' } : x))],
      wires: [
        ...ac.wires,
        // DC 電源はトランスの二次（CP2 の先）から受電する
        w('CP2.2', 'CP9.1', 'red'),
        w('TR1.OUT0', 'CP9.3', 'red'),
        ...dc.wires
          .filter((x) => x.from.device !== 'PS1' || x.to.device === 'PS1')
          .filter((x) => !(x.from.device === 'CP1' || x.to.device === 'CP1'))
          .map((x) => (x.to.device === 'CP1' ? { ...x, to: { ...x.to, device: 'CP9' } } : x)),
        w('CP9.2', 'PSU1.L', 'red'),
        w('CP9.4', 'PSU1.N', 'red'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(issues(d).filter((i) => i.rule === 'one-side-ground')).toHaveLength(1);
    // 0V につないだリレー・表示灯の受電もそのまま確かめる（極性の誤りは見つかる）
    d.wires = d.wires.map((x) => (x.from.device === 'CR1' && x.from.terminal === '13' ? { ...x, from: { device: 'CR1', terminal: '14' } } : x.to.device === 'CR1' && x.to.terminal === '14' ? { ...x, to: { device: 'CR1', terminal: '13' } } : x));
    expect(errorsOf(d)).toContain('conductor-mismatch');
  });

  it('片側接地した導体の先は、遮断器の下流の負荷として数えない（接地を通してほかの回路を数えない）', () => {
    // トランスの二次 → CP（2P）→ 照明。CP の負荷側の 0 を接地し、DC 電源の 0V も同じ接地へ
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.1p100v'),
        dev('PSU1', 'generic.psu.dc24v'),
        dev('CR1', 'omron.my2n.dc24'),
        dev('TR1', 'generic.control-transformer.1p200-100v'),
        dev('CP2', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 3 }),
        dev('LT1', 'generic.panel-light.led'),
      ],
      wires: [
        w('PS1.L', 'PSU1.L'),
        w('PS1.N', 'PSU1.N'),
        w('PSU1.+V1', 'CR1.14'),
        w('CR1.13', 'PSU1.-V1'),
        w('PSU1.-V2', 'PS1.PE', 'green'),
        w('TR1.OUT100', 'CP2.1', 'red'),
        w('TR1.OUT0', 'CP2.3', 'red'),
        w('CP2.2', 'LT1.L', 'red'),
        w('CP2.4', 'LT1.N', 'red'),
        w('CP2.4', 'PS1.PE', 'green'),
      ],
    };
    expect(errorsOf(d)).not.toContain('ground-fault');
    const cp = diagramCurrentMargins(d, lookup).find((x) => x.protector.id === 'CP2');
    expect(cp?.protector.devices).toEqual(['LT1']);
  });
});

describe('地絡（今までどおりエラー）', () => {
  it('商用電源の電圧側（R・L）を接地すると地絡のエラー', () => {
    const d = acGrounded();
    d.wires.push(w('CP1.2', 'PS1.PE', 'green'));
    expect(errorsOf(d)).toContain('ground-fault');
    const e: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('LT1', 'generic.panel-light.led')],
      wires: [w('PS1.L', 'LT1.L'), w('PS1.N', 'LT1.N'), w('LT1.PE', 'PS1.L')],
    };
    expect(errorsOf(e)).toContain('ground-fault');
  });

  it('商用電源の N（絶縁されていない電源）を盤内で PE につなぐと地絡のエラー', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('LT1', 'generic.panel-light.led')],
      wires: [w('PS1.L', 'LT1.L'), w('PS1.N', 'LT1.N'), w('LT1.N', 'PS1.PE')],
    };
    expect(errorsOf(d)).toContain('ground-fault');
  });

  it('絶縁を書いていない電源の 0V を接地すると地絡のエラー', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('DC1', plainDc.type)],
      wires: [w('DC1.-V', 'PS1.PE')],
    };
    expect(errorsOf(d)).toContain('ground-fault');
  });

  it('安全出力（OSSD）を接地すると地絡のエラー（絶縁された電源の 0V を接地していても）', () => {
    const d = dcGrounded();
    d.devices.push(dev('LC1', 'omron.f3sg-sr.receiver'));
    const def = getDeviceDefinition('omron.f3sg-sr.receiver');
    const ossd = def && (typeof def.terminals === 'function' ? def.terminals({}) : def.terminals).find((t) => t.supply?.kind === 'ossd');
    expect(ossd).toBeDefined();
    d.wires.push(w(`LC1.${ossd!.id}`, 'PS1.PE', 'green'));
    expect(errorsOf(d)).toContain('ground-fault');
  });
});
