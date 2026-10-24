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

describe('電磁接触器を幹線の横にずらしたとき', () => {
  const base = sampleDiagram.schematic!;
  const main = base.sheets.find((s) => !s.kind && !s.rails?.supply)!;
  const shifted = (dx: number) => {
    const schematic: Schematic = {
      ...base,
      sheets: base.sheets.map((sh) => (sh.id !== main.id ? sh : { ...sh, items: sh.items.map((i) => (/^(MC1|THR1|M1)/.test(i.element) ? { ...i, x: i.x + dx } : i)) })),
    };
    const doc = buildSchematic({ ...sampleDiagram, schematic }, getDeviceDefinition).doc;
    return doc.sheets.find((s) => s.id === main.id)!;
  };
  /** 縦と横の線分が途中で交わる数 */
  const crossings = (sheet: ReturnType<typeof shifted>) => {
    const segs = sheet.polylines.filter((l) => l.layer === 'WIRE').flatMap((l) => l.points.slice(1).map((p, i) => [l.points[i], p] as const));
    let n = 0;
    for (const [a, b] of segs) {
      if (a[0] !== b[0]) continue;
      for (const [c, d] of segs) {
        if (c[1] !== d[1]) continue;
        const x = a[0];
        const y = c[1];
        if (x > Math.min(c[0], d[0]) && x < Math.max(c[0], d[0]) && y > Math.min(a[1], b[1]) && y < Math.max(a[1], b[1])) n++;
      }
    }
    return n;
  };

  it('遮断器から下ろした線を横に曲げて電磁接触器へ入れる（右へずらしても左へずらしても、分岐を横切る交差は増えない）', () => {
    const aligned = crossings(shifted(0));
    // 右へずらすと R・S の線が T の幹線を、左へずらすと S・T の線が R の幹線を横切るのはしかたない（それぞれ 3 本まで）
    expect(crossings(shifted(60))).toBeLessThanOrEqual(aligned + 3);
    expect(crossings(shifted(-35))).toBeLessThanOrEqual(aligned + 3);
  });

  it('遮断器の二次側の端子から、まっすぐ下へ線を下ろす', () => {
    const sheet = shifted(60);
    const elb = sheet.inserts.find((i) => i.element?.startsWith('ELB1'))!;
    const downs = sheet.polylines.filter((l) => l.points.length === 2 && l.points[0][0] === l.points[1][0] && l.points[0][1] < elb.at[1] && l.points[0][1] > l.points[1][1] && l.points[0][1] > elb.at[1] - 15);
    expect(downs.length).toBeGreaterThanOrEqual(3);
  });
});
