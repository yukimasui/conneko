/**
 * 安全機器（安全コントローラー・セーフティリレー・非常停止・ドアスイッチ・ライトカーテンなど）の定義の検査と、
 * 代表的な安全回路を組んだときに電気チェックが誤検出しないことの確認。
 */
import { describe, expect, it } from 'vitest';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { paramsWithDefaults, type DeviceDefinition } from '../devices/types';
import type { Diagram, DiagramWire } from '../model/diagram';
import { checkDiagram } from './checkDiagram';

const SAFETY_TYPES = [
  'idec.xw1e-bv402mr',
  'idec.xw1e-lv402q4mr',
  'idec.hs5d-02rn',
  'idec.hs5e-a4403-g',
  'idec.he1g-l21sm',
  'idec.hr6s-af',
  'idec.fs1b-c31s',
  'idec.rf1v-2a2bl-d24',
  'keyence.gc-1000',
  'keyence.gc-1000r',
  'keyence.gl-r.receiver',
  'keyence.gl-r.emitter',
  'keyence.sz-v32',
  'keyence.gs-11p5',
  'mitsubishi.sd-t12.dc24v',
  'mitsubishi.sd-t21.dc24v',
  'mitsubishi.s-t12.ac200v',
  'mitsubishi.ws0-cpu0-xtio',
  'omron.g9sp-n10s',
  'omron.g9se-201',
  'omron.g9se-401',
  'omron.g9se-221-t05',
  'omron.g9sa-301',
  'omron.g9sa-th301',
  'omron.g7sa-3a1b',
  'omron.er6022-021m',
  'omron.d4n-4c20',
  'omron.g9sx-ns202-rt',
  'omron.d40a-1c5',
  'omron.f3sg-sr.receiver',
  'omron.f3sg-sr.emitter',
  'pilz.pnoz-x2-8p',
  'pilz.pnoz-s4',
];

const lookup = (type: string) => getDeviceDefinition(type);

const svgOf = (def: DeviceDefinition) => (typeof def.svg === 'function' ? def.svg(paramsWithDefaults(def, {})) : def.svg);

describe('安全機器の定義', () => {
  it.each(SAFETY_TYPES)('%s が登録されている', (type) => {
    expect(getDeviceDefinition(type)).toBeDefined();
  });

  it.each(SAFETY_TYPES)('%s の端子・内部導通・SVG が整合している', (type) => {
    const def = getDeviceDefinition(type)!;
    const ids = def.terminals.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of def.terminals) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(def.width);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(def.height);
      if (t.role === 'input') expect(t.accepts, `${type} ${t.id}`).toBeDefined();
      if (t.role === 'supply') expect(t.supply, `${type} ${t.id}`).toBeDefined();
    }
    for (const l of def.links ?? []) {
      expect(ids).toContain(l.from);
      expect(ids).toContain(l.to);
    }
    const svg = svgOf(def);
    for (const m of svg.matchAll(/\bid="([^"]*)"/g)) expect(m[1]).toContain('{{uid}}');
    expect(svg).not.toMatch(/<script|<image|<foreignObject|href="http/i);
    // パラメータで見た目が変わる機器は、全ての選択肢で描画できる
    for (const p of def.params ?? []) {
      for (const o of p.options) {
        const s = typeof def.svg === 'function' ? def.svg(paramsWithDefaults(def, { [p.key]: o.value })) : def.svg;
        expect(s.length).toBeGreaterThan(100);
      }
    }
  });

  it('安全コントローラー・セーフティリレーの電源端子は DC24V の +/- を受ける', () => {
    // 交流操作コイルの電磁接触器は対象外
    for (const type of SAFETY_TYPES.filter((t) => !t.endsWith('.ac200v'))) {
      const def = getDeviceDefinition(type)!;
      for (const t of def.terminals.filter((x) => x.role === 'input')) {
        expect(t.accepts!.system).toBe('DC');
        expect(t.accepts!.minVoltage).toBeLessThanOrEqual(24);
        expect(t.accepts!.maxVoltage).toBeGreaterThanOrEqual(24);
        expect(t.accepts!.conductors?.length).toBe(1);
      }
    }
  });

  it('安全機器のカテゴリは既存の分類のどれか', () => {
    const cats = new Set(deviceDefinitions.map((d) => d.category));
    for (const type of SAFETY_TYPES) expect(cats).toContain(getDeviceDefinition(type)!.category);
  });
});

let seq = 0;
const w = (from: string, to: string, color = 'blue'): DiagramWire => {
  const [fd, ...ft] = from.split('.');
  const [td, ...tt] = to.split('.');
  return {
    id: `W${++seq}`,
    from: { device: fd, terminal: ft.join('.') },
    to: { device: td, terminal: tt.join('.') },
    color,
    sizeSq: 0.75,
    wireType: 'KIV',
  };
};

