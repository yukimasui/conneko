import { buildFrl } from '../smc/frl';

/** SMC ミストセパレータ（AFM シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.afm',
  name: 'ミストセパレータ',
  series: 'AFM',
  units: ['AFM'],
  suffix: 'A',
  labelPrefix: 'AFM',
  description:
    'SMC のミストセパレータ AFM シリーズ（AFM20-A〜AFM40-A）。エアフィルタ（5μm）の後ろに置き、エア中の油分のミストを除く（ろ過度 0.3μm、捕集効率 99.9%）。最高使用圧力 1.0MPa。',
});
