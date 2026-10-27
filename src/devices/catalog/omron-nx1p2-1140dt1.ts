import { buildNx1p2 } from '../omron/nx1p2';

/**
 * オムロン NX1P2-1140DT1（NX1P2 CPU ユニット、内蔵 I/O 入力 24 点・PNP 出力 16 点、DC24V 電源）。
 * NX1P2-1040DT1（モーション制御 2 軸）はパラメータ engine で選ぶ。見た目・端子は src/devices/omron/nx1p2.ts。
 */
export default buildNx1p2('40DT1');
