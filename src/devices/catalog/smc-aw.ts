import { buildFrl } from '../smc/frl';

/** SMC フィルタレギュレータ（AW シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.aw',
  name: 'フィルタレギュレータ',
  series: 'AW',
  units: ['AW'],
  suffix: 'B',
  labelPrefix: 'FR',
  description:
    'SMC のフィルタレギュレータ AW シリーズ（AW20-B〜AW40-B、圧力計付き）。エアフィルタ（ろ過度 5μm）とレギュレータを 1 台にまとめたもので、装置の入口に置いて、ごみ・水分を除き設定圧力に減圧する。最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。一次側の圧力は設定圧力より 0.05MPa 以上高くする。つまみは引いてロックを外し（オレンジの帯が見える）、回して圧力を合わせ、押してロックする。',
});
