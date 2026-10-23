import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { pageNameOf, printableArea, printPageCss } from '../export/printPages';
import { sampleDiagram } from '../model/sample';
import { autoLayout } from './autoLayout';
import { PAPER_SIZES } from './format';
import { buildSchematic, rowsPerSheet } from './layout';
import { paperOf, paperSizeOf, parseSchematic, serializeSchematic, type Schematic, type SchematicSheet } from './model';

const build = (sheets: SchematicSheet[], settings?: Schematic['settings']) =>
  buildSchematic({ ...sampleDiagram, schematic: { ...(settings ? { settings } : {}), sheets } }, getDeviceDefinition);

describe('A3 より大きい用紙', () => {
  it('A2・A1・A0 を選べ、知らない名前は読み飛ばす（既存の JSON は A3 のまま）', () => {
    expect(PAPER_SIZES.A2).toEqual({ width: 594, height: 420 });
    expect(PAPER_SIZES.A1).toEqual({ width: 841, height: 594 });
    expect(PAPER_SIZES.A0).toEqual({ width: 1189, height: 841 });
    expect(paperSizeOf('A1')).toBe('A1');
    expect(paperSizeOf('toString')).toBeUndefined();
    expect(paperSizeOf('B4')).toBeUndefined();
    const old = parseSchematic({ sheets: [{ id: 'D1', name: '主回路', items: [] }] })!;
    expect(paperOf(old, old.sheets[0])).toEqual(PAPER_SIZES.A3);
    const back = parseSchematic({ settings: { paper: 'A1' }, sheets: [{ id: 'D1', name: 'a', items: [] }, { id: 'D2', name: 'b', paper: 'A0', items: [] }, { id: 'D3', name: 'c', paper: 'constructor', items: [] }] })!;
    expect(back.settings).toEqual({ paper: 'A1' });
    expect(back.sheets.map((s) => paperOf(back, s).width)).toEqual([841, 1189, 841]);
    expect(serializeSchematic(back)).toEqual({ settings: { paper: 'A1' }, sheets: [{ id: 'D1', name: 'a', items: [] }, { id: 'D2', name: 'b', paper: 'A0', items: [] }, { id: 'D3', name: 'c', items: [] }] });
  });

  it('図面枠・表題欄・行番号・母線が用紙に合わせて広がる', () => {
    const sheet = sampleDiagram.schematic!.sheets.find((s) => s.rails?.supply)!;
    const b = build([{ ...sheet, paper: 'A1' }]);
    const out = b.doc.sheets[0];
    expect(out.paper).toEqual(PAPER_SIZES.A1);
    // 図面枠は用紙の 10mm 内側、表題欄は右下
    expect(out.polylines[out.polylines.length - 4].points).toEqual([[10, 10], [831, 10], [831, 584], [10, 584]]);
    expect(out.texts.some((t) => t.text === '1 / 1' && t.at[0] === 841 - 22.5)).toBe(true);
    // 段の数（行番号）は用紙の高さで増える
    expect(b.rowsOf(sheet.id)).toBe(rowsPerSheet(594));
    expect(b.rowsOf(sheet.id)).toBeGreaterThan(rowsPerSheet(297) * 2 - 2);
    expect(out.texts.some((t) => t.text === String(b.rowsOf(sheet.id)) && t.layer === 'FRAME')).toBe(true);
  });

  it('左右に分けた母線は用紙の右端から同じ距離に置く', () => {
    const sheet = sampleDiagram.schematic!.sheets.find((s) => s.rails?.supply)!;
    const b = build([{ ...sheet, rails: { ...sheet.rails, layout: 'sides' }, paper: 'A2' }]);
    const xs = b.doc.sheets[0].polylines.filter((p) => p.layer === 'WIRE' && p.points.length === 2 && p.points[0][0] === p.points[1][0]).map((p) => p.points[0][0]);
    expect(xs).toContain(594 - 40);
  });

  it('表のシートは大きい用紙ほどページが少ない', () => {
    const io = (paper?: 'A1'): SchematicSheet => ({ id: 'IO', name: 'I/O 図', kind: 'io', rails: { supply: 'PSU1.+V1', common: 'PSU1.-V1' }, ...(paper ? { paper } : {}), items: [] });
    const a3 = build([io()]).doc.sheets.length;
    const a1 = build([io('A1')]).doc.sheets;
    expect(a1.length).toBeLessThan(a3);
    expect(a1.every((p) => p.paper.width === 841)).toBe(true);
  });

  it('自動配置は用紙の右の母線の近くまで使う', () => {
    const sheet = sampleDiagram.schematic!.sheets.find((s) => s.rails?.supply)!;
    const s: Schematic = { sheets: [{ ...sheet, rails: { ...sheet.rails, layout: 'sides' }, paper: 'A1', items: [] }] };
    const b = buildSchematic({ ...sampleDiagram, schematic: s }, getDeviceDefinition);
    const r = autoLayout(b, s, sheet.id, paperOf(s, s.sheets[0]));
    expect(r.placed).toBeGreaterThan(0);
    const items = r.schematic.sheets[0].items;
    expect(Math.max(...items.map((i) => i.x))).toBeGreaterThan(700);
    for (const it of items) expect(it.x).toBeLessThan(841 - 40);
    for (const it of items) expect(it.y).toBeLessThan(594 - 45);
  });
});

describe('印刷のページの大きさ', () => {
  it('概念図・一覧は選んだ用紙、展開図のページは用紙ごとの名前付きページにする', () => {
    expect(printableArea('A1')).toEqual({ w: 841 - 16, h: 594 - 16 });
    const css = printPageCss('A3', [PAPER_SIZES.A1, PAPER_SIZES.A3, PAPER_SIZES.A1]);
    expect(css).toContain('@page { size: A3 landscape; margin: 8mm; }');
    expect(css).toContain(`@page ${pageNameOf(PAPER_SIZES.A1)} { size: 841mm 594mm; margin: 0; }`);
    expect(css).toContain('@page conneko-420x297 { size: 420mm 297mm; margin: 0; }');
    expect(css.match(/conneko-841x594/g)?.length).toBe(1);
  });
});
