import { buildNcMil } from '../keyence/kv-nc';
import { KV_NANO_BUS, kvUnitBus } from '../keyence/kv-parts';
import { ncMilLinks, ncMilPins } from '../keyence/kv-nc-mil-pins';

/**
 * KEYENCE 拡張出力ユニット KV-NC16ET（16点、MOSFET シンク出力、MIL 20極コネクタ）。KV Nano シリーズ / KV-EC01（リモート I/O）用。
 * ピン（KEYENCE 入出力回路図、MIL 標準の千鳥番号）: 1・2 = N.C.、3,5,…,17 = OUT 000〜007、4,6,…,18 = OUT 008〜015、
 * 19 = COM0、20 = COM1（内部短絡、負荷電源の 0V）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc16et/io-circuit/
 */

const pins = ncMilPins(16, 'out', 'com-sink', ' (0V)');

export default buildNcMil({
  type: 'keyence.kv-nc16et',
  model: 'KV-NC16ET',
  name: 'PLC 拡張出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE の 16点 トランジスタ出力ユニット（MOSFET シンク出力・過電流保護付き、DC30V 0.2A/点、MIL 規格 20極コネクタ）。KV Nano シリーズの増設や、EtherCAT カプラ KV-EC01 に連結するリモート I/O として使う。ピンは MIL 標準の千鳥番号で、1・2 = N.C.、奇数 3〜17 = OUT 000〜007、偶数 4〜18 = OUT 008〜015、19 = COM0、20 = COM1（内部短絡、負荷電源の 0V をつなぐ）。過電流を検出すると 000〜007 または 008〜015 がまとめて OFF。ピンのラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。内部消費電流 30mA。',
  poles: 20,
  pins,
  links: ncMilLinks(16, pins),
  io: { outSignal: 'npn' },
  bus: kvUnitBus(30, { outputs: 16 }, KV_NANO_BUS),
});
