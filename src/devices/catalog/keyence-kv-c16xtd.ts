import { INPUT_MODE_PARAM, buildMilUnit, inputComAccepts, ioOutputLinks, kvUnitBus, mil34IoPins } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 入出力ユニット KV-C16XTD（入力 16点 + MOSFET シンク出力 16点、コネクタタイプ）。
 * 外形 W23 × H90 × D80 mm（1mm ≒ 2px）。正面上部に入力モード切替スイッチの小窓、その下に MIL 規格 34極のボックスヘッダ。
 *
 * ピン配置（KEYENCE 入出力回路図より）: 左列 No.1〜16 = 入力 000〜015、No.17 = COM0（入力）、
 * 右列 No.18〜33 = 出力 100〜115、No.34 = COM1（出力、負荷電源の 0V）。COM0 と COM1 は独立。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c16xtd/io-circuit/
 */

const pins = mil34IoPins(
  'CN1',
  { offset: 0, kind: 'in', com: 'com-in', comName: 'COM0（入力）' },
  { offset: 0, kind: 'out', com: 'com-sink', comName: 'COM1（出力 0V）' },
);

export default buildMilUnit({
  type: 'keyence.kv-c16xtd',
  model: 'KV-C16XTD',
  name: 'PLC 入出力ユニット',
  labelPrefix: 'IO',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの入出力ユニット（コネクタタイプ）。入力 16点（IN 000〜015、DC24V/DC5V モード切替、COM0 は双方向）、出力 16点（OUT 100〜115、MOSFET シンク出力・過電流保護付き、DC30V 0.2A/点、COM1 に負荷電源の 0V）。COM0 と COM1 は独立。外部接続は MIL 規格 34極コネクタ（左列 No.1〜17 が入力側、右列 No.18〜34 が出力側）。ピン名の (No.n) は KEYENCE のピン番号、ピンID は MIL 標準の千鳥番号。ピンのラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。入力は先頭チャネル、出力は次のチャネル（例: 先頭 R000 なら入力 R000〜R015、出力 R100〜R115）。入力モードは params の inputMode。内部消費電流 40mA。',
  width: 46,
  modelSize: 5,
  connectors: [{ id: 'CN1', cx: 23.5, cy: 111, poles: 34, label: 'CN1 (MIL 34P)' }],
  pins,
  links: ioOutputLinks(pins, 0.2),
  io: { inputs: 16, inputAccepts: inputComAccepts, outSignal: 'npn' },
  params: [INPUT_MODE_PARAM],
  bus: kvUnitBus(40, { inputs: 16, outputs: 16 }),
  extra: `
  <rect x="12" y="22" width="22" height="20" rx="1" fill="#1d1f22" stroke="#4a4d52" stroke-width="0.5"/>
  <text x="15" y="28" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#d0d2d6">24V</text>
  <text x="15" y="39" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#d0d2d6">5V</text>
  <rect x="26" y="24" width="6" height="16" rx="0.8" fill="#0d0e0f"/>
  <rect x="26.6" y="24.6" width="4.8" height="7" rx="0.6" fill="#d9dadc" stroke="#8a8d92" stroke-width="0.4"/>`,
});
