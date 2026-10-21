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
  let mid = horizontalMid ? (p1.y + p3.y) / 2 : (p1.x + p3.x) / 2;
  // 両端が同じ向き（上と上など）の場合は、機器の上を横切らないよう外側で折り返す
  if (e.sSide === e.tSide) {
    if (e.sSide === 'top') mid = Math.min(p1.y, p3.y);
    else if (e.sSide === 'bottom') mid = Math.max(p1.y, p3.y);
    else if (e.sSide === 'left') mid = Math.min(p1.x, p3.x);
    else mid = Math.max(p1.x, p3.x);
  }
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

/** 折れ線の全長 */
export function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return len;
}

/** 折れ線の始点から距離 from〜to の部分を切り出す */
export function slicePolyline(points: Point[], from: number, to: number): Point[] {
  const out: Point[] = [];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const at = (d: number) => ({ x: a.x + ((b.x - a.x) * (d - acc)) / (len || 1), y: a.y + ((b.y - a.y) * (d - acc)) / (len || 1) });
    if (acc + len >= from && acc <= to) {
      if (!out.length) out.push(at(Math.max(from, acc)));
      if (acc + len <= to) out.push(b);
      else {
        out.push(at(to));
        break;
      }
    }
    acc += len;
  }
  return out;
}

/** 両端のスタブの先（最初・最後の曲がり位置） */
export function stubEnds(e: WireEndpoints): { p0: Point; p1: Point; p3: Point; p4: Point } {
  const { p0, p1, p3, p4 } = skeleton(e);
  return { p0, p1, p3, p4 };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

/**
 * 点列を直交の折れ線にする。隣り合う点が縦にも横にもそろっていなければ角を 1 つ入れる
 * （直前の線分が縦なら横へ、横なら縦へ曲がる）。firstVertical は最初の点に入ってくる線分（スタブ）が縦か。
 */
export function orthogonalize(points: Point[], firstVertical: boolean): Point[] {
  const out: Point[] = [];
  let vertical = firstVertical;
  for (const p of points) {
    const a = out[out.length - 1];
    if (a && !near(a.x, p.x) && !near(a.y, p.y)) {
      const corner = vertical ? { x: p.x, y: a.y } : { x: a.x, y: p.y };
      out.push(corner);
      vertical = !vertical;
    }
    if (a && (!near(a.x, p.x) || !near(a.y, p.y))) vertical = near(a.x, p.x);
    out.push({ ...p });
  }
  return out;
}

/** 重なった点と一直線上の中間点を取り除く（両端は残す） */
export function simplifyRoute(points: Point[]): Point[] {
  return simplify(points);
}

/**
 * 手で編集した経路（route: スタブの先どうしの間の頂点）から、描く折れ線と編集用の頂点列を求める。
 * inner は [スタブの先（始点側）, ...route を直交化したもの, スタブの先（終点側）]。
 */
export function manualRoute(e: WireEndpoints, route: Point[]): { points: Point[]; inner: Point[] } {
  const { p0, p1, p3, p4 } = skeleton(e);
  const inner = orthogonalize([p1, ...route, p3], isVertical(e.sSide));
  return { points: simplify([p0, ...inner, p4]), inner };
}

/** 自動の経路の編集用の頂点列（スタブの先と中間セグメントの両端） */
export function autoInner(e: WireEndpoints, offset: number): Point[] {
  const { p1, p3 } = skeleton(e);
  const r = routeWire(e, offset);
  return [p1, r.midA, r.midB, p3];
}

/** 折れ線の始点から距離 d の位置 */
export function pointAtLength(points: Point[], d: number): Point {
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + len >= d) {
      const t = len ? (d - acc) / len : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    acc += len;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}
