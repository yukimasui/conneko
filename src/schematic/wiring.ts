/**
 * 展開図の線を引く部品（経路の選び方・母線への引き出し・分かれ目・線番の位置）。座標は y が上向きの mm。
 */
import type { Point } from './format';
import type { Bounds, Direction } from './place';

/** 端子から線を出す長さ（曲げる前にまっすぐ出す）[mm] */
export const STUB = 5;

export const r3 = (v: number) => Math.round(v * 1000) / 1000;
export const same = (a: Point, b: Point) => r3(a[0]) === r3(b[0]) && r3(a[1]) === r3(b[1]);

/** 連続する同じ点と、一直線上の途中の点を除く */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    if (out.length && same(out[out.length - 1], p)) continue;
    if (out.length >= 2) {
      const [a, b] = [out[out.length - 2], out[out.length - 1]];
      const collinear = (r3(a[0]) === r3(b[0]) && r3(b[0]) === r3(p[0])) || (r3(a[1]) === r3(b[1]) && r3(b[1]) === r3(p[1]));
      if (collinear) out.pop();
    }
    out.push(p);
  }
  return out;
}

export interface PinAt {
  pos: Point;
  dir: Direction;
}

/** 軸に平行な線分が四角の内側を通るか（縁に沿う・縁で止まるのは通らないとみなす） */
export function crosses(a: Point, b: Point, r: Bounds): boolean {
  const e = 0.05;
  const [x1, x2] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  const [y1, y2] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  return x2 > r.x1 + e && x1 < r.x2 - e && y2 > r.y1 + e && y1 < r.y2 - e;
}

/** 折れ線が横切る記号の数 */
export function hits(points: Point[], obstacles: Bounds[]): number {
  let n = 0;
  for (const r of obstacles) if (points.slice(1).some((p, i) => crosses(points[i], p, r))) n++;
  return n;
}

/** シートに引いた線分（網ごと）。別の網の線と重ならないように経路を選ぶ */
export interface Segment {
  a: Point;
  b: Point;
  net: string;
}

/** 2 つの線分が一直線上で重なる長さ（重ならなければ 0） */
export function overlap(p: Point, q: Point, s: Point, t: Point): number {
  if (r3(p[1]) === r3(q[1]) && r3(s[1]) === r3(t[1]) && r3(p[1]) === r3(s[1])) {
    return Math.min(Math.max(p[0], q[0]), Math.max(s[0], t[0])) - Math.max(Math.min(p[0], q[0]), Math.min(s[0], t[0]));
  }
  if (r3(p[0]) === r3(q[0]) && r3(s[0]) === r3(t[0]) && r3(p[0]) === r3(s[0])) {
    return Math.min(Math.max(p[1], q[1]), Math.max(s[1], t[1])) - Math.max(Math.min(p[1], q[1]), Math.min(s[1], t[1]));
  }
  return 0;
}

/** 点が線分の上（端を含む）にあるか */
export const touches = (p: Point, a: Point, b: Point) => same(p, a) || same(p, b) || onSegment(p, a, b);

/** 縦と横の線分が、互いの途中で交わるか */
export function crossing(p: Point, q: Point, s: Point, t: Point): boolean {
  const vertical = (a: Point, b: Point) => r3(a[0]) === r3(b[0]);
  const pair: Point[] | undefined = vertical(p, q) && !vertical(s, t) ? [p, q, s, t] : vertical(s, t) && !vertical(p, q) ? [s, t, p, q] : undefined;
  if (!pair) return false;
  const [v1, v2, h1, h2] = pair;
  const x = v1[0];
  const y = h1[1];
  return x > Math.min(h1[0], h2[0]) && x < Math.max(h1[0], h2[0]) && y > Math.min(v1[1], v2[1]) && y < Math.max(v1[1], v2[1]);
}

/**
 * 折れ線と別の網の線との干渉の点数。重なる・T 字に触れる（つながって見える）は 10、交差は 1。
 */
export function conflicts(points: Point[], net: string, segments: Segment[]): number {
  let n = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const [p, q] = [points[i], points[i + 1]];
    for (const s of segments) {
      if (s.net === net) continue;
      if (overlap(p, q, s.a, s.b) > 0.01) n += 10;
      else if (touches(s.a, p, q) || touches(s.b, p, q) || touches(p, s.a, s.b) || touches(q, s.a, s.b)) n += 10;
      else if (crossing(p, q, s.a, s.b)) n += 1;
    }
  }
  return n;
}

