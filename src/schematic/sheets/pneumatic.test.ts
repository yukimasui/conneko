import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../../devices/registry';
import type { DeviceDefinition, TerminalDef } from '../../devices/types';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { buildSchematic } from '../layout';
import { sheetSvg } from '../svg';

const port = (id: string, air: TerminalDef['air'], extra: Partial<TerminalDef> = {}): TerminalDef => ({ id, x: 0, y: 0, side: 'top', role: 'air', air, ...extra });
const base = { name: '', labelPrefix: 'X', width: 10, height: 10, svg: '' };

const fr: DeviceDefinition = {
  ...base,
  type: 'test.fr',
  model: 'AW20-02G',
  category: 'air-supply',
  terminals: [port('IN', { kind: 'in', tubeOD: 8 }), port('OUT', { kind: 'out', tubeOD: 6 })],
  airLinks: [{ from: 'IN', to: 'OUT', directed: true, regulate: 0.4 }],
  pneumatic: { symbol: 'filter-regulator', ports: { in: 'IN', out: 'OUT' }, gauge: true },
};
const sc: DeviceDefinition = {
  ...base,
  type: 'test.sc',
  model: 'AS1002F-06',
  category: 'air-fitting',
  terminals: [port('IN', { kind: 'work', tubeOD: 6 }), port('OUT', { kind: 'work', tubeOD: 6 })],
  airLinks: [{ from: 'IN', to: 'OUT' }],
  pneumatic: { symbol: 'speed-controller', ports: { in: 'IN', out: 'OUT' } },
};
const cyl: DeviceDefinition = {
  ...base,
  type: 'test.cyl',
  model: 'CDM2B25-100Z',
  category: 'actuator',
  terminals: [
    port('HEAD', { kind: 'work', tubeOD: 6 }),
    port('ROD', { kind: 'work', tubeOD: 6 }),
    { id: 'SW1', x: 0, y: 0, side: 'bottom', role: 'signal', signal: { dir: 'out', kind: 'npn' } },
  ],
  pneumatic: { symbol: 'cylinder', ports: { head: 'HEAD', rod: 'ROD' }, cylinder: { acting: 'double', magnet: true, switches: { head: 'SW1' } } },
};
const tests = [fr, sc, cyl];
const lookup = (type: string) => tests.find((d) => d.type === type) ?? getDeviceDefinition(type);

