/**
 * 三菱電機 AC サーボ MELSERVO-J5（サーボアンプ MR-J5-□A とロータリサーボモーター HK-KT）の共通の値。
 *
 * サーボアンプとサーボモーターの組み合わせ（200V、低慣性・小容量の HK-KT）:
 *   MR-J5-10A ↔ HK-KT13W（100W）、MR-J5-20A ↔ HK-KT23W（200W）、MR-J5-40A ↔ HK-KT43W（400W）、MR-J5-70A ↔ HK-KT7M3W（750W）。
 * 出典: 三菱電機 FA サイト「仕様から探す」MR-J5-A 汎用インタフェース 200V 仕様（出力定格電流・主回路電源の定格電流）、
 *       ミスミの MR-J5-A（200V）仕様表、HK-KT_W シリーズの仕様（電磁ブレーキ DC24V −10%〜0%）。
 */

/** サーボアンプの CN2（エンコーダー）とサーボモーターのエンコーダーコネクターの種類。専用のエンコーダーケーブルでつなぐ */
export const MR_J5_ENCODER = 'MR-J5-ENC';

export interface MelservoCapacity {
  /** サーボアンプの容量の記号（MR-J5-□A の □） */
  amp: string;
  /** 組み合わせるサーボモーター HK-KT の容量の記号（HK-KT□W の □） */
  motor: string;
  /** 定格出力[W] */
  watt: number;
  /** サーボアンプの出力定格電流[A] */
  ampOut: number;
  /** サーボアンプの主回路電源の定格電流[A]（三相 AC200V） */
  ampIn: number;
  /** サーボアンプの幅[mm] */
  ampWidthMm: number;
  /** サーボモーターの定格電流[A] */
  motorCurrent: number;
  /** サーボモーターの定格電流が推定か */
  motorCurrentEstimated?: boolean;
  /** サーボモーターのフランジ角[mm] */
  flangeMm: number;
  /** 電磁ブレーキ（DC24V）の電流[A]。HK-KT43WB の 7.9W から求めた値。ほかの容量は推定 */
  brakeCurrent: number;
}

export const MELSERVO_J5: MelservoCapacity[] = [
  { amp: '10', motor: '13', watt: 100, ampOut: 1.3, ampIn: 0.9, ampWidthMm: 40, motorCurrent: 0.8, motorCurrentEstimated: true, flangeMm: 40, brakeCurrent: 0.27 },
  { amp: '20', motor: '23', watt: 200, ampOut: 1.8, ampIn: 1.5, ampWidthMm: 40, motorCurrent: 1.3, motorCurrentEstimated: true, flangeMm: 60, brakeCurrent: 0.33 },
  { amp: '40', motor: '43', watt: 400, ampOut: 2.8, ampIn: 2.6, ampWidthMm: 40, motorCurrent: 2.6, flangeMm: 60, brakeCurrent: 0.33 },
  { amp: '70', motor: '7M3', watt: 750, ampOut: 5.8, ampIn: 3.8, ampWidthMm: 60, motorCurrent: 4.8, motorCurrentEstimated: true, flangeMm: 80, brakeCurrent: 0.42 },
];
