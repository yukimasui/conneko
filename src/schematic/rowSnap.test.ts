/**
 * 制御回路のシートの記号の上下の位置と、母線の上端。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { sampleDiagram } from '../model/sample';
import { snapItem } from '../editor/SchematicEditor';
import { buildSchematic, ROW_PITCH, ROW_TOP } from './layout';
import type { Schematic } from './model';

const build = (schematic: Schematic) => buildSchematic({ ...sampleDiagram, schematic }, getDeviceDefinition).doc;
const base = sampleDiagram.schematic!;
const railed = base.sheets.find((s) => !s.kind && s.rails?.supply)!;
const main = base.sheets.find((s) => !s.kind && !s.rails?.supply)!;

describe('制御回路のシートの段', () => {
  it('母線のあるシートでは、上下はいちばん近い段にそろえ、左右は格子にそろえる', () => {
    expect(snapItem(base, railed, 101.2, ROW_TOP + 2 * ROW_PITCH + 6)).toEqual({ x: 100, y: ROW_TOP + 2 * ROW_PITCH });
    expect(snapItem(base, railed, 50, ROW_TOP + 2 * ROW_PITCH + 8)).toEqual({ x: 50, y: ROW_TOP + 3 * ROW_PITCH });
    // 段より上・下には出さない
    expect(snapItem(base, railed, 50, 0).y).toBe(ROW_TOP);
  });

  it('主回路のシートは格子（2.5mm）にそろえるだけ', () => {
    expect(snapItem(base, main, 50, 61.5)).toEqual({ x: 50, y: 62.5 });
  });

  it('いちばん上の記号を下へ動かしても、母線の上端と線番の位置は動かない', () => {
    const railTops = (s: Schematic) => {
      const sheet = build(s).sheets.find((x) => x.id === railed.id)!;
      return sheet.polylines.filter((l) => l.layer === 'WIRE' && l.points.length === 2 && l.points[0][0] === l.points[1][0]).map((l) => Math.max(l.points[0][1], l.points[1][1]));
    };
    const before = Math.max(...railTops(base));
    const topY = Math.min(...railed.items.map((i) => i.y));
    const moved: Schematic = {
      ...base,
      sheets: base.sheets.map((sh) => (sh.id !== railed.id ? sh : { ...sh, items: sh.items.map((i) => (i.y === topY ? { ...i, y: i.y + 4 * ROW_PITCH } : i)) })),
    };
    expect(Math.max(...railTops(moved))).toBe(before);
  });
});
