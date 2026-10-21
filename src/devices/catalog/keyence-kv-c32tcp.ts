import { buildMilUnit, ioOutputLinks, kvUnitBus, mil34IoPins } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-C32TCP（32点 コネクタタイプ、トランジスタ ソース出力）。
 * 外形 W23 × H90 × D80 mm（1mm ≒ 2px）。正面上部に小窓、その下に MIL 規格 34極（2列×17）のボックスヘッダ。
 *
 * ピン配置（KEYENCE 入出力回路図より）: No.1〜16 = 000〜015、No.17 = COM0、No.18〜33 = 100〜115、No.34 = COM1。
 * COM0・COM1 は内部で共通で、負荷電源の +V をつなぐ（ソース出力）。
 * ピンID は MIL 標準の千鳥番号（KEYENCE の k 番 → CN1#(2k-1)、17+k 番 → CN1#2k）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32tcp/io-circuit/
 */

const pins = mil34IoPins(
  'CN1',
  { offset: 0, kind: 'out', com: 'com-source', comName: 'COM0 (+V)' },
  { offset: 16, kind: 'out', com: 'com-source', comName: 'COM1 (+V)' },
);

export default buildMilUnit({
  type: 'keyence.kv-c32tcp',
  model: 'KV-C32TCP',
  name: 'PLC 出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 32点 トランジスタ出力ユニット（PNP/ソース出力、コネクタタイプ）。定格負荷 DC30V 0.2A/点、32点 1コモン（COM0・COM1 は内部で共通）。COM に負荷電源の +24V をつなぎ、出力 ON で COM から出力ピンへ電流が流れる。負荷のもう一端は負荷電源の 0V につなぐ。外部接続は MIL 規格 34極コネクタ（No.1〜16 = OUT 000〜015、No.17 = COM0、No.18〜33 = OUT 100〜115、No.34 = COM1）。ピン名の (No.n) は KEYENCE のピン番号、ピンID は MIL 標準の千鳥番号。ピンのラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。内部消費電流 55mA。',
  width: 46,
  modelSize: 5,
  connectors: [{ id: 'CN1', cx: 23.5, cy: 111, poles: 34, label: 'CN1 (MIL 34P)' }],
  pins,
  links: [{ from: 'CN1#33', to: 'CN1#34' }, ...ioOutputLinks(pins, 0.2)],
  io: { outSignal: 'pnp' },
  bus: kvUnitBus(55, { outputs: 32 }),
  extra: `
  <rect x="12" y="22" width="22" height="20" rx="1" fill="#1d1f22" stroke="#4a4d52" stroke-width="0.5"/>
  <rect x="14" y="24" width="18" height="16" rx="0.6" fill="#141517"/>`,
});
