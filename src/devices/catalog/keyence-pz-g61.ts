import { buildPzgReflective } from '../keyence/pz-g';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G61N / PZ-G61P（回帰反射型・長距離 P.R.O. 機能付、角型、ケーブル 2m）。
 * 線色（KEYENCE 入出力回路図より）: 茶 = DC10〜30V、黒 = 制御出力（NPN/PNP オープンコレクタ 30V 100mA）、青 = 0V。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g61n/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g61n/io-circuit/
 */

export default buildPzgReflective({
  series: 'PZ-G61',
  kindName: '回帰反射型',
  range: '0.1〜4.2m',
  description:
    'KEYENCE のアンプ内蔵型光電センサ PZ-G61（回帰反射型・長距離、検出距離 0.1〜4.2m（リフレクタ R-2L 使用時、リフレクタ別売）、角型 20×31mm、ケーブル 2m）。出力形式は params の output で NPN（PZ-G61N）/PNP（PZ-G61P）を選ぶ。茶を +24V、青を 0V、黒（制御出力、オープンコレクタ 30V 100mA）を PLC の入力につなぐ。電源 DC10〜30V、消費電流 34mA 以下。',
});
