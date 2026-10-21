import { buildCbSeries, networkList } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー ACON-CB / ACON-CGB（ロボシリンダー RCA/RCA2 用、DC24V サーボモーター）。
 * 外形・正面の配置は PCON-CB と共通（正面パネルは紺）。
 * 出典: IAI 総合カタログ CJ9005「ACON-CB/DCON-CB」（基本仕様・モーター電源容量・PIO パターン・外形寸法図・製品写真）、
 *       取扱説明書 MJ0343「ACON-CB/DCON-CB」（電源コネクターの配線・モーター・エンコーダーコネクター）。
 */
export default buildCbSeries({
  type: 'iai.acon-cb',
  series: 'ACON',
  variant: 'CB',
  name: 'ポジションコントローラー（ロボシリンダー用）',
  panel: ['#25356b', '#1a254d'],
  motorKind: 'IAI-RCA-MPG',
  actuators: 'RCA/RCA2/RCL',
  out15: '*BALM/*ALML',
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（定格電流）',
    unit: 'A',
    options: [
      { value: 1, label: '5W（定格 1.0A / 最大 3.3A）' },
      { value: 1.3, label: '10W/20W/30W（定格 1.3A / 最大 4.4A）' },
      { value: 1.7, label: '20W（20S）（定格 1.7A / 最大 5.1A）' },
    ],
    default: 1.3,
  },
  description:
    'IAI のロボシリンダー RCA/RCA2/RCL（DC24V サーボモーター）用の 1 軸ポジションコントローラー。電源は DC24V ±10%（モーター電源容量は 5W で定格 1.0A、10〜30W で定格 1.3A・最大 4.4A）。' +
    'タイプ: CB（標準）/ CGB（安全カテゴリー対応）。' +
    `I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6 コネクター）、パルス列（差動入力）、フィールドネットワーク（${networkList}）。` +
    'PIO・電源コネクターの割付けは PCON-CB と同じ（PIO の 1A・2A が +24V、19B・20B が 0V。電源コネクターは 24V・0V・MPI・MPO・EMG-・S1・S2・BK）。' +
    'NPN 仕様の入力はプラスコモン、出力は NPN（最大 50mA）。PNP 仕様は入力がマイナスコモン、出力が PNP。',
});
