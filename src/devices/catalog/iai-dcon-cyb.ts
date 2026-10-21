import { buildCybSeries } from '../iai/cyb-series';

/**
 * IAI ポジションコントローラー DCON-CYB / PLB / POB（ロボシリンダー RCD 用の小型タイプ）。
 * 外形・コネクターは PCON-CYB と同じ（正面パネルはえんじ）。作りは iai/cyb-series.ts
 * （出典: 総合カタログ CJ9005「ACON/DCON-CYB/PLB/POB」、取扱説明書 MJ0354）。
 */
export default buildCybSeries({
  type: 'iai.dcon-cyb',
  series: 'DCON',
  name: 'ポジションコントローラー（小型、ロボシリンダー RCD 用）',
  panel: ['#8c3a2b', '#64281e'],
  motorKind: 'IAI-RCD-MPG',
  loadOptions: [{ value: 0.7, label: 'RCD 3W（定格 0.7A）' }],
  loadDefault: 0.7,
  description:
    'IAI のロボシリンダー RCD（DC ブラシレスモーター）用の小型 1 軸ポジションコントローラー（W28 × H80mm）。電源 DC24V ±10%。' +
    'タイプ: CYB（ポジショナー / 電磁弁）、PLB（パルス列・差動）、POB（パルス列・オープンコレクター）。I/O は入力 8 点・出力 8 点（NPN / PNP）、20 極 PIO コネクター（CB-PAD-PIO）。' +
    'I/O 用の電源はコントローラーの電源と共通（非絶縁）。電源コネクター: CP・0V・MP・EMG-・BK。',
});
