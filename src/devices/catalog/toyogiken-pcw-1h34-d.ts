import { buildKeyenceBlock } from '../toyogiken/plc';
import { kvBranchRows } from '../toyogiken/rows';

/**
 * 東洋技研 PCW-1H34-D（KEYENCE PLC 対応、スプリングロック式 2.5㎟ 対応、分岐端子付き 40 端子）。
 * 手前段 000〜015・C1 ×4（No.17）、奥段 100〜115・C2 ×4（No.34）。ピッチ 5mm、2 段は 2.5mm ずらし。外形 107 × 43mm。
 * 出典: https://www.togi.co.jp/series/interface/579/ （カタログ「結線タイプ PLC 対応 D タイプ」）
 */
export default buildKeyenceBlock({
  type: 'toyogiken.pcw-1h34-d',
  model: 'PCW-1H34-D',
  series: 'pcw',
  widthMm: 107,
  connector: 'MIL',
  poles: 34,
  rows: kvBranchRows('D'),
  source: 'https://www.togi.co.jp/series/interface/579/',
  description:
    '東洋技研 PCW シリーズの KEYENCE PLC 対応コネクタ端子台（スプリングロック式、MIL 34 極、分岐端子付き 40 端子）。C1（手前段の右端 4 端子、No.17 = COM0）・C2（奥段の右端 4 端子、No.34 = COM1）はコモンの分岐用で、隣の端子台への渡りや電源からの直接配線に使える（2.5㎟ まで、12A）。定格 AC/DC50V、信号 1A、コモン−コネクタ間 2A。',
});
