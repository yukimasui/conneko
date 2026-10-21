import { buildCbSeries, networkList } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー PCON-CFB / PCON-CGFB（高推力・大型パルスモーター 56SP/60P/86P 用）。
 * PCON-CB と同じ正面に、上部のファンユニット（強制空冷）が付き、高さ 190mm。
 * 出典: IAI 総合カタログ CJ9005「PCON-CB/CFB」（基本仕様・外形寸法図）、取扱説明書 MJ0342。
 */
export default buildCbSeries({
  type: 'iai.pcon-cfb',
  series: 'PCON',
  variant: 'CFB',
  name: 'ポジションコントローラー（ロボシリンダー高推力用）',
  panel: ['#1f4b47', '#163633'],
  motorKind: 'IAI-RCP-MPG-CFB',
  actuators: 'RCP6/RCP5/RCP4 の 56SP/60P/86P、RCP2 高推力タイプなど',
  out15: 'LOAD/TRQS/*ALML',
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（負荷電流）',
    unit: 'A',
    options: [{ value: 6, label: '56SP/60P/86P（最大 6A）' }],
    default: 6,
  },
  description:
    'IAI のロボシリンダー高推力タイプ（モーター 56SP/60P/86P）用の 1 軸ポジションコントローラー。PCON-CB の上にファンユニットが付いた形（強制空冷）。電源は DC24V ±10%（負荷電流 最大 6A）。' +
    'タイプ: CFB（標準）/ CGFB（安全カテゴリー対応）。' +
    `I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6 コネクター）、パルス列、フィールドネットワーク（${networkList}）。` +
    'PIO・電源コネクターの割付けは PCON-CB と同じ（PIO の 1A・2A が +24V、19B・20B が 0V。電源コネクターは 24V・0V・MPI・MPO・EMG-・S1・S2・BK）。' +
    'OUT15 の LOAD/TRQS（押付け判定）は CFB 専用の信号。',
});
