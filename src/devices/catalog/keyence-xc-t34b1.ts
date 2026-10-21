import { buildXcTerminal } from '../keyence/xc-terminal';

/**
 * KEYENCE 端子台変換ユニット XC-T34B1（MIL 34極 → M3 ネジ端子 34極、1A/pin）。
 * 外形 124.5 × 約 41.8 mm（1mm ≒ 2px）、ネジ端子ピッチ 7mm、2段（段は千鳥ではなく縦にそろう）。
 * KV-C32XC / KV-C32TC / KV-C64XC などの MIL 34極 I/O ユニットと XC-H34 ケーブルでつなぐ。
 *
 * 端子番号: 奥段が 1〜17、手前段が 18〜34（KEYENCE の I/O ユニットの「横並び番号」に合わせたと仮定）。
 * 端子 k はコネクタの MIL 標準ピン（k ≤ 17 → 2k−1、k ≥ 18 → 2(k−17)）と導通する。
 * ※端子台の実際の印字・ピン対応は公開資料（ログイン不要の範囲）で確認できなかったため推定。
 * 出典（外形）: https://www.keyence.co.jp/products/controls/other-controls/xc/models/xc-t34b1/
 */

export default buildXcTerminal({
  type: 'keyence.xc-t34b1',
  model: 'XC-T34B1',
  poles: 34,
  lengthMm: 124.5,
  numbering: 'keyence',
  description:
    'KEYENCE の MIL 34極 → ネジ端子 変換端子台（M3、定格 AC/DC125V 1A/pin、AWG22〜16）。KV-C32XC / KV-C64XC / KV-C32TD など MIL 34極の I/O ユニットと 34極ケーブル（XC-H34 など）でつなぐ。端子番号は奥段 1〜17・手前段 18〜34 で、I/O ユニットの KEYENCE ピン番号（No.1〜34）と同じ番号の端子に出る想定（端子 k ↔ コネクタの MIL 標準ピン 2k−1 / 2(k−17)。実物の印字は未確認）。',
});
