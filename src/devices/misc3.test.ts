/**
 * センサー・計測・安全機器・駆動機器の残り（#76・#80・#77）で追加した機器の整合性と、つないだときの電気チェックの動作確認。
 * - 計測: エー・アンド・デイ ロードセル LCB03・ウェイングインジケータ AD-4402、オムロン 61F-G・PS-3S、E6CP-A、SICK W12
 * - 安全: IDEC HE1B、オムロン NX-SL3300・NX-SIH400・NX-SOH200
 * - 駆動: 三菱電機 FR-F820、パナソニック MINAS A6（MADLN15SG・MSMF022L1）
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramWire } from '../model/diagram';
import { hasEstimates } from './estimates';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { functionsOf, resolveDevice } from './resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from './types';

const TYPES = [
  'aandd.lcb03',
  'aandd.ad-4402',
  'omron.61f-g',
  'omron.ps-3s',
  'omron.e6cp-a',
  'sick.w12',
  'idec.he1b-m1',
  'omron.nx-sl3300',
  'omron.nx-sih400',
  'omron.nx-soh200',
  'mitsubishi.fr-f820-0.75k',
  'mitsubishi.fr-f820-1.5k',
  'panasonic.madln15sg',
  'panasonic.msmf022l1',
];

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

const variants = (d: DeviceDefinition): ParamValues[] => {
  const out = [paramsWithDefaults(d, {})];
  for (const p of d.params ?? []) for (const o of p.options) out.push(paramsWithDefaults(d, { [p.key]: o.value }));
  return out;
};

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ...ft] = from.split('.');
  const [td, ...tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft.join('.') }, to: { device: td, terminal: tt.join('.') }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const issues = (d: Diagram) => checkDiagram(d, getDeviceDefinition);
const errorRules = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const rules = (d: Diagram) => issues(d).map((i) => i.rule);
const dev = (id: string, type: string, params?: ParamValues) => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });

describe('追加した機器の定義', () => {
  it.each(TYPES.map((t) => [t] as const))('%s が登録され、端子 ID が重複せず、内部経路の端子がある', (type) => {
    const d = def(type);
    for (const v of variants(d)) {
      const r = resolveDevice(d, v);
      const ids = [...r.terminals, ...r.pins].map((t) => t.id);
      expect(new Set(ids).size, JSON.stringify(v)).toBe(ids.length);
      for (const l of r.links) {
        expect(ids).toContain(l.from);
        expect(ids).toContain(l.to);
      }
    }
  });

  it.each(TYPES.map((t) => [t] as const))('%s は推定を含むことを示す', (type) => {
    expect(hasEstimates(def(type))).toBe(true);
  });

  it('型式（modelOf）がパラメータで変わる', () => {
    const m = (t: string, p: ParamValues) => def(t).modelOf!(paramsWithDefaults(def(t), p));
    expect(m('aandd.lcb03', { capacity: 'K030L' })).toBe('LCB03K030L');
    expect(m('aandd.ad-4402', {})).toBe('AD-4402D');
    expect(m('aandd.ad-4402', { power: 'AC', analog: 'current' })).toBe('AD-4402 + AD4402-07');
    expect(m('sick.w12', {})).toBe('WTB12-3P2431');
    expect(m('sick.w12', { output: 'N' })).toBe('WTB12-3N2431');
    expect(m('idec.he1b-m1', { mount: 'front' })).toBe('HE1B-M1N');
    expect(m('panasonic.msmf022l1', { brake: 'yes' })).toBe('MSMF022L1V2M');
    expect(def('mitsubishi.fr-f820-1.5k').model).toBe('FR-F820-1.5K-1');
  });

  it('パレットのファミリー', () => {
    expect(familyOf('sick.w12')?.name).toBe('光電センサ');
    expect(familyOf('idec.he1b-m1')?.name).toBe('イネーブルスイッチ');
    for (const t of ['omron.nx-sl3300', 'omron.nx-sih400', 'omron.nx-soh200']) expect(familyOf(t)?.name, t).toBe('セーフティコントローラ');
    const inv = familyOf('mitsubishi.fr-f820-0.75k')!;
    expect(inv.name).toBe('インバーター');
    const series = inv.facets?.find((f) => f.label === 'シリーズ');
    expect(series?.value(def('mitsubishi.fr-f820-0.75k'))).toBe('FR-F800');
    expect(series?.value(def('mitsubishi.fr-a820-0.75k'))).toBe('FR-A800');
    expect(familyOf('panasonic.madln15sg')?.name).toBe('サーボアンプ');
    expect(familyOf('panasonic.msmf022l1')?.name).toBe('サーボモーター');
  });

  it('E6CP-A: 8 本の出力は NPN で 0V（黒）へ向かう出力の経路、電源は赤・黒', () => {
    const r = resolveDevice(def('omron.e6cp-a'));
    expect(r.links).toHaveLength(8);
    for (const l of r.links) {
      expect(l).toMatchObject({ to: 'BK', switch: 'output', ratedCurrent: 0.016 });
      expect(r.terminal(l.from)?.signal).toMatchObject({ dir: 'out', kind: 'npn' });
    }
    expect(r.terminal('RD')?.accepts).toMatchObject({ conductors: ['+'] });
    expect(r.terminal('BU')?.signal).toMatchObject({ kind: 'npn' });
  });

  it('SICK W12: 相補出力の 2 本（ピン 2・4）が出力形式に合わせて +V / 0V へ向かう', () => {
    const pnp = resolveDevice(def('sick.w12'), { output: 'P' });
    expect(pnp.links.map((l) => `${l.from}→${l.to}`)).toEqual(['CN#2→CN#1', 'CN#4→CN#1']);
    const npn = resolveDevice(def('sick.w12'), { output: 'N' });
    expect(npn.links.map((l) => `${l.from}→${l.to}`)).toEqual(['CN#2→CN#3', 'CN#4→CN#3']);
  });

  it('FR-F820 は FR-A820 と同じ制御回路端子で、PR・PX がない', () => {
    const f = resolveDevice(def('mitsubishi.fr-f820-0.75k')).terminals.map((t) => t.id);
    const a = resolveDevice(def('mitsubishi.fr-a820-0.75k')).terminals.map((t) => t.id);
    expect(f).not.toContain('PR');
    expect(f).not.toContain('PX');
    expect(a.filter((id) => id !== 'PR' && id !== 'PX')).toEqual(f);
    expect(def('mitsubishi.fr-f820-0.75k').loadCurrent).toBe(5);
    expect(resolveDevice(def('mitsubishi.fr-f820-1.5k')).terminal('U')?.supply).toMatchObject({ limitCurrent: 7 });
  });

  it('安全: HE1B の接点は直接開路の a 接点、NX の安全入出力は機能・チャンネル・組を持つ', () => {
    expect(resolveDevice(def('idec.he1b-m1')).links).toEqual([{ from: '1', to: '2', switch: 'NO', directOpening: true, ratedCurrent: 2 }]);
    const si = resolveDevice(def('omron.nx-sih400'));
    expect(si.safetyChannels.map((g) => g.channels.map((c) => `${c.source}→${c.input}`))).toEqual([
      ['T0→Si0', 'T1→Si1'],
      ['T0→Si2', 'T1→Si3'],
    ]);
    expect(functionsOf(si.terminal('T0')!)).toContain('test-output');
    expect(si.terminal('T1')?.supply).toMatchObject({ kind: 'test', limitCurrent: 0.025 });
    const so = resolveDevice(def('omron.nx-soh200'));
    for (const id of ['So0', 'So1']) {
      expect(so.terminal(id)?.supply).toMatchObject({ system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 2 });
      expect(functionsOf(so.terminal(id)!)).toContain('ossd');
    }
    for (const t of ['omron.nx-sl3300', 'omron.nx-sih400', 'omron.nx-soh200']) expect(def(t).safety).toMatchObject({ pl: 'e', category: '4', sil: 3 });
    // NX1P2 には連結できない（bus を持たない）
    expect(def('omron.nx-sih400').bus).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* 計測: ロードセルと指示計                                              */
