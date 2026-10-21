import { buildLrxn } from '../keyence/amp-series';

/**
 * KEYENCE CMOS レーザセンサ LR-X シリーズのアンプ LR-XN11C（M8 4ピン コネクタ、NPN/PNP 切換式）。
 * 見た目・端子・配線の根拠は src/devices/keyence/amp-series.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-x/specs/
 */

export default buildLrxn('main-m8');
