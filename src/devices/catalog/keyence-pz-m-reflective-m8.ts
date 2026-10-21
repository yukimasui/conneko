import { buildPzvm } from '../keyence/pz-vm';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-V / PZ-M シリーズ 反射型（PZ-M12/M32/M72/M62、PZ-V12/V32/V72、ケーブル付 M8 コネクタ 0.13m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pz-vm.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/specs/
 */

export default buildPzvm('reflective', 'M8-pigtail');
