/**
 * KEYENCE 以外のメーカーのセンサー（オムロン E3Z・E2E NEXT M12・E6B2-C、パナソニック CX-400・GX-F/H、SMC PF3W7、汎用フロートスイッチ）の
 * 機器定義の整合性と、PLC の入力へつないだときの電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { familyOf } from '../families';
import { getDeviceDefinition } from '../registry';
import { connectorsMate, resolveDevice } from '../resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from '../types';

const TYPES = [
  'omron.e3z.reflective',
  'omron.e3z.reflective.m8',
  'omron.e3z.emitter',
  'omron.e3z.emitter.m8',
  'omron.e3z.receiver',
  'omron.e3z.receiver.m8',
  'panasonic.cx-400.reflective',
  'panasonic.cx-400.emitter',
  'panasonic.cx-400.receiver',
  'panasonic.gx-f-h',
  'omron.e2e-x.m12',
  'omron.e6b2-cwz6c',
  'omron.e6b2-cwz1x',
  'smc.pf3w7',
  'generic.float-switch',
];

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

describe('センサー（KEYENCE 以外）の機器定義', () => {
  it('すべて登録されている', () => {
    for (const t of TYPES) expect(getDeviceDefinition(t), t).toBeDefined();
  });

  it.each(TYPES.map((t) => [t] as const))('%s: NPN / PNP の出力線には、0V / +V へ向かう出力の内部経路がある', (type) => {
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
        expect(links[0].switch).toBe('output');
        expect(links[0].ratedCurrent).toBeGreaterThan(0);
      }
    }
  });

  it('コネクタタイプは同じサイズのセンサーケーブルとつながる', () => {
    const cable = (kind: string) => resolveDevice(def(kind === 'M8-4' ? 'generic.m8-4p-cable' : 'generic.m12-4p-cable')).terminal('CN')!.connector!;
    for (const t of ['omron.e3z.reflective.m8', 'omron.e3z.emitter.m8', 'omron.e3z.receiver.m8', 'omron.e2e-x.m12']) {
      const cn = resolveDevice(def(t)).terminal('CN')!.connector!;
      expect(connectorsMate(cn, cable(cn.kind)), t).toBe(true);
    }
  });

  it('透過型の投光器は電源だけで出力を持たない', () => {
    for (const t of ['omron.e3z.emitter', 'omron.e3z.emitter.m8', 'panasonic.cx-400.emitter']) {
      const r = resolveDevice(def(t));
      expect(r.links, t).toEqual([]);
      expect([...r.terminals, ...r.pins].some((x) => x.signal?.dir === 'out'), t).toBe(false);
    }
  });

  it('型式（modelOf）は出力形式・種類で変わる', () => {
    const m = (t: string, p: ParamValues) => def(t).modelOf!(paramsWithDefaults(def(t), p));
    expect(m('omron.e3z.reflective', {})).toBe('E3Z-D61');
    expect(m('omron.e3z.reflective', { model: 'D62', output: 'P' })).toBe('E3Z-D82');
    expect(m('omron.e3z.reflective.m8', { model: 'D62', output: 'P' })).toBe('E3Z-D87');
    expect(m('omron.e3z.reflective.m8', { model: 'R61' })).toBe('E3Z-R66');
    expect(m('omron.e3z.receiver.m8', { output: 'P' })).toBe('E3Z-T86（受光器）');
    expect(m('panasonic.cx-400.reflective', { model: '491', output: 'P' })).toBe('CX-491-P');
    expect(m('panasonic.gx-f-h', { face: 'H', size: 12, contact: 'B', output: 'P' })).toBe('GX-H12B-P');
    expect(m('omron.e2e-x.m12', { size: 18, output: 'P' })).toBe('E2E-X8B1D18-M1');
    expect(m('omron.e6b2-cwz6c', { resolution: 600 })).toBe('E6B2-CWZ6C 600P/R 2M');
    expect(m('smc.pf3w7', { range: '40', port: '06', output: 'C' })).toBe('PF3W740-06-C-M');
  });

  it('PF3W7 の接続口径は流量レンジで選べるものが変わる', () => {
    const port = def('smc.pf3w7').params!.find((p) => p.key === 'port')!;
    expect(port.optionsFor!(paramsWithDefaults(def('smc.pf3w7'), { range: '11' })).map((o) => o.value)).toEqual(['06', '10']);
  });

  it('PF3W7 の白（OUT2）は出力仕様でスイッチ出力・アナログ出力に変わる', () => {
    const d = def('smc.pf3w7');
    expect(resolveDevice(d, { output: 'A' }).terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'npn' });
    expect(resolveDevice(d, { output: 'D' }).terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'analog-i', ref: 'BU' });
    expect(resolveDevice(d, { output: 'D' }).links.map((l) => l.from)).toEqual(['BK']);
    expect(resolveDevice(d, { output: 'B' }).links).toEqual([
      { from: 'BK', to: 'BN', switch: 'output', ratedCurrent: 0.08 },
      { from: 'WH', to: 'BN', switch: 'output', ratedCurrent: 0.08 },
    ]);
  });

  it('E6B2-CWZ1X はラインドライバの A・B・Z 相と反転出力を持ち、出力の内部経路はない', () => {
    const r = resolveDevice(def('omron.e6b2-cwz1x'));
    expect(r.terminals.filter((t) => t.signal?.kind === 'line-driver').map((t) => t.id)).toEqual(['BK', 'BKRD', 'WH', 'WHRD', 'OG', 'OGRD']);
    expect(r.links).toEqual([]);
    expect(resolveDevice(def('omron.e6b2-cwz6c')).links.map((l) => `${l.from}→${l.to}`)).toEqual(['BK→BU', 'WH→BU', 'OG→BU']);
  });

  it('パレットのファミリー: 光電センサ・近接センサ・流量センサに入る', () => {
    expect(familyOf('omron.e3z.reflective')?.name).toBe('光電センサ');
    expect(familyOf('panasonic.cx-400.emitter')?.name).toBe('光電センサ');
    expect(familyOf('panasonic.gx-f-h')?.name).toBe('近接センサ');
    expect(familyOf('omron.e2e-x.m12')?.name).toBe('近接センサ');
    expect(familyOf('smc.pf3w7')?.name).toBe('流量センサ');
    expect(familyOf('omron.e6b2-cwz1x')?.members.map((m) => m.type).sort()).toEqual(['omron.e6b2-cwz1x', 'omron.e6b2-cwz6c']);
  });
});

/* ------------------------------------------------------------------ */
/* KV の入力ユニットにつないだときのチェック                              */
/* ------------------------------------------------------------------ */

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
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

