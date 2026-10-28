/**
 * 三菱電機の大容量の遮断器・中容量の電磁接触器・電磁開閉器 MSO-T・補助接点ユニット（docs/mitsubishi-catalog.md）の
 * 代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { diagramCurrentMargins } from '../check/protection';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { deviceElements } from '../schematic/elements';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { deviceAccessories } from './types';

let seq = 0;
const w = (from: string, to: string, sizeSq = 2): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq, wireType: 'KIV' };
};
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const lookup = (t: string) => getDeviceDefinition(t);
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);

/** 三相 200V → 主幹（遮断器）→ 電磁開閉器 MSO-T21 → モーター。コイルは AC200V を押しボタンで入れる */
const motorCircuit = (mains = 'mitsubishi.nv125-sv.3p', starter = 'mitsubishi.mso-t21.ac200v', heater = 15, motorA = 15.4): Diagram => ({
  devices: [
    dev('PS1', 'generic.power-source.3p200v'),
    dev('ELB1', mains, { ratedCurrent: 30 }),
    dev('MS1', starter, { heater }),
    dev('M1', 'generic.motor.3p', { ratedCurrent: motorA }),
    dev('PB1', 'omron.a22nn-bnm-g100'),
  ],
  wires: [
    w('PS1.R', 'ELB1.1', 5.5),
    w('PS1.S', 'ELB1.3', 5.5),
    w('PS1.T', 'ELB1.5', 5.5),
    w('ELB1.2', 'MS1.1/L1', 5.5),
    w('ELB1.4', 'MS1.3/L2', 5.5),
    w('ELB1.6', 'MS1.5/L3', 5.5),
    w('MS1.2/T1', 'M1.U', 5.5),
    w('MS1.4/T2', 'M1.V', 5.5),
    w('MS1.6/T3', 'M1.W', 5.5),
    w('M1.E', 'PS1.PE', 5.5),
    // 操作回路: R → 押しボタン → 95-96（サーマルの b 接点）→ A1、A2 → S
    w('ELB1.2', 'PB1.3'),
    w('PB1.4', 'MS1.95'),
    w('MS1.96', 'MS1.A1'),
    w('MS1.A2', 'ELB1.4'),
  ],
});

