import { buildKeyenceBlock } from '../toyogiken/plc';
import { kvK1Rows } from '../toyogiken/rows';

/**
 * 東洋技研 PCX-1H34-TB34-K1（KEYENCE PLC 対応、スプリングロック式、MIL 34 極 → 34 端子）。
 * 奥段（TB2）100〜115・COM1、手前段（TB1）000〜015・COM0（ピッチ 3.5mm、2 段は縦にそろう）。外形 67.5 × 43mm。
 * 出典: https://www.togi.co.jp/series/interface/211/ （カタログ PCX-1H34-TB□-□ の記名板・結線図）
 */
export default buildKeyenceBlock({
  type: 'toyogiken.pcx-1h34-tb34-k1',
  model: 'PCX-1H34-TB34-K1',
  series: 'pcx',
  widthMm: 67.5,
  connector: 'MIL',
  poles: 34,
  rows: kvK1Rows(),
  source: 'https://www.togi.co.jp/series/interface/211/',
  description: '東洋技研 PCX シリーズの KEYENCE PLC 対応コネクタ端子台（スプリングロック式、MIL 34 極、34 端子）。定格 AC/DC125V 1A。',
});
