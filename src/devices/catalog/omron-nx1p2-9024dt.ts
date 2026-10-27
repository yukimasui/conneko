import { buildNx1p2 } from '../omron/nx1p2';

/**
 * オムロン NX1P2-9024DT（NX1P2 CPU ユニット、内蔵 I/O 入力 14 点・NPN 出力 10 点、DC24V 電源、モーション制御軸なし）。
 * 見た目・端子は src/devices/omron/nx1p2.ts。
 */
export default buildNx1p2('9024DT');
