import { buildFrA800, FR_A800_LAYOUT_NOTE } from '../mitsubishi/fr-a800';

/**
 * 三菱電機 インバーター FR-A820-2.2K-1（FR-A800 シリーズ 標準品、三相 200V 2.2kW、海外形名 FR-A820-00167）。
 * 外形 W150 × H260 × D140mm（1mm = 2px）。ND 定格出力電流 11A、定格入力電流 15A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-A820-1、販売店の仕様表。共通の作りは src/devices/mitsubishi/fr-a800.ts。
 */
export default buildFrA800({
  type: 'mitsubishi.fr-a820-2.2k',
  capacity: '2.2K',
  code: '00167',
  kw: 2.2,
  outputCurrent: 11,
  inputCurrent: 15,
  widthMm: 150,
  depthMm: 140,
  estimated: FR_A800_LAYOUT_NOTE + '。定格入力電流（15A）は FR-E820-2.2K と同じ値とした推定',
});
