import { buildNcMil } from '../keyence/kv-nc';
import { KV_NANO_BUS, kvUnitBus } from '../keyence/kv-parts';
import { ncMilLinks, ncMilPins } from '../keyence/kv-nc-mil-pins';

/**
 * KEYENCE 拡張入力ユニット KV-NC32EX（32点、DC24V、MIL 34極コネクタ）。KV Nano シリーズ / KV-EC01（リモート I/O）用。
 * ピン（KEYENCE 入出力回路図、MIL 標準の千鳥番号）: 1,3,…,31 = IN 000〜015、2,4,…,32 = IN 100〜115、33 = COM0、34 = COM1（内部短絡）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc32ex/io-circuit/
 */

const pins = ncMilPins(32, 'in', 'com-in');

export default buildNcMil({
  type: 'keyence.kv-nc32ex',
  model: 'KV-NC32EX',
  name: 'PLC 拡張入力ユニット',
  labelPrefix: 'IN',
  description:
    'KEYENCE の 32点 DC 入力ユニット（DC24V、MIL 規格 34極コネクタ）。KV Nano シリーズの増設や、EtherCAT カプラ KV-EC01 に連結するリモート I/O として使う。ピンは MIL 標準の千鳥番号で、奇数 1〜31 = IN 000〜015、偶数 2〜32 = IN 100〜115、33 = COM0、34 = COM1（COM は内部で短絡、双方向）。KV-8000 用の KV-C32XC と同じ物理配置。ピンのラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。内部消費電流 20mA。',
  poles: 34,
  pins,
  links: ncMilLinks(32, pins),
  io: { inputs: 32 },
  bus: kvUnitBus(20, { inputs: 32 }, KV_NANO_BUS),
});
