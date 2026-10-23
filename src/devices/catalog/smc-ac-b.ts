import { buildFrl } from '../smc/frl';

/** SMC 2 点セット（フィルタ + レギュレータ）（AC□B シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.ac-b',
  name: '2 点セット（フィルタ + レギュレータ）',
  series: 'AC',
  combo: 'B',
  units: ['AF', 'AR'],
  suffix: 'B',
  labelPrefix: 'FR',
  description:
    'SMC のモジュラー形 F.R.L. ユニット AC□B（エアフィルタ AF + レギュレータ AR）。ルブリケータなしの 2 点セットで、無給油の機器（いまの電磁弁・シリンダの多く）に使う。ろ過度 5μm、最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。',
});