describe('安全回路の電気チェック', () => {
  it('非常停止 → セーフティリレー G9SE → 接触器 2 台（EDM 付き）の回路で誤検出しない', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SR1', type: 'omron.g9se-201', x: 0, y: 0 },
        { id: 'EMG1', type: 'idec.xw1e-bv402mr', x: 0, y: 0 },
        { id: 'MC1', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
        { id: 'MC2', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
      ],
      wires: [
        w('PSU1.+V1', 'SR1.A1'),
        w('PSU1.-V1', 'SR1.A2'),
        // 非常停止の b 接点 2 回路を CH1・CH2 へ
        w('SR1.T11', 'EMG1.21'),
        w('EMG1.22', 'SR1.T12'),
        w('SR1.T21', 'EMG1.41'),
        w('EMG1.42', 'SR1.T22'),
        // フィードバック（接触器のミラー接点を直列）と自動リセット側の +24V
        w('SR1.T31', 'MC1.21'),
        w('MC1.22', 'MC2.21'),
        w('MC2.22', 'SR1.T32'),
        w('PSU1.+V2', 'SR1.T33'),
        // 安全出力で接触器のコイルを駆動
        w('SR1.T33', 'SR1.13'),
        w('SR1.14', 'MC1.A1'),
        w('SR1.13', 'SR1.23'),
        w('SR1.24', 'MC2.A1'),
        w('MC1.A2', 'PSU1.-V2'),
        w('MC2.A2', 'PSU1.-V2'),
      ],
    };
    const issues = checkDiagram(d, lookup);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    // 接触器のコイルには安全出力の接点を通って電源が届く
    expect(issues.filter((i) => i.rule === 'no-power')).toEqual([]);
    // セーフティリレー・接触器のコイルの未接続はない
    expect(issues.filter((i) => i.rule === 'unconnected' && (i.devices.includes('SR1') || i.message.includes('A1') || i.message.includes('A2')))).toEqual([]);
  });

  it('コイルの極性を逆にすると検出する', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'MC1', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'MC1.A2'), w('PSU1.-V1', 'MC1.A1')],
    };
    expect(checkDiagram(d, lookup).map((i) => i.rule)).toContain('conductor-mismatch');
  });

  it('ライトカーテン → セーフティコントローラ GC-1000 の配線で誤検出しない', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SC1', type: 'keyence.gc-1000', x: 0, y: 0 },
        { id: 'LCR', type: 'keyence.gl-r.receiver', x: 0, y: 0 },
        { id: 'LCE', type: 'keyence.gl-r.emitter', x: 0, y: 0 },
      ],
      wires: [
        w('PSU1.+V1', 'SC1.+24V'),
        w('PSU1.-V1', 'SC1.0V'),
        w('PSU1.+V2', 'LCR.+24V', 'blue'),
        w('PSU1.-V2', 'LCR.0V'),
        w('LCR.+24V', 'LCE.+24V'),
        w('LCR.0V', 'LCE.0V'),
        w('LCR.OSSD1', 'SC1.Si0'),
        w('LCR.OSSD2', 'SC1.Si1'),
        // 自動復帰（黄を +24V）
        w('LCR.RESET', 'LCR.+24V'),
      ],
    };
    const issues = checkDiagram(d, lookup);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.filter((i) => i.rule === 'no-power')).toEqual([]);
  });

  it('非接触ドアスイッチ D40A を G9SX-NS の D3/D4 から給電しても誤検出しない', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'SR1', type: 'omron.g9sx-ns202-rt', x: 0, y: 0 },
        { id: 'DS1', type: 'omron.d40a-1c5', x: 0, y: 0 },
        { id: 'DS2', type: 'omron.d40a-1c5', x: 0, y: 0 },
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
    const issues = checkDiagram(d, lookup);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.filter((i) => i.rule === 'no-power')).toEqual([]);
  });

  it('OSSD を 0V に短絡しても電源の短絡とはみなさない（OSSD は信号端子として扱う）', () => {
    const d: Diagram = {
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'LCR', type: 'keyence.gl-r.receiver', x: 0, y: 0 },
      ],
      wires: [w('PSU1.+V1', 'LCR.+24V'), w('PSU1.-V1', 'LCR.0V'), w('LCR.OSSD1', 'PSU1.-V2')],
    };
    // 現状の型では OSSD の短絡を検出できない（docs/proposals/safety.md の ossd-short を参照）
    expect(checkDiagram(d, lookup).filter((i) => i.severity === 'error')).toEqual([]);
  });
});
