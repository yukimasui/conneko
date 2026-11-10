import { buildVqcValve } from '../smc/vqc';

/** SMC 5 ポート電磁弁 VQC1500-51（プラグイン形・マニホールド VV5QC11 用、3 位置プレッシャセンタ、DC24V）。作りは src/devices/smc/vqc.ts */
export default buildVqcValve({ type: 'smc.vqc1500-51', fn: 'pressure' });
