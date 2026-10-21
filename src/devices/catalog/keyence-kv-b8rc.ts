import { buildBlockUnit, type IoKind } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-B8RC（8点 ネジ端子台、リレー出力・独立コモン）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。端子台の並び（KEYENCE 入出力回路図より）:
 * 左列が上から C0〜C7、NC、右列（半ピッチ下がる）が 0〜7、NC。出力 n の接点は Cn と n の間（各点独立）。
 * 定格負荷 AC250V/DC30V 2A/点。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b8rc/io-circuit/
 */

const OUTS = Array.from({ length: 8 }, (_, i) => String(i));
const COMS = OUTS.map((o) => `C${o}`);
const LEFT = [...COMS, 'NC1'];
const RIGHT = [...OUTS, 'NC2'];

const points: Record<string, { label: string; kind: IoKind; print?: string }> = {};
for (const o of OUTS) {
  points[o] = { label: `OUT ${o.padStart(3, '0')}`, kind: 'out' };
  points[`C${o}`] = { label: `COM${o}`, kind: 'pass' };
}
points.NC1 = { label: 'NC（未使用）', kind: 'nc', print: 'NC' };
points.NC2 = { label: 'NC（未使用）', kind: 'nc', print: 'NC' };

export default buildBlockUnit({
  type: 'keyence.kv-b8rc',
  model: 'KV-B8RC',
  name: 'PLC リレー出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 8点 リレー出力ユニット（独立コモン、脱着式ネジ端子台）。定格負荷 AC250V/DC30V 2A/点。出力 n の接点は端子 Cn（COMn）と n の間にあり、点ごとに別の電源（AC100V と DC24V など）を使い分けられる。端子 0〜7 の信号名 000〜007 はユニットの先頭リレー番号からの相対番号。NC 端子は未使用。図面上はリレー接点を「閉」とみなしてチェックする。内部消費電流 65mA。',
  left: LEFT,
  right: RIGHT,
  points,
  links: OUTS.map((o) => ({ from: `C${o}`, to: o })),
  window: 'none',
  tag: 'OUT',
});
