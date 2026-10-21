import { buildMilUnit, ioOutputLinks, kvUnitBus, mil34IoPins } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 入出力ユニット KV-C32XTD（入力 32点 + MOSFET シンク出力 32点、コネクタタイプ）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。MIL 規格 34極のボックスヘッダが 2 個（左が入力側 IN、右が出力側 OUT）。
 *
 * ピン配置（KEYENCE 入出力回路図より）:
 *   IN 側（CN1）: No.1〜16 = 入力 000〜015、No.17 = COM0、No.18〜33 = 入力 100〜115、No.34 = COM1（COM0・COM1 は内部で共通）
 *   OUT 側（CN2）: No.1〜16 = 出力 200〜215、No.17 = COM2、No.18〜33 = 出力 300〜315、No.34 = COM3（COM2・COM3 は内部で共通、負荷電源の 0V）
 * 入力側と出力側の COM は独立。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32xtd/io-circuit/
 */

const inPins = mil34IoPins('CN1', { offset: 0, kind: 'in', com: 'com-in', comName: 'COM0' }, { offset: 16, kind: 'in', com: 'com-in', comName: 'COM1' });
const outPins = mil34IoPins(
  'CN2',
  { offset: 0, kind: 'out', com: 'com-sink', comName: 'COM2 (0V)' },
  { offset: 16, kind: 'out', com: 'com-sink', comName: 'COM3 (0V)' },
);

export default buildMilUnit({
  type: 'keyence.kv-c32xtd',
  model: 'KV-C32XTD',
  name: 'PLC 入出力ユニット',
  labelPrefix: 'IO',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの入出力ユニット（コネクタタイプ）。入力 32点（DC24V、4.1mA、32点 1コモン、双方向）、出力 32点（MOSFET シンク出力・過電流保護付き、DC30V 0.2A/点、32点 1コモン）。外部接続は MIL 規格 34極コネクタ × 2（CN1 = IN 側: IN 000〜015・100〜115、COM0/COM1。CN2 = OUT 側: OUT 200〜215・300〜315、COM2/COM3 に負荷電源の 0V）。入力側と出力側の COM は独立。ピン名の (No.n) は KEYENCE のピン番号、ピンID は MIL 標準の千鳥番号。ピンのラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。入力は先頭から 2 チャネル、出力はその次の 2 チャネル（例: 先頭 R000 なら入力 R000〜R115、出力 R200〜R315）。内部消費電流 65mA。',
  width: 58,
  connectors: [
    { id: 'CN1', cx: 15.5, cy: 110, poles: 34, label: 'CN1 IN (MIL 34P)', tag: 'IN' },
    { id: 'CN2', cx: 41.5, cy: 110, poles: 34, label: 'CN2 OUT (MIL 34P)', tag: 'OUT' },
  ],
  pins: [...inPins, ...outPins],
  links: [{ from: 'CN1#33', to: 'CN1#34' }, { from: 'CN2#33', to: 'CN2#34' }, ...ioOutputLinks(outPins, 0.2)],
  io: { inputs: 32, outSignal: 'npn' },
  bus: kvUnitBus(65, { inputs: 32, outputs: 32 }),
});
