import { buildFrA800, FR_A800_LAYOUT_NOTE } from '../mitsubishi/fr-a800';

/**
 * 三菱電機 インバーター FR-F820-0.75K-1（FR-F800 シリーズ ファン・ポンプ用、三相 200V 0.75kW、海外形名 FR-F820-00046）。
 * 定格（LD）: 定格出力電流 4.2A、定格入力電流 5.0A（DC リアクトルなし。あり 4.2A）。SLD では出力 4.6A・入力 5.3A。質量 約 1.9kg。
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-F820-1、ミスミの FR-F820 の定格表、FR-F800 カタログ（形名の 00046 = 0.75K）。
 * 制御回路端子は FR-A800 と同じで、ブレーキトランジスタがない（PR・PX なし）。共通の作りは src/devices/mitsubishi/fr-a800.ts（series: 'F'）。
 */
export default buildFrA800({
  type: 'mitsubishi.fr-f820-0.75k',
  series: 'F',
  capacity: '0.75K',
  code: '00046',
  kw: 0.75,
  outputCurrent: 4.2,
  inputCurrent: 5.0,
  widthMm: 110,
  depthMm: 125,
  estimated: FR_A800_LAYOUT_NOTE + '。外形の寸法（W110 × D125mm）は FR-A820-0.75K と同じとした推定',
});
