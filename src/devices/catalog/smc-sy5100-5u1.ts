import { buildSyPlugIn } from '../smc/sy-serial';

/** SMC 5 ポート電磁弁 SY5100-5U1（プラグイン形・マニホールド SS5Y5-10S 用、2 位置シングル、DC24V）。作りは src/devices/smc/sy-serial.ts */
export default buildSyPlugIn({ type: 'smc.sy5100-5u1', model: 'SY5100-5U1', fn: 'single', size: 5 });
