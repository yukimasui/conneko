import { buildLrz } from '../keyence/lr-z';

/**
 * KEYENCE アンプ内蔵型 CMOS レーザセンサ LR-ZB250C（センサー単体。M8 4ピンコネクタが端子）。
 * M8 ケーブル（generic.m8-4p-cable など）とつないで使う。見た目・端子は src/devices/keyence/lr-z.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/
 */

export default buildLrz('m8');
