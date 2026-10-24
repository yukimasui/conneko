import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../../devices/registry';
import type { DeviceDefinition, TerminalDef } from '../../devices/types';
import type { Diagram, DiagramWire } from '../../model/diagram';
import { movePneumatic, resetPneumatic } from '../../editor/SchematicEditor';
import { sampleDiagram } from '../../model/sample';
import { buildSchematic } from '../layout';
import { parseSchematic, pneumaticElement, serializeSchematic, type Schematic, type SchematicItem } from '../model';
import { hits } from '../wiring';
import { sheetSvg } from '../svg';
import { pipeRoute } from './pneumatic';

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
    expect(texts).toContain('-01-06SA');
  });

  it('エア機器がなければ案内を書く', () => {
    const d: Diagram = { devices: [], wires: [], schematic: { sheets: [{ id: 'D1', name: '空圧', kind: 'pneumatic', items: [] }] } };
    expect(buildSchematic(d, lookup).doc.sheets[0].texts.some((t) => t.text.includes('エア機器'))).toBe(true);
  });
});

describe('空圧回路図の記号をドラッグで動かす', () => {
  const withItems = (items: SchematicItem[], paper?: 'A1'): Diagram => ({
    ...circuit(),
    schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', ...(paper ? { paper } : {}), items }] },
  });
  const textAt = (b: ReturnType<typeof buildSchematic>, text: string) => b.doc.sheets[0].texts.find((t) => t.text === text)!.at;

  it('機器ごとに動かせるまとまりがあり、動かしていなければ自動の位置に置く', () => {
    const b = buildSchematic(circuit(), lookup);
    const groups = b.pneumaticGroups.get('D1')!;
    expect(groups.map((g) => g.device).sort()).toEqual(['AIR1', 'CY1', 'CY2', 'FR1', 'SC1', 'SC2', 'SOL1', 'SOL2']);
    for (const g of groups) {
      expect(g.element).toBe(pneumaticElement(g.device));
      // つかむ範囲は外形の左上を含む
      expect(g.bounds.x).toBeLessThanOrEqual(g.origin[0]);
      expect(g.bounds.y).toBeLessThanOrEqual(g.origin[1]);
    }
  });

  it('items の位置（外形の左上）へ動かし、ほかの記号は動かさない。配管は動かした記号の端へ引き直す', () => {
    const before = buildSchematic(circuit(), lookup);
    const g = before.pneumaticGroups.get('D1')!.find((x) => x.device === 'CY1')!;
    const after = buildSchematic(withItems([{ element: 'CY1:pneumatic', x: g.origin[0] + 200, y: g.origin[1] + 20 }]), lookup);
    const moved = after.pneumaticGroups.get('D1')!.find((x) => x.device === 'CY1')!;
    expect(moved.origin).toEqual([g.origin[0] + 200, g.origin[1] + 20]);
    // 機器名・型式も一緒に動く（展開図 JSON は y が上向き）
    const [x0, y0] = textAt(before, 'CY1');
    expect(textAt(after, 'CY1')).toEqual([x0 + 200, y0 - 20]);
    expect(textAt(after, 'SC1')).toEqual(textAt(before, 'SC1'));
    // シリンダの下端（ポート）に配管がつながる
    const H = after.doc.sheets[0].paper.height;
    const bottom = H - (moved.origin[1] + 10);
    const ends = after.doc.sheets[0].polylines.filter((p) => p.layer === 'WIRE').flatMap((p) => [p.points[0], p.points[p.points.length - 1]]);
    const atCylinder = ends.filter(([x, y]) => Math.abs(y - bottom) < 0.01 && x > moved.origin[0] && x < moved.origin[0] + 52);
    expect(atCylinder.length).toBe(2);
  });

  it('自動配置に戻すと、動かす前と同じ図になる', () => {
    const s0: Schematic = withItems([]).schematic!;
    const moved = movePneumatic(s0, 'D1', 'SC1:pneumatic', { x: 101.2, y: 49.9 });
    expect(moved.sheets[0].items).toEqual([{ element: 'SC1:pneumatic', x: 100, y: 50 }]);
    const reset = resetPneumatic(movePneumatic(moved, 'D1', 'CY2:pneumatic', { x: 300, y: 50 }), 'D1', 'CY2:pneumatic');
    expect(reset.sheets[0].items.map((i) => i.element)).toEqual(['SC1:pneumatic']);
    expect(resetPneumatic(reset, 'D1').sheets[0].items).toEqual([]);
    const a = buildSchematic(circuit(), lookup).doc.sheets[0];
    const b = buildSchematic({ ...circuit(), schematic: resetPneumatic(moved, 'D1') }, lookup).doc.sheets[0];
    expect(b).toEqual(a);
  });

  it('マニホールドは装着した弁ごと動かす', () => {
    const sheet = sampleDiagram.schematic!.sheets.find((s) => s.kind === 'pneumatic')!;
    const build = (items: SchematicItem[]) => buildSchematic({ ...sampleDiagram, schematic: { sheets: [{ ...sheet, items }] } }, getDeviceDefinition);
    const before = build([]);
    const groups = before.pneumaticGroups.get(sheet.id)!;
    const mf = groups.find((g) => g.device === 'MF1')!;
    // 装着した弁は単独では動かさない
    expect(groups.some((g) => g.device === 'SOL1')).toBe(false);
    const after = build([{ element: 'MF1:pneumatic', x: mf.origin[0] + 50, y: mf.origin[1] + 30 }]);
    const page = (b: typeof before) => b.doc.sheets.find((p) => p.source === sheet.id)!;
    const find = (b: typeof before, prefix: string) => page(b).texts.find((t) => t.text.startsWith(prefix))!.at;
    expect(find(after, 'SOL1')).toEqual([find(before, 'SOL1')[0] + 50, find(before, 'SOL1')[1] - 30]);
    expect(find(after, 'MF1')).toEqual([find(before, 'MF1')[0] + 50, find(before, 'MF1')[1] - 30]);
    expect(find(after, 'CY1')).toEqual(find(before, 'CY1'));
  });

  it('動かした位置を保存して読み戻す（回転などは持たない。シートごとに別の位置）', () => {
    const back = parseSchematic({
      sheets: [
        { id: 'P1', name: '空圧 1', kind: 'pneumatic', items: [{ element: 'CY1:pneumatic', x: 10.004, y: 20, rotation: 90 }, { element: 'CY1:pneumatic', x: 1, y: 1 }] },
        { id: 'P2', name: '空圧 2', kind: 'pneumatic', items: [{ element: 'CY1:pneumatic', x: 30, y: 40 }] },
        { id: 'B', name: '部品表', kind: 'bom', items: [{ element: 'CY1:pneumatic', x: 30, y: 40 }] },
      ],
    })!;
    expect(back.sheets.map((s) => s.items)).toEqual([[{ element: 'CY1:pneumatic', x: 10.004, y: 20 }], [{ element: 'CY1:pneumatic', x: 30, y: 40 }], []]);
    expect(serializeSchematic(back).sheets[0].items).toEqual([{ element: 'CY1:pneumatic', x: 10, y: 20 }]);
  });

  it('用紙が大きければその用紙で描く', () => {
    const b = buildSchematic(withItems([], 'A1'), lookup);
    expect(b.doc.sheets[0].paper).toEqual({ width: 841, height: 594 });
  });

  it('配管は記号を横切らないよう脇を回り、別の配管と重ならない', () => {
    // a（上向き）から b（下向き）へ。間に記号がある
    const box = { x1: 20, y1: 40, x2: 80, y2: 60 };
    const pl = pipeRoute({ pos: [50, 100], dir: [0, -1] }, { pos: [50, 10], dir: [0, 1] }, 'n1', [box], []);
    expect(hits(pl, [box])).toBe(0);
    expect(pl[0]).toEqual([50, 100]);
    expect(pl[pl.length - 1]).toEqual([50, 10]);
    for (let i = 0; i + 1 < pl.length; i++) expect(pl[i][0] === pl[i + 1][0] || pl[i][1] === pl[i + 1][1]).toBe(true);
    // 向かい合っていればまっすぐ
    expect(pipeRoute({ pos: [0, 5], dir: [1, 0] }, { pos: [30, 5], dir: [-1, 0] }, 'n2', [], [])).toEqual([
      [0, 5],
      [30, 5],
    ]);
  });
});

