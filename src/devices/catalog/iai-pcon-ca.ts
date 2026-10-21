import { buildCbSeries, networkList } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー PCON-CA（PCON-CB の前の世代。ロボシリンダー RCP2/RCP3/RCP4 用、パルスモーター）。
 * 正面の配置・電源コネクター（EMG-・0V・24V・MPO・MPI・S2・S1・BKRLS）・40 極 PIO の割付けは PCON-CB と同じ。
 * 出典: 取扱説明書 MJ0289「PCON-CA/CFA」（各部の名称と機能・型式の見方・2.1.2 PIO パターン・2.3.1 電源コネクタの配線）。
 */
export default buildCbSeries({
  type: 'iai.pcon-ca',
  series: 'PCON',
  variant: 'CA',
  name: 'ポジションコントローラー（ロボシリンダー用、旧世代）',
  panel: ['#1f4b47', '#163633'],
  motorKind: 'IAI-RCP-MPG',
  actuators: 'RCP4/RCP3/RCP2',
  out15: 'LOAD/TRQS/*ALML',
  ioTypes: ['NP', 'PN', 'PLN', 'PLP', 'CC', 'DV', 'PR', 'CN', 'ML', 'EC', 'EP'],
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（負荷電流）',
    unit: 'A',
    options: [
      { value: 1, label: '20P/28P/28SP（最大 1A）' },
      { value: 2.2, label: '35P/42P/56P（最大 2.2A）' },
      { value: 4.2, label: '高出力設定（定格 3.5A / 最大 4.2A）' },
    ],
    default: 2.2,
  },
  description:
    'IAI のロボシリンダー（RCP4/RCP3/RCP2、パルスモーター）用の 1 軸ポジションコントローラー PCON-CA（現行は PCON-CB）。電源は DC24V ±10%。' +
    `I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6）、パルス列、フィールドネットワーク（CC-Link・DeviceNet・PROFIBUS-DP・CompoNet・MECHATROLINK・EtherCAT・EtherNet/IP）。` +
    'PIO・電源コネクターの割付けは PCON-CB と同じ（PIO の 1A・2A に +24V、19B・20B に 0V。電源コネクターは 24V・0V・MPI・MPO・EMG-・S1・S2・BKRLS（Conneko の端子ID は BK））。' +
    `参考: CB 世代の対応ネットワーク ${networkList}。`,
});
