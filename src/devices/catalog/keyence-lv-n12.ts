import { buildLvn } from '../keyence/amp-series';

/**
 * KEYENCE デジタルレーザセンサ LV-N シリーズ アンプ LV-N12N / LV-N12P（子機、ケーブル 2m、2 出力 + 外部入力）。
 * 見た目・端子・配線の根拠は src/devices/keyence/amp-series.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/laser/lv-n/specs/
 */

export default buildLvn('expansion');
