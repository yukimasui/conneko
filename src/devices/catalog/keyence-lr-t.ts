import { buildLrt } from '../keyence/lr-wtx';

/**
 * KEYENCE アンプ内蔵型 TOF レーザセンサ LR-T シリーズ（LR-TB2000 / TB5000、ケーブル 2m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/lr-wtx.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-t/specs/
 */

export default buildLrt('cable');
