import { buildVqcValve } from '../smc/vqc';

/** SMC 5 ポート電磁弁 VQC1300-51（プラグイン形・マニホールド VV5QC11 用、3 位置クローズドセンタ、DC24V）。作りは src/devices/smc/vqc.ts */
export default buildVqcValve({ type: 'smc.vqc1300-51', fn: 'closed' });
