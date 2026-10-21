import { buildKeyenceBlock } from '../toyogiken/plc';
import { kvBranchRows } from '../toyogiken/rows';

/**
 * 東洋技研 PCX-1H34-TB40-K2（KEYENCE PLC 対応、スプリングロック式、分岐端子付き 40 端子）。
 * 手前段の右端 4 端子が KEYENCE COM（COM0・COM1 の両方に接続）、奥段の右端 4 端子が Service（COM）
 * （コネクタにはつながらない分岐用コモン）。外形 75 × 43mm。
 * 出典: https://www.togi.co.jp/series/interface/212/ （カタログ PCX-1H34-TB40-K2 の記名板・結線図）
 */
export default buildKeyenceBlock({
  type: 'toyogiken.pcx-1h34-tb40-k2',
  model: 'PCX-1H34-TB40-K2',
  series: 'pcx',
  widthMm: 75,
  connector: 'MIL',
  poles: 34,
  rows: kvBranchRows('K2'),
  source: 'https://www.togi.co.jp/series/interface/212/',
  description:
    '東洋技研 PCX シリーズの KEYENCE PLC 対応コネクタ端子台（スプリングロック式、MIL 34 極、分岐端子付き 40 端子）。手前段の右端 4 端子が KEYENCE COM（ユニットの COM0・COM1 の両方をつなぐ。2 つのコモンを同じ極性で使う場合用）、奥段の右端 4 端子が Service（COM）（コネクタにつながらない分岐用コモン、10A）。定格 AC/DC125V 1A。',
});
