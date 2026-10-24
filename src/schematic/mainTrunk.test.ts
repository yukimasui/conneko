/**
 * 主回路の幹線と分岐: 上から下へまっすぐ降りる線を幹線とし、分岐の端子はそこへ T 字に着ける。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { sampleDiagram } from '../model/sample';
import { buildSchematic } from './layout';
import type { Schematic } from './model';
import { tapRoute, trunks, type PinAt } from './wiring';

const pin = (x: number, y: number, dx: number, dy: number): PinAt => ({ pos: [x, y], dir: [dx, dy] as PinAt['dir'] });

describe('幹線（trunks）と分岐（tapRoute）', () => {
  it('同じ x で上の端子が下、下の端子が上を向いていれば幹線にする', () => {
    const pins = [pin(10, 100, 0, -1), pin(10, 40, 0, 1), pin(50, 80, -1, 0)];
    expect(trunks(pins)).toEqual([{ upper: 0, lower: 1, x: 10, y1: 40, y2: 100 }]);
    // 向かい合っていなければ幹線にしない
    expect(trunks([pin(10, 100, 0, 1), pin(10, 40, 0, 1)])).toEqual([]);
  });

  it('幹線の方を向いた横向きの端子は、端子の高さのまま幹線へまっすぐ着ける', () => {
    const list = trunks([pin(10, 100, 0, -1), pin(10, 40, 0, 1)]);
    expect(tapRoute(pin(50, 80, -1, 0), list, 'n', [], [])?.points).toEqual([
      [50, 80],
      [10, 80],
    ]);
    // 幹線と反対を向いている・幹線の高さの外にある端子は着けない
    expect(tapRoute(pin(50, 80, 1, 0), list, 'n', [], [])).toBeUndefined();
    expect(tapRoute(pin(50, 120, -1, 0), list, 'n', [], [])).toBeUndefined();
  });

  it('途中に記号があれば着けない', () => {
    const list = trunks([pin(10, 100, 0, -1), pin(10, 40, 0, 1)]);
    expect(tapRoute(pin(50, 80, -1, 0), list, 'n', [{ x1: 20, y1: 75, x2: 30, y2: 85 }], [])).toBeUndefined();
  });
});

describe('サンプルの主回路', () => {
  const sheetOf = (schematic: Schematic) => {
    const doc = buildSchematic({ ...sampleDiagram, schematic }, getDeviceDefinition).doc;
    const main = schematic.sheets.find((s) => !s.kind && !s.rails?.supply)!;
    return doc.sheets.find((s) => s.id === main.id)!;
  };

  it('遮断器から降りる幹線は 1 本の縦線で、サーキットプロテクタへの分岐は横 1 本で幹線に着く（分かれ目に点）', () => {
    const sheet = sheetOf(sampleDiagram.schematic!);
    const taps = sheet.polylines.filter((l) => l.edge?.includes('CP') && l.points.length === 2 && l.points[0][1] === l.points[1][1] && l.points[1][0] < l.points[0][0]);
    expect(taps.length).toBeGreaterThanOrEqual(4);
    for (const t of taps) {
      const end = t.points[1];
      // 着いた点は、縦の幹線の途中で、接続点がある
      const trunk = sheet.polylines.find((l) => l.points.length === 2 && l.points[0][0] === end[0] && l.points[1][0] === end[0] && Math.min(l.points[0][1], l.points[1][1]) < end[1] && Math.max(l.points[0][1], l.points[1][1]) > end[1]);
      expect(trunk, JSON.stringify(t.points)).toBeDefined();
      expect(sheet.dots.some((d) => d.at[0] === end[0] && d.at[1] === end[1])).toBe(true);
    }
  });
});
