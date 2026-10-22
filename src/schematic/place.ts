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
