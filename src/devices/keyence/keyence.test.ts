/**
 * KEYENCE 機器定義の整合性と、代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../../check/checkDiagram';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { deviceDefinitions, getDeviceDefinition } from '../registry';
import { resolveDevice } from '../resolve';
import { paramsWithDefaults } from '../types';

const keyence = deviceDefinitions.filter((d) => d.maker === 'KEYENCE');

describe('KEYENCE 機器定義', () => {
  it('type が一意で keyence. で始まる', () => {
    const types = keyence.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    for (const t of types) expect(t.startsWith('keyence.')).toBe(true);
  });

  it.each(keyence.map((d) => [d.type, d] as const))('%s: 端子・ピン・links が整合している', (_, def) => {
    const r = resolveDevice(def);
    const d = { ...def, terminals: r.terminals, pins: r.pins, links: r.links };
    const ids = new Set<string>();
    for (const t of d.terminals) {
      expect(ids.has(t.id), `端子ID重複 ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(t.x >= 0 && t.x <= d.width && t.y >= 0 && t.y <= d.height, `端子が範囲外 ${t.id}`).toBe(true);
      if (t.role === 'input') expect(t.accepts, `accepts なし ${t.id}`).toBeDefined();
      if (t.role === 'connector') expect(t.connector, `connector なし ${t.id}`).toBeDefined();
    }
    for (const p of d.pins) {
      const [cn, no] = p.id.split('#');
      const conn = d.terminals.find((t) => t.id === cn)?.connector;
      expect(conn && Number(no) >= 1 && Number(no) <= conn.pins, `ピンID不正 ${p.id}`).toBe(true);
      expect(ids.has(p.id), `ピンID重複 ${p.id}`).toBe(false);
      ids.add(p.id);
    }
    // MIL コネクタは全ピンを定義する
    for (const t of d.terminals) {
      if (t.connector && t.connector.pins > 0) {
        const n = d.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length;
        expect(n, `${t.id} のピン数`).toBe(t.connector.pins);
      }
    }
    for (const l of d.links) expect(ids.has(l.from) && ids.has(l.to), `links ${l.from}->${l.to}`).toBe(true);
    // SVG の id に {{uid}} が付いている（パラメータの全選択肢で確認）
    const variants = [paramsWithDefaults(d, {})];
    for (const p of d.params ?? []) for (const o of p.options) variants.push(paramsWithDefaults(d, { [p.key]: o.value }));
    for (const v of variants) {
      const svg = typeof d.svg === 'function' ? d.svg(v) : d.svg;
      for (const m of svg.matchAll(/\bid="([^"]*)"/g)) expect(m[1]).toContain('{{uid}}');
      expect(svg).not.toMatch(/undefined|NaN/);
    }
  });
});

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const lookup = (t: string) => getDeviceDefinition(t);
const errorsOf = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.severity === 'error');
const rulesAt = (d: Diagram, device: string) =>
  checkDiagram(d, lookup)
    .filter((i) => i.devices.includes(device))
    .map((i) => i.rule);

describe('KEYENCE 機器の配線チェック', () => {
  const base = (): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-b16td', x: 0, y: 0 },
      { id: 'PH1', type: 'keyence.pz-g41', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
    ],
    wires: [
      // センサーの電源と出力（NPN → PLC 入力のプラスコモン）
      w('PSU1.+V1', 'PH1.BN'),
      w('PSU1.-V1', 'PH1.BU'),
      w('PH1.BK', 'IN1.0'),
      w('PSU1.+V1', 'IN1.C0'),
      // シンク出力 → 表示灯
      w('PSU1.+V1', 'PL1.X1'),
      w('PL1.X2', 'OUT1.0'),
      w('PSU1.-V1', 'OUT1.C0'),
    ],
  });

  it('センサー → 入力ユニット、出力ユニット → 表示灯 の正しい回路でエラーが出ない', () => {
    const d = base();
    expect(errorsOf(d)).toEqual([]);
    // 表示灯の X2 にはシンク出力（出力 ON 時に COM と導通）経由で 0V が来る
    expect(rulesAt(d, 'PL1')).not.toContain('no-power');
    expect(rulesAt(d, 'PH1')).not.toContain('no-power');
  });

  it('センサーの電源を逆につなぐと極性エラーになる', () => {
    const d = base();
    d.wires = d.wires.map((x) => (x.to.device === 'PH1' && x.to.terminal === 'BN' ? { ...x, from: { device: 'PSU1', terminal: '-V2' } } : x));
    expect(errorsOf(d).map((i) => i.rule)).toContain('conductor-mismatch');
  });

  it('シンク出力ユニットの COM に +24V をつなぐと極性エラーになる', () => {
    const d = base();
    d.wires = d.wires.map((x) => (x.to.device === 'OUT1' && x.to.terminal === 'C0' ? { ...x, from: { device: 'PSU1', terminal: '+V2' } } : x));
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  it('MIL ケーブルで I/O ユニットと XC 端子台がつながり、ピンの電源条件がチェックされる', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'OUT1', type: 'keyence.kv-c32td', x: 0, y: 0 },
        { id: 'TB1', type: 'keyence.xc-t34b1', x: 0, y: 0 },
        { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
      ],
      wires: [
        w('OUT1.CN1', 'TB1.CN', { wireType: 'CABLE' }),
        // KEYENCE No.17 = COM0（端子台の端子 17）
        w('PSU1.-V1', 'TB1.17'),
        w('PSU1.+V1', 'PL1.X1'),
        // KEYENCE No.1 = OUT 000（端子台の端子 1）
        w('PL1.X2', 'TB1.1'),
      ],
    };
    expect(errorsOf(d)).toEqual([]);
    expect(rulesAt(d, 'PL1')).not.toContain('no-power');
    // COM に +24V を入れると極性エラー
    d.wires[1] = w('PSU1.+V2', 'TB1.17');
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  it('MIL 34極と 40極のコネクタはつなげない', () => {
    const d: Diagram = {
      devices: [
        { id: 'IO1', type: 'keyence.kv-sir32xt', x: 0, y: 0 },
        { id: 'TB1', type: 'keyence.xc-t34b1', x: 0, y: 0 },
      ],
      wires: [w('IO1.CN1', 'TB1.CN', { wireType: 'CABLE' })],
    };
    expect(errorsOf(d).map((i) => i.rule)).toContain('connector-mismatch');
  });
});
