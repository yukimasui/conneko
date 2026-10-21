import { buildFdq } from '../keyence/fd-q';

/**
 * KEYENCE クランプオン式流量センサ FD-Q シリーズ（センサー単体。M12 4ピンコネクタが端子）。
 * M12 ケーブル（generic.m12-4p-cable など）とつないで使う。見た目・端子は src/devices/keyence/fd-q.ts を参照。
 * 出典: https://www.keyence.co.jp/products/process/flow/fd-q/models/fd-q20c/
 */

export default buildFdq('m12');
