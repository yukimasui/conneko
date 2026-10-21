import { buildCbSeries } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー DCON-CA（DCON-CB の前の世代。ロボシリンダー RCD 用）。
 * 正面の配置・電源コネクター・40 極 PIO の割付けは DCON-CB と同じ。
 * 出典: 取扱説明書 MJ0326「ACON-CA/DCON-CA」。
 */
export default buildCbSeries({
  type: 'iai.dcon-ca',
  series: 'DCON',
  variant: 'CA',
  name: 'ポジションコントローラー（ロボシリンダー RCD 用、旧世代）',
  panel: ['#8c3a2b', '#64281e'],
  motorKind: 'IAI-RCD-MPG',
  actuators: 'RCD',
  out15: '*ALML',
  ioTypes: ['NP', 'PN', 'PLN', 'PLP', 'CC', 'DV', 'PR', 'CN', 'ML', 'EC', 'EP'],
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（定格電流）',
    unit: 'A',
    options: [{ value: 0.7, label: '3W（定格 0.7A）' }],
    default: 0.7,
  },
  description:
    'IAI のロボシリンダー RCD（DC ブラシレスモーター）用の 1 軸ポジションコントローラー DCON-CA（現行は DCON-CB）。電源は DC24V ±10%。' +
    'PIO・電源コネクターの割付けは DCON-CB / PCON-CB と同じ。',
});