/** 母線への引き出しで、記号の下（上）を回り込むときのずらし[mm]（上向きが正） */
export const RAIL_DETOURS = [-5, -7.5, 5, 7.5, -10, 10, -12.5, 12.5, -2.5, 2.5];

/**
 * 母線へ横に引き出す線。まっすぐ引くと記号を横切る（端子が母線と反対を向いているなど）場合は、
 * 端子から出して記号の下（または上）を回り込んでから母線へ引く。
 */
export function railRoute(p: PinAt, railX: number, net: string, obstacles: Bounds[], segments: Segment[], detours = RAIL_DETOURS): Point[] {
  const straight: Point[] = [p.pos, [railX, p.pos[1]]];
  const candidates: Point[][] = [straight];
  for (const len of STUBS) {
    const s: Point = [p.pos[0] + p.dir[0] * len, p.pos[1] + p.dir[1] * len];
    for (const dy of detours) candidates.push(simplify([p.pos, s, [s[0], s[1] + dy], [railX, s[1] + dy]]));
  }
  let best = straight;
  let bestScore = Infinity;
  candidates.forEach((c, i) => {
    const score = hits(c, obstacles) * 1000 + conflicts(c, net, segments) + i * 0.01;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  });
  return best;
}

/** 端子から出す長さの候補（短い方を優先し、重なるときに伸ばす） */
export const STUBS = [STUB, STUB + 2.5, STUB + 5, STUB + 7.5, STUB - 2.5, STUB + 10];

/**
 * 2 つの端子を直角の折れ線でつなぐ。端子からまっすぐ出し、L 字に曲げてつなぐ。
 * 出す長さと曲げ方の組み合わせのうち、記号を横切らず、別の網の線と重ならないものを選ぶ。
 */
export function route(a: PinAt, b: PinAt, net: string, obstacles: Bounds[], segments: Segment[]): Point[] {
  const [ax, ay] = a.pos;
  const [bx, by] = b.pos;
  // 同じ高さで向かい合っている（a の右に b があり、a は右へ・b は左へ出す）ならまっすぐ
  const facing =
    (r3(ay) === r3(by) && (bx - ax) * a.dir[0] > 0 && (ax - bx) * b.dir[0] > 0) ||
    (r3(ax) === r3(bx) && (by - ay) * a.dir[1] > 0 && (ay - by) * b.dir[1] > 0);
  const candidates: Point[][] = facing ? [[a.pos, b.pos]] : [];
  for (const len of STUBS) {
    const sa: Point = [ax + a.dir[0] * len, ay + a.dir[1] * len];
    const sb: Point = [bx + b.dir[0] * len, by + b.dir[1] * len];
    const first: Point = a.dir[0] !== 0 ? [sa[0], sb[1]] : [sb[0], sa[1]];
    const second: Point = a.dir[0] !== 0 ? [sb[0], sa[1]] : [sa[0], sb[1]];
    candidates.push(simplify([a.pos, sa, first, sb, b.pos]), simplify([a.pos, sa, second, sb, b.pos]));
  }
  // 記号を横切らないこと > 別の網と重ならないこと > 候補の順（短い出し方・まっすぐを優先）
  let best = candidates[0];
  let bestScore = Infinity;
  candidates.forEach((c, i) => {
    const score = hits(c, obstacles) * 1000 + conflicts(c, net, segments) + i * 0.01;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  });
  return best;
}

/**
 * 手で決めた位置に真ん中の区間を通す線。端子から少し出し、x なら縦の区間を x に、y なら横の区間を y に通してつなぐ（y は上向きの座標）
 */
export function bentRoute(a: PinAt, b: PinAt, bend: { x?: number; y?: number }): Point[] {
  const sa: Point = [a.pos[0] + a.dir[0] * STUB, a.pos[1] + a.dir[1] * STUB];
  const sb: Point = [b.pos[0] + b.dir[0] * STUB, b.pos[1] + b.dir[1] * STUB];
  const mid: Point[] = bend.x !== undefined ? [[bend.x, sa[1]], [bend.x, sb[1]]] : [[sa[0], bend.y!], [sb[0], bend.y!]];
  return simplify([a.pos, sa, ...mid, sb, b.pos]);
}

