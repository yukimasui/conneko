import { buildMilUnit, mil34IoPins, outputLinks } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-C64TCP（64点 コネクタタイプ、トランジスタ ソース出力）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。MIL 規格 34極（2列×17）のボックスヘッダが 2 個（左が L 側、右が H 側）。
 *
 * ピン配置（KEYENCE 入出力回路図より）:
 *   L 側（CN1）: No.1〜16 = 000〜015、No.17 = COM0、No.18〜33 = 100〜115、No.34 = COM1
 *   H 側（CN2）: No.1〜16 = 200〜215、No.17 = COM2、No.18〜33 = 300〜315、No.34 = COM3
 * COM0〜COM3 はすべて内部で共通（64点 1コモン・4端子）で、負荷電源の +V をつなぐ。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c64tcp/io-circuit/
 */

const pins = [
  ...mil34IoPins('CN1', { ch: 0, kind: 'out', com: 'com-source', comName: 'COM0 (+V)' }, { ch: 1, kind: 'out', com: 'com-source', comName: 'COM1 (+V)' }),
  ...mil34IoPins('CN2', { ch: 2, kind: 'out', com: 'com-source', comName: 'COM2 (+V)' }, { ch: 3, kind: 'out', com: 'com-source', comName: 'COM3 (+V)' }),
];

export default buildMilUnit({
  type: 'keyence.kv-c64tcp',
  model: 'KV-C64TCP',
  name: 'PLC 出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 64点 トランジスタ出力ユニット（PNP/ソース出力、コネクタタイプ）。定格負荷 DC30V 0.2A/点、64点 1コモン（COM0〜COM3 は内部ですべて共通）。COM に負荷電源の +24V をつなぎ、負荷のもう一端は 0V へ。外部接続は MIL 規格 34極コネクタ × 2（CN1 = L 側: OUT 000〜015・100〜115、CN2 = H 側: OUT 200〜215・300〜315）。ピン名の (No.n) は KEYENCE のピン番号、ピンID は MIL 標準の千鳥番号。信号名はユニットの先頭リレー番号からの相対番号。図面上は出力 ON（COM と出力ピンが導通）とみなしてチェックする。',
  width: 58,
  connectors: [
    { id: 'CN1', cx: 15.5, cy: 110, poles: 34, label: 'CN1 L側 (MIL 34P)', tag: 'L' },
    { id: 'CN2', cx: 41.5, cy: 110, poles: 34, label: 'CN2 H側 (MIL 34P)', tag: 'H' },
  ],
  pins,
  links: [
    { from: 'CN1#33', to: 'CN1#34' },
    { from: 'CN1#33', to: 'CN2#33' },
    { from: 'CN2#33', to: 'CN2#34' },
    ...outputLinks(pins, 'CN1#33'),
  ],
});
