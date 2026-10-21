import { buildLrz } from '../keyence/lr-z';

/**
 * KEYENCE アンプ内蔵型 CMOS レーザセンサ LR-ZB250C（M8 ケーブルを差した姿。芯線の色ごとの端子）。
 * 見た目・端子は src/devices/keyence/lr-z.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/
 */

export default buildLrz('cable');