describe('センサー（KEYENCE 以外）→ KV 入力ユニットの配線チェック', () => {
  it('E3Z: NPN はプラスコモンで OK・マイナスコモンでエラー、PNP はその逆', () => {
    expect(errorRules(sensorToKv('omron.e3z.reflective', { output: 'N' }, 'BK', '+V1'))).toEqual([]);
    expect(errorRules(sensorToKv('omron.e3z.reflective', { output: 'N' }, 'BK', '-V1'))).toContain('signal-polarity');
    expect(errorRules(sensorToKv('omron.e3z.receiver', { output: 'P' }, 'BK', '-V1'))).toEqual([]);
    expect(errorRules(sensorToKv('omron.e3z.receiver', { output: 'P' }, 'BK', '+V1'))).toContain('signal-polarity');
  });

  it('CX-400・GX-F/H の PNP をプラスコモンにつなぐとエラー', () => {
    expect(errorRules(sensorToKv('panasonic.cx-400.reflective', { output: 'P' }, 'BK', '+V1'))).toContain('signal-polarity');
    expect(errorRules(sensorToKv('panasonic.gx-f-h', { output: 'P', contact: 'B' }, 'BK', '+V1'))).toContain('signal-polarity');
    expect(errorRules(sensorToKv('panasonic.gx-f-h', { output: 'N' }, 'BK', '+V1'))).toEqual([]);
  });

  it('E2E NEXT の M12 コネクタ品はセンサーケーブルの黒の芯線経由で入力につながる', () => {
    const base = (output: 'N' | 'P', com: '+V1' | '-V1'): Diagram => ({
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
        { id: 'PX1', type: 'omron.e2e-x.m12', x: 0, y: 0, params: { output } },
        { id: 'CBL1', type: 'generic.m12-4p-cable', x: 0, y: 0 },
      ],
      wires: [w('PX1.CN', 'CBL1.CN', { wireType: 'CABLE' }), w('PSU1.+V1', 'CBL1.BN'), w('PSU1.-V1', 'CBL1.BU'), w('CBL1.BK', 'IN1.0'), w(`PSU1.${com}`, 'IN1.C0')],
    });
    expect(errorRules(base('N', '+V1'))).toEqual([]);
    expect(errorRules(base('N', '-V1'))).toContain('signal-polarity');
    expect(errorRules(base('P', '-V1'))).toEqual([]);
  });

  it('E6B2-CWZ6C の A 相はプラスコモンの入力につなげ、CWZ1X（ラインドライバ）を DC 入力につなぐと注意が出る', () => {
    expect(errorRules(sensorToKv('omron.e6b2-cwz6c', {}, 'BK', '+V1'))).toEqual([]);
    expect(errorRules(sensorToKv('omron.e6b2-cwz6c', {}, 'BK', '-V1'))).toContain('signal-polarity');
    const ld = sensorToKv('omron.e6b2-cwz1x', {}, 'BK', '+V1');
    expect(rules(ld)).toContain('signal-kind');
    // CWZ1X の電源は DC5V。24V をつなぐと電圧のエラー
    expect(errorRules(ld)).toContain('voltage-mismatch');
  });

  it('PF3W7 のアナログ出力を DC 入力につなぐと注意、フロートスイッチの接点は入力につなげる', () => {
    expect(rules(sensorToKv('smc.pf3w7', { output: 'C' }, 'WH', '+V1'))).toContain('signal-kind');
    expect(errorRules(sensorToKv('smc.pf3w7', { output: 'A' }, 'WH', '+V1'))).toEqual([]);
    // フロートスイッチ: 片側を 0V、もう片側を入力（プラスコモン）
    const fl = sensorToKv('generic.float-switch', { contact: 'b' }, 'WH', '+V1', { plus: 'BK', minus: 'BK' });
    fl.wires.splice(0, 1);
    expect(errorRules(fl)).toEqual([]);
  });
});
