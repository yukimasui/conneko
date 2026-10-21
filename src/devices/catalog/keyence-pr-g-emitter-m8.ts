import { buildPrg } from '../keyence/pr-g';

/**
 * KEYENCE アンプ内蔵型光電センサ PR-G シリーズ 透過型の投光器（PR-G51C、角型・M8 4ピン コネクタ）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pr-g.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/specs/
 */

export default buildPrg('emitter', 'M8');
