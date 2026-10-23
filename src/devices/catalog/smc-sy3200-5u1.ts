import { buildSyPlugIn } from '../smc/sy-serial';

/** SMC 5 ポート電磁弁 SY3200-5U1（プラグイン形・マニホールド SS5Y3-10S 用、2 位置ダブル、DC24V）。作りは src/devices/smc/sy-serial.ts */
export default buildSyPlugIn({ type: 'smc.sy3200-5u1', model: 'SY3200-5U1', fn: 'double', size: 3 });
