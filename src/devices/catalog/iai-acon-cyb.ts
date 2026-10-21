import { buildCybSeries } from '../iai/cyb-series';

/**
 * IAI ポジションコントローラー ACON-CYB / PLB / POB（ロボシリンダー RCA/RCA2/RCL 用の小型タイプ）。
 * 外形・コネクターは PCON-CYB と同じ（正面パネルは紺）。作りは iai/cyb-series.ts
 * （出典: 総合カタログ CJ9005「ACON/DCON-CYB/PLB/POB」、取扱説明書 MJ0354）。
 */
export default buildCybSeries({
  type: 'iai.acon-cyb',
  series: 'ACON',
  name: 'ポジションコントローラー（小型、ロボシリンダー用）',
  panel: ['#25356b', '#1a254d'],
  motorKind: 'IAI-RCA-MPG',
  loadOptions: [
    { value: 1, label: '5W（定格 1.0A）' },
    { value: 1.3, label: '10〜30W（定格 1.3A）' },
    { value: 1.7, label: '20W（20S）（定格 1.7A）' },
  ],
  loadDefault: 1.3,
  description:
    'IAI のロボシリンダー RCA/RCA2/RCL（DC24V サーボモーター）用の小型 1 軸ポジションコントローラー（W28 × H80mm）。電源 DC24V ±10%。' +
    'タイプ: CYB（ポジショナー / 電磁弁）、PLB（パルス列・差動）、POB（パルス列・オープンコレクター）。I/O は入力 8 点・出力 8 点（NPN / PNP）、20 極 PIO コネクター（CB-PAD-PIO）。' +
    'I/O 用の電源はコントローラーの電源と共通（非絶縁）。電源コネクター: CP・0V・MP・EMG-・BK。',
});
