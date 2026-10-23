import { buildSyBase } from '../smc/sy-manifold';

/** SMC 5 ポート電磁弁 SY5440-5LZ（ベース配管形・マニホールド SS5Y5-41 用、3 位置エキゾーストセンタ、DC24V、L 形プラグ）。作りは src/devices/smc/sy-manifold.ts */
export default buildSyBase({ type: 'smc.sy5440-5lz', model: 'SY5440-5LZ', fn: 'exhaust', size: 5 });
