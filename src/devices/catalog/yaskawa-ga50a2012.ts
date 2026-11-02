import { buildGa500, GA500_LAYOUT_NOTE } from '../yaskawa/ga500';

/**
 * 安川電機 インバーター GA500 CIPR-GA50A2012（三相 200V 級、重負荷 HD 2.2kW / 軽負荷 ND 3kW）。
 * 外形 W108 × H128mm（1mm = 2px）。HD 定格出力電流 11A、定格入力電流 11A。
 * 出典: 安川電機「GA500 仕様 200V 級」、GA500 データシート。共通の作りは src/devices/yaskawa/ga500.ts。
 */
export default buildGa500({
  type: 'yaskawa.ga50a2012',
  code: '2012',
  kw: 2.2,
  ndKw: 3,
  outputCurrent: 11,
  inputCurrent: 11,
  widthMm: 108,
  estimated: GA500_LAYOUT_NOTE,
});
