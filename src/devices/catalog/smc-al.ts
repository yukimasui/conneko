import { buildFrl } from '../smc/frl';

/** SMC ルブリケータ（AL シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.al',
  name: 'ルブリケータ',
  series: 'AL',
  units: ['AL'],
  suffix: 'A',
  labelPrefix: 'AL',
  description:
    'SMC のルブリケータ AL シリーズ（AL20-A〜AL40-A）。エアにタービン油 1 種（ISO VG32）を霧状に混ぜて、給油が必要な機器へ送る。滴下窓で滴下量を見ながら上のつまみで調整する。最高使用圧力 1.0MPa。一度給油した機器は給油をやめないこと。',
});
