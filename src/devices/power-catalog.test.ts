/**
 * 制御盤の電源・保護・盤内設備（docs/power-catalog.md）の、代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { deviceModel, deviceSize } from './types';

let seq = 0;
const w = (from: string, to: string, sizeSq = 1.25): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq, wireType: 'KIV' };
};
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const lookup = (t: string) => getDeviceDefinition(t);
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const rulesOf = (d: Diagram) => issues(d).map((i) => i.rule);

/** 三相 200V → CP（2P）→ 制御用トランス → CP（2P）→ 盤内照明・コンセント・スイッチング電源 */
const panelPower = (): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.3p200v'),
    dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 5 }),
    dev('TR1', 'generic.control-transformer.1p200-100v', { capacity: 500 }),
    dev('CP2', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 5 }),
    dev('LT1', 'generic.panel-light.led'),
    dev('CN1', 'generic.panel-outlet.ac100v'),
    dev('PSU1', 'omron.s8vk-g.dc24v'),
  ],
  wires: [
    w('PS1.R', 'CP1.1'),
    w('PS1.S', 'CP1.3'),
    w('CP1.2', 'TR1.IN200'),
    w('CP1.4', 'TR1.IN0'),
    w('TR1.E', 'PS1.PE'),
    w('TR1.OUT100', 'CP2.1'),
    w('TR1.OUT0', 'CP2.3'),
    w('CP2.2', 'LT1.L'),
    w('CP2.4', 'LT1.N'),
    w('CP2.2', 'CN1.L'),
    w('CP2.4', 'CN1.N'),
    w('CN1.PE', 'PS1.PE'),
    w('CP2.2', 'PSU1.L'),
    w('CP2.4', 'PSU1.N'),
    w('PSU1.PE', 'PS1.PE'),
  ],
});

