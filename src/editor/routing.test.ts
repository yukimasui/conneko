import { describe, expect, it } from 'vitest';
import { assignLanes, autoInner, lCorner, manualRoute, orthogonalize, routeWire } from './routing';

describe('routeWire', () => {
  it('上下の端子を直交配線でつなぐ', () => {
    const { points } = routeWire({ sx: 0, sy: 0, sSide: 'bottom', tx: 100, ty: 200, tSide: 'top' }, 0);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 100, y: 200 });
  });
});

describe('L 字の経路', () => {
  // 下向きの端子（センサーの芯線など）から、右下にあるリンク（左向き）へ
  const down = { sx: 0, sy: 0, sSide: 'bottom' as const, tx: 21, ty: 100, tSide: 'left' as const };

  it('上下と左右に出る端子どうしは、角が両方の外側にあれば角 1 つでつなぐ', () => {
    expect(lCorner(down)).toEqual({ x: 0, y: 100 });
    expect(routeWire(down, 0).points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 21, y: 100 },
    ]);
    // 編集用の頂点もスタブの先・角・スタブの先
    expect(autoInner(down, 0)).toEqual([
      { x: 0, y: 30 },
      { x: 0, y: 100 },
      { x: -9, y: 100 },
    ]);
  });

  it('角が端子の内側や近すぎる位置になるときは、従来の経路にする', () => {
    // リンクが端子の左にある（角がリンクの裏側になる）
    expect(lCorner({ ...down, tx: -30 })).toBeUndefined();
    // リンクが端子のすぐ下（下へ出す長さが足りない）
    expect(lCorner({ ...down, ty: 10 })).toBeUndefined();
    // 端子が機器の奥にありスタブが長いときは、スタブの長さ以上離れていること
    expect(lCorner({ ...down, sStub: 120 })).toBeUndefined();
    // 両端が同じ向きの系統（上下と上下）は対象外
    expect(lCorner({ sx: 0, sy: 0, sSide: 'bottom', tx: 100, ty: 200, tSide: 'top' })).toBeUndefined();
  });

  it('曲がり位置をずらした電線は L 字にしない', () => {
    expect(routeWire(down, 20).points.length).toBeGreaterThan(3);
  });

  it('L 字の電線はレーンの割り当ての対象にしない', () => {
    const lanes = assignLanes([
      { ...down, id: 'a', manual: false },
      { ...down, id: 'b', sx: 5, manual: false },
    ]);
    expect(lanes.size).toBe(0);
  });
});

describe('assignLanes', () => {
  it('平行に走る配線を別々のレーンに振り分ける', () => {
    const wire = (id: string, x: number) => ({ id, sx: x, sy: 0, sSide: 'bottom' as const, tx: x + 100, ty: 200, tSide: 'top' as const, manual: false });
    const lanes = assignLanes([wire('a', 0), wire('b', 20), wire('c', 40)]);
    const values = ['a', 'b', 'c'].map((id) => lanes.get(id));
    expect(new Set(values).size).toBe(3);
    // 右下へ向かう配線は、左側の配線ほど下のレーンを通ると交差しない
    expect(values[0]!).toBeGreaterThan(values[2]!);
  });

  it('手動で調整した配線はレーン割り当ての対象外', () => {
    const lanes = assignLanes([
      { id: 'a', sx: 0, sy: 0, sSide: 'bottom', tx: 100, ty: 200, tSide: 'top', manual: true },
      { id: 'b', sx: 20, sy: 0, sSide: 'bottom', tx: 120, ty: 200, tSide: 'top', manual: false },
    ]);
    expect(lanes.size).toBe(0);
  });
});

describe('routeWire（同じ向きの端子）', () => {
  it('上向きの端子どうしは、両方の端子より上で折り返す', () => {
    const { points } = routeWire({ sx: 0, sy: 0, sSide: 'top', tx: 300, ty: 200, tSide: 'top', sStub: 20, tStub: 20 }, 0);
    expect(Math.min(...points.map((p) => p.y))).toBe(-20);
    // 始点側の機器を下向きに横切らない
    expect(points.filter((p) => p.x === 0).every((p) => p.y <= 0)).toBe(true);
  });
});

describe('手で編集した経路', () => {
  it('そろっていない点の間に角を入れて直交にする', () => {
    expect(orthogonalize([{ x: 0, y: 0 }, { x: 10, y: 20 }], true)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
    ]);
  });

  it('スタブの先から経路の頂点を通り、直交の折れ線になる', () => {
    const e = { sx: 0, sy: 0, sSide: 'bottom' as const, tx: 100, ty: 0, tSide: 'bottom' as const, sStub: 30, tStub: 30 };
    const { points } = manualRoute(e, [{ x: 0, y: 80 }, { x: 100, y: 80 }]);
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 80 },
      { x: 100, y: 80 },
      { x: 100, y: 0 },
    ]);
    for (let i = 1; i < points.length; i++) expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true);
  });
});
