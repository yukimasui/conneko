import { buildSyBase } from '../smc/sy-manifold';

/** SMC 5 ポート電磁弁 SY3140-5LZ（ベース配管形・マニホールド SS5Y3-41 用、2 位置シングル、DC24V、L 形プラグ）。作りは src/devices/smc/sy-manifold.ts */
export default buildSyBase({ type: 'smc.sy3140-5lz', model: 'SY3140-5LZ', fn: 'single', size: 3 });
