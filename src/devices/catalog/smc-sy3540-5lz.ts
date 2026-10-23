import { buildSyBase } from '../smc/sy-manifold';

/** SMC 5 ポート電磁弁 SY3540-5LZ（ベース配管形・マニホールド SS5Y3-41 用、3 位置プレッシャセンタ、DC24V、L 形プラグ）。作りは src/devices/smc/sy-manifold.ts */
export default buildSyBase({ type: 'smc.sy3540-5lz', model: 'SY3540-5LZ', fn: 'pressure', size: 3 });
