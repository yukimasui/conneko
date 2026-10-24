/**
 * 展開図の SVG の描き方（記号を回したときの属性の文字の向き）。
 */
import { describe, expect, it } from 'vitest';
import type { SymbolDef } from './format';
import { symbolSvg, upsideDown } from './svg';
import { hits, railRoute, wireNoAt } from './wiring';

const def: SymbolDef = {
  description: 't',
  primitives: [],
  pins: {},
  attributes: [{ tag: 'TAG', at: [5, 0], height: 2.5, align: 'left' }],
};

describe('記号を回したときの属性の文字', () => {
  it('180°・270° は逆さ・上から読む向きになるので、読める向きに直す', () => {
    expect([0, 90, 180, 270, -90].map((r) => upsideDown(r))).toEqual([false, false, true, true, true]);
  });

  it('逆さになる文字は 180° 回し、左寄せを右寄せにして記号の外側へ伸ばす', () => {
    expect(symbolSvg(def, { TAG: 'PL1' }, '#000', 0)).toMatch(/text-anchor="start"/);
    const flipped = symbolSvg(def, { TAG: 'PL1' }, '#000', 180);
    expect(flipped).toMatch(/rotate\(-180\)/);
    expect(flipped).toMatch(/text-anchor="end"/);
    expect(symbolSvg(def, { TAG: 'PL1' }, '#000', 90)).not.toMatch(/rotate/);
  });
});

describe('線番の位置（wireNoAt）', () => {
  it('横の区間の途中に分かれ目があれば、分かれ目で区切った長いほうの空きの中央に置く', () => {
    // 0〜20 の横線の x = 5 から下へ分かれる
    const at = wireNoAt([
      [
        [0, 0],
        [20, 0],
      ],
      [
        [5, 0],
        [5, -10],
      ],
    ]);
    expect(at?.at).toEqual([12.5, 1.8]);
  });

  it('分かれ目がなければ、いちばん長い横の区間の中央', () => {
    expect(
      wireNoAt([
        [
          [0, 0],
          [0, 10],
          [30, 10],
        ],
      ])?.at,
    ).toEqual([15, 11.8]);
  });
});

describe('母線への引き出し（railRoute）', () => {
  it('決まったずらしでは記号を横切る（背の高い記号）ときも、記号の縁の外を回り込む', () => {
    // 端子は高さ ±20 の記号の右の縁から右へ出ていて、母線は左
    const box = { x1: 80, y1: -20, x2: 100, y2: 20 };
    const pl = railRoute({ pos: [100, 0], dir: [1, 0] }, 0, 'n', [box], []);
    expect(hits(pl, [box])).toBe(0);
    expect(pl[pl.length - 1][0]).toBe(0);
  });
});
