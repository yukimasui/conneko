/**
 * オリエンタルモーター ブラシレスモーター BLE2 シリーズ（ドライバー BLE2D□-A / -C とモーター BLM□HP）の共通の値。
 *
 * 出典: オリエンタルモーター BLE2 シリーズのカタログ B-46・製品ページ（BLE2D120-C など）・販売店（オリムベクスタ）の掲載。
 * - ドライバーの電源: -A は単相 100〜120V、-C は単相・三相 200〜240V。
 * - 定格入力電流: 30W（100V）1.1A、120W（100V）2.8A・（200V 単相）1.7A・（三相）1.02A、200W（200V 単相）2.5A・（三相）1.5A。ほかは推定。
 * - 入出力（CN5）: 入力 IN0〜IN6（7 点、フォトカプラ、機能を割り付けられる）、出力 2 点、外部速度設定（VH・VM・VL）。
 * - モーターとドライバーは、モーターのコネクタからドライバーの CN2 へ専用の接続ケーブル（動力・センサー一体）でつなぐ。
 */

/** ドライバーの CN2（モーター）とモーターのコネクタの種類 */
export const BLE2_MOTOR_CONNECTOR = 'OM-BLE2-MOTOR';

export type Ble2Power = '100' | '200-1' | '200-3';

export interface Ble2Capacity {
  /** 定格出力[W] */
  watt: number;
  /** ドライバーの型式の容量（BLE2D□-A の □） */
  driver: string;
  /** モーターの型式（ギヤなしの丸軸タイプ） */
  motor: string;
  /** モーターの取付角[mm]（推定） */
  sizeMm: number;
  /** 電源ごとの定格入力電流[A]（ない組み合わせは省く） */
  input: Partial<Record<Ble2Power, number>>;
  /** 推定の入力電流の電源 */
  estimatedInput: Ble2Power[];
}

export const BLE2: Ble2Capacity[] = [
  { watt: 30, driver: '30', motor: 'BLM230HP-AS', sizeMm: 60, input: { '100': 1.1, '200-1': 0.7, '200-3': 0.4 }, estimatedInput: ['200-1', '200-3'] },
  { watt: 60, driver: '60', motor: 'BLM460HP-AS', sizeMm: 80, input: { '100': 1.8, '200-1': 1.0, '200-3': 0.6 }, estimatedInput: ['100', '200-1', '200-3'] },
  { watt: 120, driver: '120', motor: 'BLM5120HP-AS', sizeMm: 90, input: { '100': 2.8, '200-1': 1.7, '200-3': 1.02 }, estimatedInput: [] },
  { watt: 200, driver: '200', motor: 'BLM6200SHP-AS', sizeMm: 104, input: { '200-1': 2.5, '200-3': 1.5 }, estimatedInput: [] },
];

export const ble2Of = (watt: unknown) => BLE2.find((c) => String(c.watt) === String(watt)) ?? BLE2[2];

export const BLE2_POWER_LABEL: Record<Ble2Power, string> = {
  '100': '単相 100〜120V（-A）',
  '200-1': '単相 200〜240V（-C）',
  '200-3': '三相 200〜240V（-C）',
};
