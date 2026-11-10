import { buildVqcValve } from '../smc/vqc';

/** SMC 5 ポート電磁弁 VQC1200-51（プラグイン形・マニホールド VV5QC11 用、2 位置ダブル、DC24V）。作りは src/devices/smc/vqc.ts */
export default buildVqcValve({ type: 'smc.vqc1200-51', fn: 'double' });
