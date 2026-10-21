/**
 * KEYENCE 光電センサ（PZ-G・PR-G・PZ-V/M・PR-M/F・LR-Z/W/T/X・アンプ類）の機器定義の整合性と、
 * KV の入力ユニットへつないだときの電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import { busAccepts, computeBus } from '../../model/bus';
import type { Diagram, DiagramDevice, DiagramWire } from '../../model/diagram';
import { deviceDefinitions, getDeviceDefinition } from '../registry';
import { connectorsMate, resolveDevice } from '../resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from '../types';

const PHOTO_PREFIXES = [
  'keyence.pz-g.',
  'keyence.pr-g.',
  'keyence.pz-m.',
  'keyence.pr-mf.',
  'keyence.lr-z',
  'keyence.lr-w',
  'keyence.lr-t',
  'keyence.lr-x',
  'keyence.ps-n',
  'keyence.lv-n',
  'keyence.fs-n',
  'keyence.px-10',
  'keyence.cz-v2',
];
const photo = deviceDefinitions.filter((d) => PHOTO_PREFIXES.some((p) => d.type.startsWith(p)));

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

describe('KEYENCE 光電センサの機器定義', () => {
  it('シリーズごとの機器がそろっている', () => {
    const count = (prefix: string) => photo.filter((d) => d.type.startsWith(prefix)).length;
    expect(count('keyence.pz-g.')).toBe(15);
    expect(count('keyence.pr-g.')).toBe(6);
    expect(count('keyence.pz-m.')).toBe(9);
    expect(count('keyence.pr-mf.')).toBe(6);
    expect(photo.length).toBeGreaterThan(60);
  });

  it.each(photo.map((d) => [d.type, d] as const))('%s: 出力線には NPN/PNP に合った出力の内部経路がある', (_, d) => {
    for (const v of variants(d)) {
      const r = resolveDevice(d, v);
      const all = [...r.terminals, ...r.pins];
      const hasPower = all.some((t) => t.role === 'input' && t.accepts);
      for (const t of all) {
        const s = t.signal;
        if (s?.dir !== 'out' || (s.kind !== 'npn' && s.kind !== 'pnp')) continue;
        const links = r.links.filter((l) => l.from === t.id);
        if (!hasPower) {
          // 電源線のない子機は基準側がないので経路を持たない
          expect(links, `${t.id}`).toEqual([]);
          continue;
        }
        expect(links, `${t.id} ${JSON.stringify(v)}`).toHaveLength(1);
        const to = all.find((x) => x.id === links[0].to)!;
        const acc = Array.isArray(to.accepts) ? to.accepts[0] : to.accepts;
        // NPN は 0V（'-'）へ、PNP は +V（'+'）へ
        expect(acc?.conductors, `${t.id} → ${to.id}`).toEqual([s.kind === 'npn' ? '-' : '+']);
        expect(links[0].switch).toBe('output');
        expect(links[0].ratedCurrent).toBeGreaterThan(0);
      }
      // 出力の内部経路の from はすべて出力線
      for (const l of r.links) expect(all.find((x) => x.id === l.from)?.signal?.dir, `${l.from}`).toBe('out');
    }
  });

  it('コネクタタイプは 4 ピンの丸形コネクタで、同じサイズのセンサーケーブルとつながる', () => {
    const m8 = resolveDevice(def('generic.m8-4p-cable')).terminal('CN')!.connector!;
    const m12 = resolveDevice(def('generic.m12-4p-cable')).terminal('CN')!.connector!;
    let n = 0;
    for (const d of photo) {
      const cn = resolveDevice(d).terminal('CN');
      if (!cn) continue;
      n++;
      expect(cn.connector?.style, d.type).toBe('round');
      expect(cn.connector?.pins).toBe(4);
      const cable = cn.connector!.kind === 'M8-4' ? m8 : m12;
      expect(connectorsMate(cn.connector!, cable), d.type).toBe(true);
    }
    expect(n).toBeGreaterThan(20);
  });

  it('透過型の投光器は電源だけで出力を持たない', () => {
    for (const d of photo.filter((x) => x.type.includes('.emitter'))) {
      const r = resolveDevice(d);
      expect(r.links, d.type).toEqual([]);
      expect([...r.terminals, ...r.pins].some((t) => t.signal?.dir === 'out'), d.type).toBe(false);
    }
  });

  it('PZ-G の角型は出力形式で NPN/PNP、ナット型は黒 = PNP・白 = NPN の 2 出力', () => {
    const sq = def('keyence.pz-g.reflective.m8');
    expect(resolveDevice(sq).links).toEqual([{ from: 'CN#4', to: 'CN#3', switch: 'output', ratedCurrent: 0.1 }]);
    expect(resolveDevice(sq, { output: 'P' }).links).toEqual([{ from: 'CN#4', to: 'CN#1', switch: 'output', ratedCurrent: 0.1 }]);
    const nut = resolveDevice(def('keyence.pz-g.nut.receiver'));
    expect(nut.terminal('BK')?.signal).toEqual({ dir: 'out', kind: 'pnp' });
    expect(nut.terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'npn' });
    expect(resolveDevice(def('keyence.pz-g.nut.reflective.m12')).pin('CN#2')?.signal).toEqual({ dir: 'out', kind: 'npn' });
  });

  it('PZ-M の桃（出力動作の切換）は +V・0V のどちらにもつなげる受電端子', () => {
    const r = resolveDevice(def('keyence.pz-m.reflective'));
    const pk = r.terminal('PK')!;
    expect(pk.role).toBe('input');
    expect(r.accepts.get('PK')?.[0].conductors).toEqual(['+', '-']);
    expect(resolveDevice(def('keyence.pz-m.reflective.m12')).pin('CN#2')?.role).toBe('input');
  });

  it('LR-T は初期設定（io）で黒・白の機能が変わり、TB5000 のアナログは電流 / 電圧を選べる', () => {
    const d = def('keyence.lr-t');
    const a = resolveDevice(d, { io: 'in-out1', output: 'P' });
    expect(a.terminal('BK')?.signal).toEqual({ dir: 'in', kind: 'dc', commonPolarity: '-' });
    expect(a.links).toEqual([{ from: 'WH', to: 'BN', switch: 'output', ratedCurrent: 0.05 }]);
    const b = resolveDevice(d, { model: 'TB5000', io: 'out-analog', analog: 'V' });
    expect(b.terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'analog-v' });
    expect(b.links.map((l) => l.from)).toEqual(['BK']);
  });

  it('LR-X / LR-XN11C の白線（ピン 2）は出力2 と外部入力を切り換える', () => {
    expect(resolveDevice(def('keyence.lr-x'), { pin2: 'in' }).terminal('WH')?.signal?.dir).toBe('in');
    expect(resolveDevice(def('keyence.lr-xn11.m8'), { pin2: 'out' }).links.map((l) => l.from).sort()).toEqual(['CN#2', 'CN#4']);
  });

  it('アンプの子機は親機に装着でき、台数の上限を超えると指摘される', () => {
    const pairs: [string, string, number][] = [
      ['keyence.fs-n41', 'keyence.fs-n42', 16],
      ['keyence.fs-n43', 'keyence.fs-n44', 16],
      ['keyence.ps-n11', 'keyence.ps-n12', 16],
      ['keyence.lv-n11', 'keyence.lv-n12', 16],
      ['keyence.lr-xn11', 'keyence.lr-xn12', 8],
      ['keyence.cz-v21a', 'keyence.cz-v22a', 3],
    ];
    for (const [host, unit, slots] of pairs) {
      expect(busAccepts(def(host), def(unit)), `${host} ← ${unit}`).toBe(true);
      const devices: DiagramDevice[] = [
        { id: 'H', type: host, x: 0, y: 0 },
        ...Array.from({ length: slots + 1 }, (_, i) => ({ id: `U${i}`, type: unit, x: 0, y: 0, mount: { device: 'H', slot: i + 1 } })),
      ];
      expect(computeBus(devices, getDeviceDefinition).problems.map((p) => p.rule), host).toContain('mount-slot-over');
    }
    expect(busAccepts(def('keyence.fs-n41'), def('keyence.ps-n12'))).toBe(false);
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
const lookup = (t: string) => getDeviceDefinition(t);
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorRules = (d: Diagram) => issues(d).filter((i) => i.severity === 'error').map((i) => i.rule);

/** センサー（電源と出力）と KV-B16XC の入力 0、入力の COM の配線 */
function sensorToKv(type: string, params: ParamValues, out: string, com: '+V1' | '-V1', power = { plus: 'BN', minus: 'BU' }): Diagram {
  return {
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      { id: 'PH1', type, x: 0, y: 0, params },
    ],
    wires: [w('PSU1.+V1', `PH1.${power.plus}`), w('PSU1.-V1', `PH1.${power.minus}`), w(`PH1.${out}`, 'IN1.0'), w(`PSU1.${com}`, 'IN1.C0')],
  };
}

