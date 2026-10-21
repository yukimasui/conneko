import { INPUT_MODE_PARAM, buildBlockUnit, inputComAccepts, kvUnitBus, type BlockUnitSpec } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 入力ユニット KV-B16XC（16点 ネジ端子台、DC24V/DC5V 入力）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。正面左上に入力モード（24V/5V）切替スイッチの小窓、
 * 右側に脱着式のネジ端子台（18端子・2列千鳥）。実機は端子台にカバーが付くが、図ではカバーを開けた状態で描く。
 *
 * 端子の並び（KEYENCE 入出力回路図より）: 左列が上から 1, 3, 5, 7, C0, 9, 11, 13, 15、
 * 右列（半ピッチ下がる）が 0, 2, 4, 6, 8, 10, 12, 14, C1。COM（C0 / C1）は内部で共通。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16xc/io-circuit/
 */

const LEFT = ['1', '3', '5', '7', 'C0', '9', '11', '13', '15'];
const RIGHT = ['0', '2', '4', '6', '8', '10', '12', '14', 'C1'];

const points: BlockUnitSpec['points'] = {};
for (let i = 0; i < 16; i++) points[String(i)] = { kind: 'in', index: i, common: 'C0' };
points.C0 = { kind: 'com-in', label: 'COM0', note: '入力のコモン（C1 と内部で共通）。プラスコモンなら +24V、マイナスコモンなら 0V をつなぐ' };
points.C1 = { kind: 'com-in', label: 'COM1', note: '入力のコモン（C0 と内部で共通）' };

export default buildBlockUnit({
  type: 'keyence.kv-b16xc',
  model: 'KV-B16XC',
  name: 'PLC 入力ユニット',
  labelPrefix: 'IN',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 16点 DC 入力ユニット（脱着式ネジ端子台）。DC24V/DC5V 入力（モード切替、24V モード 5.3mA・最小 ON 電圧 19V・最大 26.4V）、16点 1コモン（C0・C1 の 2 端子は内部で共通）。双方向フォトカプラ入力のため COM はプラスコモン/マイナスコモンどちらでも使える。端子のラベルはリレー番号（装着位置から決まる先頭番号 + 端子番号。例: 先頭 R000 なら R000〜R015）。入力モードは params の inputMode（DC24V / DC5V）。内部消費電流 15mA（CPU から供給）。',
  left: LEFT,
  right: RIGHT,
  points,
  links: [{ from: 'C0', to: 'C1' }],
  io: { inputs: 16, inputAccepts: inputComAccepts },
  params: [INPUT_MODE_PARAM],
  bus: kvUnitBus(15, { inputs: 16 }),
  window: 'switch',
  tag: 'IN',
});
