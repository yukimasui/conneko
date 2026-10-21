import { buildBlockUnit, type IoKind } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-B16TCP（16点 ネジ端子台、トランジスタ ソース出力）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。端子台の並びは KV-B16XC と同じ（左列 1,3,5,7,C0,9,11,13,15 / 右列 0,2,…,14,C1）。
 * 定格負荷 DC30V 0.2A/点、16点 1コモン（C0・C1 は内部で共通）。COM には負荷電源の +V をつなぐ（ソース出力）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16tcp/io-circuit/
 */

const LEFT = ['1', '3', '5', '7', 'C0', '9', '11', '13', '15'];
const RIGHT = ['0', '2', '4', '6', '8', '10', '12', '14', 'C1'];
const OUTS = Array.from({ length: 16 }, (_, i) => String(i));

const points: Record<string, { label: string; kind: IoKind }> = {};
for (const o of OUTS) points[o] = { label: `OUT ${o.padStart(3, '0')}`, kind: 'out' };
points.C0 = { label: 'COM0 (+V)', kind: 'com-source' };
points.C1 = { label: 'COM1 (+V)', kind: 'com-source' };

export default buildBlockUnit({
  type: 'keyence.kv-b16tcp',
  model: 'KV-B16TCP',
  name: 'PLC 出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 16点 トランジスタ出力ユニット（PNP/ソース出力、脱着式ネジ端子台）。定格負荷 DC30V 0.2A/点、16点 1コモン（C0・C1 は内部で共通）。COM に負荷電源の +24V をつなぎ、出力 ON で COM から出力端子へ電流が流れる。負荷のもう一端は負荷電源の 0V につなぐ。端子 0〜15 の信号名 000〜015 はユニットの先頭リレー番号からの相対番号。図面上は出力 ON（出力端子と COM が導通）とみなしてチェックする。',
  left: LEFT,
  right: RIGHT,
  points,
  links: [{ from: 'C0', to: 'C1' }, ...OUTS.map((o) => ({ from: 'C0', to: o }))],
  window: 'none',
  tag: 'OUT',
});
