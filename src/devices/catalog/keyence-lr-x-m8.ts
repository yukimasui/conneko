import { buildLrx } from '../keyence/lr-wtx';

/**
 * KEYENCE CMOS レーザセンサ LR-X シリーズ 標準タイプ（LR-X50C / X100C / X250C、ケーブル中継アンプ付き、M8 4ピン コネクタ）。
 * 見た目・端子・配線の根拠は src/devices/keyence/lr-wtx.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-x/specs/
 */

export default buildLrx('M8');
