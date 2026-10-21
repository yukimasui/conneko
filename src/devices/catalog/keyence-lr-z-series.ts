import { buildLrzSeries } from '../keyence/lr-z';

/**
 * KEYENCE アンプ内蔵型 CMOS レーザセンサ LR-Z シリーズ（LR-ZB100N/P、LR-ZB250AN/AP、LR-ZH500N/P、ケーブル 2m）。
 * 種類は params の model で選ぶ。見た目・端子は src/devices/keyence/lr-z.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250an/dimensions/（4芯 茶/青/黒/白）
 */

export default buildLrzSeries('cable');
