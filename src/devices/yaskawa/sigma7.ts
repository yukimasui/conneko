/**
 * 安川電機 AC サーボ Σ-7（サーボパック SGD7S-□A00A とサーボモーター SGM7J）の共通の値。
 *
 * サーボパックとサーボモーターの組み合わせ（三相 AC200V、中慣性・高速の SGM7J）:
 *   SGD7S-R90A ↔ SGM7J-01A（100W）、SGD7S-1R6A ↔ SGM7J-02A（200W）、SGD7S-2R8A ↔ SGM7J-04A（400W）、SGD7S-5R5A ↔ SGM7J-08A（750W）。
 * 出典: 安川電機 e-mechatronics「SGD7S モデル（アナログ・パルス）定格」・「SGM7J モデル」（販売店・検索での引用）。
 * - サーボパックの定格出力電流 0.91 / 1.6 / 2.8 / 5.5Arms、主回路の入力電流 0.8 / 1.3 / 2.5 / 4.1Arms、制御電源の入力電流 0.2Arms。
 * - サーボモーターの定格電流 0.85 / 1.6 / 2.5 / 4.4Arms。保持ブレーキは DC24V ±10%、0.23 / 0.25 / 0.25 / 0.27A。
 */

export interface Sigma7Capacity {
  /** サーボパックの容量の記号（SGD7S-□A00A の □） */
  amp: string;
  /** サーボモーターの容量の記号（SGM7J-□A の □） */
  motor: string;
  watt: number;
  /** サーボパックの定格出力電流[A] */
  ampOut: number;
  /** サーボパックの主回路の入力電流[A]（三相 AC200V） */
  ampIn: number;
  /** サーボモーターの定格電流[A] */
  motorCurrent: number;
  /** サーボモーターのフランジ角[mm] */
  flangeMm: number;
  /** 保持ブレーキの電流[A]（DC24V） */
  brakeCurrent: number;
}

export const SIGMA7: Sigma7Capacity[] = [
  { amp: 'R90', motor: '01', watt: 100, ampOut: 0.91, ampIn: 0.8, motorCurrent: 0.85, flangeMm: 40, brakeCurrent: 0.23 },
  { amp: '1R6', motor: '02', watt: 200, ampOut: 1.6, ampIn: 1.3, motorCurrent: 1.6, flangeMm: 60, brakeCurrent: 0.25 },
  { amp: '2R8', motor: '04', watt: 400, ampOut: 2.8, ampIn: 2.5, motorCurrent: 2.5, flangeMm: 60, brakeCurrent: 0.25 },
  { amp: '5R5', motor: '08', watt: 750, ampOut: 5.5, ampIn: 4.1, motorCurrent: 4.4, flangeMm: 80, brakeCurrent: 0.27 },
];
