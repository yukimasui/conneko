/**
 * センサーの残り（#76: パナソニック EX-10/EX-20、オムロン D4C・ZC・E6B2-CWZ5B/CWZ3E・EE-SX67・E2E の DC 2 線式）と
 * 安全機器の残り（#80: IDEC HS5L・HE5B、オムロン D40Z・OS32C）の機器定義の整合性と、
 * PLC の入力・セーフティリレーなどにつないだときの電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { familyOf } from '../families';
import { getDeviceDefinition } from '../registry';
import { functionsOf, resolveDevice } from '../resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from '../types';
import { hasEstimates } from '../estimates';

const SENSORS = [
  'panasonic.ex.emitter',
  'panasonic.ex.receiver',
  'panasonic.ex.reflective',
  'omron.d4c',
  'omron.zc-55',
  'omron.e6b2-cwz5b',
  'omron.e6b2-cwz3e',
  'omron.ee-sx67',
  'omron.e2e-x-d1',
];
const SAFETY = ['idec.hs5l-vd7y4m-g', 'idec.he5b-m2pb', 'omron.d40z-1c5', 'omron.os32c'];

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

/** パラメータの全選択肢（1 つずつ変えたもの）と既定値 */
const variants = (d: DeviceDefinition): ParamValues[] => {
  const out = [paramsWithDefaults(d, {})];
  for (const p of d.params ?? []) for (const o of p.options) out.push(paramsWithDefaults(d, { [p.key]: o.value }));
  return out;
};

