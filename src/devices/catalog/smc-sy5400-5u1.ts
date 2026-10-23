import { buildSyPlugIn } from '../smc/sy-serial';

/** SMC 5 ポート電磁弁 SY5400-5U1（プラグイン形・マニホールド SS5Y5-10S 用、3 位置エキゾーストセンタ、DC24V）。作りは src/devices/smc/sy-serial.ts */
export default buildSyPlugIn({ type: 'smc.sy5400-5u1', model: 'SY5400-5U1', fn: 'exhaust', size: 5 });
