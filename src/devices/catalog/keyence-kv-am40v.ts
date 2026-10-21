import { buildBlockUnit, type IoKind } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/7000/KV-X シリーズ アナログ入出力ユニット KV-AM40V（A/D 2ch + D/A 2ch）。
 * 外形 W29 × H90 × D80 mm（1mm ≒ 2px）。脱着式ネジ端子台（18端子・2列千鳥）。
 *
 * 端子の並び（KEYENCE 入出力回路図より）:
 *   左列（上から）: NC, 0−, C0, 1−, C1, V2−, I2−, V3−, I3−
 *   右列（上から）: NC, V0+, I0+, V1+, I1+, V2+, I2+, V3+, I3+
 * ch0/ch1 が入力（電圧 V+ / 電流 I+、GND は 0− / 1−）、ch2/ch3 が出力（電圧 V+ / V−、電流 I+ / I−）。
 * C0, C1, V2−, V3−, I2−, I3− は内部で共通（内部回路のグランド）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-am40v/io-circuit/
 */

const LEFT = ['NC1', '0-', 'C0', '1-', 'C1', 'V2-', 'I2-', 'V3-', 'I3-'];
const RIGHT = ['NC2', 'V0+', 'I0+', 'V1+', 'I1+', 'V2+', 'I2+', 'V3+', 'I3+'];

const P = (label: string, kind: IoKind = 'in', print?: string) => ({ label, kind, print });
const points = {
  NC1: P('NC（未使用）', 'nc', 'NC'),
  NC2: P('NC（未使用）', 'nc', 'NC'),
  'V0+': P('ch0 電圧入力 +'),
  'I0+': P('ch0 電流入力 +'),
  '0-': P('ch0 アナログ入力 GND'),
  'V1+': P('ch1 電圧入力 +'),
  'I1+': P('ch1 電流入力 +'),
  '1-': P('ch1 アナログ入力 GND'),
  C0: P('GND コモン'),
  C1: P('GND コモン'),
  'V2+': P('ch2 電圧出力 +', 'out'),
  'V2-': P('ch2 電圧出力 GND', 'out'),
  'I2+': P('ch2 電流出力 +', 'out'),
  'I2-': P('ch2 電流出力 GND', 'out'),
  'V3+': P('ch3 電圧出力 +', 'out'),
  'V3-': P('ch3 電圧出力 GND', 'out'),
  'I3+': P('ch3 電流出力 +', 'out'),
  'I3-': P('ch3 電流出力 GND', 'out'),
};

const COMMON = ['C0', 'C1', 'V2-', 'V3-', 'I2-', 'I3-'];

export default buildBlockUnit({
  type: 'keyence.kv-am40v',
  model: 'KV-AM40V',
  name: 'PLC アナログ入出力ユニット',
  labelPrefix: 'AIO',
  description:
    'KEYENCE KV-8000/7000/KV-X シリーズのアナログ入出力ユニット（A/D 2ch + D/A 2ch、脱着式ネジ端子台）。入力 ch0/ch1: 電圧 −10〜+10V/0〜10V/−5〜+5V/0〜5V/1〜5V または電流 0〜20mA/4〜20mA（V+ または I+ と ch の −端子に接続）。出力 ch2/ch3: 電圧 −10〜+10V/0〜10V/0〜5V/1〜5V（V+ と V−）または電流 0〜20mA/4〜20mA（I+ と I−）。C0・C1・V2−・V3−・I2−・I3− は内部で共通（電位の異なる端子どうしの接続は禁止）。変換速度 80µs/ch、内部消費電流 140mA。アナログ信号はシールド線で配線する。',
  left: LEFT,
  right: RIGHT,
  points,
  links: COMMON.slice(1).map((t) => ({ from: COMMON[0], to: t })),
  window: 'none',
  tag: 'A/D',
});
