import { buildFsnExpansion } from '../keyence/fs-n';

/**
 * KEYENCE デジタルファイバセンサ FS-N40 シリーズ アンプ FS-N42N / FS-N42P（ケーブルタイプ・子機、1 出力）。
 * 親機（FS-N41 / FS-N43）に連結して使う。見た目・端子は src/devices/keyence/fs-n.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/specs/
 *       https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n42n/dimensions/
 */

export default buildFsnExpansion('FS-N42');
