import { buildCbSeries, networkList } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー DCON-CB / DCON-CGB（ロボシリンダー RCD 用、DC ブラシレスモーター）。
 * 外形・正面の配置は PCON-CB と共通（正面パネルはえんじ。インクリメンタル仕様のみで、アブソバッテリー関係の LED・コネクターはない）。
 * 出典: IAI 総合カタログ CJ9005「ACON-CB/DCON-CB」、取扱説明書 MJ0343「ACON-CB/DCON-CB」。
 */
export default buildCbSeries({
  type: 'iai.dcon-cb',
  series: 'DCON',
  variant: 'CB',
  name: 'ポジションコントローラー（ロボシリンダー RCD 用）',
  panel: ['#8c3a2b', '#64281e'],
  motorKind: 'IAI-RCD-MPG',
  actuators: 'RCD',
  out15: '*ALML',
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（定格電流）',
    unit: 'A',
    options: [{ value: 0.7, label: '3W（定格 0.7A / 最大 1.5A）' }],
    default: 0.7,
  },
  description:
    'IAI のロボシリンダー RCD（DC ブラシレスモーター 3W）用の 1 軸ポジションコントローラー。電源は DC24V ±10%（定格 0.7A・最大 1.5A）。' +
    'タイプ: CB（標準）/ CGB（安全カテゴリー対応）。' +
    `I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6 コネクター）、パルス列（差動入力）、フィールドネットワーク（${networkList}）。` +
    'PIO・電源コネクターの割付けは PCON-CB と同じ（PIO の 1A・2A が +24V、19B・20B が 0V。電源コネクターは 24V・0V・MPI・MPO・EMG-・S1・S2・BK）。',
});
