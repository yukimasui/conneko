import { buildPzgReflective } from '../keyence/pz-g';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G41N / PZ-G41P（拡散反射型・長距離、角型、ケーブル 2m）。
 * 線色（KEYENCE 入出力回路図より）: 茶 = DC10〜30V、黒 = 制御出力（NPN/PNP オープンコレクタ 30V 100mA）、青 = 0V。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41n/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41n/io-circuit/
 */

export default buildPzgReflective({
  series: 'PZ-G41',
  kindName: '拡散反射型',
  range: '1m',
  description:
    'KEYENCE のアンプ内蔵型光電センサ PZ-G41（拡散反射型・長距離、検出距離 1m、角型 20×31mm、ケーブル 2m）。出力形式は params の output で NPN（PZ-G41N）/PNP（PZ-G41P）を選ぶ。茶を +24V、青を 0V、黒（制御出力、オープンコレクタ 30V 100mA）を PLC の入力につなぐ。NPN は出力 ON で黒が 0V に落ちる（PLC 入力の COM を +24V にする）、PNP は黒が +V になる（COM を 0V にする）。電源 DC10〜30V、消費電流 34mA 以下。',
});
