import { buildSy } from '../smc/sy-body';

/** SMC 5 ポート電磁弁 SY3320-5LZ（ボディ配管形、3 位置クローズドセンタ、DC24V、L 形プラグ）。作りは src/devices/smc/sy-body.ts */
export default buildSy({ type: 'smc.sy3320-5lz', model: 'SY3320-5LZ', fn: 'closed', size: 3 });
