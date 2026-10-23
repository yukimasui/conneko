/**
 * ブレーカーの極の呼び名（端子の吹き出し用）。
 * 3P は左から R/S/T とみなして '一次 R'・'二次 S' のように、1P・2P は '一次側'・'二次側' とする。
 */
export function poleHint(count: number, index: number, side: '一次' | '二次'): string {
  return count === 3 ? `${side} ${'RST'[index]}` : `${side}側`;
}
