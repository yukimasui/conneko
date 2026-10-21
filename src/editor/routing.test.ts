import { describe, expect, it } from 'vitest';
import { assignLanes, routeWire } from './routing';

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
