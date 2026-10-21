import { buildPzvm } from '../keyence/pz-vm';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-V / PZ-M シリーズ 反射型（PZ-M13/M33/M73/M63、PZ-V13/V33/V73、ケーブル付 M12 コネクタ 0.3m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pz-vm.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/specs/
 */

export default buildPzvm('reflective', 'M12-pigtail');
