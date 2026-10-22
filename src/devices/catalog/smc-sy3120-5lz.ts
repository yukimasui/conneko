import { buildSy } from '../generic/smc-sy';

/** SMC 5 ポート電磁弁 SY3120-5LZ（2 位置シングル、DC24V、L 形プラグ）。作りは src/devices/generic/smc-sy.ts */
export default buildSy({ type: 'smc.sy3120-5lz', model: 'SY3120-5LZ', solenoids: 1, size: 3 });
