/**
 * 東洋技研の端子台の構造（コネクタのピンと端子の対応、コネクタの種類）と、
 * PLC の I/O ユニットにケーブルでつないだときのチェック・I/O の接続先の確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import type { Diagram, DiagramWire } from '../model/diagram';
import { ioSystem } from '../model/io';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';
import { paramVariants } from './validate';

const togi = deviceDefinitions.filter((d) => d.maker === '東洋技研');
const withConnector = togi.filter((d) => resolveDevice(d).terminals.some((t) => t.connector));
/** 1:1 タイプ（コネクタのピンと端子が 1 対 1） */
const oneToOne = withConnector.filter((d) => /^toyogiken\.(pcn7|pcx|pcv5|pcw)-(1h\d+|4f40)2?$/.test(d.type));

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

/** 端子 → つながるコネクタのピン（CN#n の n）の一覧 */
function pinsOf(d: DeviceDefinition, params = {}) {
  const r = resolveDevice(d, params);
  const map = new Map<string, number[]>();
  for (const l of r.links) {
    const pair = l.from.startsWith('CN#') ? [l.from, l.to] : l.to.startsWith('CN#') ? [l.to, l.from] : undefined;
    if (!pair) continue;
    const [pin, term] = pair;
    map.set(term, [...(map.get(term) ?? []), Number(pin.slice(3))]);
  }
  return { r, map };
}

