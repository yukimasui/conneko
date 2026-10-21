/**
 * 配線の経路計算（直交配線）と、重なり回避のためのレーン割り当て。
 *
 * 経路: 端子から side 方向に短く出し（スタブ）、中央の1本の線分（中間セグメント）で折り返して
 * 相手の端子へ入る。中間セグメントの位置は「自動位置 + レーンオフセット + ユーザー調整量(bend)」。
 */
import type { TerminalSide } from '../devices/types';

export interface Point {
  x: number;
  y: number;
}

export interface WireEndpoints {
  sx: number;
  sy: number;
  sSide: TerminalSide;
  tx: number;
  ty: number;
  tSide: TerminalSide;
  /** 端子から最初に曲がるまでの長さ（省略時は既定値） */
  sStub?: number;
  tStub?: number;
}

const STUB = 30;
/** 機器の外形から最初の曲がりまでの最小距離 */
const CLEARANCE = 14;
const LANE_GAP = 9;

export const DIR: Record<TerminalSide, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * 端子から機器の外形までの距離をもとに、最初の曲がりが機器の外側になるスタブ長を返す。
 */
export function stubLength(distanceToEdge: number): number {
  return Math.max(STUB, distanceToEdge + CLEARANCE);
}

const isVertical = (side: TerminalSide) => side === 'top' || side === 'bottom';

interface Skeleton {
  p0: Point;
  p1: Point;
  p3: Point;
  p4: Point;
  /** 中間セグメントが水平なら true（source の side が上下） */
  horizontalMid: boolean;
  /** 中間セグメントの自動位置（水平なら y、垂直なら x） */
  mid: number;
}

function skeleton(e: WireEndpoints): Skeleton {
  const p0 = { x: e.sx, y: e.sy };
  const p4 = { x: e.tx, y: e.ty };
  const ss = e.sStub ?? STUB;
  const ts = e.tStub ?? STUB;
  const p1 = { x: e.sx + DIR[e.sSide].x * ss, y: e.sy + DIR[e.sSide].y * ss };
  const p3 = { x: e.tx + DIR[e.tSide].x * ts, y: e.ty + DIR[e.tSide].y * ts };
  const horizontalMid = isVertical(e.sSide);
  const mid = horizontalMid ? (p1.y + p3.y) / 2 : (p1.x + p3.x) / 2;
  return { p0, p1, p3, p4, horizontalMid, mid };
}

/** 配線の折れ線（頂点列）を求める。offset は中間セグメントのずらし量 */
export function routeWire(e: WireEndpoints, offset: number): { points: Point[]; midA: Point; midB: Point; horizontalMid: boolean } {
  const { p0, p1, p3, p4, horizontalMid, mid } = skeleton(e);
  const m = mid + offset;
  const midA = horizontalMid ? { x: p1.x, y: m } : { x: m, y: p1.y };
  const midB = horizontalMid ? { x: p3.x, y: m } : { x: m, y: p3.y };
  return { points: simplify([p0, p1, midA, midB, p3, p4]), midA, midB, horizontalMid };
}

/** 重複点と一直線上の中間点を取り除く */
function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i >= 1; i--) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    const colinear = (Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01) || (Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01);
    if (colinear) out.splice(i, 1);
  }
  return out;
}

/** 角を少し丸めた SVG パス文字列 */
export function toRoundedPath(points: Point[], radius = 6): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const lenIn = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const lenOut = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.min(radius, lenIn / 2, lenOut / 2);
    const inPt = { x: cur.x - ((cur.x - prev.x) / (lenIn || 1)) * r, y: cur.y - ((cur.y - prev.y) / (lenIn || 1)) * r };
    const outPt = { x: cur.x + ((next.x - cur.x) / (lenOut || 1)) * r, y: cur.y + ((next.y - cur.y) / (lenOut || 1)) * r };
    d += ` L ${inPt.x} ${inPt.y} Q ${cur.x} ${cur.y} ${outPt.x} ${outPt.y}`;
  }
  const last = points[points.length - 1];
  return d + ` L ${last.x} ${last.y}`;
}

export interface LaneInput extends WireEndpoints {
  id: string;
  /** ユーザーが曲がり位置を調整済みならレーン割り当ての対象外 */
  manual: boolean;
}

/**
 * 中間セグメントが同じ位置に重なりそうな配線どうしにレーン（ずらし量）を割り当てる。
 * 平行に走る配線が交差しないよう、進行方向に応じて並び順を決める。
 */
export function assignLanes(wires: LaneInput[]): Map<string, number> {
  const items = wires
    .filter((w) => !w.manual)
    .map((w) => {
      const s = skeleton(w);
      // 中間セグメントの範囲（水平なら x 範囲）と、並べ替えのキー
      const a = s.horizontalMid ? s.p1.x : s.p1.y;
      const b = s.horizontalMid ? s.p3.x : s.p3.y;
      const across = s.horizontalMid ? s.p3.y - s.p1.y : s.p3.x - s.p1.x;
      const along = Math.sign(b - a) || 1;
      return { id: w.id, h: s.horizontalMid, mid: s.mid, lo: Math.min(a, b), hi: Math.max(a, b), key: a * along, acrossSign: Math.sign(across) || 1 };
    });

  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const p = items[i];
      const q = items[j];
      if (p.h !== q.h || Math.abs(p.mid - q.mid) > LANE_GAP * 1.5) continue;
      const overlap = Math.min(p.hi, q.hi) - Math.max(p.lo, q.lo);
      if (overlap > -LANE_GAP) parent[find(i)] = find(j);
    }
  }
  const clusters = new Map<number, typeof items>();
  items.forEach((it, i) => clusters.set(find(i), [...(clusters.get(find(i)) ?? []), it]));

  const lanes = new Map<string, number>();
  for (const cluster of clusters.values()) {
    if (cluster.length < 2) continue;
    cluster.sort((p, q) => p.key - q.key);
    const n = cluster.length;
    cluster.forEach((it, i) => lanes.set(it.id, ((n - 1) / 2 - i) * LANE_GAP * it.acrossSign));
  }
  return lanes;
}
