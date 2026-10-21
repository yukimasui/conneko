import { buildMilUnit, mil34IoPins } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 入力ユニット KV-C64XC（64点 コネクタタイプ、DC24V 入力）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。正面に MIL 規格 34極（2列×17）のボックスヘッダが 2 個並ぶ（左が L 側、右が H 側）。
 *
 * ピン配置（KEYENCE 入出力回路図より。KEYENCE の番号は左列 1〜17・右列 18〜34 の横並び番号）:
 *   L 側（CN1）: No.1〜16 = 000〜015、No.17 = COM0、No.18〜33 = 100〜115、No.34 = COM1
 *   H 側（CN2）: No.1〜16 = 200〜215、No.17 = COM2、No.18〜33 = 300〜315、No.34 = COM3
 * COM0・COM1 は内部で共通、COM2・COM3 は内部で共通。L 側と H 側の COM は独立。
 * ピンID は MIL 標準の千鳥番号（KEYENCE の k 番 → #(2k-1)、17+k 番 → #2k）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c64xc/io-circuit/
 */

const pins = [
  ...mil34IoPins('CN1', { ch: 0, kind: 'in', com: 'com-in', comName: 'COM0' }, { ch: 1, kind: 'in', com: 'com-in', comName: 'COM1' }),
  ...mil34IoPins('CN2', { ch: 2, kind: 'in', com: 'com-in', comName: 'COM2' }, { ch: 3, kind: 'in', com: 'com-in', comName: 'COM3' }),
];

export default buildMilUnit({
  type: 'keyence.kv-c64xc',
  model: 'KV-C64XC',
  name: 'PLC 入力ユニット',
  labelPrefix: 'IN',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 64点 DC 入力ユニット（コネクタタイプ）。DC24V 入力（4.1mA、最小 ON 電圧 19V、最大 26.4V）、32点 1コモン × 2。外部接続は MIL 規格 34極コネクタ × 2（CN1 = L 側: IN 000〜015・100〜115、COM0/COM1。CN2 = H 側: IN 200〜215・300〜315、COM2/COM3）。L 側・H 側それぞれの 2 つの COM は内部で共通、L 側と H 側は独立。双方向フォトカプラ入力のため COM はプラス/マイナスどちらのコモンでもよい。ピン名の (No.n) は KEYENCE のピン番号（左列 1〜17、右列 18〜34）、ピンID は MIL 標準の千鳥番号。信号名はユニットの先頭リレー番号からの相対番号。適合コネクタは OP-42224（34極）。',
  width: 58,
  connectors: [
    { id: 'CN1', cx: 15.5, cy: 110, poles: 34, label: 'CN1 L側 (MIL 34P)', tag: 'L' },
    { id: 'CN2', cx: 41.5, cy: 110, poles: 34, label: 'CN2 H側 (MIL 34P)', tag: 'H' },
  ],
  pins,
  links: [
    { from: 'CN1#33', to: 'CN1#34' },
    { from: 'CN2#33', to: 'CN2#34' },
  ],
});
