import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY3220-5LZ（ボディ配管形、2 位置ダブル、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy3220-5lz', model: 'SY3220-5LZ', fn: 'double', size: 3 });
