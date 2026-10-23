/**
 * 端子の吹き出しの並べ方。
 *
 * 吹き出しは端子から電線が出る向きの外側に置く。端子が密集していて吹き出しどうしが重なるときは、
 * 重なる吹き出しの組を端子の並びに沿って詰めて一列に並べ直し、端子と吹き出しを引出線でつなぐ。
 * 重ならない吹き出しは端子のすぐ横（従来どおり）に置く。座標はすべて機器の座標系[px]。
 */
import type { TerminalSide } from '../devices/types';

/** 端子から吹き出しまでの距離 */
export const CALLOUT_GAP = 7;
/** 並べ直した吹き出しを、引出線のぶん外へ離す距離 */
export const CALLOUT_FAN = 14;
/** 並べた吹き出しどうしの隙間 */
const SPACE = 1;
/** この距離より大きくずらした吹き出しの組だけ、外へ離して引出線を引く（わずかな調整は引出線なし） */
const NUDGE = 3;
/** 互い違いに並べるときの最大の段数 */
const MAX_TIERS = 4;

export interface CalloutInput {
  id: string;
  side: TerminalSide;
  /** 端子の位置 */
  x: number;
  y: number;
  text: string;
  /** 密集して吹き出しを段に重ねるときに代わりに出す短い文字（端子の印字だけ）。text と同じなら省略 */
  short?: string;
}

export interface PlacedCallout {
  id: string;
  side: TerminalSide;
  text: string;
  /** 吹き出しの端子側の辺の中点（left なら右辺の中点、top なら下辺の中点） */
  ax: number;
  ay: number;
  /** 引出線（端子から吹き出しまでの折れ線）。端子のすぐ横に置いたときは undefined */
  leader?: [number, number][];
}

const isWide = (ch: string) => !/[\x20-\x7e]/.test(ch);

/** 吹き出しの大きさ（画面では実際の大きさを測って渡す） */
export type CalloutSizer = (text: string, side: TerminalSide) => { w: number; h: number };

/**
 * 吹き出しの大きさの見積もり（styles.css の .terminal-callout に合わせる: 文字 10px・行高 1.2・余白・枠線）。
 * 左右の吹き出しは横書き、上下の吹き出しは縦書き（英字も立てる）
 */
export function calloutSize(text: string, side: TerminalSide): { w: number; h: number } {
  const chars = [...text];
  if (side === 'left' || side === 'right') {
    return { w: chars.reduce((s, ch) => s + (isWide(ch) ? 10 : 6), 0) + 8, h: 16 };
  }
  return { w: 16, h: chars.length * 10 + 8 };
}

interface Item extends CalloutInput {
  w: number;
  h: number;
}

const horizontal = (side: TerminalSide) => side === 'left' || side === 'right';
/** 端子の並びに沿った向き（左右の吹き出しは y、上下は x）の位置と大きさ */
const along = (it: Item) => (horizontal(it.side) ? it.y : it.x);
const alongSize = (it: Item) => (horizontal(it.side) ? it.h : it.w);

/**
 * 望む位置（中心）の並びを、大きさぶん重ならないよう詰めて並べる。ずらす量の合計が小さくなるよう、
 * 重なった組は組の中心が望む位置の平均になるように置く。items は望む位置の昇順。返り値は各中心
 */
function spread(items: { want: number; size: number }[]): number[] {
  type Block = { idx: number[]; offsets: number[]; sum: number; total: number; top: number };
  const blocks: Block[] = [];
  items.forEach((it, i) => {
    let b: Block = { idx: [i], offsets: [0], sum: it.want - it.size / 2, total: it.size, top: it.want - it.size / 2 };
    while (blocks.length) {
      const prev = blocks[blocks.length - 1];
      if (prev.top + prev.total + SPACE <= b.top) break;
      blocks.pop();
      const shift = prev.total + SPACE;
      const n = prev.idx.length + b.idx.length;
      const sum = prev.sum + b.sum - b.idx.length * shift;
      b = {
        idx: [...prev.idx, ...b.idx],
        offsets: [...prev.offsets, ...b.offsets.map((o) => o + shift)],
        sum,
        total: prev.total + SPACE + b.total,
        top: sum / n,
      };
    }
    blocks.push(b);
  });
  const centers: number[] = new Array(items.length);
  for (const b of blocks) b.idx.forEach((i, k) => (centers[i] = b.top + b.offsets[k] + items[i].size / 2));
  return centers;
}

/** 端子から電線の向きへ d だけ出た点 */
function beside(it: Item, d: number): [number, number] {
  switch (it.side) {
    case 'left':
      return [it.x - d, it.y];
    case 'right':
      return [it.x + d, it.y];
    case 'top':
      return [it.x, it.y - d];
    case 'bottom':
      return [it.x, it.y + d];
  }
}

/**
 * 組の吹き出しの、端子の並びに沿った位置と段数を決める（sorted は並びの昇順）。
 * 一列に並べるか、数段に分けて互い違いに並べるか。端子が一列に密集していると一列では横に長く広がるので、
 * ずらす量と段を重ねて外へ出る量の和が小さい段数にする
 */
