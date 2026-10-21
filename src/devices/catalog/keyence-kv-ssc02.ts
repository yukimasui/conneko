import type { DeviceDefinition, PinDef } from '../types';
import { INPUT_COM_ACCEPTS, SINK_COM_ACCEPTS, kvBody2, kvDefs, milHeaderV } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 高速カウンタユニット KV-SSC02（2ch、単相 4MHz / 2相4逓倍 16MHz、シリアルエンコーダ対応）。
 * 外形 W22.6 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部の下に MIL 規格 40極コネクタが 1 個。
 *
 * ピン配置（KEYENCE 入出力回路図より。MIL 標準の千鳥番号: 左列が奇数 = ch0、右列が偶数 = ch1）:
 *   1/2 A相 24V、3/4 A相 12V、5/6 A相 5V、7/8 A相コモン、9〜15 / 10〜16 B相（方向）、17〜23 / 18〜24 Z相（プリセット）、
 *   25/26 インプットキャプチャ0（イネーブル）入力、27/28 インプットキャプチャ1 入力、29/30 OUT0、31/32 OUT1、
 *   33 DATA+ / 34 DATA−、35 CLK+ / 36 CLK−（シリアルエンコーダ通信）、37 エンコーダ用 5V 電源出力、38 SG、
 *   39 制御入力コモン、40 出力コモン（SG と内部短絡）
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-ssc02/io-circuit/
 */

const W = 45;
const H = 185;
const CN = { x: 22.5, y: 113 };

const PH: [string, string][] = [
  ['A', 'A相'],
  ['B', 'B相（方向）'],
  ['Z', 'Z相（プリセット）'],
];

const pins: PinDef[] = [];
for (const ch of [0, 1]) {
  const n = (i: number) => `CN1#${2 * i + 1 + ch}`;
  PH.forEach(([p, name], pi) => {
    pins.push(
      { id: n(pi * 4), label: `ch${ch} ${p}相 24V 入力（${name}）`, role: 'signal', optional: true },
      { id: n(pi * 4 + 1), label: `ch${ch} ${p}相 12V 入力（${name}）`, role: 'signal', optional: true },
      { id: n(pi * 4 + 2), label: `ch${ch} ${p}相 5V 入力（${name}）`, role: 'signal', optional: true },
      { id: n(pi * 4 + 3), label: `ch${ch} ${p}相 コモン（${name}）`, role: 'signal', optional: true },
    );
  });
  pins.push(
    { id: n(12), label: `ch${ch} インプットキャプチャ0（イネーブル）入力`, role: 'signal', optional: true },
    { id: n(13), label: `ch${ch} インプットキャプチャ1 入力`, role: 'signal', optional: true },
    { id: n(14), label: `ch${ch} OUT0（一致出力）`, role: 'signal', optional: true },
    { id: n(15), label: `ch${ch} OUT1（一致出力）`, role: 'signal', optional: true },
  );
}
pins.push(
  { id: 'CN1#33', label: 'DATA+（シリアルエンコーダ）', role: 'signal', optional: true },
  { id: 'CN1#34', label: 'DATA−（シリアルエンコーダ）', role: 'signal', optional: true },
  { id: 'CN1#35', label: 'CLK+（シリアルエンコーダ）', role: 'signal', optional: true },
  { id: 'CN1#36', label: 'CLK−（シリアルエンコーダ）', role: 'signal', optional: true },
  { id: 'CN1#37', label: 'エンコーダ用 DC5V 電源出力（300mA）', role: 'supply', supply: { system: 'DC', voltage: 5, conductor: '+', limitCurrent: 0.3 }, optional: true },
  { id: 'CN1#38', label: 'SG（信号グランド）', role: 'signal', optional: true },
  { id: 'CN1#39', label: '制御入力コモン（DC12〜24V）', role: 'input', accepts: INPUT_COM_ACCEPTS, optional: true },
  { id: 'CN1#40', label: '出力コモン（0V）', role: 'input', accepts: SINK_COM_ACCEPTS, optional: true },
);
pins.sort((a, b) => Number(a.id.split('#')[1]) - Number(b.id.split('#')[1]));

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-SSC02', {
    headerH: 30,
    leds: [
      { x: 10, y: 15, label: 'CH0' },
      { x: 22, y: 15, label: 'CH1', c: 'off' },
      { x: 34, y: 15, label: 'ERR', c: 'off' },
    ],
  })}
  ${milHeaderV(CN.x, CN.y, 40)}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-ssc02',
  name: 'PLC 高速カウンタユニット',
  model: 'KV-SSC02',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズ専用の高速カウンタユニット（2ch、単相 4MHz・2相4逓倍 16MHz、EnDat2.2/BiSS-C/安川シリアルのアブソリュートエンコーダにも対応）。エンコーダの A/B/Z 相は電圧（24V/12V/5V）に合ったピンと各相のコモンに配線する（ラインドライバ出力も可）。外部接続は MIL 規格 40極コネクタ（ピン番号は MIL 標準の千鳥番号、奇数 = ch0、偶数 = ch1）。制御入力（キャプチャ/イネーブル、DC12〜24V）のコモンは 39、一致出力 OUT0/OUT1（DC30V 0.2A）の出力コモンは 40（SG と内部短絡、負荷電源の 0V をつなぐ）。37 はエンコーダ用 DC5V 電源出力。図面上は一致出力を ON（出力コモンと導通）とみなしてチェックする。内部消費電流 190mA。',
  labelPrefix: 'CNT',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'CN1', label: 'CN1 I/O (MIL 40P)', x: CN.x, y: CN.y, side: 'bottom', role: 'connector', connector: { kind: 'MIL40', pins: 40, width: 23 }, optional: true },
  ],
  pins,
  links: [
    { from: 'CN1#38', to: 'CN1#40' },
    ...['CN1#29', 'CN1#30', 'CN1#31', 'CN1#32'].map((p) => ({ from: p, to: 'CN1#40' })),
  ],
};

export default def;
