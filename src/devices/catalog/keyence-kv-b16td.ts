import { buildBlockUnit, type IoKind } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-B16TD（16点 ネジ端子台、MOSFET シンク出力、過電流保護付き）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。端子台の並びは KV-B16XC と同じ（左列 1,3,5,7,C0,9,11,13,15 / 右列 0,2,…,14,C1）。
 * 定格負荷 DC30V 0.3A/点、16点 1コモン（C0・C1 は内部で共通）。COM には負荷電源の 0V をつなぐ。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16td/io-circuit/
 */

const LEFT = ['1', '3', '5', '7', 'C0', '9', '11', '13', '15'];
const RIGHT = ['0', '2', '4', '6', '8', '10', '12', '14', 'C1'];
const OUTS = Array.from({ length: 16 }, (_, i) => String(i));

const points: Record<string, { label: string; kind: IoKind }> = {};
for (const o of OUTS) points[o] = { label: `OUT ${o.padStart(3, '0')}`, kind: 'out' };
points.C0 = { label: 'COM0 (0V)', kind: 'com-sink' };
points.C1 = { label: 'COM1 (0V)', kind: 'com-sink' };

export default buildBlockUnit({
  type: 'keyence.kv-b16td',
  model: 'KV-B16TD',
  name: 'PLC 出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 16点 トランジスタ出力ユニット（MOSFET シンク出力・過電流保護付き、脱着式ネジ端子台）。定格負荷 DC30V 0.3A/点、16点 1コモン（C0・C1 は内部で共通）。出力 ON で負荷電流が出力端子から COM（負荷電源の 0V）へ流れるので、負荷のもう一端は負荷電源の +24V につなぐ。端子 0〜15 の信号名 000〜015 はユニットの先頭リレー番号からの相対番号。図面上は出力 ON（出力端子と COM が導通）とみなしてチェックする。',
  left: LEFT,
  right: RIGHT,
  points,
  // COM は内部で共通。出力 ON 時は出力端子と COM（0V）が導通する（接点「閉」とみなす）
  links: [{ from: 'C0', to: 'C1' }, ...OUTS.map((o) => ({ from: o, to: 'C0' }))],
  window: 'none',
  tag: 'OUT',
});
