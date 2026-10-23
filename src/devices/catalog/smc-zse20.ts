import { buildPressureSwitch } from '../smc/pressure-switch';

/** SMC デジタル圧力スイッチ ZSE20（真空圧、1 出力）。作りは src/devices/smc/pressure-switch.ts */
export default buildPressureSwitch({ type: 'smc.zse20', series: 'ZSE20' });
