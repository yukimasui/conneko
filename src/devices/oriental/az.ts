/**
 * オリエンタルモーター αSTEP AZ シリーズ（DC 電源入力）のドライバー AZD-KD とモーター AZM□□AK / MK の共通の値。
 *
 * 出典: オリエンタルモーター 製品ページ「AZD-KD」（付属コネクタ: 主電源・電磁ブレーキ接続用 CN1、入出力信号用 CN4。制御入力 10 点 フォトカプラ、
 *       制御出力 6 点 フォトカプラ・オープンコレクタ）、AZ シリーズ DC 電源入力の取扱説明書（HM-60249 / HM-60315。CN1 の +24V/+48V・GND、
 *       電磁ブレーキのリード線 MB1（黒、−）・MB2（白、＋））、miniドライバ AZD-KRD のカタログ（モーター別の主電源入力電流）。
 */

/** ドライバーの CN2（モーター）とモーターのコネクタの種類。専用の接続ケーブル（モーター・エンコーダー一体）でつなぐ */
export const AZ_MOTOR_CONNECTOR = 'OM-AZ-MOTOR';

export interface AzMotor {
  /** 型式の頭（'AZM46' など） */
  frame: string;
  /** 取付角[mm] */
  sizeMm: number;
  /** 主電源の入力電流[A]（miniドライバ AZD-KRD の値を流用した推定） */
  inputCurrent: number;
  /** 描画用のモーターの長さ（胴の長さ）[px] */
  lengthPx: number;
}

export const AZ_MOTORS: AzMotor[] = [
  { frame: 'AZM46', sizeMm: 42, inputCurrent: 1.6, lengthPx: 64 },
  { frame: 'AZM48', sizeMm: 42, inputCurrent: 2.1, lengthPx: 78 },
  { frame: 'AZM66', sizeMm: 60, inputCurrent: 3.7, lengthPx: 70 },
  { frame: 'AZM69', sizeMm: 60, inputCurrent: 3.5, lengthPx: 92 },
];

export const azMotorOf = (frame: unknown) => AZ_MOTORS.find((m) => m.frame === String(frame)) ?? AZ_MOTORS[0];

/** モーターの選択肢（ドライバー・モーターで共通） */
export const AZ_MOTOR_OPTIONS = AZ_MOTORS.map((m) => ({ value: m.frame, label: `${m.frame}（□${m.sizeMm}mm）` }));
