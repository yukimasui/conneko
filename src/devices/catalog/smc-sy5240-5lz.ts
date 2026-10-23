import { buildSyBase } from '../smc/sy-manifold';

/** SMC 5 ポート電磁弁 SY5240-5LZ（ベース配管形・マニホールド SS5Y5-41 用、2 位置ダブル、DC24V、L 形プラグ）。作りは src/devices/smc/sy-manifold.ts */
export default buildSyBase({ type: 'smc.sy5240-5lz', model: 'SY5240-5LZ', fn: 'double', size: 5 });
