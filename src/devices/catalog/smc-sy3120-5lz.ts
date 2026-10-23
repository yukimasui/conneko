import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY3120-5LZ（ボディ配管形、2 位置シングル、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy3120-5lz', model: 'SY3120-5LZ', fn: 'single', size: 3 });
