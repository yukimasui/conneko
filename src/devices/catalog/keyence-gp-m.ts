import { buildGpm } from '../keyence/gp-m';

/**
 * KEYENCE 高耐久圧力センサ GP-M シリーズ（M12 ケーブルを差した姿。芯線の色ごとの端子）。
 * 見た目・端子は src/devices/keyence/gp-m.ts を参照。
 * 出典: https://www.keyence.co.jp/products/process/pressure/gp-m/models/gp-m010/
 */

export default buildGpm('cable');
