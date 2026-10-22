import { buildSy } from '../generic/smc-sy';

/** SMC 5 ポート電磁弁 SY3220-5LZ（2 位置ダブル、DC24V、L 形プラグ）。作りは src/devices/generic/smc-sy.ts */
export default buildSy({ type: 'smc.sy3220-5lz', model: 'SY3220-5LZ', solenoids: 2, size: 3 });
