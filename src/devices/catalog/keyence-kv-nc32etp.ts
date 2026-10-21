import { buildNcMil } from '../keyence/kv-nc';
import { ncMilLinks, ncMilPins } from '../keyence/kv-nc-mil-pins';

/**
 * KEYENCE 拡張出力ユニット KV-NC32ETP（32点、MOSFET ソース出力、MIL 34極コネクタ）。KV Nano シリーズ / KV-EC01（リモート I/O）用。
 * ピン（KEYENCE 入出力回路図、MIL 標準の千鳥番号、KV-NC32ET と共通）: 1,3,…,31 = OUT 000〜015、2,4,…,32 = OUT 100〜115、
 * 33 = COM0、34 = COM1（内部短絡、ソース出力のため負荷電源の +V）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc32etp/io-circuit/
 */

const pins = ncMilPins(32, 'out', 'com-source', ' (+V)');

export default buildNcMil({
  type: 'keyence.kv-nc32etp',
  model: 'KV-NC32ETP',
  name: 'PLC 拡張出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE の 32点 トランジスタ出力ユニット（MOSFET ソース出力・過電流保護付き、DC30V 0.2A/点、MIL 規格 34極コネクタ）。KV Nano シリーズの増設や、EtherCAT カプラ KV-EC01 に連結するリモート I/O として使う。ピンは MIL 標準の千鳥番号で、奇数 1〜31 = OUT 000〜015、偶数 2〜32 = OUT 100〜115、33 = COM0、34 = COM1（内部短絡、負荷電源の +24V）。図面上は出力 ON（COM と出力ピンが導通）とみなしてチェックする。',
  poles: 34,
  pins,
  links: ncMilLinks(32, pins),
});