describe('追加したセンサー・安全機器の機器定義', () => {
  it.each([...SENSORS, ...SAFETY].map((t) => [t] as const))('%s が登録され、端子 ID が重複せず、内部経路の端子がある', (type) => {
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

  it.each(SENSORS.map((t) => [t] as const))('%s: NPN / PNP の出力線には、0V / +V へ向かう出力の内部経路がある', (type) => {
    const d = def(type);
    for (const v of variants(d)) {
      const r = resolveDevice(d, v);
      const all = [...r.terminals, ...r.pins];
      for (const t of all) {
        const s = t.signal;
        if (s?.dir !== 'out' || (s.kind !== 'npn' && s.kind !== 'pnp')) continue;
        const links = r.links.filter((l) => l.from === t.id);
        expect(links, `${t.id} ${JSON.stringify(v)}`).toHaveLength(1);
        const to = all.find((x) => x.id === links[0].to)!;
        const acc = Array.isArray(to.accepts) ? to.accepts[0] : to.accepts;
        expect(acc?.conductors, `${t.id} → ${to.id}`).toEqual([s.kind === 'npn' ? '-' : '+']);
        expect(links[0]).toMatchObject({ switch: 'output' });
        expect(links[0].ratedCurrent).toBeGreaterThan(0);
      }
    }
  });

  it('型式（modelOf）は種類・動作モード・出力形式で変わる', () => {
    const m = (t: string, p: ParamValues) => def(t).modelOf!(paramsWithDefaults(def(t), p));
    expect(m('panasonic.ex.reflective', {})).toBe('EX-14A');
    expect(m('panasonic.ex.reflective', { model: 'EX-28', mode: 'B', output: 'P' })).toBe('EX-28B-PN');
    expect(m('panasonic.ex.receiver', { model: 'EX-23', mode: 'B' })).toBe('EX-23（受光器）');
    expect(m('panasonic.ex.emitter', { model: 'EX-11E' })).toBe('EX-11EA（投光器）');
    expect(m('omron.d4c', { actuator: '20' })).toBe('D4C-1220');
    expect(m('omron.zc-55', { actuator: 'Q55' })).toBe('ZC-Q55');
    expect(m('omron.e6b2-cwz5b', { resolution: 1000 })).toBe('E6B2-CWZ5B 1000P/R 2M');
    expect(m('omron.e6b2-cwz3e', {})).toBe('E6B2-CWZ3E 360P/R 2M');
    expect(m('omron.ee-sx67', { model: '672' })).toBe('EE-SX672 + EE-1006 2M');
    expect(m('omron.e2e-x-d1', { size: 18 })).toBe('E2E-X7D1-N 2M');
  });

  it('EX の消費電流は種類で変わり、EX-23 には動作モードの選択がない', () => {
    const d = def('panasonic.ex.reflective');
    const lc = d.loadCurrent as (p: ParamValues) => number;
    expect(lc(paramsWithDefaults(d, { model: 'EX-14' }))).toBe(0.013);
    expect(lc(paramsWithDefaults(d, { model: 'EX-28' }))).toBe(0.015);
    const rc = def('panasonic.ex.receiver');
    const mode = rc.params!.find((p) => p.key === 'mode')!;
    expect(mode.relevant!(paramsWithDefaults(rc, { model: 'EX-23' }))).toBe(false);
    expect(mode.relevant!(paramsWithDefaults(rc, { model: 'EX-21' }))).toBe(true);
  });

  it('E6B2 の 4 つの出力形式は同じファミリーで、端子 ID がそろっている', () => {
    const family = familyOf('omron.e6b2-cwz5b')!;
    expect(family.members.map((m) => m.type).sort()).toEqual(['omron.e6b2-cwz1x', 'omron.e6b2-cwz3e', 'omron.e6b2-cwz5b', 'omron.e6b2-cwz6c']);
    const ids = (t: string) => resolveDevice(def(t)).terminals.map((x) => x.id);
    expect(ids('omron.e6b2-cwz5b')).toEqual(ids('omron.e6b2-cwz6c'));
    expect(ids('omron.e6b2-cwz3e')).toEqual(ids('omron.e6b2-cwz6c'));
    expect(resolveDevice(def('omron.e6b2-cwz5b')).links.map((l) => `${l.from}→${l.to}`)).toEqual(['BK→BN', 'WH→BN', 'OG→BN']);
  });

  it('E2E の DC 2 線式は茶・青の 2 本とも 2 線式の出力で、漏れ電流・残留電圧を持つ', () => {
    const r = resolveDevice(def('omron.e2e-x-d1'));
    for (const id of ['BN', 'BU']) expect(r.terminal(id)?.signal).toMatchObject({ dir: 'out', kind: '2wire', leakCurrent: 0.8, residualVoltage: 3 });
    expect(r.links).toEqual([{ from: 'BN', to: 'BU', switch: 'output', ratedCurrent: 0.1 }]);
  });

  it('リミットスイッチ D4C・ZC は COM-NC が b 接点、COM-NO が a 接点（直接開路ではない）', () => {
    for (const t of ['omron.d4c', 'omron.zc-55']) {
      const links = resolveDevice(def(t)).links;
      expect(links.find((l) => l.to === 'NC')).toMatchObject({ from: 'COM', switch: 'NC' });
      expect(links.find((l) => l.to === 'NO')).toMatchObject({ from: 'COM', switch: 'NO' });
      expect(links.some((l) => l.directOpening)).toBe(false);
    }
  });

  it('パレットのファミリー: 既存のファミリーに入る', () => {
    expect(familyOf('panasonic.ex.emitter')?.name).toBe('光電センサ');
    expect(familyOf('omron.ee-sx67')?.name).toBe('光電センサ');
    expect(familyOf('omron.e2e-x-d1')?.name).toBe('近接センサ');
    expect(familyOf('omron.d4c')?.name).toBe('リミットスイッチ');
    expect(familyOf('omron.zc-55')?.name).toBe('リミットスイッチ');
    expect(familyOf('idec.hs5l-vd7y4m-g')?.name).toBe('セーフティインタロックスイッチ');
    expect(familyOf('omron.d40z-1c5')?.name).toBe('セーフティインタロックスイッチ');
    expect(familyOf('idec.he5b-m2pb')?.name).toBe('イネーブルスイッチ');
    expect(familyOf('omron.os32c')?.name).toBe('セーフティレーザスキャナ');
  });

  it('安全機器: b 接点は直接開路、イネーブル接点は直接開路の a 接点、OSSD は電源出力でチャンネルの組がある', () => {
    for (const l of resolveDevice(def('idec.hs5l-vd7y4m-g')).links) expect(l).toMatchObject({ switch: 'NC', directOpening: true });
    for (const l of resolveDevice(def('idec.he5b-m2pb')).links) expect(l).toMatchObject({ switch: 'NO', directOpening: true });
    const os = resolveDevice(def('omron.os32c'));
    for (const id of ['OSSDA', 'OSSDB']) {
      const t = os.terminal(id)!;
      expect(t.role).toBe('supply');
      expect(t.supply).toMatchObject({ system: 'DC', voltage: 24, conductor: '+', kind: 'ossd' });
      expect(functionsOf(t)).toContain('ossd');
    }
    expect(os.safetyChannels.map((g) => g.channels.map((c) => c.output))).toEqual([['OSSDA', 'OSSDB']]);
    expect(functionsOf(os.terminal('EDM')!)).toContain('edm');
    // HS5L はソレノイドロック（通電で施錠）。+ 側だけに機能を付ける
    expect(resolveDevice(def('idec.hs5l-vd7y4m-g')).terminals.filter((t) => functionsOf(t).includes('lock-solenoid')).map((t) => t.id)).toEqual(['A2']);
    for (const t of SAFETY) expect(def(t).safety, t).toBeDefined();
  });

  it('推定を含む機器は estimated を持つ', () => {
    for (const t of ['panasonic.ex.reflective', 'omron.d4c', 'omron.zc-55', 'omron.e6b2-cwz5b', 'omron.e6b2-cwz3e', 'omron.ee-sx67', 'omron.e2e-x-d1', ...SAFETY]) {
      expect(hasEstimates(def(t)), t).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* PLC の入力につないだときのチェック                                    */
/* ------------------------------------------------------------------ */

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ...ft] = from.split('.');
  const [td, ...tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft.join('.') }, to: { device: td, terminal: tt.join('.') }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const issues = (d: Diagram) => checkDiagram(d, getDeviceDefinition);
const errorRules = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);
const rules = (d: Diagram) => issues(d).map((i) => i.rule);

/** センサー（電源と出力）と KV-B16XC の入力 0、入力の COM の配線 */
function sensorToKv(type: string, params: ParamValues, out: string, com: '+V1' | '-V1', power = { plus: 'BN', minus: 'BU' }): Diagram {
  return {
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      { id: 'S1', type, x: 0, y: 0, params },
    ],
    wires: [w('PSU1.+V1', `S1.${power.plus}`), w('PSU1.-V1', `S1.${power.minus}`), w(`S1.${out}`, 'IN1.0'), w(`PSU1.${com}`, 'IN1.C0')],
  };
}

describe('追加したセンサー → PLC 入力の配線チェック', () => {
  it('EX-10/EX-20: NPN はプラスコモンで OK、PNP をプラスコモンにつなぐとエラー', () => {
    expect(errorRules(sensorToKv('panasonic.ex.receiver', { output: 'N' }, 'BK', '+V1'))).toEqual([]);
    expect(errorRules(sensorToKv('panasonic.ex.reflective', { output: 'N' }, 'BK', '-V1'))).toContain('signal-polarity');
    expect(errorRules(sensorToKv('panasonic.ex.reflective', { output: 'P', model: 'EX-28' }, 'BK', '-V1'))).toEqual([]);
    expect(errorRules(sensorToKv('panasonic.ex.receiver', { output: 'P' }, 'BK', '+V1'))).toContain('signal-polarity');
  });

  it('E6B2-CWZ5B（PNP）はマイナスコモンで OK・プラスコモンでエラー、CWZ3E（DC5〜12V）に 24V をつなぐとエラー', () => {
    expect(errorRules(sensorToKv('omron.e6b2-cwz5b', {}, 'BK', '-V1'))).toEqual([]);
    expect(errorRules(sensorToKv('omron.e6b2-cwz5b', {}, 'BK', '+V1'))).toContain('signal-polarity');
    expect(errorRules(sensorToKv('omron.e6b2-cwz3e', {}, 'BK', '+V1'))).toContain('voltage-mismatch');
  });

  it('EE-SX67: NPN をプラスコモンの入力へ。L（桃）は + に短絡でき、0V につなぐとエラー', () => {
    const ok = sensorToKv('omron.ee-sx67', {}, 'BK', '+V1');
    expect(errorRules(ok)).toEqual([]);
    ok.wires.push(w('PSU1.+V2', 'S1.PK'));
    expect(errorRules(ok)).toEqual([]);
    const ng = sensorToKv('omron.ee-sx67', {}, 'BK', '+V1');
    ng.wires.push(w('PSU1.-V2', 'S1.PK'));
    expect(errorRules(ng).length).toBeGreaterThan(0);
    expect(errorRules(sensorToKv('omron.ee-sx67', {}, 'BK', '-V1'))).toContain('signal-polarity');
  });

  it('D4C・ZC の接点: COM を +24V、NO を入力（プラスコモンでない入力 = マイナスコモン）へつなげる', () => {
    for (const type of ['omron.d4c', 'omron.zc-55']) {
      const d = sensorToKv(type, {}, 'NO', '-V1', { plus: 'COM', minus: 'COM' });
      d.wires.splice(1, 1);
      expect(errorRules(d), type).toEqual([]);
    }
  });

  /** E2E の DC 2 線式を、入力ユニットの入力点と電源の間に直列に入れる（マイナスコモン: 茶 → +24V、青 → 入力） */
  it('E2E DC 2 線式: マイナスコモンなら 茶を +24V・青を入力へ。両端を同じ極にすると注意、電源に直結するとエラー', () => {
    const ok: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
        { id: 'PX1', type: 'omron.e2e-x-d1', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'PX1.BN'), w('PX1.BU', 'IN1.0'), w('PSU1.-V1', 'IN1.C0')],
    };
    expect(rules(ok).filter((r) => r.startsWith('two-wire'))).toEqual([]);
    expect(errorRules(ok)).toEqual([]);
    const same: Diagram = { ...ok, wires: [w('PSU1.-V2', 'PX1.BN'), w('PX1.BU', 'IN1.0'), w('PSU1.-V1', 'IN1.C0')] };
    expect(rules(same)).toContain('two-wire');
    const direct: Diagram = { ...ok, wires: [w('PSU1.+V1', 'PX1.BN'), w('PSU1.-V1', 'PX1.BU')] };
    // 入力回路を通さずに電源へ直結すると、検出したときに +24V と 0V が短絡する
    expect(errorRules(direct)).toContain('short-circuit');
  });

  it('E2E DC 2 線式を 2 線式を使えない入力（KV-C64XC）につなぐと two-wire-input の注意', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-c64xc', x: 0, y: 0 },
        { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
        { id: 'PX1', type: 'omron.e2e-x-d1', x: 0, y: 0 },
      ],
      // CN1 のピン 1 = 入力 R000、ピン 33 = そのコモン（0V につないでマイナスコモン）
      wires: [w('IN1.CN1', 'TB1.CN', { wireType: 'CABLE' }), w('PSU1.-V1', 'TB1.33'), w('PSU1.+V1', 'PX1.BN'), w('PX1.BU', 'TB1.1')],
    };
    const found = issues(d).filter((i) => i.rule === 'two-wire-input');
    expect(found.map((i) => i.message).join()).toMatch(/2線式センサーを使えない入力/);
  });
});

