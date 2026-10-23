import { buildPressureSwitch } from '../smc/pressure-switch';

/** SMC デジタル圧力スイッチ ISE20（正圧、1 出力）。作りは src/devices/smc/pressure-switch.ts */
export default buildPressureSwitch({ type: 'smc.ise20', series: 'ISE20' });
