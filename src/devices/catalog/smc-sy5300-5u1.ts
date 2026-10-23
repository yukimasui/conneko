import { buildSyPlugIn } from '../smc/sy-serial';

/** SMC 5 ポート電磁弁 SY5300-5U1（プラグイン形・マニホールド SS5Y5-10S 用、3 位置クローズドセンタ、DC24V）。作りは src/devices/smc/sy-serial.ts */
export default buildSyPlugIn({ type: 'smc.sy5300-5u1', model: 'SY5300-5U1', fn: 'closed', size: 5 });