/* ------------------------------------------------------------------ */
/* 安全回路のチェック                                                    */
/* ------------------------------------------------------------------ */

describe('追加した安全機器 → セーフティリレー・接触器の配線チェック', () => {
  /** G9SE-201 の 2 チャンネル入力に、スイッチの接点を 1 回路ずつ入れ、13-14・23-24 で接触器 2 台を駆動する（EDM 付き） */
  const g9se = (devices: Diagram['devices'], ch1: string[], ch2: string[], extra: DiagramWire[] = []): Diagram => {
    const loop = (src: string, dst: string, path: string[]) => {
      const out: DiagramWire[] = [];
      let prev = src;
      for (let i = 0; i < path.length; i += 2) {
        out.push(w(prev, path[i]));
        prev = path[i + 1];
      }
      out.push(w(prev, dst));
      return out;
    };
    return {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SR1', type: 'omron.g9se-201', x: 0, y: 0 },
        { id: 'MC1', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
        { id: 'MC2', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
        ...devices,
      ],
      wires: [
        w('PSU1.+V1', 'SR1.A1'),
        w('PSU1.-V1', 'SR1.A2'),
        ...loop('SR1.T11', 'SR1.T12', ch1),
        ...loop('SR1.T21', 'SR1.T22', ch2),
        w('SR1.T31', 'MC1.21'),
        w('MC1.22', 'MC2.21'),
        w('MC2.22', 'SR1.T32'),
        w('PSU1.+V2', 'SR1.T33'),
        w('SR1.T33', 'SR1.13'),
        w('SR1.14', 'MC1.A1'),
        w('SR1.13', 'SR1.23'),
        w('SR1.24', 'MC2.A1'),
        w('MC1.A2', 'PSU1.-V2'),
        w('MC2.A2', 'PSU1.-V2'),
        ...extra,
      ],
    };
  };
  const safetyRules = (d: Diagram) => issues(d).filter((i) => i.severity !== 'info').map((i) => i.rule);

  it('HS5L: 扉監視とロック監視を直列にして 2 チャンネルに入れると誤検出しない（ソレノイドは電源から施錠）', () => {
    const d = g9se(
      [{ id: 'DS1', type: 'idec.hs5l-vd7y4m-g', x: 0, y: 0 }],
      ['DS1.11', 'DS1.12', 'DS1.41', 'DS1.42'],
      ['DS1.21', 'DS1.22', 'DS1.51', 'DS1.52'],
      [w('PSU1.+V2', 'DS1.A2'), w('PSU1.-V2', 'DS1.A1')],
    );
    expect(errorRules(d)).toEqual([]);
    expect(safetyRules(d).filter((r) => /estop|direct|safety-|lock-power/.test(r))).toEqual([]);
    expect(rules(d)).not.toContain('no-power');
  });

  it('HS5L: 2 つのチャンネルで同じ接点を使うと検出する', () => {
    const d = g9se(
      [{ id: 'DS1', type: 'idec.hs5l-vd7y4m-g', x: 0, y: 0 }],
      ['DS1.11', 'DS1.12'],
      ['DS1.12', 'DS1.11'],
    );
    expect(rules(d)).toContain('safety-channel-cross');
  });

  it('HE5B: イネーブル接点（直接開路の a 接点）を 2 チャンネルに入れても a 接点の指摘にならない', () => {
    const d = g9se([{ id: 'EN1', type: 'idec.he5b-m2pb', x: 0, y: 0 }], ['EN1.C1', 'EN1.NO1'], ['EN1.C2', 'EN1.NO2']);
    expect(errorRules(d)).toEqual([]);
    expect(rules(d)).not.toContain('estop-not-nc');
  });

  it('リミットスイッチ D4C を安全入力に使うと、b 接点は直接開路でない注意、a 接点は a 接点の指摘', () => {
    const nc = g9se(
      [
        { id: 'LS1', type: 'omron.d4c', x: 0, y: 0 },
        { id: 'LS2', type: 'omron.zc-55', x: 0, y: 0 },
      ],
      ['LS1.COM', 'LS1.NC'],
      ['LS2.COM', 'LS2.NC'],
    );
    expect(rules(nc)).toContain('not-direct-opening');
    const no = g9se(
      [
        { id: 'LS1', type: 'omron.d4c', x: 0, y: 0 },
        { id: 'LS2', type: 'omron.zc-55', x: 0, y: 0 },
      ],
      ['LS1.COM', 'LS1.NO'],
      ['LS2.COM', 'LS2.NC'],
    );
    expect(rules(no)).toContain('estop-not-nc');
  });

  it('D40Z を G9SX-NS の D1〜D4 につないで 2 台直列にしても誤検出しない', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SR1', type: 'omron.g9sx-ns202-rt', x: 0, y: 0 },
        { id: 'DS1', type: 'omron.d40z-1c5', x: 0, y: 0 },
        { id: 'DS2', type: 'omron.d40z-1c5', x: 0, y: 0 },
      ],
      wires: [
        w('PSU1.+V1', 'SR1.A1'),
        w('PSU1.-V1', 'SR1.A2'),
        w('SR1.D3', 'DS1.+'),
        w('SR1.D4', 'DS1.-'),
        w('SR1.D3', 'DS2.+'),
        w('SR1.D4', 'DS2.-'),
        w('SR1.D1', 'DS1.IN'),
        w('DS1.OUT', 'DS2.IN'),
        w('DS2.OUT', 'SR1.D2'),
      ],
    };
    expect(errorRules(d)).toEqual([]);
    expect(rules(d)).not.toContain('no-power');
  });

  /** OS32C の OSSD A/B で接触器 2 台を直接駆動し、EDM をミラー接点経由で戻す */
  const os32c = (edm: boolean): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'LS1', type: 'omron.os32c', x: 0, y: 0 },
      { id: 'MC1', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
      { id: 'MC2', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
    ],
    wires: [
      w('PSU1.+V1', 'LS1.+24V'),
      w('PSU1.-V1', 'LS1.0V'),
      w('LS1.OSSDA', 'MC1.A1'),
      w('LS1.OSSDB', 'MC2.A1'),
      w('MC1.A2', 'PSU1.-V2'),
      w('MC2.A2', 'PSU1.-V2'),
      ...(edm ? [w('LS1.EDM', 'MC1.21'), w('MC1.22', 'MC2.21'), w('MC2.22', 'PSU1.+V2')] : []),
    ],
  });

  it('OS32C: OSSD で接触器 2 台を駆動し EDM を戻すと誤検出しない。EDM を配線しないと注意', () => {
    const ok = os32c(true);
    expect(errorRules(ok)).toEqual([]);
    expect(rules(ok)).not.toContain('no-power');
    expect(rules(ok)).not.toContain('edm-missing');
    expect(rules(os32c(false))).toContain('edm-missing');
  });

  it('OS32C: OSSD を 0V に短絡すると短絡として検出する', () => {
    const d = os32c(true);
    d.wires.push(w('LS1.OSSDA', 'PSU1.-V2'));
    expect(errorRules(d).some((r) => r === 'short-circuit' || r === 'ossd-short')).toBe(true);
  });

  it('OS32C の OSSD を G9SE の安全入力（OSSD 入力）につなげ、要求 PL e の図面では PL d を注意する', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SR1', type: 'omron.g9se-201', x: 0, y: 0 },
        { id: 'LS1', type: 'omron.os32c', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'SR1.A1'), w('PSU1.-V1', 'SR1.A2'), w('PSU1.+V2', 'LS1.+24V'), w('PSU1.-V2', 'LS1.0V'), w('LS1.OSSDA', 'SR1.T12'), w('LS1.OSSDB', 'SR1.T22')],
      settings: { requiredPL: 'e' },
    };
    expect(errorRules(d)).toEqual([]);
    expect(rules(d)).toContain('safety-rating');
  });
});
