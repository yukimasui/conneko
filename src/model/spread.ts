/**
 * 一列に並べるものの位置を、重ならないよう詰めて決める（吹き出し・リンクの並べ直しで使う）。
 */

/**
 * 望む位置（中心）の並びを、大きさぶん重ならないよう詰めて並べる。ずらす量の合計が小さくなるよう、
 * 重なった組は組の中心が望む位置の平均になるように置く。items は望む位置の昇順。返り値は各中心。
 * space は並べたものどうしの隙間
 */
export function spread(items: { want: number; size: number }[], space = 0): number[] {
  type Block = { idx: number[]; offsets: number[]; sum: number; total: number; top: number };
  const blocks: Block[] = [];
  items.forEach((it, i) => {
    let b: Block = { idx: [i], offsets: [0], sum: it.want - it.size / 2, total: it.size, top: it.want - it.size / 2 };
    while (blocks.length) {
      const prev = blocks[blocks.length - 1];
      if (prev.top + prev.total + space <= b.top) break;
      blocks.pop();
      const shift = prev.total + space;
      const n = prev.idx.length + b.idx.length;
      const sum = prev.sum + b.sum - b.idx.length * shift;
      b = {
        idx: [...prev.idx, ...b.idx],
        offsets: [...prev.offsets, ...b.offsets.map((o) => o + shift)],
        sum,
        total: prev.total + space + b.total,
        top: sum / n,
      };
    }
    blocks.push(b);
  });
  const centers: number[] = new Array(items.length);
  for (const b of blocks) b.idx.forEach((i, k) => (centers[i] = b.top + b.offsets[k] + items[i].size / 2));
  return centers;
}
