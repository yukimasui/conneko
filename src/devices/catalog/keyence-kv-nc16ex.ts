import { buildNcMil } from '../keyence/kv-nc';
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
    'KEYENCE の 16点 DC 入力ユニット（DC24V/DC5V モード切替、MIL 規格 20極コネクタ）。KV Nano シリーズの増設や、EtherCAT カプラ KV-EC01 に連結するリモート I/O として使う。ピンは MIL 標準の千鳥番号で、1・2 = N.C.、奇数 3〜17 = IN 000〜007、偶数 4〜18 = IN 008〜015、19 = COM0、20 = COM1（COM は内部で短絡、双方向）。信号名はユニットの先頭リレー番号からの相対番号。内部消費電流 20mA。',
  poles: 20,
  pins,
  links: ncMilLinks(16, pins),
  modeSwitch: true,
});
