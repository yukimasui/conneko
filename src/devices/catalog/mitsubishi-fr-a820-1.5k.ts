import { buildFrA800, FR_A800_LAYOUT_NOTE } from '../mitsubishi/fr-a800';

/**
 * 三菱電機 インバーター FR-A820-1.5K-1（FR-A800 シリーズ 標準品、三相 200V 1.5kW、海外形名 FR-A820-00105）。
 * 外形 W150 × H260 × D140mm（1mm = 2px）。ND 定格出力電流 8A、定格入力電流 11A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-A820-1、販売店の仕様表。共通の作りは src/devices/mitsubishi/fr-a800.ts。
 */
export default buildFrA800({
  type: 'mitsubishi.fr-a820-1.5k',
  capacity: '1.5K',
  code: '00105',
  kw: 1.5,
  outputCurrent: 8,
  inputCurrent: 11,
  widthMm: 150,
  depthMm: 140,
  estimated: FR_A800_LAYOUT_NOTE + '。定格入力電流（11A）は FR-E820-1.5K と同じ値とした推定',
});