describe('KEYENCE 光電センサ → KV 入力ユニットの配線チェック', () => {
  it('NPN の受光器をプラスコモン（COM = +24V）の入力につなぐとエラーなし', () => {
    const d = sensorToKv('keyence.pz-g.receiver', { model: '52', output: 'N' }, 'BK', '+V1');
    expect(errorRules(d)).toEqual([]);
    expect(issues(d).filter((i) => i.devices.includes('PH1')).map((i) => i.rule)).not.toContain('no-power');
  });

  it('NPN の出力をマイナスコモン（COM = 0V）の入力につなぐと signal-polarity エラー', () => {
    const d = sensorToKv('keyence.pz-g.receiver', { model: '52', output: 'N' }, 'BK', '-V1');
    expect(errorRules(d)).toContain('signal-polarity');
  });

  it('PNP はマイナスコモンなら OK、プラスコモンならエラー', () => {
    expect(errorRules(sensorToKv('keyence.pr-g.reflective', { model: '41', output: 'P' }, 'WH', '-V1'))).toEqual([]);
    expect(errorRules(sensorToKv('keyence.pr-g.reflective', { model: '41', output: 'P' }, 'WH', '+V1'))).toContain('signal-polarity');
  });

  it('ナット型（Bipolar）は白（NPN）をプラスコモン、黒（PNP）をマイナスコモンにつなぐ', () => {
    expect(errorRules(sensorToKv('keyence.pz-g.nut.reflective', {}, 'WH', '+V1'))).toEqual([]);
    expect(errorRules(sensorToKv('keyence.pz-g.nut.reflective', {}, 'BK', '-V1'))).toEqual([]);
    expect(errorRules(sensorToKv('keyence.pz-g.nut.reflective', {}, 'BK', '+V1'))).toContain('signal-polarity');
  });

  it('M8 コネクタのセンサーはセンサーケーブルの芯線（黒）経由で入力につながる', () => {
    const base = (com: '+V1' | '-V1'): Diagram => ({
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
        { id: 'PH1', type: 'keyence.lr-z.m8', x: 0, y: 0, params: { model: 'ZH500', output: 'N' } },
        { id: 'CBL1', type: 'generic.m8-4p-cable', x: 0, y: 0 },
      ],
      wires: [
        w('PH1.CN', 'CBL1.CN', { wireType: 'CABLE' }),
        w('PSU1.+V1', 'CBL1.BN'),
        w('PSU1.-V1', 'CBL1.BU'),
        w('CBL1.BK', 'IN1.0'),
        w(`PSU1.${com}`, 'IN1.C0'),
      ],
    });
    expect(errorRules(base('+V1'))).toEqual([]);
    expect(errorRules(base('-V1'))).toContain('signal-polarity');
  });

  it('PZ-M の桃を +V につなぐとエラーなし、電源を逆につなぐと極性エラー', () => {
    const d = sensorToKv('keyence.pz-m.reflective', { model: 'M31' }, 'BK', '+V1');
    d.wires.push(w('PSU1.+V2', 'PH1.PK'));
    expect(errorRules(d)).toEqual([]);
    d.wires[0] = w('PSU1.-V2', 'PH1.BN');
    expect(errorRules(d)).toContain('conductor-mismatch');
  });

  it('アンプの子機（電源線なし）の出力も NPN / PNP とコモンの相性がチェックされる', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
        { id: 'FS1', type: 'keyence.fs-n41', x: 0, y: 0 },
        { id: 'FS2', type: 'keyence.fs-n42', x: 0, y: 0, params: { output: 'N' }, mount: { device: 'FS1', slot: 1 } },
      ],
      wires: [w('PSU1.+V1', 'FS1.BN'), w('PSU1.-V1', 'FS1.BU'), w('FS2.BK', 'IN1.0'), w('PSU1.-V2', 'IN1.C0')],
    };
    expect(errorRules(d)).toContain('signal-polarity');
    d.wires[3] = w('PSU1.+V2', 'IN1.C0');
    expect(errorRules(d)).toEqual([]);
  });
});
