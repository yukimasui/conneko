import { buildPrg } from '../keyence/pr-g';

/**
 * KEYENCE アンプ内蔵型光電センサ PR-G シリーズ 透過型の受光器（PR-G51/56、角型・ケーブル 2m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pr-g.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/specs/
 */

export default buildPrg('receiver', 'cable');
