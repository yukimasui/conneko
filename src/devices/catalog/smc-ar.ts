import { buildFrl } from '../smc/frl';

/** SMC レギュレータ（減圧弁）（AR シリーズ）。作りは src/devices/smc/frl.ts */
export default buildFrl({
  type: 'smc.ar',
  name: 'レギュレータ（減圧弁）',
  series: 'AR',
  units: ['AR'],
  suffix: 'B',
  labelPrefix: 'AR',
  description:
    'SMC のレギュレータ AR シリーズ（AR20-B〜AR40-B、圧力計付き）。一次側のエアを設定圧力に減圧して二次側へ送る（リリーフ形: 二次側が設定より高くなると逃がす）。最高使用圧力 1.0MPa、設定圧力範囲 0.05〜0.85MPa。一次側の圧力は設定圧力より 0.05MPa 以上高くする。シリンダごとに圧力を変えたいときは、電磁弁の手前に個別に置く。',
});