/* ------------------------------------------------------------------ */

describe('ロードセル LCB03 と指示計 AD-4402', () => {
  const base = (): Diagram => ({
    devices: [dev('PSU1', 'generic.psu.dc24v'), dev('WI1', 'aandd.ad-4402'), dev('LC1', 'aandd.lcb03')],
    wires: [
      w('PSU1.+V1', 'WI1.+24V'),
      w('PSU1.-V1', 'WI1.0V'),
      w('WI1.EXC+', 'LC1.RD'),
      w('WI1.EXC-', 'LC1.WH'),
      w('WI1.EXC+', 'WI1.SEN+'),
      w('WI1.EXC-', 'WI1.SEN-'),
      w('LC1.GN', 'WI1.SIG+'),
      w('LC1.BU', 'WI1.SIG-'),
      w('LC1.YE', 'WI1.SHLD'),
    ],
  });

  it('4 線式の配線（EXC と SEN を短絡）でエラーにならず、ロードセルに電源が届く', () => {
    const d = base();
    expect(errorRules(d)).toEqual([]);
    expect(rules(d)).not.toContain('no-power');
  });

  it('ロードセルの電源（赤・白）を DC24V の電源へ直接つなぐと電圧の不一致', () => {
    const d: Diagram = {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('LC1', 'aandd.lcb03')],
      wires: [w('PSU1.+V1', 'LC1.RD'), w('PSU1.-V1', 'LC1.WH')],
    };
    expect(errorRules(d)).toContain('voltage-mismatch');
  });

  it('ロードセルを 350Ω 相当で 9 台つなぐと、ブリッジ電源（230mA）の容量を超える', () => {
    const d = base();
    for (let i = 2; i <= 9; i++) {
      d.devices.push(dev(`LC${i}`, 'aandd.lcb03'));
      d.wires.push(w('WI1.EXC+', `LC${i}.RD`), w('WI1.EXC-', `LC${i}.WH`));
    }
    expect(rules(d)).toContain('supply-overload');
  });

  it('制御出力（オープンコレクタ）は PLC のプラスコモンの入力で OK、マイナスコモンでエラー', () => {
    const plc = (com: '+V2' | '-V2'): Diagram => {
      const d = base();
      d.devices.push(dev('IN1', 'keyence.kv-b16xc'));
      d.wires.push(w('WI1.OUT1', 'IN1.0'), w(`PSU1.${com}`, 'IN1.C0'), w('WI1.OUT COM', 'PSU1.-V2'));
      return d;
    };
    expect(errorRules(plc('+V2'))).toEqual([]);
    expect(errorRules(plc('-V2'))).toContain('signal-polarity');
  });

  it('アナログ出力（4〜20mA）は FR-F820 の電流入力 4 で OK、電圧入力 2 につなぐと信号の種類の注意', () => {
    const d = (input: '4' | '2'): Diagram => {
      const x = base();
      x.devices[1] = dev('WI1', 'aandd.ad-4402', { analog: 'current' });
      x.devices.push(dev('INV1', 'mitsubishi.fr-f820-0.75k'));
      x.wires.push(w('WI1.AOUT+', `INV1.${input}`), w('WI1.AOUT-', 'INV1.5'));
      return x;
    };
    const signalIssues = (x: Diagram) => issues(x).filter((i) => i.devices.includes('INV1') && /signal-kind|analog-return/.test(i.rule));
    expect(signalIssues(d('4'))).toEqual([]);
    expect(rules(d('2'))).toContain('signal-kind');
  });
});

