import { buildFrl } from '../smc/frl';

/** SMC エアフィルタ（AF シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.af',
  name: 'エアフィルタ',
  series: 'AF',
  units: ['AF'],
  suffix: 'A',
  labelPrefix: 'AF',
  description:
    'SMC のエアフィルタ AF シリーズ（AF20-A〜AF40-A）。エア中のごみ・水分を除く（ろ過度 5μm）。ボウルにたまったドレンはドレンコック（またはオートドレン）で抜く。最高使用圧力 1.0MPa。',
});
