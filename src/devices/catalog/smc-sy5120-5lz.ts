import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY5120-5LZ（ボディ配管形、2 位置シングル、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy5120-5lz', model: 'SY5120-5LZ', fn: 'single', size: 5 });
