import { buildNcMil } from '../keyence/kv-nc';
import { ncMilLinks, ncMilPins } from '../keyence/kv-nc-mil-pins';

/**
 * KEYENCE 拡張出力ユニット KV-NC16ETP（16点、MOSFET ソース出力、MIL 20極コネクタ）。KV Nano シリーズ / KV-EC01（リモート I/O）用。
 * ピン（KEYENCE 入出力回路図、MIL 標準の千鳥番号、KV-NC16ET と共通）: 1・2 = N.C.、3,5,…,17 = OUT 000〜007、
 * 4,6,…,18 = OUT 008〜015、19 = COM0、20 = COM1（内部短絡、ソース出力のため負荷電源の +V）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc16et/io-circuit/
 */

const pins = ncMilPins(16, 'out', 'com-source', ' (+V)');

export default buildNcMil({
  type: 'keyence.kv-nc16etp',
  model: 'KV-NC16ETP',
  name: 'PLC 拡張出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE の 16点 トランジスタ出力ユニット（MOSFET ソース出力・過電流保護付き、DC30V 0.2A/点、MIL 規格 20極コネクタ）。KV Nano シリーズの増設や、EtherCAT カプラ KV-EC01 に連結するリモート I/O として使う。ピンは MIL 標準の千鳥番号で、1・2 = N.C.、奇数 3〜17 = OUT 000〜007、偶数 4〜18 = OUT 008〜015、19 = COM0、20 = COM1（内部短絡、負荷電源の +24V をつなぐ）。図面上は出力 ON（COM と出力ピンが導通）とみなしてチェックする。',
  poles: 20,
  pins,
  links: ncMilLinks(16, pins),
});
