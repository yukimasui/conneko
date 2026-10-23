import { buildFrl } from '../smc/frl';

/** SMC 3 点セット（フィルタ + レギュレータ + ルブリケータ）（AC シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.ac',
  name: '3 点セット（フィルタ + レギュレータ + ルブリケータ）',
  series: 'AC',
  units: ['AF', 'AR', 'AL'],
  suffix: 'B',
  labelPrefix: 'FRL',
  description:
    'SMC のモジュラー形 F.R.L. ユニット AC シリーズ（エアフィルタ AF + レギュレータ AR + ルブリケータ AL）。エア源の直後に置き、ごみ・水分を除き（ろ過度 5μm）、設定圧力に減圧し、タービン油 1 種（ISO VG32）を霧状に混ぜて下流の機器へ送る。最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。給油が不要な機器（無給油の電磁弁・シリンダ）だけなら AC□B（AF + AR）を使う。',
});