function arrange(sorted: Item[]) {
  const side = sorted[0].side;
  // 吹き出しの段の深さ（電線の向きの大きさ。左右の吹き出しは幅、上下は縦書きの長さ）
  const depth = Math.max(...sorted.map((it) => (horizontal(side) ? it.w : it.h))) + SPACE;
  let best: { tiers: number; centers: number[]; moved: number; cost: number; depth: number } | undefined;
  for (let tiers = 1; tiers <= Math.min(MAX_TIERS, sorted.length); tiers++) {
    const centers: number[] = new Array(sorted.length);
    for (let t = 0; t < tiers; t++) {
      const idx = sorted.flatMap((_, i) => (i % tiers === t ? [i] : []));
      const c = spread(idx.map((i) => ({ want: along(sorted[i]), size: alongSize(sorted[i]) })));
      idx.forEach((i, k) => (centers[i] = c[k]));
    }
    const moved = Math.max(...sorted.map((it, i) => Math.abs(centers[i] - along(it))));
    const cost = moved + (tiers - 1) * depth;
    if (!best || cost < best.cost) best = { tiers, centers, moved, cost, depth };
  }
  return best!;
}

/** 組（同じ向きの吹き出しの集まり）を並べる */
function placeGroup(group: Item[], size: CalloutSizer): PlacedCallout[] {
  const side = group[0].side;
  if (group.length === 1) {
    const it = group[0];
    const [ax, ay] = beside(it, CALLOUT_GAP);
    return [{ id: it.id, side, text: it.text, ax, ay }];
  }
  let sorted = [...group].sort((a, b) => along(a) - along(b));
  let best = arrange(sorted);
  // 段に重ねるほど密集しているときは、吹き出しを端子の印字だけにして並べ直す（詳しくはポップアップで見る）
  if (best.tiers > 1 && sorted.some((it) => it.short)) {
    sorted = sorted.map((it) => (it.short ? { ...it, text: it.short, ...size(it.short, side) } : it));
    best = arrange(sorted);
  }
  const { tiers, centers, moved, depth } = best;
  const fan = moved > NUDGE || tiers > 1 ? CALLOUT_FAN : 0;
  // 吹き出しの列の位置（組でいちばん外側の端子に合わせる）
  const out =
    side === 'left'
      ? Math.min(...group.map((it) => it.x)) - CALLOUT_GAP - fan
      : side === 'right'
        ? Math.max(...group.map((it) => it.x)) + CALLOUT_GAP + fan
        : side === 'top'
          ? Math.min(...group.map((it) => it.y)) - CALLOUT_GAP - fan
          : Math.max(...group.map((it) => it.y)) + CALLOUT_GAP + fan;
  const outward = side === 'left' || side === 'top' ? -1 : 1;
  return sorted.map((it, i) => {
    const c = centers[i];
    const o = out + outward * (i % tiers) * depth;
    const [ax, ay] = horizontal(side) ? [o, c] : [c, o];
    const placed: PlacedCallout = { id: it.id, side, text: it.text, ax, ay };
    const [nx, ny] = beside(it, CALLOUT_GAP);
    // 端子のすぐ横から離れた吹き出しは、端子から電線の向きへ少し出してから吹き出しへ斜めに向かう引出線でつなぐ
    if (fan || Math.hypot(ax - nx, ay - ny) > NUDGE) placed.leader = [[it.x, it.y], beside(it, 3), [ax, ay]];
    return placed;
  });
}

/** 吹き出しの矩形 [左, 上, 右, 下] */
function rect(p: PlacedCallout, size: CalloutSizer): [number, number, number, number] {
  const { w, h } = size(p.text, p.side);
  switch (p.side) {
    case 'left':
      return [p.ax - w, p.ay - h / 2, p.ax, p.ay + h / 2];
    case 'right':
      return [p.ax, p.ay - h / 2, p.ax + w, p.ay + h / 2];
    case 'top':
      return [p.ax - w / 2, p.ay - h, p.ax + w / 2, p.ay];
    case 'bottom':
      return [p.ax - w / 2, p.ay, p.ax + w / 2, p.ay + h];
  }
}

const overlaps = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] + SPACE && b[1] < a[3] + SPACE;

/**
 * 吹き出しを並べる。同じ向きの吹き出しで重なるものを組にまとめて並べ直し、
 * 並べ直した組がほかの吹き出しに重なれば、それも組に加えて並べ直す（重なりがなくなるまで）
 */
export function layoutCallouts(inputs: CalloutInput[], size: CalloutSizer = calloutSize): PlacedCallout[] {
  const result: PlacedCallout[] = [];
  for (const side of ['left', 'right', 'top', 'bottom'] as const) {
    const items: Item[] = inputs.filter((c) => c.side === side).map((c) => ({ ...c, ...size(c.text, side) }));
    if (!items.length) continue;
    // 組の番号（最初は 1 つずつ）
    const groupOf = items.map((_, i) => i);
    let placed: PlacedCallout[] = [];
    for (;;) {
      const groups = new Map<number, Item[]>();
      items.forEach((it, i) => groups.set(groupOf[i], [...(groups.get(groupOf[i]) ?? []), it]));
      const byId = new Map<string, PlacedCallout>();
      for (const g of groups.values()) for (const p of placeGroup(g, size)) byId.set(p.id, p);
      placed = items.map((it) => byId.get(it.id)!);
      const rects = placed.map((p) => rect(p, size));
      let merged = false;
      for (let i = 0; i < items.length && !merged; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (groupOf[i] !== groupOf[j] && overlaps(rects[i], rects[j])) {
            const from = groupOf[j];
            for (let k = 0; k < items.length; k++) if (groupOf[k] === from) groupOf[k] = groupOf[i];
            merged = true;
            break;
          }
        }
      }
      if (!merged) break;
    }
    result.push(...placed);
  }
  return result;
}