describe('空圧回路図の文字の重なり（#34）', () => {
  /** サンプル図面の空圧回路図のページ */
  const samplePage = (paper?: 'A1') => {
    const sheets = sampleDiagram.schematic!.sheets.map((s) => (s.kind === 'pneumatic' && paper ? { ...s, paper } : s));
    const b = buildSchematic({ ...sampleDiagram, schematic: { ...sampleDiagram.schematic!, sheets } }, getDeviceDefinition);
    const id = sheets.find((s) => s.kind === 'pneumatic')!.id;
    return b.doc.sheets.find((s) => (s.source ?? s.id) === id)!;
  };

  it('マニホールドの破線の枠は、ソレノイドの名前と弁の型式を囲む', () => {
    const page = samplePage();
    const frame = page.polylines.find((p) => p.dashed && p.closed && page.texts.some((t) => t.text.startsWith('SOL1') && inside(t.at, p.points)))!;
    expect(frame).toBeTruthy();
    // MF1 の弁（SOL1・SOL2、SY3140・SY3240）の名前と型式
    for (const t of page.texts.filter((x) => /^SOL[12]|^SY3[12]40/.test(x.text))) expect(inside(t.at, frame.points), t.text).toBe(true);
  });

  it('図面枠に区分け（列番号・行記号）を付ける', () => {
    const page = samplePage();
    const frameTexts = page.texts.filter((t) => t.layer === 'FRAME').map((t) => t.text);
    expect(frameTexts).toEqual(expect.arrayContaining(['1', '2', '3', 'A', 'B', 'C']));
  });

  it('大きい用紙では、記号の並びを用紙の中央に寄せる', () => {
    const a3 = samplePage();
    const a1 = samplePage('A1');
    const xOf = (p: typeof a3) => p.texts.find((t) => t.text === 'AIR1')!.at[0];
    expect(xOf(a3)).toBeLessThan(60);
    expect(xOf(a1)).toBeGreaterThan(150);
  });
});

/** 点が多角形（軸に平行な四角）の内側にあるか */
function inside([x, y]: [number, number], pts: [number, number][]): boolean {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return x > Math.min(...xs) && x < Math.max(...xs) && y > Math.min(...ys) && y < Math.max(...ys);
}
