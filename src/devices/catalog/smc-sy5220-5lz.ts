import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY5220-5LZ（ボディ配管形、2 位置ダブル、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy5220-5lz', model: 'SY5220-5LZ', fn: 'double', size: 5 });
