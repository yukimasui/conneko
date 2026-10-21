import { buildBlockUnit, ioOutputLinks, kvUnitBus, type BlockUnitSpec } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ 出力ユニット KV-B16TCP（16点 ネジ端子台、トランジスタ ソース出力）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。端子台の並びは KV-B16XC と同じ（左列 1,3,5,7,C0,9,11,13,15 / 右列 0,2,…,14,C1）。
 * 定格負荷 DC30V 0.2A/点、16点 1コモン（C0・C1 は内部で共通）。COM には負荷電源の +V をつなぐ（ソース出力）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16tcp/io-circuit/
 */

const LEFT = ['1', '3', '5', '7', 'C0', '9', '11', '13', '15'];
const RIGHT = ['0', '2', '4', '6', '8', '10', '12', '14', 'C1'];
const OUTS = Array.from({ length: 16 }, (_, i) => String(i));

const points: BlockUnitSpec['points'] = {};
for (const o of OUTS) points[o] = { kind: 'out', index: Number(o), common: 'C0' };
points.C0 = { kind: 'com-source', label: 'COM0 (+V)', note: '出力のコモン（C1 と内部で共通）。負荷電源の +24V をつなぐ' };
points.C1 = { kind: 'com-source', label: 'COM1 (+V)', note: '出力のコモン（C0 と内部で共通）' };

export default buildBlockUnit({
  type: 'keyence.kv-b16tcp',
  model: 'KV-B16TCP',
  name: 'PLC 出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズの 16点 トランジスタ出力ユニット（PNP/ソース出力、脱着式ネジ端子台）。定格負荷 DC30V 0.2A/点、16点 1コモン（C0・C1 は内部で共通）。COM に負荷電源の +24V をつなぎ、出力 ON で COM から出力端子へ電流が流れる。負荷のもう一端は負荷電源の 0V につなぐ。端子のラベルはリレー番号（装着位置から決まる先頭番号 + 端子番号）。内部消費電流 30mA。',
  left: LEFT,
  right: RIGHT,
  points,
  links: [{ from: 'C0', to: 'C1' }, ...ioOutputLinks(Object.entries(points).map(([id, p]) => ({ id, ...p })), 0.2)],
  io: { outSignal: 'pnp' },
  bus: kvUnitBus(30, { outputs: 16 }),
  window: 'none',
  tag: 'OUT',
});
