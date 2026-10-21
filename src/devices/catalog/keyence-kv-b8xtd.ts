import { INPUT_MODE_PARAM, buildBlockUnit, inputComAccepts, ioOutputLinks, kvUnitBus, type BlockUnitSpec } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 入出力ユニット KV-B8XTD（入力 8点 + MOSFET シンク出力 8点、ネジ端子台）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。端子台の並びは KV-B16XC と同じ（左列 1,3,5,7,C0,9,11,13,15 / 右列 0,2,…,14,C1）。
 * 端子 0〜7 が入力 000〜007（COM は C0）、端子 8〜15 が出力 100〜107（COM は C1、負荷電源の 0V）。C0 と C1 は独立。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b8xtd/io-circuit/
 */

const LEFT = ['1', '3', '5', '7', 'C0', '9', '11', '13', '15'];
const RIGHT = ['0', '2', '4', '6', '8', '10', '12', '14', 'C1'];

const points: BlockUnitSpec['points'] = {};
for (let i = 0; i < 8; i++) points[String(i)] = { kind: 'in', index: i, common: 'C0' };
for (let i = 8; i < 16; i++) points[String(i)] = { kind: 'out', index: i - 8, common: 'C1' };
points.C0 = { kind: 'com-in', label: 'COM0（入力）', note: '端子 0〜7（入力）のコモン（双方向）' };
points.C1 = { kind: 'com-sink', label: 'COM1（出力 0V）', note: '端子 8〜15（出力）のコモン。負荷電源の 0V をつなぐ' };

export default buildBlockUnit({
  type: 'keyence.kv-b8xtd',
  model: 'KV-B8XTD',
  name: 'PLC 入出力ユニット',
  labelPrefix: 'IO',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの入出力ユニット（脱着式ネジ端子台）。入力 8点（端子 0〜7 = 000〜007、DC24V/DC5V モード切替、COM は C0、双方向）、出力 8点（端子 8〜15 = 100〜107、MOSFET シンク出力・過電流保護付き、DC30V 0.3A/点、COM は C1 で負荷電源の 0V をつなぐ）。C0 と C1 は独立。端子のラベルはリレー番号（入力は先頭チャネル、出力は次のチャネル。例: 先頭 R000 なら入力 R000〜R007、出力 R100〜R107）。内部消費電流 30mA。',
  left: LEFT,
  right: RIGHT,
  points,
  links: ioOutputLinks(Object.entries(points).map(([id, p]) => ({ id, ...p })), 0.3),
  io: { inputs: 8, inputAccepts: inputComAccepts, outSignal: 'npn' },
  params: [INPUT_MODE_PARAM],
  bus: kvUnitBus(30, { inputs: 8, outputs: 8 }),
  window: 'switch',
  tag: 'I/O',
});
