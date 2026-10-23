import { buildFrl } from '../smc/frl';

/** SMC 2 点セット（フィルタレギュレータ + ミストセパレータ）（AC□D シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.ac-d',
  name: '2 点セット（フィルタレギュレータ + ミストセパレータ）',
  series: 'AC',
  combo: 'D',
  units: ['AW', 'AFM'],
  suffix: 'B',
  labelPrefix: 'FR',
  description:
    'SMC のモジュラー形 F.R.L. ユニット AC□D（フィルタレギュレータ AW + ミストセパレータ AFM）。AW でろ過（5μm）・減圧し、AFM で油分のミストまで除く（0.3μm）。最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。',
});
