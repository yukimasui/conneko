import { buildCzv } from '../keyence/amp-series';

/**
 * KEYENCE デジタル RGB センサ CZ-V20 シリーズのアンプ CZ-V21A / CZ-V21AP（親機、4 出力）。
 * 見た目・端子・配線の根拠は src/devices/keyence/amp-series.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/cz-v20/specs/
 */

export default buildCzv('main');
