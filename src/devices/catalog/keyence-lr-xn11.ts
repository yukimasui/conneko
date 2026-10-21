import { buildLrxn } from '../keyence/amp-series';

/**
 * KEYENCE CMOS レーザセンサ LR-X シリーズのアンプ LR-XN11N / LR-XN11P（親機、ケーブル 2m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/amp-series.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-x/specs/
 */

export default buildLrxn('main');
