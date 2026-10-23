import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY5420-5LZ（ボディ配管形、3 位置エキゾーストセンタ、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy5420-5lz', model: 'SY5420-5LZ', fn: 'exhaust', size: 5 });
