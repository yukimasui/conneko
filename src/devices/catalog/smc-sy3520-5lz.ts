import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY3520-5LZ（ボディ配管形、3 位置プレッシャセンタ、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy3520-5lz', model: 'SY3520-5LZ', fn: 'pressure', size: 3 });
