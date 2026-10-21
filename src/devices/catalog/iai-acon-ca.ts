import { buildCbSeries } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー ACON-CA（ACON-CB の前の世代。ロボシリンダー RCA/RCA2/RCL 用）。
 * 正面の配置・電源コネクター・40 極 PIO の割付けは ACON-CB と同じ。
 * 出典: 取扱説明書 MJ0326「ACON-CA/DCON-CA」（型式の見方・電源コネクタの配線）。
 */
export default buildCbSeries({
  type: 'iai.acon-ca',
  series: 'ACON',
  variant: 'CA',
  name: 'ポジションコントローラー（ロボシリンダー用、旧世代）',
  panel: ['#25356b', '#1a254d'],
  motorKind: 'IAI-RCA-MPG',
  actuators: 'RCA/RCA2/RCL',
  out15: '*BALM/*ALML',
  ioTypes: ['NP', 'PN', 'PLN', 'PLP', 'CC', 'DV', 'PR', 'CN', 'ML', 'EC', 'EP'],
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（定格電流）',
    unit: 'A',
    options: [
      { value: 1, label: '5W（定格 1.0A）' },
      { value: 1.3, label: '10〜30W（定格 1.3A）' },
      { value: 1.7, label: '20W（20S）（定格 1.7A）' },
    ],
    default: 1.3,
  },
  description:
    'IAI のロボシリンダー RCA/RCA2/RCL（DC24V サーボモーター）用の 1 軸ポジションコントローラー ACON-CA（現行は ACON-CB）。電源は DC24V ±10%。' +
    'I/O 種類: PIO（NPN / PNP、40 極 HIF6）、パルス列、フィールドネットワーク（CC-Link・DeviceNet・PROFIBUS-DP・CompoNet・MECHATROLINK・EtherCAT・EtherNet/IP）。' +
    'PIO・電源コネクターの割付けは ACON-CB / PCON-CB と同じ。',
});