/* ------------------------------------------------------------------ */
/* 計測: フロートなしスイッチ・エンコーダ・光電センサ                       */
/* ------------------------------------------------------------------ */

describe('フロートなしスイッチ 61F-G と電極保持器 PS-3S', () => {
  const lv = (src: 'generic.power-source.1p100v' | 'generic.power-source.3p200v', a: string, b: string, s: 'S1' | 'S2'): Diagram => ({
    devices: [dev('AC1', src), dev('LV1', 'omron.61f-g'), dev('LE1', 'omron.ps-3s')],
    wires: [w(`AC1.${a}`, 'LV1.S0'), w(`AC1.${b}`, `LV1.${s}`), w('LV1.E1', 'LE1.E1'), w('LV1.E2', 'LE1.E2'), w('LV1.E3', 'LE1.E3')],
  });

  it('S0-S1 に AC100V、S0-S2 に AC200V なら OK', () => {
    expect(errorRules(lv('generic.power-source.1p100v', 'L', 'N', 'S1'))).toEqual([]);
    expect(errorRules(lv('generic.power-source.3p200v', 'R', 'S', 'S2'))).toEqual([]);
  });

  it('S1（AC100V 用）に AC200V をつなぐと電圧の不一致', () => {
    expect(errorRules(lv('generic.power-source.3p200v', 'R', 'S', 'S1'))).toContain('voltage-mismatch');
  });

  it('出力の 1c 接点: Tc-Tb が b 接点、Tc-Ta が a 接点（3A）', () => {
    const links = resolveDevice(def('omron.61f-g')).links;
    expect(links).toEqual([
      { from: 'Tc', to: 'Tb', switch: 'NC', ratedCurrent: 3 },
      { from: 'Tc', to: 'Ta', switch: 'NO', ratedCurrent: 3 },
    ]);
  });
});

