import { buildPrmf } from '../keyence/pr-mf';

/**
 * KEYENCE 超小型アンプ内蔵型光電センサ PR-M51 / PR-F51（透過型）の受光器（ケーブル 1m・3m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pr-mf.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pr-m_f/specs/
 */

export default buildPrmf('receiver', 'cable');