describe('三菱電機の主幹・電磁開閉器の電気チェック', () => {
  it('NV125-SV → MSO-T21 → モーターの回路はエラーなし', () => {
    const d = motorCircuit();
    expect(errorsOf(d)).toEqual([]);
    expect(issues(d).map((i) => i.rule)).not.toContain('no-protection');
  });

  it('MSO-T のヒーター呼びがモーターの定格電流より小さいと、保護機器が動作すると警告する', () => {
    const d = motorCircuit('mitsubishi.nv125-sv.3p', 'mitsubishi.mso-t21.ac200v', 5, 15.4);
    expect(issues(d).some((i) => i.rule === 'overload' && i.devices.includes('M1'))).toBe(true);
  });

  it('MSO-T10・T20・T25 も同じ端子 ID でつながる', () => {
    for (const t of ['mitsubishi.mso-t10.ac200v', 'mitsubishi.mso-t20.ac200v', 'mitsubishi.mso-t25.ac200v']) {
      expect(errorsOf(motorCircuit('mitsubishi.nv125-sv.3p', t, 9, 6.6)), t).toEqual([]);
    }
  });

  it('225A フレームの NF250-SV の下流の電線が細いと、電線の太さを警告する', () => {
    const d = motorCircuit('mitsubishi.nf250-sv.3p');
    d.devices[1] = dev('ELB1', 'mitsubishi.nf250-sv.3p', { ratedCurrent: 225 });
    expect(issues(d).some((i) => i.rule === 'wire-too-thin')).toBe(true);
  });

  it('大容量の遮断器は電流の余裕（遮断器ごとの下流の負荷）に出る', () => {
    const d = motorCircuit('mitsubishi.nv250-sv.3p');
    d.devices[1] = dev('ELB1', 'mitsubishi.nv250-sv.3p', { ratedCurrent: 125 });
    const m = diagramCurrentMargins(d, lookup).find((x) => x.protector.id === 'ELB1');
    expect(m?.protector.rating).toBe(125);
    expect(m?.protector.devices).toContain('M1');
  });

  it('S-T35〜S-T100 は主接点の定格（AC-3）を超える負荷を警告する', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.3p200v'),
        dev('CB1', 'mitsubishi.nf250-sv.3p', { ratedCurrent: 125 }),
        dev('MC1', 'mitsubishi.s-t35.ac200v'),
        dev('M1', 'generic.motor.3p', { ratedCurrent: 15.4 }),
        dev('M2', 'generic.motor.3p', { ratedCurrent: 15.4 }),
        dev('M3', 'generic.motor.3p', { ratedCurrent: 15.4 }),
      ],
      wires: [
        w('PS1.R', 'CB1.1', 38),
        w('PS1.S', 'CB1.3', 38),
        w('PS1.T', 'CB1.5', 38),
        w('CB1.2', 'MC1.1/L1', 38),
        w('CB1.4', 'MC1.3/L2', 38),
        w('CB1.6', 'MC1.5/L3', 38),
        ...['M1', 'M2', 'M3'].flatMap((m) => [w('MC1.2/T1', `${m}.U`, 38), w('MC1.4/T2', `${m}.V`, 38), w('MC1.6/T3', `${m}.W`, 38), w(`${m}.E`, 'PS1.PE', 38)]),
        w('CB1.2', 'MC1.A1'),
        w('MC1.A2', 'CB1.4'),
      ],
    };
    // 15.4A × 3 = 46.2A > S-T35 の 35A
    expect(issues(d).some((i) => i.rule === 'contact-overload' && i.devices.includes('MC1'))).toBe(true);
    d.devices[2] = dev('MC1', 'mitsubishi.s-t50.ac200v');
    expect(issues(d).map((i) => i.rule)).not.toContain('contact-overload');
  });

  it('S-T32 に補助接点ユニット UT-AX4 を付けると、53-54（a 接点）で自己保持できる', () => {
    const d: Diagram = {
      devices: [
        dev('PS1', 'generic.power-source.3p200v'),
        dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 3 }),
        dev('PB1', 'omron.a22nn-bnm-g100'),
        dev('MC1', 'mitsubishi.s-t32.ac200v', { auxUnit: 'ut-ax4' }),
      ],
      wires: [w('PS1.R', 'CP1.1'), w('PS1.S', 'CP1.3'), w('CP1.2', 'PB1.3'), w('PB1.4', 'MC1.A1'), w('CP1.2', 'MC1.53'), w('MC1.54', 'MC1.A1'), w('MC1.A2', 'CP1.4')],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(issues(d).map((i) => i.rule)).not.toContain('unknown-terminal');
    const def = getDeviceDefinition('mitsubishi.s-t32.ac200v')!;
    expect(resolveDevice(def).terminals.some((t) => t.id === '53')).toBe(false);
    expect(resolveDevice(def, { auxUnit: 'ut-ax2' }).terminals.map((t) => t.id)).toEqual(expect.arrayContaining(['53', '54', '61', '62']));
    expect(deviceAccessories(def, { auxUnit: 'ut-ax4' }).map((a) => a.model)).toEqual(['UT-AX4 2a2b']);
    expect(deviceAccessories(def, {})).toEqual([]);
  });
});

describe('三菱電機の主幹・電磁開閉器の定義', () => {
  it('ファミリーにまとまる', () => {
    expect(familyOf('mitsubishi.nv125-sv.3p')?.name).toBe('漏電ブレーカー');
    expect(familyOf('mitsubishi.nv250-sv.3p')?.name).toBe('漏電ブレーカー');
    expect(familyOf('mitsubishi.nf250-sv.3p')?.name).toBe('ノーヒューズブレーカー');
    expect(familyOf('mitsubishi.s-t100.ac200v')?.name).toBe('電磁接触器');
    expect(familyOf('mitsubishi.mso-t21.ac200v')?.name).toBe('電磁接触器');
    expect(familyOf('mitsubishi.mso-t21.ac200v')?.facets.map((f) => f.label)).toContain('サーマルリレー');
  });

  it('展開図では MSO-T の主回路が主接点、コイル・補助接点・サーマルの接点が記号になる', () => {
    const els = deviceElements(getDeviceDefinition('mitsubishi.mso-t21.ac200v')!);
    expect(els.map((e) => e.kind)).toEqual(expect.arrayContaining(['coil', 'contactor', 'contact']));
    expect(els.find((e) => e.kind === 'contactor')?.pinOf).toMatchObject({ '1/L1': '1', '2/T1': '2' });
  });

  it('MSO-T のサーマルリレーの接点（95-96・97-98）はコイルではなく過負荷のトリップで切り換わる（別の動作の単位）', () => {
    const r = resolveDevice(getDeviceDefinition('mitsubishi.mso-t21.ac200v')!);
    const thermal = r.links.filter((l) => ['95', '97'].includes(l.from));
    expect(thermal.map((l) => [l.from, l.to, l.switch, l.actor])).toEqual([
      ['95', '96', 'NC', 'thermal'],
      ['97', '98', 'NO', 'thermal'],
    ]);
    // 電磁接触器の補助接点はコイルで切り換わる（actor なし）
    expect(r.links.filter((l) => l.switch && !['95', '97'].includes(l.from)).every((l) => !l.actor)).toBe(true);
  });
});