let n = 0;
const tube = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `T${++n}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: 6 };
};

/** エア源 → フィルタレギュレータ → 電磁弁 2 台（シングル・ダブル）→ スピコン → シリンダ */
function circuit(): Diagram {
  return {
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
      { id: 'FR1', type: 'test.fr', x: 0, y: 0 },
      { id: 'SOL1', type: 'smc.sy3120-5lz', x: 100, y: 0 },
      { id: 'SOL2', type: 'smc.sy3220-5lz', x: 300, y: 0 },
      { id: 'SC1', type: 'test.sc', x: 0, y: 0 },
      { id: 'SC2', type: 'test.sc', x: 0, y: 0 },
      { id: 'CY1', type: 'test.cyl', x: 100, y: 0 },
      { id: 'CY2', type: 'test.cyl', x: 300, y: 0 },
    ],
    wires: [
      tube('AIR1.OUT', 'FR1.IN'),
      tube('FR1.OUT', 'SOL1.P'),
      tube('FR1.OUT', 'SOL2.P'),
      // SOL1: A → スピコン（弁の側が IN）→ ヘッド側、B → ロッド側
      tube('SOL1.A', 'SC1.IN'),
      tube('SC1.OUT', 'CY1.HEAD'),
      tube('SOL1.B', 'SC2.OUT'),
      tube('SC2.IN', 'CY1.ROD'),
      tube('SOL2.A', 'CY2.HEAD'),
      tube('SOL2.B', 'CY2.ROD'),
    ],
    schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] },
  };
}

describe('空圧回路図', () => {
  it('エア機器とチューブから、機器名・型式・圧力・記号を描く', () => {
    const build = buildSchematic(circuit(), lookup);
    const page = build.doc.sheets[0];
    const texts = page.texts.map((t) => t.text);
    for (const id of ['AIR1', 'FR1', 'CY1', 'CY2', 'SC1', 'SC2']) expect(texts).toContain(id);
    expect(texts).toContain('CDM2B25-100Z');
    expect(texts).toContain('SOL1');
    expect(texts).toContain('SOL2A');
    expect(texts).toContain('SOL2B');
    expect(texts).toContain('0.5MPa');
    expect(texts).toContain('0.4MPa');
    expect(page.polylines.length).toBeGreaterThan(50);
    if (process.env.PNEUMATIC_SVG) writeFileSync(process.env.PNEUMATIC_SVG, sheetSvg(build.doc, page));
  });

  it('シリンダのポートに直付けしたスピードコントローラは、別に置いたものと同じ記号・逆止弁の向きで描く', () => {
    /** 速度制御弁の逆止弁の玉（半径 1.1 の円）が、破線の枠の中心より上（+1）か下（-1）か */
    const balls = (d: Diagram) => {
      const page = buildSchematic(d, lookup).doc.sheets[0];
      const center = (pts: [number, number][]) => ({ x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length });
      const scBoxes = page.polylines
        .filter((l) => l.dashed && l.closed && l.points.length === 4)
        .map((l) => ({ ...center(l.points), w: Math.abs(l.points[1][0] - l.points[0][0]), h: Math.abs(l.points[2][1] - l.points[0][1]) }))
        .filter((b) => Math.abs(b.w - 12) < 0.01 && Math.abs(b.h - 16) < 0.01);
      return page.polylines
        .filter((l) => l.closed && l.points.length === 20)
        .map((l) => ({ c: center(l.points), r: Math.hypot(l.points[0][0] - center(l.points).x, l.points[0][1] - center(l.points).y) }))
        .filter((b) => Math.abs(b.r - 1.1) < 0.01)
        .map((b) => {
          const box = scBoxes.find((x) => Math.abs(x.x - b.c.x) < 6 && Math.abs(x.y - b.c.y) < 8)!;
          return Math.sign(b.c.y - box.y);
        });
    };
    const t = (id: string, from: string, to: string): DiagramWire => {
      const [fd, ft] = from.split('.');
      const [td, tt] = to.split('.');
      return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: 6 };
    };
    const sheet = { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic' as const, items: [] }] };
    const attached = (control: string): Diagram => ({
      devices: [
        { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
        { id: 'CY1', type: 'smc.cm2', x: 0, y: 0, params: { speedController: control } },
      ],
      wires: [t('T1', 'AIR1.OUT', 'SOL1.P'), t('T2', 'SOL1.A', 'CY1.HEAD'), t('T3', 'SOL1.B', 'CY1.ROD')],
      schematic: sheet,
    });
    const separate = (type: string): Diagram => ({
      devices: [
        { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
        { id: 'SC1', type, x: 0, y: 0 },
        { id: 'CY1', type: 'smc.cm2', x: 0, y: 0 },
      ],
      wires: [t('T1', 'AIR1.OUT', 'SOL1.P'), t('T2', 'SOL1.A', 'SC1.TUBE'), t('T3', 'SC1.CYL', 'CY1.HEAD'), t('T4', 'SOL1.B', 'CY1.ROD')],
      schematic: sheet,
    });
    const out = balls(separate('smc.as2201f'));
    const inn = balls(separate('smc.as2211f'));
    expect(out).toHaveLength(1);
    expect(inn).toEqual([-out[0]]);
    // 直付けはヘッド側・ロッド側の 2 個。向きは別に置いたものと同じ
    expect(balls(attached('meter-out'))).toEqual([out[0], out[0]]);
    expect(balls(attached('meter-in'))).toEqual([inn[0], inn[0]]);
    expect(balls(attached('none'))).toEqual([]);
    const texts = buildSchematic(attached('meter-out'), lookup).doc.sheets[0].texts.map((x) => x.text);
    expect(texts.filter((x) => x === 'AS2201F')).toHaveLength(2);
    expect(texts).toContain('-01-06S');
  });

  it('エア機器がなければ案内を書く', () => {
    const d: Diagram = { devices: [], wires: [], schematic: { sheets: [{ id: 'D1', name: '空圧', kind: 'pneumatic', items: [] }] } };
    expect(buildSchematic(d, lookup).doc.sheets[0].texts.some((t) => t.text.includes('エア機器'))).toBe(true);
  });
});
