import { buildGpm } from '../keyence/gp-m';

/**
 * KEYENCE 高耐久圧力センサ GP-M シリーズ（センサー単体。M12 4ピンコネクタが端子）。
 * M12 ケーブル（generic.m12-4p-cable など）とつないで使う。見た目・端子は src/devices/keyence/gp-m.ts を参照。
 * 出典: https://www.keyence.co.jp/products/process/pressure/gp-m/models/gp-m010/
 */

export default buildGpm('m12');
