import { buildFrA800, FR_A800_LAYOUT_NOTE } from '../mitsubishi/fr-a800';

/**
 * 三菱電機 インバーター FR-F820-1.5K-1（FR-F800 シリーズ ファン・ポンプ用、三相 200V 1.5kW、海外形名 FR-F820-00077）。
 * 定格（LD）: 定格出力電流 7.0A、定格入力電流 8.3A。SLD では出力 7.7A・入力 8.9A。質量 約 2.1kg、奥行 125mm（置換え資料）。
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-F820-1.5K-1、メカシスの仕様表、F500 → F800 置換え資料（BCN-C21002-173）。
 * 制御回路端子は FR-A800 と同じで、ブレーキトランジスタがない（PR・PX なし）。共通の作りは src/devices/mitsubishi/fr-a800.ts（series: 'F'）。
 */
export default buildFrA800({
  type: 'mitsubishi.fr-f820-1.5k',
  series: 'F',
  capacity: '1.5K',
  code: '00077',
  kw: 1.5,
  outputCurrent: 7.0,
  inputCurrent: 8.3,
  widthMm: 110,
  depthMm: 125,
  estimated: FR_A800_LAYOUT_NOTE + '。外形の幅（110mm）と、定格入力電流 8.3A が DC リアクトルなしの値であることは推定',
});
