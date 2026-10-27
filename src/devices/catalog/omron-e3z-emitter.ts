import { buildE3z } from '../sensor/omron-e3z';

/**
 * オムロン 小型アンプ内蔵形光電センサ E3Z コード引出し（ケーブル 2m）の透過形の投光器。
 * 見た目・端子・配線の根拠は src/devices/sensor/omron-e3z.ts を参照。
 * 出典: https://www.fa.omron.co.jp/products/family/407/specification/
 *       https://www.fa.omron.co.jp/products/family/407/lineup/
 */
export default buildE3z('emitter', 'cable');
