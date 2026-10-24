/**
 * 展開接続図の線の曲がり位置を手で動かす（#21）。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { sampleDiagram } from '../model/sample';
import { setBend } from '../editor/SchematicEditor';
import { buildSchematic } from './layout';
import { parseSchematic, pruneSchematic, renameSchematicDevice, serializeSchematic, wireEdgeElements, wireEdgeKey, type Schematic } from './model';

const build = (schematic: Schematic) => buildSchematic({ ...sampleDiagram, schematic }, getDeviceDefinition).doc;
const base = sampleDiagram.schematic!;
const first = base.sheets.find((s) => !s.kind)!;

describe('線の曲がり位置', () => {
  it('展開接続図の線には、両端の要素の端子のキーが付く（DXF には書かない）', () => {
    const lines = build(base).sheets.find((s) => s.id === first.id)!.polylines;
    const edges = lines.filter((l) => l.edge);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((l) => l.edge!.includes('|') && l.edge!.includes('#'))).toBe(true);
  });

  it('手で決めた位置に、線の真ん中の区間を通す（x: 縦の区間、y: 横の区間）', () => {
    const before = build(base).sheets.find((s) => s.id === first.id)!;
    // 母線以外の、両端の高さが違う線を 1 本選ぶ
    const line = before.polylines.find((l) => l.edge && !l.edge.includes('rail:') && Math.abs(l.points[0][1] - l.points[l.points.length - 1][1]) > 20)!;
    const H = before.paper.height;
    const moved = build(setBend(base, first.id, line.edge!, { x: 222.5 })).sheets.find((s) => s.id === first.id)!;
    const after = moved.polylines.find((l) => l.edge === line.edge)!;
    expect(after.points.some((p, i) => i > 0 && p[0] === 222.5 && after.points[i - 1][0] === 222.5)).toBe(true);
    // 両端の位置が左右にずれた線は、横の区間の高さを動かせる
    const lineY = before.polylines.find((l) => l.edge && !l.edge.includes('rail:') && Math.abs(l.points[0][0] - l.points[l.points.length - 1][0]) > 20)!;
    const movedY = build(setBend(base, first.id, lineY.edge!, { y: 100 })).sheets.find((s) => s.id === first.id)!;
    const afterY = movedY.polylines.find((l) => l.edge === lineY.edge)!;
    expect(afterY.points.some((p, i) => i > 0 && p[1] === H - 100 && afterY.points[i - 1][1] === H - 100)).toBe(true);
  });

  it('母線への引き出しも、横の区間の高さを動かせる', () => {
    const railed = base.sheets.find((s) => !s.kind && s.rails?.supply)!;
    const before = build(base).sheets.find((s) => s.id === railed.id)!;
    const line = before.polylines.find((l) => l.edge?.includes('rail:'))!;
    const sheet = build(setBend(base, railed.id, line.edge!, { y: 37.5 })).sheets.find((s) => s.id === railed.id)!;
    const after = sheet.polylines.find((l) => l.edge === line.edge)!;
    expect(after.points[after.points.length - 1][1]).toBe(sheet.paper.height - 37.5);
  });

  it('保存して読み戻せる。格子に合わせ、自動に戻すと消える', () => {
    const k = wireEdgeKey('MC1:13-14#1', 'PB2:3-4#2');
    const s = setBend(base, first.id, k, { x: 101.2 });
    expect(s.sheets.find((x) => x.id === first.id)!.bends).toEqual({ [k]: { x: 100 } });
    const back = parseSchematic(JSON.parse(JSON.stringify(serializeSchematic(s))));
    expect(back!.sheets.find((x) => x.id === first.id)!.bends).toEqual({ [k]: { x: 100 } });
    expect(setBend(s, first.id, k, null).sheets.find((x) => x.id === first.id)!.bends).toBeUndefined();
    expect(setBend(s, first.id, null, null).sheets.find((x) => x.id === first.id)!.bends).toBeUndefined();
  });

  it('機器名を変えるとキーも付け替わり、置いていない要素の線のキーは消える', () => {
    const el = first.items[0].element;
    const k = wireEdgeKey(`${el}#1`, 'rail:supply');
    const s = setBend(base, first.id, k, { y: 50 });
    const dev = el.slice(0, el.indexOf(':'));
    const renamed = renameSchematicDevice(s, dev, 'NEW1')!;
    const keys = Object.keys(renamed.sheets.find((x) => x.id === first.id)!.bends!);
    expect(keys.map(wireEdgeElements).flat()).toEqual([`NEW1${el.slice(el.indexOf(':'))}`]);
    const devices = new Set(sampleDiagram.devices.map((d) => d.id).filter((d) => d !== dev));
    expect(pruneSchematic(s, devices)!.sheets.find((x) => x.id === first.id)!.bends).toBeUndefined();
  });
});
