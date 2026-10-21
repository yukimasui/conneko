import { buildKeyenceBlock } from '../toyogiken/plc';
import { kvBranchRows } from '../toyogiken/rows';

/**
 * 東洋技研 PCX-1H34-TB40-K1（KEYENCE PLC 対応、スプリングロック式、分岐端子付き 40 端子）。
 * 34 端子の K1 に、COM0（手前段）・COM1（奥段）の分岐端子を 4 個ずつ加えたもの（各 4 端子は同じピンにつながる、10A）。
 * センサーのコモンや電源を端子台から直接分岐できる。外形 75 × 43mm。
 * 出典: https://www.togi.co.jp/series/interface/212/ （カタログ PCX-1H34-TB40-K1 の記名板・結線図）
 */
export default buildKeyenceBlock({
  type: 'toyogiken.pcx-1h34-tb40-k1',
  model: 'PCX-1H34-TB40-K1',
  series: 'pcx',
  widthMm: 75,
  connector: 'MIL',
  poles: 34,
  rows: kvBranchRows('K1'),
  source: 'https://www.togi.co.jp/series/interface/212/',
  description:
    '東洋技研 PCX シリーズの KEYENCE PLC 対応コネクタ端子台（スプリングロック式、MIL 34 極、分岐端子付き 40 端子）。右端の 4 端子ずつが COM0（手前段、No.17）・COM1（奥段、No.34）の分岐端子（10A）。定格 AC/DC125V 1A。',
});
