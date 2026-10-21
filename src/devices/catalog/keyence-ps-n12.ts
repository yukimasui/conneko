import { buildPsn } from '../keyence/amp-series';

/**
 * KEYENCE アンプ分離型光電センサ PS-N シリーズ アンプ PS-N12N / PS-N12P（子機、ケーブル 2m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/amp-series.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/ps-n/specs/
 */

export default buildPsn('expansion', 'cable');
