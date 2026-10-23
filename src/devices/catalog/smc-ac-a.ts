import { buildFrl } from '../smc/frl';

/** SMC 3 点セット（フィルタレギュレータ + ルブリケータ）（AC□A シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.ac-a',
  name: '3 点セット（フィルタレギュレータ + ルブリケータ）',
  series: 'AC',
  combo: 'A',
  units: ['AW', 'AL'],
  suffix: 'B',
  labelPrefix: 'FRL',
  description:
    'SMC のモジュラー形 F.R.L. ユニット AC□A（フィルタレギュレータ AW + ルブリケータ AL）。フィルタとレギュレータを 1 台にまとめた AW で、ろ過（5μm）と減圧をし、ルブリケータで給油する。最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。',
});
