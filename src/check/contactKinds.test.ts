/**
 * 接点の種類（#22）: セレクタスイッチの位置・限時接点・SSR の交流専用の出力・ブザーの記号。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import { resolveNum } from '../devices/types';
import type { Diagram, DiagramWire } from '../model/diagram';
import { deviceElements } from '../schematic/elements';
import { LIBRARY_SYMBOL_IDS, librarySymbol } from '../schematic/symbols';
import { checkDiagram } from './checkDiagram';

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 1.25, wireType: 'KIV' };
};
const lookup = (t: string) => getDeviceDefinition(t);
const def = (t: string) => getDeviceDefinition(t)!;

describe('セレクタスイッチの位置（positions）', () => {
  it('3 ノッチの左右の a 接点は、閉じる位置が別々', () => {
    const r = resolveDevice(def('omron.a22ns-3bm-g101'));
    expect(r.links.map((l) => l.positions)).toEqual([['2'], ['1']]);
    expect(def('omron.a22ns-3bm-g101').schematic?.actuator).toBe('selector');
  });

  /** +24V → 位置 1 の接点 → 位置 2 の接点 → 0V（両方が同時に閉じれば短絡） */
  const series = (type: string, a: [string, string], b: [string, string]): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'COS1', type, x: 0, y: 0 },
    ],
    wires: [w('PSU1.+V1', `COS1.${a[0]}`), w(`COS1.${a[1]}`, `COS1.${b[0]}`), w(`COS1.${b[1]}`, 'PSU1.-V1')],
  });

  it('別の位置で閉じる 2 つの接点が同時に閉じたとはみなさない（短絡と指摘しない）', () => {
    const issues = checkDiagram(series('omron.a22ns-3bm-g101', ['P1-3', 'P1-4'], ['P3-3', 'P3-4']), lookup);
    expect(issues.filter((i) => i.key?.startsWith('state:'))).toEqual([]);
  });

  it('1 つの位置で電源を短絡する接点は、その位置の状態として指摘する', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'COS1', type: 'omron.a22ns-2bm-g100', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'COS1.3'), w('COS1.4', 'PSU1.-V1')],
    };
    const issues = checkDiagram(d, lookup).filter((i) => i.key?.startsWith('state:'));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/^COS1 を位置 2 にすると/);
  });
});

describe('限時接点（timed）', () => {
  it('タイマー H3Y の接点は限時動作で、展開図では限時動作の c 接点の記号になる', () => {
    const r = resolveDevice(def('omron.h3y-2.dc24'));
    expect(r.links.every((l) => l.timed === 'on-delay')).toBe(true);
    const contacts = deviceElements(def('omron.h3y-2.dc24')).filter((e) => e.kind === 'contact');
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts.every((e) => e.symbol === 'contact-c-on-delay')).toBe(true);
  });

  it('セレクタ・限時動作・限時復帰の接点の記号と、ブザーの記号がライブラリにある', () => {
    for (const id of ['contact-no-selector', 'contact-no-on-delay', 'contact-nc-off-delay', 'contact-c-on-delay', 'buzzer']) {
      expect(LIBRARY_SYMBOL_IDS, id).toContain(id);
      expect(librarySymbol(id), id).toBeDefined();
    }
    expect(librarySymbol('contact-no-on-delay')!.description).toBe('a 接点（限時動作）');
  });

  it('ブザー HW1Z は展開図でブザーの記号になる', () => {
    expect(deviceElements(def('idec.hw1z-2pq4b')).map((e) => e.symbol)).toEqual(['buzzer']);
  });
});

describe('パラメーターで変わる消費電流（#1）', () => {
  it('A22N の照光・M22N の表示灯の LED の電流は色で変わる（赤 12mA・白と緑 5mA）', () => {
    const m22 = def('omron.m22n-bn-a-c');
    expect(resolveNum(m22.loadCurrent, m22, { color: 'TR' })).toBe(0.012);
    expect(resolveNum(m22.loadCurrent, m22, { color: 'TG' })).toBe(0.005);
    expect(resolveNum(m22.loadCurrent, m22, {})).toBe(0.005);
    const a22 = def('omron.a22nl-bnm-g100-c');
    expect(resolveNum(a22.loadCurrent, a22, { color: 'TW' })).toBe(0.005);
    expect(resolveNum(a22.loadCurrent, a22, { color: 'TO' })).toBe(0.012);
  });
});

describe('SSR の交流専用の出力（system）と定格', () => {
  const ssr = (source: 'ac' | 'dc', loadRating?: number): Diagram => ({
    devices: [
      source === 'ac' ? { id: 'SRC', type: 'generic.power-source.3p200v', x: 0, y: 0 } : { id: 'SRC', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'SSR1', type: 'omron.g3na-210b', x: 0, y: 0, ...(loadRating ? { params: { loadRating } } : {}) },
      { id: 'M1', type: 'generic.motor.3p', x: 0, y: 0, params: { ratedCurrent: 6.6 } },
    ],
    wires: [w(source === 'ac' ? 'SRC.R' : 'SRC.+V1', 'SSR1.1'), w('SSR1.2', 'M1.U')],
  });
  const rules = (d: Diagram) => checkDiagram(d, lookup).map((i) => i.rule);

  it('直流の電源を開閉すると switch-system のエラー', () => {
    expect(rules(ssr('dc'))).toContain('switch-system');
    expect(rules(ssr('ac'))).not.toContain('switch-system');
  });

  it('放熱器なし（4A）で 6.6A の負荷を開閉すると contact-overload、放熱器付き（10A）なら指摘なし', () => {
    expect(rules(ssr('ac', 4))).toContain('contact-overload');
    expect(rules(ssr('ac'))).not.toContain('contact-overload');
  });
});
