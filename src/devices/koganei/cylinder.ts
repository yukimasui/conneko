/**
 * コガネイのエアシリンダに共通の部品（ロゴ・型式・センサスイッチ）。
 * 作りは SMC と同じ src/devices/smc/cylinder.ts の buildCylinder() で、メーカー・ロゴ・センサスイッチ（ZE シリーズ）・型式の書き方だけを変える。
 *
 * センサスイッチ（src/devices/smc/autoswitch.ts の SwitchMaker 'koganei'）: ZE135A（無接点 2 線式）、ZE155A（無接点 3 線式 NPN）。
 *   型式の 3 桁目がリード線の長さ（ZE1□□ 1m、ZE2□□ 3m）、末尾の数字が個数。定格（負荷電流・漏れ電流・内部降下電圧）は推定
 *
 * 型式（推定を含む）: CDA<内径>×<ストローク>[-B（磁石付き）][-ZE<リード線><種類>A<個数>]。例: CDA16×20-B-ZE135A2
 */
import type { ParamValues } from '../types';
import type { BoreSpec } from '../smc/cylinder';

export const KOGANEI_LOGO = { text: 'KOGANEI', color: '#0b4ea2' };

/** ジグシリンダの型式（センサ磁石付きは -B） */
export function koganeiJigModel(series: string, p: ParamValues, b: BoreSpec, sw: string): string {
  const magnet = p.switch !== 'none';
  return `${series}${b.bore}×${p.stroke}${magnet ? '-B' : ''}${sw}`;
}
