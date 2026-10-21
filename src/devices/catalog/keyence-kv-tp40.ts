import { buildBlockUnit } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 温度・アナログ マルチ入力ユニット KV-TP40（4ch）。
 * 外形 W35 × H90 × D80 mm（1mm ≒ 2px）。右寄りに脱着式ネジ端子台（18端子・2列千鳥、カバー付き）、
 * 左側の帯に設定用のつまみ（写真ではピンク・水色）が見える。
 *
 * 端子の並び（KEYENCE 入出力回路図より。端子名は「熱電対/測温抵抗体/電圧・電流」の兼用表記）:
 *   左列（上から）: 0 A/−/−, 0 b/・/・, 1 A/−/−, 1 b/・/・, NC, 2 A/−/−, 2 b/・/・, 3 A/−/−, 3 b/・/・
 *   右列（上から）: 0 B/+/V+, 0 ・/・/I+, 1 B/+/V+, 1 ・/・/I+, NC, 2 B/+/V+, 2 ・/・/I+, 3 B/+/V+, 3 ・/・/I+
 * 熱電対: −（青）を A/−/−、+（赤）を B/+/V+。測温抵抗体（3線式）: A（赤）を A、B（白）を B と b。
 * 電圧: + を V+、− を −。電流: + を I+、− を −。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-tp40/io-circuit/
 */

const CH = [0, 1, 2, 3];
const LEFT = ['0A', '0b', '1A', '1b', 'NC1', '2A', '2b', '3A', '3b'];
const RIGHT = ['0B', '0I', '1B', '1I', 'NC2', '2B', '2I', '3B', '3I'];

const points: Record<string, { label: string; kind: 'in' | 'nc'; print?: string }> = {
  NC1: { label: 'NC（未使用）', kind: 'nc', print: 'NC' },
  NC2: { label: 'NC（未使用）', kind: 'nc', print: 'NC' },
};
for (const c of CH) {
  points[`${c}A`] = { label: `ch${c} A/−/−（熱電対 −・測温抵抗体 A・電圧/電流 −）`, kind: 'in', print: `${c} A/-` };
  points[`${c}b`] = { label: `ch${c} b（測温抵抗体 b）`, kind: 'in', print: `${c} b` };
  points[`${c}B`] = { label: `ch${c} B/+/V+（熱電対 +・測温抵抗体 B・電圧 +）`, kind: 'in', print: `${c} B/+` };
  points[`${c}I`] = { label: `ch${c} I+（電流 +）`, kind: 'in', print: `${c} I+` };
}

/** 左側の帯（設定つまみ） */
const extra = `
  <rect x="4" y="22" width="13" height="150" rx="1" fill="#2a2c30" stroke="#151617" stroke-width="0.5"/>
  <rect x="7" y="34" width="6" height="7" rx="1" fill="#eef0f2" stroke="#8a8d92" stroke-width="0.4"/>
  <rect x="7" y="58" width="6" height="7" rx="1" fill="#1b1c1e" stroke="#4a4d52" stroke-width="0.4"/>
  <rect x="7" y="118" width="6" height="7" rx="1" fill="#e0407a" stroke="#8f1d45" stroke-width="0.4"/>
  <rect x="7" y="146" width="6" height="7" rx="1" fill="#33b4e8" stroke="#1b6c8f" stroke-width="0.4"/>`;

export default buildBlockUnit({
  type: 'keyence.kv-tp40',
  model: 'KV-TP40',
  name: 'PLC 温度・アナログ入力ユニット',
  labelPrefix: 'TC',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの温度・アナログ マルチ入力ユニット（4ch、脱着式ネジ端子台）。ch ごとに熱電対（K/J/T/E/N/R/S/B など）、測温抵抗体（Pt100/JPt100、3線式）、電圧、電流を選べる。変換周期 50ms/4ch、内部消費電流 90mA。端子名は兼用表記（A/−/−: 熱電対の −・測温抵抗体 A・電圧/電流の −、B/+/V+: 熱電対の +・測温抵抗体 B・電圧 +、b: 測温抵抗体 b、I+: 電流 +）。熱電対の補償導線は端子台に直接つなぐ。',
  width: 70,
  blocks: [{ x: 24, w: 44, left: LEFT, right: RIGHT }],
  points,
  window: 'off',
  extra,
  tag: '',
});
