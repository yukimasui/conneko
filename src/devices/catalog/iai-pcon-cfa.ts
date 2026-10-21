import { buildCbSeries } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー PCON-CFA（PCON-CA の高推力アクチュエーター用。上にファンユニット。現行は PCON-CFB）。
 * 出典: 取扱説明書 MJ0289「PCON-CA/CFA」。
 */
export default buildCbSeries({
  type: 'iai.pcon-cfa',
  series: 'PCON',
  variant: 'CFA',
  name: 'ポジションコントローラー（ロボシリンダー高推力用、旧世代）',
  panel: ['#1f4b47', '#163633'],
  motorKind: 'IAI-RCP-MPG-CFB',
  actuators: 'RCP4/RCP3/RCP2 の 56SP/60P/86P など高推力タイプ',
  out15: 'LOAD/TRQS/*ALML',
  ioTypes: ['NP', 'PN', 'PLN', 'PLP', 'CC', 'DV', 'PR', 'CN', 'ML', 'EC', 'EP'],
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（負荷電流）',
    unit: 'A',
    options: [{ value: 6, label: '60P/86P など（定格 4.2A / 最大 6A）' }],
    default: 6,
  },
  description:
    'IAI のロボシリンダー高推力タイプ用の 1 軸ポジションコントローラー PCON-CFA（現行は PCON-CFB）。PCON-CA の上にファンユニットが付いた形。電源は DC24V ±10%（最大 6A）。' +
    'PIO・電源コネクターの割付けは PCON-CA / CB と同じ。',
});
