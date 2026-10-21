import { buildNcMil } from '../keyence/kv-nc';
import { INPUT_MODE_PARAM, KV_NANO_BUS, inputComAccepts, kvUnitBus } from '../keyence/kv-parts';
import { ncMilLinks, ncMilPins } from '../keyence/kv-nc-mil-pins';

/**
 * KEYENCE 拡張入力ユニット KV-NC16EX（16点、DC24V/DC5V、MIL 20極コネクタ）。KV Nano シリーズ / KV-EC01（リモート I/O）用。
 * ピン（KEYENCE 入出力回路図、MIL 標準の千鳥番号）: 1・2 = N.C.、3,5,…,17 = IN 000〜007、4,6,…,18 = IN 008〜015、19 = COM0、20 = COM1（内部短絡）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc16ex/io-circuit/
 */

const pins = ncMilPins(16, 'in', 'com-in');

export default buildNcMil({
  type: 'keyence.kv-nc16ex',
  model: 'KV-NC16EX',
  name: 'PLC 拡張入力ユニット',
  labelPrefix: 'IN',
  description:
    'KEYENCE の 16点 DC 入力ユニット（DC24V/DC5V モード切替、MIL 規格 20極コネクタ）。KV Nano シリーズの増設や、EtherCAT カプラ KV-EC01 に連結するリモート I/O として使う。ピンは MIL 標準の千鳥番号で、1・2 = N.C.、奇数 3〜17 = IN 000〜007、偶数 4〜18 = IN 008〜015、19 = COM0、20 = COM1（COM は内部で短絡、双方向）。ピンのラベルはリレー番号（装着位置から決まる先頭番号 + 点数）。入力モードは params の inputMode。内部消費電流 20mA。',
  poles: 20,
  pins,
  links: ncMilLinks(16, pins),
  io: { inputs: 16, inputAccepts: inputComAccepts },
  bus: kvUnitBus(20, { inputs: 16 }, KV_NANO_BUS),
  params: [INPUT_MODE_PARAM],
  modeSwitch: true,
});
