/**
 * 記号の配置の計算（端子の位置など）。
 */
import type { Point, SymbolDef } from './format';

/** 記号の点を、配置（挿入点・反時計回りの回転[度]）に合わせてシートの座標にする */
export function placePoint(p: Point, at: Point, rotation = 0): Point {
  const r = (((rotation % 360) + 360) % 360) as number;
  const [x, y] = p;
  // 90 度刻みは誤差が出ないように整数の回転で計算する
  const [rx, ry] = r === 0 ? [x, y] : r === 90 ? [-y, x] : r === 180 ? [-x, -y] : r === 270 ? [y, -x] : rotate(x, y, r);
  return [at[0] + rx, at[1] + ry];
}

function rotate(x: number, y: number, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

/** 配置した記号の端子の位置 */
export function pinPoint(def: SymbolDef, pin: string, at: Point, rotation = 0): Point {
  const p = def.pins[pin];
  if (!p) throw new Error(`記号の端子 ${pin} がありません`);
  return placePoint(p, at, rotation);
}

export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const boundsCache = new WeakMap<SymbolDef, Bounds>();

/** 記号の図形と端子を囲む四角（記号の座標系。文字は含めない） */
export function symbolBounds(def: SymbolDef): Bounds {
  const hit = boundsCache.get(def);
  if (hit) return hit;
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (x: number, y: number) => {
    xs.push(x);
    ys.push(y);
  };
  for (const p of def.primitives) {
    if (p.kind === 'line') for (const [x, y] of p.points) add(x, y);
    else if (p.kind === 'circle' || p.kind === 'arc') {
      add(p.center[0] - p.r, p.center[1] - p.r);
      add(p.center[0] + p.r, p.center[1] + p.r);
    }
  }
  for (const [x, y] of Object.values(def.pins)) add(x, y);
  const b = xs.length ? { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) } : { x1: 0, y1: 0, x2: 0, y2: 0 };
  boundsCache.set(def, b);
  return b;
}

/** 配置した記号を囲む四角（シートの座標） */
export function placedBounds(def: SymbolDef, at: Point, rotation = 0): Bounds {
  const b = symbolBounds(def);
  const corners = [
    placePoint([b.x1, b.y1], at, rotation),
    placePoint([b.x2, b.y2], at, rotation),
  ];
  return {
    x1: Math.min(corners[0][0], corners[1][0]),
    y1: Math.min(corners[0][1], corners[1][1]),
    x2: Math.max(corners[0][0], corners[1][0]),
    y2: Math.max(corners[0][1], corners[1][1]),
  };
}

/** 端子から線を出す向き（単位ベクトル。y は上向き） */
export type Direction = Point;

/**
 * 記号の端子から線を出す向き。記号の外形の左端の端子は左、右端は右、上端は上、下端は下へ出す
 * （どれでもなければ左右の近い方）。配置の回転も反映する。
 */
export function pinDirection(def: SymbolDef, pin: string, rotation = 0): Direction {
  const p = def.pins[pin];
  const b = symbolBounds(def);
  const eps = 0.01;
  let d: Point;
  if (!p) d = [-1, 0];
  else if (p[0] <= b.x1 + eps) d = [-1, 0];
  else if (p[0] >= b.x2 - eps) d = [1, 0];
  else if (p[1] >= b.y2 - eps) d = [0, 1];
  else if (p[1] <= b.y1 + eps) d = [0, -1];
  else d = p[0] - b.x1 < b.x2 - p[0] ? [-1, 0] : [1, 0];
  const [x, y] = placePoint(d, [0, 0], rotation);
  return [Math.round(x), Math.round(y)];
}
