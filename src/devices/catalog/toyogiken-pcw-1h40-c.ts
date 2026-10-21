import { buildMelsecBlock } from '../toyogiken/plc';
import { melsecCRows } from '../toyogiken/rows';

/**
 * 東洋技研 PCW-1H40-C（三菱電機・富士電機 PLC 対応、入力用 / 出力用、スプリングロック式 2.5㎟ 対応、MIL 40 極 → 分岐端子付き 40 端子）。
 * 手前段 00〜0F・C1 ×4（B01・B02）、奥段 10〜1F・C2 ×4（A01・A02）。ピッチ 5mm、2 段は 2.5mm ずらし。外形 107 × 43mm。
 * 出典: https://www.togi.co.jp/series/interface/579/ （カタログ「結線タイプ PLC 対応 C タイプ」）
 */
export default buildMelsecBlock({
  type: 'toyogiken.pcw-1h40-c',
  model: 'PCW-1H40-C',
  series: 'pcw',
  widthMm: 107,
  connector: 'MIL',
  poles: 40,
  rows: melsecCRows(),
  source: 'https://www.togi.co.jp/series/interface/579/',
  description:
    '東洋技研 PCW シリーズの三菱電機 PLC 対応コネクタ端子台（スプリングロック式、MIL 40 極（ヒロセ電機 HIF3BA-40PA）、分岐端子付き 40 端子、入力用 / 出力用共通）。C1（手前段の右端 4 端子、B01・B02 = 入力の COM / 出力の +V）・C2（奥段の右端 4 端子、A01・A02 = 出力の COM（0V））はコモンの分岐用（2.5㎟ まで、12A）。定格 AC/DC50V、信号 1A、コモン−コネクタ間 2A。',
});
