import { buildPzg } from '../keyence/pz-g';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G シリーズ 角型・ケーブル 2mの反射型（拡散反射・狭視界・限定反射・回帰反射）。
 * 種類（型式）は params の model で選ぶ。見た目・端子・配線の根拠は src/devices/keyence/pz-g.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41n/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41n/dimensions/
 */

export default buildPzg('square', 'reflective', 'cable');
