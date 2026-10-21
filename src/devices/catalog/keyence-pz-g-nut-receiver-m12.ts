import { buildPzg } from '../keyence/pz-g';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G シリーズ ナット型（M18、Bipolar 出力）・M12 4ピン コネクタの透過型の受光器。
 * 種類（型式）は params の model で選ぶ。見た目・端子・配線の根拠は src/devices/keyence/pz-g.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41cb/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41cb/dimensions/
 */

export default buildPzg('nut', 'receiver', 'm12');
