import { buildAv2000 } from '../smc/soft-start';

/** SMC ソフトスタート弁 AV2000（残圧排気弁を兼ねる 3 ポート電磁弁、DC24V）。作りは src/devices/smc/soft-start.ts */
export default buildAv2000('smc.av2000');
