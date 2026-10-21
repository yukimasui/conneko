import { buildCybSeries } from '../iai/cyb-series';

/**
 * IAI ポジションコントローラー PCON-CYB / PLB / POB（ロボシリンダー RCP6/RCP5/RCP4/RCP3/RCP2 用の小型タイプ）。
 * 作りは iai/cyb-series.ts（出典: 総合カタログ CJ9005「PCON-CYB/PLB/POB」、取扱説明書 MJ0353）。
 */
export default buildCybSeries({
  type: 'iai.pcon-cyb',
  series: 'PCON',
  name: 'ポジションコントローラー（小型、ロボシリンダー用）',
  panel: ['#1f4b47', '#163633'],
  motorKind: 'IAI-RCP-MPG',
  loadOptions: [
    { value: 2.2, label: '標準（2.2A）' },
    { value: 4.2, label: '高出力設定（最大 4.2A）' },
  ],
  loadDefault: 2.2,
  description:
    'IAI のロボシリンダー（RCP6/RCP5/RCP4/RCP3/RCP2、パルスモーター）用の小型 1 軸ポジションコントローラー（W28 × H80mm）。電源 DC24V ±10%（2.2A、高出力設定で最大 4.2A）。' +
    'タイプ: CYB（ポジショナー / 電磁弁タイプ、最大 64 点）、PLB（パルス列・差動）、POB（パルス列・オープンコレクター）。I/O は入力 8 点・出力 8 点（NPN / PNP）で、20 極の PIO コネクターに PIO ケーブル CB-PAD-PIO（PLB/POB は CB-PAD-PIOS）をつなぐ。' +
    'I/O 用の電源はコントローラーの電源と共通（非絶縁）: NPN 仕様の入力は CP（+24V）へのプラスコモン、出力は 0V へ引き込む。' +
    '電源コネクター: CP（制御電源 24V）・0V・MP（モーター駆動電源）・EMG-（+24V で非常停止解除）・BK（ブレーキ強制解除）。',
});