describe('E6CP-A・SICK W12 → PLC 入力', () => {
  it('E6CP-A の出力（NPN）はプラスコモンの入力で OK、マイナスコモンでエラー。24V を赤・黒へ', () => {
    const d = (com: '+V1' | '-V1'): Diagram => ({
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('IN1', 'keyence.kv-b16xc'), dev('EN1', 'omron.e6cp-a')],
      wires: [w('PSU1.+V2', 'EN1.RD'), w('PSU1.-V2', 'EN1.BK'), w('EN1.BN', 'IN1.0'), w('EN1.BU', 'IN1.4'), w(`PSU1.${com}`, 'IN1.C0')],
    });
    expect(errorRules(d('+V1'))).toEqual([]);
    expect(errorRules(d('-V1'))).toContain('signal-polarity');
  });

  it('E6CP-A の青（2⁴ の出力）を 0V と思って電源の 0V につなぐと、出力が 0V に直結する（入力に信号が来ない）', () => {
    const d: Diagram = {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('EN1', 'omron.e6cp-a')],
      wires: [w('PSU1.+V1', 'EN1.RD'), w('PSU1.-V1', 'EN1.BU')],
    };
    // 0V は黒。黒が未接続のままになる
    expect(issues(d).some((i) => i.rule === 'unconnected' && i.devices.includes('EN1') && /黒 0V/.test(i.message))).toBe(true);
  });

  it('SICK W12（PNP）を M12 ケーブルで KV の入力へ: マイナスコモンで OK、プラスコモンでエラー', () => {
    const d = (com: '+V1' | '-V1'): Diagram => ({
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('IN1', 'keyence.kv-b16xc'), dev('PH1', 'sick.w12', { output: 'P' }), dev('CB1', 'generic.m12-4p-cable')],
      wires: [w('PH1.CN', 'CB1.CN', { wireType: 'CABLE' }), w('PSU1.+V2', 'CB1.BN'), w('PSU1.-V2', 'CB1.BU'), w('CB1.BK', 'IN1.0'), w(`PSU1.${com}`, 'IN1.C0')],
    });
    expect(errorRules(d('-V1'))).toEqual([]);
    expect(errorRules(d('+V1'))).toContain('signal-polarity');
  });
});

/* ------------------------------------------------------------------ */
/* 安全回路                                                              */
/* ------------------------------------------------------------------ */

describe('NX の安全入出力ユニットと HE1B の安全回路', () => {
  /** 非常停止（2b）を T0→Si0・T1→Si1 に入れ、So0・So1 で接触器 2 台を駆動する */
  const nx = (ch1: [string, string], ch2: [string, string], estop = 'idec.xw1e-bv402mr'): Diagram => ({
    devices: [
      dev('PSU1', 'generic.psu.dc24v'),
      dev('SI1', 'omron.nx-sih400'),
      dev('SO1', 'omron.nx-soh200'),
      dev('ES1', estop),
      dev('MC1', 'mitsubishi.sd-t12.dc24v'),
      dev('MC2', 'mitsubishi.sd-t12.dc24v'),
    ],
    wires: [
      w('SI1.T0', `ES1.${ch1[0]}`),
      w(`ES1.${ch1[1]}`, 'SI1.Si0'),
      w('SI1.T1', `ES1.${ch2[0]}`),
      w(`ES1.${ch2[1]}`, 'SI1.Si1'),
      w('SO1.So0', 'MC1.A1'),
      w('SO1.So1', 'MC2.A1'),
      w('MC1.A2', 'SO1.IOG1'),
      w('MC2.A2', 'SO1.IOG2'),
      w('SO1.IOG1', 'PSU1.-V1'),
      w('SO1.IOG2', 'PSU1.-V2'),
    ],
  });

  it('非常停止の b 接点 2 回路と、接触器 2 台の駆動で誤検出しない', () => {
    const d = nx(['21', '22'], ['41', '42']);
    expect(errorRules(d)).toEqual([]);
    expect(rules(d).filter((r) => /estop|direct|safety-channel|single-channel|safety-output/.test(r))).toEqual([]);
    expect(rules(d)).not.toContain('no-power');
  });

  it('2 つのチャンネルで同じ接点を使うと検出する', () => {
    expect(rules(nx(['21', '22'], ['22', '21']))).toContain('safety-channel-cross');
  });

  it('安全出力 So0 を 0V に短絡すると短絡として検出する', () => {
    const d = nx(['21', '22'], ['41', '42']);
    d.wires.push(w('SO1.So0', 'PSU1.-V2'));
    expect(errorRules(d).some((r) => r === 'short-circuit' || r === 'ossd-short')).toBe(true);
  });

  it('安全出力を片方（So0）だけ使うと冗長化されていない出力を指摘する', () => {
    const d = nx(['21', '22'], ['41', '42']);
    d.wires = d.wires.filter((x) => x.from.terminal !== 'So1');
    expect(rules(d).some((r) => r === 'single-channel-output' || r === 'safety-output-partial')).toBe(true);
  });

  it('HE1B を 2 個、NX の安全入力の 2 チャンネルに 1 個ずつ入れても a 接点の指摘にならない', () => {
    const d: Diagram = {
      devices: [dev('SI1', 'omron.nx-sih400'), dev('EN1', 'idec.he1b-m1'), dev('EN2', 'idec.he1b-m1')],
      wires: [w('SI1.T0', 'EN1.1'), w('EN1.2', 'SI1.Si0'), w('SI1.T1', 'EN2.1'), w('EN2.2', 'SI1.Si1')],
    };
    expect(errorRules(d)).toEqual([]);
    expect(rules(d)).not.toContain('estop-not-nc');
  });
});

