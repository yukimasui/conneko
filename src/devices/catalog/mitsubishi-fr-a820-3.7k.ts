import { buildFrA800, FR_A800_LAYOUT_NOTE } from '../mitsubishi/fr-a800';

/**
 * 三菱電機 インバーター FR-A820-3.7K-1（FR-A800 シリーズ 標準品、三相 200V 3.7kW、海外形名 FR-A820-00250）。
 * 外形 W150 × H260 × D140mm（1mm = 2px）。ND 定格出力電流 17.5A、定格入力電流 22.6A（ND・DC リアクトルなし）。
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-A820-1、販売店の仕様表。共通の作りは src/devices/mitsubishi/fr-a800.ts。
 */
export default buildFrA800({
  type: 'mitsubishi.fr-a820-3.7k',
  capacity: '3.7K',
  code: '00250',
  kw: 3.7,
  outputCurrent: 17.5,
  inputCurrent: 22.6,
  widthMm: 150,
  depthMm: 140,
  estimated: FR_A800_LAYOUT_NOTE,
});
