import { describe, expect, it } from 'vitest';
import { CALLOUT_GAP, calloutSize, layoutCallouts, type CalloutInput, type PlacedCallout } from './calloutLayout';

/** 吹き出しの矩形 [左, 上, 右, 下] */
function rect(p: PlacedCallout): number[] {
  const { w, h } = calloutSize(p.text, p.side);
  if (p.side === 'left') return [p.ax - w, p.ay - h / 2, p.ax, p.ay + h / 2];
  if (p.side === 'right') return [p.ax, p.ay - h / 2, p.ax + w, p.ay + h / 2];
  if (p.side === 'top') return [p.ax - w / 2, p.ay - h, p.ax + w / 2, p.ay];
  return [p.ax - w / 2, p.ay, p.ax + w / 2, p.ay + h];
}
const overlap = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const noOverlap = (ps: PlacedCallout[]) => {
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (overlap(rect(ps[i]), rect(ps[j]))) return false;
  return true;
};

describe('layoutCallouts', () => {
  it('重ならない吹き出しは端子のすぐ横に置き、引出線を引かない', () => {
    const ps = layoutCallouts([
      { id: 'A', side: 'left', x: 0, y: 0, text: 'A 入力' },
      { id: 'B', side: 'left', x: 0, y: 40, text: 'B 入力' },
      { id: 'C', side: 'top', x: 50, y: 0, text: 'C' },
    ]);
    expect(ps.find((p) => p.id === 'A')).toMatchObject({ ax: -CALLOUT_GAP, ay: 0 });
    expect(ps.find((p) => p.id === 'B')).toMatchObject({ ax: -CALLOUT_GAP, ay: 40 });
    expect(ps.find((p) => p.id === 'C')).toMatchObject({ ax: 50, ay: -CALLOUT_GAP });
    expect(ps.every((p) => !p.leader)).toBe(true);
  });

  it('密集した端子（XSEL のシステム I/O、ピッチ 7px）の吹き出しを重ならないよう一列に並べ、引出線でつなぐ', () => {
    const inputs: CalloutInput[] = Array.from({ length: 10 }, (_, i) => ({ id: `T${i}`, side: 'left', x: 100, y: i * 7, text: `EMG${i} 非常停止` }));
    const ps = layoutCallouts(inputs);
    expect(noOverlap(ps)).toBe(true);
    expect(ps.every((p) => p.leader)).toBe(true);
    // 端子の並びの順を保ち、列は端子の外側にそろう
    const ys = inputs.map((c) => ps.find((p) => p.id === c.id)!.ay);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(new Set(ps.map((p) => p.ax)).size).toBe(1);
    expect(ps[0].ax).toBeLessThan(100 - CALLOUT_GAP);
    // 列の中心は端子の並びの中心
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(31.5);
  });

  it('並べ直した組がほかの吹き出しに重なれば、それも組に加える', () => {
    const inputs: CalloutInput[] = [
      ...Array.from({ length: 6 }, (_, i): CalloutInput => ({ id: `S${i}`, side: 'left', x: 100, y: i * 7, text: '長い呼び名の端子' })),
      { id: 'X', side: 'left', x: 60, y: 50, text: '別の端子' },
    ];
    expect(noOverlap(layoutCallouts(inputs))).toBe(true);
  });

  it('一列に密集した多数の端子（MIL ケーブルの芯線）は、段に分けて互い違いに並べ、印字だけの短い文字にする', () => {
    const inputs: CalloutInput[] = Array.from({ length: 40 }, (_, i) => ({
      id: `${i + 1}`,
      side: 'bottom',
      x: i * 9,
      y: 0,
      text: `芯線 ${i + 1} コネクタの…`,
      short: `芯線 ${i + 1}`,
    }));
    const ps = layoutCallouts(inputs);
    expect(noOverlap(ps)).toBe(true);
    expect(new Set(ps.map((p) => p.ay)).size).toBeGreaterThan(1);
    expect(ps.every((p) => p.text.startsWith('芯線') && !p.text.includes('コネクタ'))).toBe(true);
    // 一列に並べるより横に広がらない（一列なら 40 × 17px ほど）
    const xs = ps.map((p) => p.ax);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(40 * 17 * 0.7);
  });

  it('段に分けない組は短い文字に置き換えない', () => {
    const inputs: CalloutInput[] = [
      { id: 'A1', side: 'top', x: 0, y: 0, text: 'A1 コイル+', short: 'A1' },
      { id: 'A2', side: 'top', x: 10, y: 0, text: 'A2 コイル−', short: 'A2' },
    ];
    const ps = layoutCallouts(inputs);
    expect(noOverlap(ps)).toBe(true);
    expect(ps.map((p) => p.text)).toEqual(['A1 コイル+', 'A2 コイル−']);
  });

  it('渡した大きさで並べる', () => {
    const inputs: CalloutInput[] = [
      { id: 'A', side: 'right', x: 0, y: 0, text: 'a' },
      { id: 'B', side: 'right', x: 0, y: 20, text: 'b' },
    ];
    expect(layoutCallouts(inputs).every((p) => !p.leader)).toBe(true);
    const tall = layoutCallouts(inputs, () => ({ w: 20, h: 30 }));
    expect(Math.abs(tall[1].ay - tall[0].ay)).toBeGreaterThanOrEqual(30);
  });
});
