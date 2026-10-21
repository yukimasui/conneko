import { buildKeyenceBlock } from '../toyogiken/plc';
import { crimpParam, kvK1Rows } from '../toyogiken/rows';

/**
 * 東洋技研 PCN7-1H34-TB34-K1（KEYENCE PLC 対応、ネジ式、MIL 34 極 → 34 端子）。
 * 手前段 000〜015・COM0、奥段 100〜115・COM1（千鳥配置、ピッチ 7mm）。外形 128 × 40mm。
 * 出典: https://www.togi.co.jp/series/interface/205/ （カタログ PCN7-1H34-TB34-K1 の記名板・結線図）
 */
export default buildKeyenceBlock({
  type: 'toyogiken.pcn7-1h34-tb34-k1',
  model: (p) => `PCN7${p.crimp === 'R' ? 'R' : ''}-1H34-TB34-K1`,
  series: 'pcn7',
  widthMm: 128,
  connector: 'MIL',
  poles: 34,
  rows: kvK1Rows(),
  params: [crimpParam],
  source: 'https://www.togi.co.jp/series/interface/205/',
  description: '東洋技研 PCN7 シリーズの KEYENCE PLC 対応コネクタ端子台（ネジ式、MIL 34 極、34 端子）。定格 AC/DC125V 1A（COM 2A）。',
});
