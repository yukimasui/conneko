/**
 * CKD のエアシリンダ（ペンシル形 SCPD3・薄形 SSD2・標準形 CMK2）に共通の部品。
 * 作りは SMC と同じ src/devices/smc/cylinder.ts の buildCylinder()（横から見た姿、ストロークで長さが変わる、
 * シリンダスイッチをパラメータで付ける）で、メーカー・ロゴ・シリンダスイッチ（CKD T シリーズ）・型式の書き方だけを変える。
 *
 * シリンダスイッチ（src/devices/smc/autoswitch.ts の SwitchMaker 'ckd'）:
 *   T2H: 無接点 2 線式（負荷電圧 DC10〜30V、負荷電流 5〜20mA、内部降下電圧 4V 以下、漏れ電流 1mA 以下）
 *   T3H: 無接点 3 線式 NPN（電源電圧 DC10〜28V、負荷 DC30V 以下・100mA 以下、内部降下電圧 0.5V 以下、消費電流 10mA 以下）
 *   T3PH（PNP）・T2YH / T3YH（2 色表示）・T0H（有接点。表示灯付き）の定格は推定
 *   リード線の長さ: 無記号 1m、3 3m、5 5m。個数: D 2 個、R ロッド側 1 個、H ヘッド側 1 個
 *   出典: CKD「Cylinder switch guide」「T Series（T*H/T*V）Specifications」、MISUMI の SW-T3H・SW-T0H3 の掲載
 *
 * 型式（推定を含む）: <シリーズ>[-L（スイッチ付き・マグネット内蔵）]-<支持形式>-<内径>-<ストローク>[-<スイッチ><リード線>-<個数>]
 *   例: SCPD3-L-00-16-50-T2H-D、SSD2-00-25-20、CMK2-L-LB-25-100-T3H3-R
 *   CKD の型式はシリーズによってオプションの記号が間に入るため、ここでは代表的な並びで組み立てる（推定）
 */
import type { ParamValues } from '../types';
import type { BoreSpec } from '../smc/cylinder';

/** CKD のロゴ（本体に書く文字） */
export const CKD_LOGO = { text: 'CKD', color: '#0b5aa6' };

/** 型式を組み立てる（スイッチ付き・マグネット内蔵は -L） */
export function ckdCylinderModel(series: string, p: ParamValues, b: BoreSpec, sw: string): string {
  const magnet = p.switch !== 'none';
  return `${series}${magnet ? '-L' : ''}-${p.mount}-${b.bore}-${p.stroke}${sw}`;
}

/** 共通の推定の説明 */
export const CKD_CYLINDER_ESTIMATED =
  '外形寸法（カバー・チューブの長さと径）、型式の記号の並び（スイッチ付きの -L・支持形式の記号）、T3PH・T2YH・T3YH・T0H の電気的な定格は推定';
