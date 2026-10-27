import { buildE3z } from '../sensor/omron-e3z';

/**
 * オムロン 小型アンプ内蔵形光電センサ E3Z M8 4ピン コネクタの反射形（拡散反射形 E3Z-D61 / D62・回帰反射形 E3Z-R61。種類は params の model で選ぶ）。
 * 見た目・端子・配線の根拠は src/devices/sensor/omron-e3z.ts を参照。
 * 出典: https://www.fa.omron.co.jp/products/family/407/specification/
 *       https://www.fa.omron.co.jp/products/family/407/lineup/
 */
export default buildE3z('reflective', 'M8');
