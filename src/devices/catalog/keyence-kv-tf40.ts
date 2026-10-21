import { buildBlockUnit, type IoKind } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 温度調節ユニット KV-TF40（4ch、PID 制御）。
 * 外形 W58 × H90 × D80 mm（1mm ≒ 2px）。脱着式ネジ端子台（18端子・2列千鳥）が左右に 2 個（LEFT / RIGHT）。
 *
 * 端子の並び（KEYENCE 入出力回路図より）:
 *   LEFT  左列: CT0G, CT1G, NC, CT2G, CT3G, NC, 0B/+, 0b/−, 0A/・   右列: CT0, CT1, NC, CT2, CT3, NC, 1B/+, 1b/−, 1A/・
 *   RIGHT 左列: OUT0, C0, ALM0, OUT1, C1, ALM1, 2B/+, 2b/−, 2A/・   右列: OUT2, C2, ALM2, OUT3, C3, ALM3, 3B/+, 3b/−, 3A/・
 * 制御出力 OUTn・警報出力 ALMn はトランジスタ シンク出力（DC30V 100mA）で、Cn に負荷電源の 0V をつなぐ。
 * 熱電対: +（赤）を nB/+、−（青）を nb/−。測温抵抗体: A（赤）を nA、B（白）を nB と nb。CT 入力は CTn と CTnG。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-tf40/io-circuit/
 */

const L_LEFT = ['CT0G', 'CT1G', 'NC1', 'CT2G', 'CT3G', 'NC2', '0B', '0b', '0A'];
const L_RIGHT = ['CT0', 'CT1', 'NC3', 'CT2', 'CT3', 'NC4', '1B', '1b', '1A'];
const R_LEFT = ['OUT0', 'C0', 'ALM0', 'OUT1', 'C1', 'ALM1', '2B', '2b', '2A'];
const R_RIGHT = ['OUT2', 'C2', 'ALM2', 'OUT3', 'C3', 'ALM3', '3B', '3b', '3A'];

const points: Record<string, { label: string; kind: IoKind; print?: string }> = {};
for (const n of [1, 2, 3, 4]) points[`NC${n}`] = { label: 'NC（未使用）', kind: 'nc', print: 'NC' };
for (const c of [0, 1, 2, 3]) {
  points[`CT${c}`] = { label: `CT${c}（ヒータ断線検出 CT 入力）`, kind: 'in' };
  points[`CT${c}G`] = { label: `CT${c}G（CT 入力 GND）`, kind: 'in' };
  points[`${c}B`] = { label: `ch${c} B/+（熱電対 +・測温抵抗体 B）`, kind: 'in', print: `${c}B/+` };
  points[`${c}b`] = { label: `ch${c} b/−（熱電対 −・測温抵抗体 b）`, kind: 'in', print: `${c}b/-` };
  points[`${c}A`] = { label: `ch${c} A（測温抵抗体 A）`, kind: 'in', print: `${c}A` };
  points[`OUT${c}`] = { label: `ch${c} 制御出力`, kind: 'out' };
  points[`ALM${c}`] = { label: `ch${c} 警報出力`, kind: 'out' };
  points[`C${c}`] = { label: `ch${c} 出力コモン (0V)`, kind: 'com-sink' };
}

export default buildBlockUnit({
  type: 'keyence.kv-tf40',
  model: 'KV-TF40',
  name: 'PLC 温度調節ユニット',
  labelPrefix: 'TC',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの温度調節ユニット（4ch、PID/加熱冷却/ON-OFF 制御、脱着式ネジ端子台 × 2）。入力は熱電対・測温抵抗体（ch ごとに選択）、ヒータ断線検出用 CT 入力 4 点（CT は OP-6694 など別売）。制御出力 OUT0〜3・警報出力 ALM0〜3 はトランジスタ シンク出力（DC30V 100mA）で、ch ごとの出力コモン Cn に負荷電源の 0V をつなぐ（負荷のもう一端は +24V）。LEFT 端子台は CT 入力と ch0/ch1、RIGHT 端子台は出力と ch2/ch3。内部消費電流 210mA。図面上は出力 ON（出力端子と Cn が導通）とみなしてチェックする。',
  width: 116,
  blocks: [
    { x: 8, w: 48, left: L_LEFT, right: L_RIGHT },
    { x: 64, w: 48, left: R_LEFT, right: R_RIGHT },
  ],
  points,
  links: [0, 1, 2, 3].flatMap((c) => [
    { from: `OUT${c}`, to: `C${c}` },
    { from: `ALM${c}`, to: `C${c}` },
  ]),
  window: 'off',
  extra: `
  <text x="32" y="176" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#b9bcc1">LEFT</text>
  <text x="88" y="176" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#b9bcc1">RIGHT</text>`,
  tag: '',
});
