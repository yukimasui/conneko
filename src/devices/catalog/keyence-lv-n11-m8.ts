import { buildLvn } from '../keyence/amp-series';

/**
 * KEYENCE デジタルレーザセンサ LV-N シリーズ アンプ LV-N11CN / LV-N11CP（親機、M8 4ピン コネクタ）。
 * 見た目・端子・配線の根拠は src/devices/keyence/amp-series.ts を参照。
 * 出典: https://www.keyence.com/products/sensor/laser/lv-n/models/lv-n11cn/
 */

export default buildLvn('main-m8');
