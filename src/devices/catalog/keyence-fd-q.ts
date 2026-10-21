import { buildFdq } from '../keyence/fd-q';

/**
 * KEYENCE クランプオン式流量センサ FD-Q シリーズ（M12 ケーブルを差した姿。芯線の色ごとの端子）。
 * 見た目・端子は src/devices/keyence/fd-q.ts を参照。
 * 出典: https://www.keyence.co.jp/products/process/flow/fd-q/models/fd-q20c/
 */

export default buildFdq('cable');
