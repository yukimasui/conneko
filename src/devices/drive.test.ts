/**
 * モーターと駆動機器（インバーター・サーボ・ステッピング・ブレーキ付き／単相モーター。docs/drive-catalog.md）の
 * 電気的なチェックの確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';

let seq = 0;
const wire = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'KIV', ...extra };
};
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const check = (d: Diagram) => checkDiagram(d, getDeviceDefinition);
/** 電源・電圧・極性・短絡・過電流など電気的な誤りの指摘（未接続の注意などを除く） */
const electrical = (d: Diagram) => check(d).filter((i) => i.severity === 'error' || /voltage|system|conductor|short|overload|phase|polarity/.test(i.rule));

/** 三相 200V → ブレーカー → インバーター → モーター */
function inverterCircuit(inv: string, motorAmp = 6.6): Diagram {
  return {
    devices: [
      dev('PS1', 'generic.power-source.3p200v'),
      dev('CB1', 'mitsubishi.nf32-sv.3p', { ratedCurrent: 20 }),
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

describe('インバーター FR-E820 / FR-E820S', () => {
  it('容量の違う機種は端子の ID がそろっている（機種を変えても配線が外れない）', () => {
    const ids = (t: string) => resolveDevice(getDeviceDefinition(t)!).terminals.map((x) => x.id);
    const base = ids('mitsubishi.fr-e820-0.75k');
    for (const t of ['mitsubishi.fr-e820-0.1k', 'mitsubishi.fr-e820-0.2k', 'mitsubishi.fr-e820-0.4k', 'mitsubishi.fr-e820-1.5k', 'mitsubishi.fr-e820-2.2k', 'mitsubishi.fr-e820-3.7k']) {
      expect(ids(t), t).toEqual(base);
    }
    // 単相品は T/L3 がないだけ
    expect(ids('mitsubishi.fr-e820s-0.75k')).toEqual(base.filter((id) => id !== 'T/L3'));
  });

  it('容量で出力の定格電流と入力電流が変わる', () => {
    const r = resolveDevice(getDeviceDefinition('mitsubishi.fr-e820-3.7k')!);
    expect(r.terminal('U')?.supply?.limitCurrent).toBe(17.5);
    expect(getDeviceDefinition('mitsubishi.fr-e820-3.7k')!.loadCurrent).toBe(23);
    expect(r.width).toBe(280);
  });

  it('三相 200V から 1.5K のインバーターでモーターを回す回路に電気的な誤りがない', () => {
    expect(electrical(inverterCircuit('mitsubishi.fr-e820-1.5k'))).toEqual([]);
  });

  it('単相品に三相の 3 本目をつなぐ端子はない。単相 200V で給電できる', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.3p200v'), dev('CB1', 'mitsubishi.nf32-sv.2p', { ratedCurrent: 20 }), dev('INV1', 'mitsubishi.fr-e820s-0.75k')],
      wires: [wire('PS1.R', 'CB1.1'), wire('PS1.S', 'CB1.3'), wire('CB1.2', 'INV1.R/L1'), wire('CB1.4', 'INV1.S/L2'), wire('PS1.PE', 'INV1.E', { color: 'green' })],
    };
    expect(electrical(d)).toEqual([]);
  });

  it('ファミリー「インバーター」で電源と容量を絞り込める', () => {
    const f = familyOf('mitsubishi.fr-e820-1.5k')!;
    expect(f.name).toBe('インバーター');
    expect(f.facets.map((x) => x.label)).toEqual(['電源', '容量']);
    const def = getDeviceDefinition('mitsubishi.fr-e820s-0.75k')!;
    expect(f.facets.map((x) => x.value(def))).toEqual(['単相 200V', '0.75kW']);
  });
});

/** サーボアンプ MR-J5-40A ＋ サーボモーター HK-KT43WB */
function servoCircuit(brakeSupply: 'dc24' | 'ac200' = 'dc24'): Diagram {
  const d: Diagram = {
    devices: [
      dev('PS1', 'generic.power-source.3p200v'),
      dev('CB1', 'mitsubishi.nf32-sv.3p', { ratedCurrent: 10 }),
      dev('SA1', 'mitsubishi.mr-j5-a', { capacity: '40' }),
      dev('SM1', 'mitsubishi.hk-kt', { capacity: '43', brake: 'B' }),
      dev('PSU1', 'generic.psu.dc24v'),
    ],
    wires: [
      wire('PS1.R', 'CB1.1'),
      wire('PS1.S', 'CB1.3'),
      wire('PS1.T', 'CB1.5'),
      wire('CB1.2', 'SA1.L1'),
      wire('CB1.4', 'SA1.L2'),
      wire('CB1.6', 'SA1.L3'),
      wire('CB1.2', 'SA1.L11'),
      wire('CB1.4', 'SA1.L21'),
      wire('SA1.U', 'SM1.U'),
      wire('SA1.V', 'SM1.V'),
      wire('SA1.W', 'SM1.W'),
      wire('PS1.PE', 'SA1.PE', { color: 'green' }),
      wire('SA1.PE', 'SM1.E', { color: 'green' }),
      wire('SA1.CN2', 'SM1.ENC'),
      wire('CB1.2', 'PSU1.L'),
      wire('CB1.4', 'PSU1.N'),
      wire('PS1.PE', 'PSU1.PE', { color: 'green' }),
    ],
  };
  if (brakeSupply === 'dc24') d.wires.push(wire('PSU1.+V1', 'SM1.B1', { sizeSq: 0.75 }), wire('PSU1.-V1', 'SM1.B2', { sizeSq: 0.75 }));
  else d.wires.push(wire('CB1.2', 'SM1.B1'), wire('CB1.4', 'SM1.B2'));
  return d;
}

describe('サーボアンプ MR-J5-A とサーボモーター HK-KT', () => {
  it('主回路・制御電源・モーター・エンコーダー・ブレーキの配線に電気的な誤りがない', () => {
    expect(electrical(servoCircuit())).toEqual([]);
  });

  it('電磁ブレーキに AC200V をつなぐと指摘する', () => {
    const issues = electrical(servoCircuit('ac200')).filter((i) => i.devices.includes('SM1'));
    expect(issues.length).toBeGreaterThan(0);
  });

  it('電磁ブレーキは端子ごとの消費電流（ブレーキのコイル）で保護・電源の容量と比べる', () => {
    // DC24V 2.5A の電源からブレーキだけを受電しても、モーターの動力の電流（2.6A）では数えない
    expect(check(servoCircuit()).filter((i) => i.rule === 'supply-overload')).toEqual([]);
    // ブレーキの回路をサーキットプロテクタ 0.5A で保護しても過負荷にならず、0.25A なら指摘する
    const withCp = (amp: number): Diagram => {
      const d = servoCircuit();
      d.wires = d.wires.filter((w) => w.to.terminal !== 'B1');
      d.devices.push(dev('CP1', 'mitsubishi.cp30-ba.2p', { ratedCurrent: amp }));
      d.wires.push(wire('PSU1.+V2', 'CP1.1', { sizeSq: 0.75 }), wire('CP1.2', 'SM1.B1', { sizeSq: 0.75 }));
      return d;
    };
    expect(check(withCp(0.5)).filter((i) => i.rule === 'overload')).toEqual([]);
    expect(check(withCp(0.25)).filter((i) => i.rule === 'overload').map((i) => i.key)).toEqual(['overload:SM1:B1']);
  });

  it('制御回路電源 L11・L21 は主回路と別の小さな保護でよい', () => {
    const d = servoCircuit();
    d.wires = d.wires.filter((w) => w.to.terminal !== 'L11' && w.to.terminal !== 'L21');
    d.devices.push(dev('CP2', 'mitsubishi.cp30-ba.2p', { ratedCurrent: 1 }));
    d.wires.push(wire('CB1.2', 'CP2.1'), wire('CB1.4', 'CP2.3'), wire('CP2.2', 'SA1.L11'), wire('CP2.4', 'SA1.L21'));
    expect(check(d).filter((i) => i.rule === 'overload')).toEqual([]);
  });

  it('ブレーキなしの機種は B1・B2 がなく、型式が変わる', () => {
    const def = getDeviceDefinition('mitsubishi.hk-kt')!;
    expect(resolveDevice(def, { brake: 'none' }).terminals.map((t) => t.id)).not.toContain('B1');
    expect(resolveDevice(def, { brake: 'B', capacity: '7M3' }).terminals.map((t) => t.id)).toContain('B1');
    expect(def.modelOf!({ capacity: '7M3', brake: 'B' })).toBe('HK-KT7M3WB');
  });

  it('CN1 の出力は DOCOM を共通にした NPN 出力、入力は DICOM を共通にした DC 入力', () => {
    const r = resolveDevice(getDeviceDefinition('mitsubishi.mr-j5-a')!);
    expect(r.terminal('ALM')?.signal).toMatchObject({ dir: 'out', kind: 'npn' });
    expect(r.terminal('SON')?.signal).toMatchObject({ dir: 'in', kind: 'dc', common: 'DICOM' });
    expect(r.links.filter((l) => l.switch === 'output').every((l) => l.to === 'DOCOM')).toBe(true);
  });
});

describe('ステッピングモーター AZ シリーズ（AZD-KD）', () => {
  function azCircuit(psu = 'generic.psu.dc24v'): Diagram {
    return {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('PSU1', psu), dev('DRV1', 'oriental.azd-kd'), dev('M1', 'oriental.azm')],
      wires: [
        wire('PS1.L', 'PSU1.L'),
        wire('PS1.N', 'PSU1.N'),
        wire('PS1.PE', 'PSU1.PE', { color: 'green' }),
        wire('PSU1.+V1', 'DRV1.+'),
        wire('PSU1.-V1', 'DRV1.-'),
        wire('PS1.PE', 'DRV1.FG', { color: 'green' }),
        wire('DRV1.CN2', 'M1.MOTOR'),
      ],
    };
  }

  it('DC24V の電源で駆動する回路に電気的な誤りがない', () => {
    expect(electrical(azCircuit())).toEqual([]);
  });

  it('主電源の極性を逆につなぐと指摘する', () => {
    const d = azCircuit();
    d.wires = d.wires.map((w) => (w.to.terminal === '+' ? { ...w, to: { ...w.to, terminal: '-' } } : w.to.terminal === '-' && w.to.device === 'DRV1' ? { ...w, to: { ...w.to, terminal: '+' } } : w));
    expect(electrical(d).some((i) => i.devices.includes('DRV1'))).toBe(true);
  });

  it('出力の配線（シンク・ソース）で出力の信号の種類が変わる', () => {
    const def = getDeviceDefinition('oriental.azd-kd')!;
    expect(resolveDevice(def).terminal('OUT1')?.signal?.kind).toBe('npn');
    expect(resolveDevice(def, { outLogic: 'source' }).terminal('OUT1')?.signal?.kind).toBe('pnp');
  });
});