/* ------------------------------------------------------------------ */
/* 駆動                                                                  */
/* ------------------------------------------------------------------ */

describe('MINAS A6（MADLN15SG + MSMF022L1）', () => {
  const servo = (motor = 'panasonic.msmf022l1', brake = false): Diagram => ({
    devices: [dev('AC1', 'generic.power-source.3p200v'), dev('SA1', 'panasonic.madln15sg'), dev('SM1', motor, brake ? { brake: 'yes' } : undefined)],
    wires: [
      w('AC1.R', 'SA1.L1'),
      w('AC1.S', 'SA1.L2'),
      w('AC1.T', 'SA1.L3'),
      w('AC1.R', 'SA1.L1C'),
      w('AC1.S', 'SA1.L2C'),
      w('AC1.PE', 'SA1.PE'),
      w('SA1.U', 'SM1.U'),
      w('SA1.V', 'SM1.V'),
      w('SA1.W', 'SM1.W'),
      w('SA1.PE', 'SM1.E'),
      w('SA1.X6', 'SM1.ENC', { wireType: 'CABLE' }),
    ],
  });

  it('サーボアンプとサーボモーターの動力・エンコーダの配線でエラーにならない', () => {
    const d = servo();
    expect(errorRules(d)).toEqual([]);
    expect(rules(d)).not.toContain('connector-unconnected');
  });

  it('エンコーダのコネクタは安川電機のサーボモーターとは合わない', () => {
    const d = servo('yaskawa.sgm7j');
    expect(errorRules(d)).toContain('connector-mismatch');
  });

  it('ブレーキ付きはブレーキの端子が DC24V（22.8〜25.2V）・0.36A', () => {
    const r = resolveDevice(def('panasonic.msmf022l1'), { brake: 'yes' });
    expect(r.terminal('B1')).toMatchObject({ role: 'input', loadCurrent: 0.36 });
    expect(r.terminal('B1')?.accepts).toMatchObject({ system: 'DC', minVoltage: 22.8, maxVoltage: 25.2 });
    expect(resolveDevice(def('panasonic.msmf022l1')).terminal('B1')).toBeUndefined();
  });

  it('X4 の入力はプラスコモン（COM+ に +24V）で、PNP 出力のセンサーをつなぐとエラー', () => {
    const d = servo();
    d.devices.push(dev('PSU1', 'generic.psu.dc24v'), dev('PH1', 'sick.w12', { output: 'P' }), dev('CB1', 'generic.m12-4p-cable'));
    d.wires.push(
      w('PSU1.+V1', 'SA1.COM+'),
      w('PH1.CN', 'CB1.CN', { wireType: 'CABLE' }),
      w('PSU1.+V2', 'CB1.BN'),
      w('PSU1.-V2', 'CB1.BU'),
      w('CB1.BK', 'SA1.POT'),
    );
    expect(errorRules(d)).toContain('signal-polarity');
  });
});

describe('FR-F820 の配線', () => {
  it('三相 200V を入れてモーターを回す配線でエラーにならない', () => {
    const d: Diagram = {
      devices: [dev('AC1', 'generic.power-source.3p200v'), dev('INV1', 'mitsubishi.fr-f820-0.75k'), dev('M1', 'generic.motor.3p')],
      wires: [w('AC1.R', 'INV1.R/L1'), w('AC1.S', 'INV1.S/L2'), w('AC1.T', 'INV1.T/L3'), w('AC1.PE', 'INV1.E'), w('INV1.U', 'M1.U'), w('INV1.V', 'M1.V'), w('INV1.W', 'M1.W')],
    };
    expect(errorRules(d)).toEqual([]);
  });
});
