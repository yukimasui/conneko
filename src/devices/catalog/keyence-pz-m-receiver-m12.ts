import { buildPzvm } from '../keyence/pz-vm';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-M53（透過型 10m）の受光器（ケーブル付 M12 コネクタ 0.3m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pz-vm.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/models/pz-m51/io-circuit/
 */

export default buildPzvm('receiver', 'M12-pigtail');
