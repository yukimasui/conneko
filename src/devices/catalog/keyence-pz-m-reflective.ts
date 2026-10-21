import { buildPzvm } from '../keyence/pz-vm';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-V / PZ-M シリーズ 反射型（PZ-M11/M31/M71/M61、PZ-V11/V31/V71、ケーブル 2m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/pz-vm.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/specs/
 */

export default buildPzvm('reflective', 'cable');