describe('東洋技研 機器定義', () => {
  it('type・maker・category がそろっている', () => {
    expect(togi.length).toBeGreaterThanOrEqual(35);
    for (const d of togi) {
      expect(d.type.startsWith('toyogiken.'), d.type).toBe(true);
      expect(d.category, d.type).toBe('terminal');
    }
    expect(oneToOne.length).toBe(20);
  });

  it.each(oneToOne.map((d) => [d.type, d] as const))('%s: コネクタの全ピンが端子と 1 対 1 でつながる', (_, d) => {
    for (const p of paramVariants(d)) {
      const { r, map } = pinsOf(d, p);
      const cn = r.terminals.find((t) => t.connector)!;
      const terms = r.terminals.filter((t) => !t.connector);
      expect(terms.length).toBe(cn.connector!.pins);
      const used = new Set<number>();
      for (const t of terms) {
        const pins = map.get(t.id) ?? [];
        expect(pins, t.id).toHaveLength(1);
        used.add(pins[0]);
      }
      expect(used.size).toBe(cn.connector!.pins);
    }
  });

  it('MIL の A・B 連番: A_k は MIL ピン 2k−1、B_k は 2k。-M の記名板は MIL ピン番号を印字する', () => {
    const d = def('toyogiken.pcx-1h40');
    const { r, map } = pinsOf(d);
    expect(map.get('A1')).toEqual([1]);
    expect(map.get('B1')).toEqual([2]);
    expect(map.get('A20')).toEqual([39]);
    expect(map.get('B20')).toEqual([40]);
    expect(r.terminal('B20')?.label).toBe('B20');
    expect(resolveDevice(d, { marker: 'M' }).terminal('B20')?.label).toBe('40');
    expect(resolveDevice(d, { marker: 'M' }).terminal('A3')?.label).toBe('5');
  });

  it.each(withConnector.map((d) => [d.type, d] as const))('%s: 端子はコネクタのピンか分岐用の短絡でつながり、空きピンは三菱の A03・A04・B03・B04 だけ', (_, d) => {
    for (const p of paramVariants(d)) {
      const { r, map } = pinsOf(d, p);
      const bused = new Set(r.links.filter((l) => !l.from.startsWith('CN#') && !l.to.startsWith('CN#')).flatMap((l) => [l.from, l.to]));
      for (const t of r.terminals.filter((x) => !x.connector)) {
        expect(map.has(t.id) || bused.has(t.id), `${t.id} がどこにもつながらない`).toBe(true);
      }
      const used = new Set([...map.values()].flat());
      const unused = r.pins.map((x) => Number(x.id.slice(3))).filter((n) => !used.has(n));
      const cn = r.terminals.find((t) => t.connector)!.connector!;
      // 三菱の空きピン A03・A04・B03・B04（ピン ID は A_k → 42−2k、B_k → 41−2k）
      const melsecEmpty = [36, 34, 35, 33];
      // TB40-M2-X（入力用）は A01・A02（入力ユニットでは空き）もつながない（右端の分岐端子は Service（COM））
      if (d.type.endsWith('tb40-m2-x')) melsecEmpty.push(40, 38);
      if (unused.length) {
        expect(cn.pins).toBe(40);
        expect(unused.sort((a, b) => a - b)).toEqual(melsecEmpty.sort((a, b) => a - b));
      }
    }
  });

  it('コネクタの種類は PLC の I/O ユニットと同じ文字列で、ケーブルでつなげる相手がいる', () => {
    const plcConnectors = deviceDefinitions
      .filter((d) => d.category === 'plc')
      .flatMap((d) => resolveDevice(d).terminals.filter((t) => t.connector && t.connector.pins > 0).map((t) => t.connector!));
    const kinds = new Set<string>();
    for (const d of withConnector) {
      const c = resolveDevice(d).terminals.find((t) => t.connector)!.connector!;
      kinds.add(c.kind);
      expect(['MIL20', 'MIL34', 'MIL40', 'MIL50', 'FCN40']).toContain(c.kind);
      expect(c.facing).toBe('front');
      // MIL 50 極を使う PLC はまだカタログにない
      if (c.kind !== 'MIL50') expect(plcConnectors.some((x) => connectorsMate(x, c)), `${d.type}（${c.kind}）`).toBe(true);
    }
    expect([...kinds].sort()).toEqual(['FCN40', 'MIL20', 'MIL34', 'MIL40', 'MIL50']);
  });

  it('KEYENCE 対応品は KEYENCE のピン No. の順に 000〜015・COM0・100〜115・COM1 が並ぶ', () => {
    const { r, map } = pinsOf(def('toyogiken.pcx-1h34-tb34-k1'));
    // KEYENCE No.1 = MIL ピン 1、No.17 = 33、No.18 = 2、No.34 = 34
    expect(map.get('000')).toEqual([1]);
    expect(map.get('015')).toEqual([31]);
    expect(map.get('COM0')).toEqual([33]);
    expect(map.get('100')).toEqual([2]);
    expect(map.get('COM1')).toEqual([34]);
    expect(r.terminal('000')?.y).toBeGreaterThan(r.terminal('100')!.y);
    // K2 の KEYENCE COM は COM0・COM1 の両方、Service（COM）はコネクタにつながらない
    const k2 = pinsOf(def('toyogiken.pcx-1h34-tb40-k2'));
    expect(k2.map.get('COM-1')?.sort()).toEqual([33, 34]);
    expect(k2.map.has('SV-1')).toBe(false);
  });

  it('三菱電機対応品は 00 = B20、10 = A20、+V = B01・B02、0V = A01・A02（RX41C4 と同じピン ID）', () => {
    const d = def('toyogiken.pcn7-4f40-tb34-m1');
    const rx = resolveDevice(def('mitsubishi.rx41c4'));
    const { r, map } = pinsOf(d);
    const signalAt = (n: number) => `${rx.pin(`CN1#${n}`)?.label} ${rx.pin(`CN1#${n}`)?.note ?? ''}`;
    expect(signalAt(map.get('00')![0])).toContain('X00');
    expect(signalAt(map.get('1F')![0])).toContain('X1F');
    expect(map.get('+V')!.map(signalAt).every((s) => s.startsWith('COM (B0'))).toBe(true);
    // M1 は奥段に 00〜0F、M2 は手前段に 00〜0F
    expect(r.terminal('00')!.y).toBeLessThan(r.terminal('10')!.y);
    const m2 = resolveDevice(d, { wiring: 'M2' });
    expect(m2.terminal('00')!.y).toBeGreaterThan(m2.terminal('10')!.y);
    // 入力ユニット用の記名板では +V が COM、0V が NC（端子 ID は変えない）
    expect(resolveDevice(d, { marker: 'in' }).terminal('+V')?.label).toBe('COM');
    expect(resolveDevice(d, { marker: 'in' }).terminal('0V')?.label).toBe('NC');
  });

  it('コモン端子台: PCX-COM22 は段ごとに 2 系統、P / N は 1 系統。PCXV-COM16 の 2 色品は 8 点ずつ 2 系統', () => {
    const groups = (type: string, params = {}) => {
      const r = resolveDevice(def(type), params);
      const parent = new Map(r.terminals.map((t) => [t.id, t.id]));
      const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
      for (const l of r.links) parent.set(find(l.from), find(l.to));
      return new Set(r.terminals.map((t) => find(t.id))).size;
    };
    expect(groups('toyogiken.pcx-com22')).toBe(2);
    expect(groups('toyogiken.pcx-com22', { polarity: 'P' })).toBe(1);
    expect(groups('toyogiken.pcx-com36', { polarity: 'N' })).toBe(1);
    expect(groups('toyogiken.pcxv-com16')).toBe(1);
    expect(groups('toyogiken.pcxv-com16', { color: 'RB' })).toBe(2);
    expect(groups('toyogiken.vtx-2.5-2.10p')).toBe(10);
    expect(groups('toyogiken.ptul2-10-10p')).toBe(10);
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

describe('東洋技研の端子台を PLC につないだときのチェックと I/O', () => {
  it('KEYENCE KV-C32XC（MIL 34 極）→ PCX-1H34-TB34-K1、センサーは PCX-COM22 から電源を取って 000 へ', () => {
    const d: Diagram = {
      devices: [
        { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-c32xc.input', x: 0, y: 0, mount: { device: 'PLC1', slot: 1 } },
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'TB1', type: 'toyogiken.pcx-1h34-tb34-k1', x: 0, y: 0 },
        { id: 'TB2', type: 'toyogiken.pcx-com22', x: 0, y: 0 },
        { id: 'PH1', type: 'keyence.pz-g41', x: 0, y: 0 },
      ],
      wires: [
        w('IN1.CN1', 'TB1.CN', { wireType: 'CABLE', sizeSq: 0, color: 'black' }),
        // コモン端子台へ電源を入れ、センサーの電源を分岐する
        w('PSU1.+V1', 'TB2.TB2-1'),
        w('PSU1.-V1', 'TB2.TB1-1'),
        w('TB2.TB2-2', 'PH1.BN'),
        w('TB2.TB1-2', 'PH1.BU'),
        // NPN 出力 → 入力 000、COM0 は +24V（プラスコモン）
        w('PH1.BK', 'TB1.000'),
        w('TB2.TB2-3', 'TB1.COM0'),
      ],
    };
    const issues = checkDiagram(d, lookup);
    expect(issues.filter((i) => i.rule === 'connector-mismatch')).toEqual([]);
    expect(errorsOf(d)).toEqual([]);
    expect(issues.filter((i) => i.devices.includes('PH1')).map((i) => i.rule)).not.toContain('no-power');

    const unit = ioSystem(d, 'PLC1', lookup)!.units.find((u) => u.device.id === 'IN1')!;
    const r000 = unit.points.find((p) => p.terminal === 'CN1#1')!;
    expect(r000.address).toBe('R000');
    expect(r000.endpoint).toEqual({ device: 'TB1', terminal: '000' });
    expect(r000.connections.map((c) => c.name)).toContain('PH1.BK');
    const r100 = unit.points.find((p) => p.terminal === 'CN1#2')!;
    expect(r100.address).toBe('R100');
    expect(r100.endpoint).toEqual({ device: 'TB1', terminal: '100' });
    expect(unit.bareConnectors).toEqual([]);

    // COM0 を 0V（マイナスコモン）にすると NPN センサーとの組み合わせが誤り（端子台を通してもピンの COM が判定される）
    d.wires[6] = w('TB2.TB1-3', 'TB1.COM0');
    expect(errorsOf(d).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('三菱 RX41C4（FCN 40 ピン）→ PCN7-4F40-TB34-M1 は FCN どうしでつながり、X00 の接続先が端子 00 になる', () => {
    const d: Diagram = {
      devices: [
        { id: 'BASE1', type: 'mitsubishi.r35b', x: 0, y: 0 },
        { id: 'PS1', type: 'mitsubishi.r61p', x: 0, y: 0, mount: { device: 'BASE1', slot: 1 } },
        { id: 'CPU1', type: 'mitsubishi.r04cpu', x: 0, y: 0, mount: { device: 'BASE1', slot: 2 } },
        { id: 'IN1', type: 'mitsubishi.rx41c4', x: 0, y: 0, mount: { device: 'BASE1', slot: 3 } },
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'TB1', type: 'toyogiken.pcn7-4f40-tb34-m1', x: 0, y: 0, params: { marker: 'in' } },
        { id: 'PH1', type: 'keyence.pz-g41', x: 0, y: 0 },
      ],
      wires: [
        w('IN1.CN1', 'TB1.CN', { wireType: 'CABLE', sizeSq: 0, color: 'black' }),
        w('PSU1.+V1', 'PH1.BN'),
        w('PSU1.-V1', 'PH1.BU'),
        w('PH1.BK', 'TB1.00'),
        // 入力ユニットでは +V の端子が COM（B01・B02）。NPN センサーなので +24V
        w('PSU1.+V2', 'TB1.+V'),
      ],
    };
    const issues = checkDiagram(d, lookup);
    expect(issues.filter((i) => i.rule === 'connector-mismatch')).toEqual([]);
    expect(errorsOf(d)).toEqual([]);

    const unit = ioSystem(d, 'BASE1', lookup)!.units.find((u) => u.device.id === 'IN1')!;
    const x00 = unit.points.find((p) => p.address === 'X00')!;
    expect(x00.endpoint).toEqual({ device: 'TB1', terminal: '00' });
    expect(x00.connections.map((c) => c.name)).toContain('PH1.BK');
    expect(unit.points.find((p) => p.address === 'X1F')!.endpoint).toEqual({ device: 'TB1', terminal: '1F' });
  });

  it('MIL 34 極の端子台を MIL 40 極の I/O ユニットにつなぐとコネクタ違いになる', () => {
    const d: Diagram = {
      devices: [
        { id: 'IO1', type: 'keyence.kv-sir32xt', x: 0, y: 0 },
        { id: 'TB1', type: 'toyogiken.pcn7-1h34', x: 0, y: 0 },
      ],
      wires: [w('IO1.CN1', 'TB1.CN', { wireType: 'CABLE', sizeSq: 0 })],
    };
    expect(errorsOf(d).map((i) => i.rule)).toContain('connector-mismatch');
  });
});