/** 手で決めた高さ（y は上向きの座標）を通して母線へ引き出す線 */
export function bentRailRoute(p: PinAt, railX: number, y: number): Point[] {
  const s: Point = [p.pos[0] + p.dir[0] * STUB, p.pos[1] + p.dir[1] * STUB];
  return simplify([p.pos, s, [s[0], y], [railX, y]]);
}

/** 置いた端子どうしを結ぶ最小全域木（Prim 法。距離は縦横の和）の辺 */
export function spanningTree(pins: PinAt[]): [number, number][] {
  const n = pins.length;
  const dist = (i: number, j: number) => Math.abs(pins[i].pos[0] - pins[j].pos[0]) + Math.abs(pins[i].pos[1] - pins[j].pos[1]);
  const inTree = new Array<boolean>(n).fill(false);
  const best = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  const edges: [number, number][] = [];
  best[0] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = true;
    if (from[u] >= 0) edges.push([from[u], u]);
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = dist(u, v);
      if (d < best[v]) {
        best[v] = d;
        from[v] = u;
      }
    }
  }
  return edges;
}

/** 線の分かれ目（3 本以上の線が集まる点）。点を通り抜ける線は 2 本と数える */
export function junctions(polylines: Point[][]): Point[] {
  const segs: [Point, Point][] = polylines.flatMap((pl) => pl.slice(1).map((p, i) => [pl[i], p] as [Point, Point]));
  const candidates = new Map<string, Point>();
  for (const [a, b] of segs) for (const p of [a, b]) candidates.set(`${r3(p[0])},${r3(p[1])}`, p);
  const out: Point[] = [];
  for (const p of candidates.values()) {
    let degree = 0;
    for (const [a, b] of segs) {
      if (same(a, p) || same(b, p)) degree += 1;
      else if (onSegment(p, a, b)) degree += 2;
    }
    if (degree >= 3) out.push(p);
  }
  return out;
}

export function onSegment(p: Point, a: Point, b: Point): boolean {
  const [x, y] = [r3(p[0]), r3(p[1])];
  if (r3(a[0]) === r3(b[0])) return x === r3(a[0]) && y > Math.min(r3(a[1]), r3(b[1])) && y < Math.max(r3(a[1]), r3(b[1]));
  if (r3(a[1]) === r3(b[1])) return y === r3(a[1]) && x > Math.min(r3(a[0]), r3(b[0])) && x < Math.max(r3(a[0]), r3(b[0]));
  return false;
}

/** 線番を書く位置（いちばん長い横の区間の中央の上。横の区間がなければ最初の区間の右） */
export function wireNoAt(polylines: Point[][]): { at: Point; align: 'center' | 'left' } | undefined {
  // 横の区間を、同じ網の線の折れ点・分かれ目（区間の途中に乗る点）で区切り、いちばん長い空きの中央に置く
  const vertices = polylines.flat();
  let best: { at: Point; len: number } | undefined;
  for (const pl of polylines) {
    for (let i = 0; i + 1 < pl.length; i++) {
      const [a, b] = [pl[i], pl[i + 1]];
      if (r3(a[1]) !== r3(b[1])) continue;
      const [x1, x2] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      const cuts = vertices.filter((v) => r3(v[1]) === r3(a[1]) && v[0] > x1 + 1e-6 && v[0] < x2 - 1e-6).map((v) => v[0]);
      const xs = [x1, ...[...new Set(cuts)].sort((p, q) => p - q), x2];
      for (let j = 0; j + 1 < xs.length; j++) {
        const len = xs[j + 1] - xs[j];
        if (!best || len > best.len + 1e-6) best = { at: [(xs[j] + xs[j + 1]) / 2, a[1] + 1.8], len };
      }
    }
  }
  if (best) return { at: best.at, align: 'center' };
  const pl = polylines.find((x) => x.length >= 2);
  return pl ? { at: [(pl[0][0] + pl[1][0]) / 2 + 1, (pl[0][1] + pl[1][1]) / 2], align: 'left' } : undefined;
}
