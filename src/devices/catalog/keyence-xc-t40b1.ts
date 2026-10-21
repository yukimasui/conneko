import { buildXcTerminal } from '../keyence/xc-terminal';

/**
 * KEYENCE 端子台変換ユニット XC-T40B1（MIL 40極 → M3 ネジ端子 40極、1A/pin）。
 * 外形 145.5 × 約 41.8 mm（1mm ≒ 2px）、ネジ端子ピッチ 7mm、2段（段は千鳥ではなく縦にそろう）。
 * KV-SIR32XT / KV-SH04PL / KV-SSC02 など MIL 40極コネクタのユニットと XC-H40 ケーブルでつなぐ。
 *
 * 端子番号: 奥段が奇数 1〜39、手前段が偶数 2〜40（40極ユニットのマニュアルが MIL 標準の千鳥番号のため、それに合わせたと仮定）。
 * 端子 n はコネクタの MIL 標準ピン n と導通する。
 * ※端子台の実際の印字は公開資料（ログイン不要の範囲）で確認できなかったため推定。
 * 出典（外形）: https://www.keyence.co.jp/products/controls/other-controls/xc/models/xc-t40b1/
 */

export default buildXcTerminal({
  type: 'keyence.xc-t40b1',
  model: 'XC-T40B1',
  poles: 40,
  lengthMm: 145.5,
  numbering: 'std',
  description:
    'KEYENCE の MIL 40極 → ネジ端子 変換端子台（M3、定格 AC/DC125V 1A/pin、AWG22〜16）。KV-SIR32XT / KV-SH04PL / KV-SSC02 など MIL 40極のユニットと 40極ケーブル（XC-H40 など）でつなぐ。端子 n はコネクタの MIL 標準ピン n と導通（奥段が奇数、手前段が偶数と想定。実物の印字は未確認）。',
});
