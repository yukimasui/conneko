import { buildBlockUnit, ioOutputLinks, kvUnitBus, type BlockUnitSpec } from '../keyence/kv-parts';

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

const points: BlockUnitSpec['points'] = {};
for (const o of OUTS) {
  points[o] = { kind: 'out', index: Number(o), common: `C${o}` };
  points[`C${o}`] = { kind: 'com-relay', label: `COM${o}`, note: `端子 ${o} のリレー接点の相手側（独立コモン）。負荷電源（AC / DC）の片側をつなぐ` };
}
points.NC1 = { kind: 'nc', label: 'NC（未使用）', print: 'NC' };
points.NC2 = { kind: 'nc', label: 'NC（未使用）', print: 'NC' };

export default buildBlockUnit({
  type: 'keyence.kv-b8rc',
  model: 'KV-B8RC',
  name: 'PLC リレー出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 8点 リレー出力ユニット（独立コモン、脱着式ネジ端子台）。定格負荷 AC250V/DC30V 2A/点。出力 n の接点は端子 Cn（COMn）と n の間にあり、点ごとに別の電源（AC100V と DC24V など）を使い分けられる。端子のラベルはリレー番号（装着位置から決まる先頭番号 + 端子番号）。NC 端子は未使用。内部消費電流 65mA。',
  left: LEFT,
  right: RIGHT,
  points,
  links: ioOutputLinks(Object.entries(points).map(([id, p]) => ({ id, ...p })), 2),
  io: { outSignal: 'contact' },
  bus: kvUnitBus(65, { outputs: 8 }),
  window: 'none',
  tag: 'OUT',
});
