import { buildFrl } from '../smc/frl';

/** SMC 3 点セット（フィルタ + ミストセパレータ + レギュレータ）（AC□C シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.ac-c',
  name: '3 点セット（フィルタ + ミストセパレータ + レギュレータ）',
  series: 'AC',
  combo: 'C',
  units: ['AF', 'AFM', 'AR'],
  suffix: 'B',
  labelPrefix: 'FRL',
  description:
    'SMC のモジュラー形 F.R.L. ユニット AC□C（エアフィルタ AF + ミストセパレータ AFM + レギュレータ AR）。AF（5μm）の後ろの AFM で油分のミストまで除き（0.3μm）、きれいなエアに減圧して送る。最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。',
});