describe('制御盤の電源・保護機器の電気チェック', () => {
  it('三相 200V から制御用トランスで AC100V を作り、照明・コンセント・電源へ配る回路はエラーなし', () => {
    const d = panelPower();
    expect(errorsOf(d)).toEqual([]);
    // 二次側の CP で保護しているので「保護機器がない」とは言わない
    expect(rulesOf(d)).not.toContain('no-protection');
  });

  it('トランスの二次側に CP を入れないと、二次側の負荷に保護がないと警告する', () => {
    const d = panelPower();
    d.devices = d.devices.filter((x) => x.id !== 'CP2');
    d.wires = d.wires.filter((x) => x.from.device !== 'CP2' && x.to.device !== 'CP2');
    d.wires.push(w('TR1.OUT100', 'LT1.L'), w('TR1.OUT0', 'LT1.N'));
    expect(issues(d).some((i) => i.rule === 'no-protection' && i.devices.includes('LT1'))).toBe(true);
  });

  it('トランスの一次側に AC100V をつなぐと電圧のエラー', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('TR1', 'generic.control-transformer.1p200-100v')],
      wires: [w('PS1.L', 'TR1.IN200'), w('PS1.N', 'TR1.IN0')],
    };
    expect(errorsOf(d)).toContain('voltage-mismatch');
  });

  it('トランスの一次電流（容量 ÷ 200V）が上流の CP の定格を超えると警告する', () => {
    const d = panelPower();
    d.devices = d.devices.map((x) => (x.id === 'TR1' ? { ...x, params: { capacity: 2000 } } : x));
    // 2kVA → 一次 10A > CP1 5A
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('TR1'))).toBe(true);
  });

  it('コンセントの L と N(W) を逆につなぐと極性のエラー', () => {
    const d = panelPower();
    d.wires = d.wires.map((x) =>
      x.to.device === 'CN1' && x.to.terminal === 'L' ? { ...x, to: { device: 'CN1', terminal: 'N' } } : x.to.device === 'CN1' && x.to.terminal === 'N' ? { ...x, to: { device: 'CN1', terminal: 'L' } } : x,
    );
    expect(errorsOf(d)).toContain('conductor-mismatch');
  });

  it('コンセントで使う機器の電流（想定）が上流の保護を超えると警告する', () => {
    const d = panelPower();
    d.devices = d.devices.map((x) => (x.id === 'CN1' ? { ...x, params: { loadCurrent: 15 } } : x));
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('CN1'))).toBe(true);
  });

  it('スイッチング電源（S8VK-G 240W）の入力電流が上流の CP の定格を超えると警告する', () => {
    const d = panelPower();
    d.devices = d.devices.map((x) => (x.id === 'CP2' ? { ...x, params: { ratedCurrent: 2 } } : x.id === 'PSU1' ? { ...x, params: { outputCurrent: 10 } } : x));
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('PSU1'))).toBe(true);
  });

  it('ヒューズホルダは保護機器として働く（ヒューズの定格より負荷が大きいと警告）', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('F1', 'generic.fuse-holder.2p', { ratedCurrent: 0.5 }), dev('LT1', 'generic.panel-light.led')],
      wires: [w('PS1.L', 'F1.1'), w('PS1.N', 'F1.3'), w('F1.2', 'LT1.L'), w('F1.4', 'LT1.N')],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-protection');
    expect(rulesOf(d)).not.toContain('overload');
    d.devices[2] = dev('CN1', 'generic.panel-outlet.ac100v', { loadCurrent: 1 });
    d.wires = [w('PS1.L', 'F1.1'), w('PS1.N', 'F1.3'), w('F1.2', 'CN1.L'), w('F1.4', 'CN1.N'), w('CN1.PE', 'PS1.PE')];
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('CN1'))).toBe(true);
  });

  it('ノイズフィルタは LINE → LOAD に電源と保護を通す（逆につなぐと保護が下流へ伝わらず、保護がないと警告する）', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.1p100v'),
        dev('CP1', 'mitsubishi.cp30-ba.2p'),
        dev('NF1', 'generic.noise-filter.1p'),
        dev('PSU1', 'idec.ps5r-v.dc24v'),
      ],
      wires: [
        w('PS1.L', 'CP1.1'),
        w('PS1.N', 'CP1.3'),
        w('CP1.2', 'NF1.IN-L'),
        w('CP1.4', 'NF1.IN-N'),
        w('NF1.E', 'PS1.PE'),
        w('NF1.OUT-L', 'PSU1.L'),
        w('NF1.OUT-N', 'PSU1.N'),
        w('PSU1.PE', 'PS1.PE'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-power');
    expect(rulesOf(d)).not.toContain('no-protection');
    // 電源を LOAD 側に、負荷を LINE 側につなぐ
    d.wires = d.wires.map((x) => ({
      ...x,
      from: x.from.device === 'NF1' ? { device: 'NF1', terminal: x.from.terminal.replace(/^IN-/, 'X-').replace(/^OUT-/, 'IN-').replace(/^X-/, 'OUT-') } : x.from,
      to: x.to.device === 'NF1' ? { device: 'NF1', terminal: x.to.terminal.replace(/^IN-/, 'X-').replace(/^OUT-/, 'IN-').replace(/^X-/, 'OUT-') } : x.to,
    }));
    expect(rulesOf(d)).not.toContain('no-power');
    expect(issues(d).some((i) => i.rule === 'no-protection' && i.devices.includes('PSU1'))).toBe(true);
  });

  it('ノイズフィルタの定格電流より上流の保護電流が大きいと警告する', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 20 }), dev('NF1', 'generic.noise-filter.1p', { ratedCurrent: 6 })],
      wires: [w('PS1.L', 'CP1.1'), w('PS1.N', 'CP1.3'), w('CP1.2', 'NF1.IN-L'), w('CP1.4', 'NF1.IN-N'), w('NF1.E', 'PS1.PE')],
    };
    expect(rulesOf(d)).toContain('terminal-overcurrent');
  });

  it('SPD: 単相品は AC100V に使え、三相品（200V 系）を AC100V につなぐと電圧のエラー', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('F1', 'generic.fuse-holder.2p'), dev('SPD1', 'generic.spd.1p')],
      wires: [w('PS1.L', 'F1.1'), w('PS1.N', 'F1.3'), w('F1.2', 'SPD1.L'), w('F1.4', 'SPD1.N'), w('SPD1.PE', 'PS1.PE')],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-protection');
    d.devices[2] = dev('SPD1', 'generic.spd.3p');
    d.wires = [w('PS1.L', 'F1.1'), w('PS1.N', 'F1.3'), w('F1.2', 'SPD1.L1'), w('F1.4', 'SPD1.L2'), w('SPD1.PE', 'PS1.PE')];
    expect(errorsOf(d)).toContain('voltage-mismatch');
  });

  it('SPD の PE を電路につなぐと地絡のエラー', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.3p200v'), dev('SPD1', 'generic.spd.3p')],
      wires: [w('PS1.R', 'SPD1.L1'), w('PS1.S', 'SPD1.L2'), w('PS1.T', 'SPD1.L3'), w('SPD1.PE', 'PS1.T')],
    };
    expect(errorsOf(d)).toContain('ground-fault');
  });

  it('ドアスイッチの NC（扉を開けると閉じる）で盤内照明を点ける回路はエラーなし', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 1 }), dev('DS1', 'generic.door-switch'), dev('LT1', 'generic.panel-light.led')],
      wires: [w('PS1.L', 'CP1.1'), w('PS1.N', 'CP1.3'), w('CP1.2', 'DS1.COM'), w('DS1.NC', 'LT1.L'), w('CP1.4', 'LT1.N'), w('LT1.PE', 'PS1.PE')],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('no-power');
  });
});

describe('制御盤の電源・保護機器の定義', () => {
  it('スイッチング電源の容量で大きさと型式が変わる', () => {
    const s8vk = getDeviceDefinition('omron.s8vk-g.dc24v')!;
    expect(deviceSize(s8vk, { outputCurrent: 0.65 })).toEqual({ width: 45, height: 180 });
    expect(deviceSize(s8vk, { outputCurrent: 10 })).toEqual({ width: 120, height: 250 });
    expect(deviceModel(s8vk, { outputCurrent: 5 })).toBe('S8VK-G12024');
    const ps5r = getDeviceDefinition('idec.ps5r-v.dc24v')!;
    expect(deviceModel(ps5r, { outputCurrent: 3.75 })).toBe('PS5R-VE24');
    expect(deviceSize(ps5r, { outputCurrent: 10 }).width).toBe(120);
  });

  it('ファミリーにまとまる', () => {
    expect(familyOf('omron.s8vk-g.dc24v')?.name).toBe('DC24V 電源');
    expect(familyOf('idec.ps5r-v.dc24v')?.name).toBe('DC24V 電源');
    expect(familyOf('generic.fuse-holder.1p')?.name).toBe('ヒューズホルダ');
    expect(familyOf('generic.fuse-holder.1p')?.facets.map((f) => f.label)).toContain('極数');
    expect(familyOf('generic.noise-filter.3p')?.name).toBe('ノイズフィルタ');
    expect(familyOf('generic.spd.3p')?.name).toBe('サージ保護デバイス');
    expect(familyOf('generic.control-transformer.1p200-100v')?.name).toBe('制御用トランス');
  });
});
