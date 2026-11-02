import { buildFrA800, FR_A800_LAYOUT_NOTE } from '../mitsubishi/fr-a800';

/**
 * 三菱電機 インバーター FR-A820-0.75K-1（FR-A800 シリーズ 標準品、三相 200V 0.75kW、海外形名 FR-A820-00077）。
 * 外形 W110 × H260 × D125mm（1mm = 2px）。ND 定格出力電流 5A、定格入力電流 6.3A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-A820-1、販売店の仕様表。共通の作りは src/devices/mitsubishi/fr-a800.ts。
 */
export default buildFrA800({
  type: 'mitsubishi.fr-a820-0.75k',
  capacity: '0.75K',
  code: '00077',
  kw: 0.75,
  outputCurrent: 5,
  inputCurrent: 6.3,
  widthMm: 110,
  depthMm: 125,
  estimated: FR_A800_LAYOUT_NOTE,
});
