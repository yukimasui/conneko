/**
 * IAI（アイエイアイ）のコントローラー・ケーブルの機器定義の整合性と、代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramWire } from '../model/diagram';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from './types';
import { paramVariants, validateDefinition } from './validate';

const iai = deviceDefinitions.filter((d) => d.maker === 'IAI');

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

describe('IAI 機器定義', () => {
  it('type が一意で iai. で始まる', () => {
    expect(iai.length).toBeGreaterThan(0);
    const types = iai.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    for (const t of types) expect(t.startsWith('iai.')).toBe(true);
  });

  it.each(iai.map((d) => [d.type, d] as const))('%s: すべてのパラメーターの組で定義が整合している', (_, d) => {
    for (const v of paramVariants(d)) expect(validateDefinition(d, v), JSON.stringify(v)).toEqual([]);
  });

  it.each(iai.map((d) => [d.type, d] as const))('%s: コネクターのピンはすべて定義され、通信ポートには protocols がある', (_, d) => {
    for (const v of paramVariants(d)) {
      const r = resolveDevice(d, v);
      for (const t of r.terminals) {
        if (!t.connector) continue;
        if (t.connector.pins > 0) {
          const n = r.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length;
          expect(n, `${JSON.stringify(v)} ${t.id} のピン数`).toBe(t.connector.pins);
        }
        if (t.connector.kind === 'RJ45') expect(t.connector.protocols?.length, `${t.id} の protocols`).toBeGreaterThan(0);
      }
    }
  });

  it.each(iai.map((d) => [d.type, d] as const))('%s: 出力点から出る内部経路はすべて switch: output', (_, d) => {
    for (const v of paramVariants(d)) {
      const r = resolveDevice(d, v);
      for (const l of r.links) {
        const from = r.terminal(l.from) ?? r.pin(l.from);
        if (from?.signal?.dir === 'out' && from.signal.kind !== 'line-driver') expect(l.switch, `${l.from}`).toBe('output');
      }
    }
  });
});

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const cable = (from: string, to: string) => w(from, to, { wireType: 'CABLE' });
const lookup = (t: string) => getDeviceDefinition(t);
const errorsOf = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.severity === 'error');
const rulesOf = (d: Diagram) => checkDiagram(d, lookup).map((i) => i.rule);

describe('PCON-CB の PIO と PLC の出力', () => {
  /**
   * KEYENCE KV-C32TC（NPN 出力）→ MIL 34極 変換端子台 → PIO ケーブル CB-PAC-PIO のバラ線 → PCON-CB の PIO。
   * KV-C32TC の No.1（MIL 標準ピン 1 = 端子台 1）を PCON の IN0（5A）へ、COM0（No.17 = 標準ピン 33）を 0V へ。
   */
  const base = (pcon: ParamValues = {}): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0 },
      { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      { id: 'CBL1', type: 'iai.cb-pac-pio', x: 0, y: 0 },
      { id: 'PCON1', type: 'iai.pcon-cb', x: 0, y: 0, params: pcon },
    ],
    wires: [
      cable('OUT1.CN1', 'TB1.CN'),
      cable('PCON1.PIO', 'CBL1.CN'),
      w('PSU1.-V1', 'TB1.33'),
      // PLC の出力 R200 → PCON の IN0（PC1）
      w('TB1.1', 'CBL1.5A'),
      // PIO の I/O 電源
      w('PSU1.+V1', 'CBL1.1A'),
      w('PSU1.-V1', 'CBL1.19B'),
      // PCON の制御電源・非常停止
      w('PSU1.+V2', 'PCON1.24V'),
      w('PSU1.-V2', 'PCON1.0V'),
      w('PCON1.MPO', 'PCON1.MPI'),
      w('PSU1.+V2', 'PCON1.EMG-'),
    ],
  });

  it('NPN 出力 → NPN 仕様（プラスコモン）の入力はエラーなし', () => {
    const d = base();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('signal-polarity');
  });

  it('NPN 出力 → PNP 仕様（マイナスコモン）の入力は signal-polarity エラー', () => {
    const d = base({ io: 'PN' });
    expect(errorsOf(d).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('PIO の I/O 電源（1A）に 0V をつなぐと極性エラー', () => {
    const d = base();
    d.wires = d.wires.map((x) => (x.to.device === 'CBL1' && x.to.terminal === '1A' ? { ...x, from: { device: 'PSU1', terminal: '-V2' } } : x));
    expect(errorsOf(d).map((i) => i.rule)).toContain('conductor-mismatch');
  });
});

describe('IAI のケーブル・コネクター', () => {
  it('CB-PAC-PIO は PCON-CB の PIO コネクターにつながり、ピン 5A（CN#9）と芯線 5A が導通する', () => {
    const pcon = resolveDevice(def('iai.pcon-cb'));
    const cbl = resolveDevice(def('iai.cb-pac-pio'));
    expect(connectorsMate(pcon.terminal('PIO')!.connector!, cbl.terminal('CN')!.connector!)).toBe(true);
    expect(pcon.pin('PIO#9')?.label).toContain('IN0');
    expect(cbl.links).toContainEqual({ from: 'CN#9', to: '5A' });
    expect(paramsWithDefaults(def('iai.pcon-cb'), {}).io).toBe('NP');
  });
});
