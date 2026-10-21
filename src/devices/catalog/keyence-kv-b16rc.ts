import { buildBlockUnit, ioOutputLinks, kvUnitBus, type BlockUnitSpec } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-B16RC（16点 ネジ端子台、リレー出力）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。端子台の並びは KV-B16XC と同じ（左列 1,3,5,7,C0,9,11,13,15 / 右列 0,2,…,14,C1）。
 * 定格負荷 AC250V/DC30V 2A（8A/1コモン）、8点 1コモン。C0 が 000〜007、C1 が 008〜015 のコモンで、C0 と C1 は内部で独立。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16rc/io-circuit/
 */

const LEFT = ['1', '3', '5', '7', 'C0', '9', '11', '13', '15'];
const RIGHT = ['0', '2', '4', '6', '8', '10', '12', '14', 'C1'];
const OUTS = Array.from({ length: 16 }, (_, i) => String(i));

const points: BlockUnitSpec['points'] = {};
for (const o of OUTS) points[o] = { kind: 'out', index: Number(o), common: Number(o) < 8 ? 'C0' : 'C1' };
points.C0 = { kind: 'com-relay', label: 'COM0', note: '端子 0〜7 のリレー接点のコモン（C1 とは独立）。負荷電源（AC / DC）の片側をつなぐ' };
points.C1 = { kind: 'com-relay', label: 'COM1', note: '端子 8〜15 のリレー接点のコモン（C0 とは独立）' };

export default buildBlockUnit({
  type: 'keyence.kv-b16rc',
  model: 'KV-B16RC',
  name: 'PLC リレー出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 16点 リレー出力ユニット（脱着式ネジ端子台）。定格負荷 AC250V/DC30V 2A/点（8A/1コモン）、8点 1コモン×2（C0: 000〜007、C1: 008〜015。C0 と C1 は内部で独立）。無電圧接点なので AC 負荷・DC 負荷のどちらにも使え、COM に負荷電源の片側をつなぐ。端子のラベルはリレー番号（装着位置から決まる先頭番号 + 端子番号）。内部消費電流 120mA。',
  left: LEFT,
  right: RIGHT,
  points,
  links: ioOutputLinks(Object.entries(points).map(([id, p]) => ({ id, ...p })), 2),
  commonLimits: [
    { common: 'C0', current: 8 },
    { common: 'C1', current: 8 },
  ],
  io: { outSignal: 'contact' },
  bus: kvUnitBus(120, { outputs: 16 }),
  window: 'none',
  tag: 'OUT',
});
