import { buildVqcValve } from '../smc/vqc';

/** SMC 5 ポート電磁弁 VQC1100-51（プラグイン形・マニホールド VV5QC11 用、2 位置シングル、DC24V）。作りは src/devices/smc/vqc.ts */
export default buildVqcValve({ type: 'smc.vqc1100-51', fn: 'single' });