describe('ブレーキ付き三相モーター・単相レバーシブルモーター', () => {
  it('ブレーキの電源を DC24V にした機種に AC200V をつなぐと指摘する', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.3p200v'), dev('M1', 'generic.motor.3p-brake', { brakePower: 'dc24' })],
      wires: [wire('PS1.R', 'M1.B1'), wire('PS1.S', 'M1.B2')],
    };
    expect(electrical(d).some((i) => i.devices.includes('M1'))).toBe(true);
    const ok: Diagram = { ...d, devices: [d.devices[0], dev('M1', 'generic.motor.3p-brake', { brakePower: 'ac200' })] };
    expect(electrical(ok)).toEqual([]);
  });

  it('単相 100V のレバーシブルモーターを単相 100V で回せる。200V の機種につなぐと指摘する', () => {
    const d: Diagram = {
      devices: [dev('PS1', 'generic.power-source.1p100v'), dev('M1', 'generic.motor.1p-reversible')],
      wires: [wire('PS1.N', 'M1.COM'), wire('PS1.L', 'M1.CW'), wire('PS1.PE', 'M1.E', { color: 'green' })],
    };
    expect(electrical(d)).toEqual([]);
    const v200: Diagram = { ...d, devices: [d.devices[0], dev('M1', 'generic.motor.1p-reversible', { voltage: '200' })] };
    expect(electrical(v200).some((i) => i.devices.includes('M1'))).toBe(true);
  });

  it('モーターのファミリーにまとまる', () => {
    expect(familyOf('generic.motor.3p-brake')?.name).toBe('モーター');
    expect(familyOf('generic.motor.1p-reversible')?.name).toBe('モーター');
  });
});
