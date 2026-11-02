import { buildGa500, GA500_LAYOUT_NOTE } from '../yaskawa/ga500';

/**
 * 安川電機 インバーター GA500 CIPR-GA50A2021（三相 200V 級、重負荷 HD 3.7kW / 軽負荷 ND 5.5kW）。
 * 外形 W140 × H128mm（1mm = 2px）。HD 定格出力電流 17.6A、定格入力電流 18.9A。
 * 出典: 安川電機「GA500 仕様 200V 級」、GA500 データシート。共通の作りは src/devices/yaskawa/ga500.ts。
 */
export default buildGa500({
  type: 'yaskawa.ga50a2021',
  code: '2021',
  kw: 3.7,
  ndKw: 5.5,
  outputCurrent: 17.6,
  inputCurrent: 18.9,
  widthMm: 140,
  estimated: GA500_LAYOUT_NOTE + '。定格入力電流（18.9A）は 2012 の入出力の比から求めた推定。ND の適用モーター容量（5.5kW）も推定',
});
