import { buildGa500, GA500_LAYOUT_NOTE } from '../yaskawa/ga500';

/**
 * 安川電機 インバーター GA500 CIPR-GA50A2006（三相 200V 級、重負荷 HD 0.75kW / 軽負荷 ND 1.1kW）。
 * 外形 W68 × H128mm（1mm = 2px）。HD 定格出力電流 5A、定格入力電流 5.8A。
 * 出典: 安川電機「GA500 仕様 200V 級」、GA500 データシート。共通の作りは src/devices/yaskawa/ga500.ts。
 */
export default buildGa500({
  type: 'yaskawa.ga50a2006',
  code: '2006',
  kw: 0.75,
  ndKw: 1.1,
  outputCurrent: 5,
  inputCurrent: 5.8,
  widthMm: 68,
  estimated: GA500_LAYOUT_NOTE,
});
