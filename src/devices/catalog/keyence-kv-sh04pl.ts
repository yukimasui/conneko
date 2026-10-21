import type { DeviceDefinition, PinDef } from '../types';
import { kvBody2, kvDefs, milHeaderV, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 高速位置決めユニット KV-SH04PL（4軸、パルス出力）。
 * 外形 W42 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に軸ごとの LED（AX1〜AX4）、正面に MIL 規格 40極コネクタが 2 個
 * （左が 1軸/2軸用 CN1、右が 3軸/4軸用 CN2。中心間 19.4mm）。
 *
 * ピン配置（KEYENCE 入出力回路図より。MIL 標準の千鳥番号: 左列が奇数 = 1軸/3軸、右列が偶数 = 2軸/4軸）:
 *   奇数 1 LSF / 3 LSR / 5 ORG / 7 STOP / 9 SP0ST / 11 Z+ / 13 Z− / 15 SVEND / 17 SVRDY / 19 ALM（以上入力）
 *        21 ALMRES / 23 SVON / 25 CLR / 27 FP+ / 29 FP− / 31 RP+ / 33 RP−（以上出力）/ 35 空き / 37 +5V_OUT / 39 +COM
 *   偶数 2〜34 は同じ並びで相手軸、36 FSTOP（CN1 のみ。CN2 は空き）、38・40 −COM
 * +COM（DC24V 入力）・−COM（0V）・+5V_OUT は 2 つのコネクタで内部共通。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sh04pl/io-circuit/
 */

const W = 84;
const H = 185;
const CN1 = { x: 23, y: 113 };
const CN2 = { x: 61.8, y: 113 };

const SIG: [string, string, 'in' | 'out'][] = [
  ['LSF', '正方向リミット', 'in'],
  ['LSR', '負方向リミット', 'in'],
  ['ORG', '原点センサ', 'in'],
  ['STOP', '停止センサ', 'in'],
  ['SP0ST', '連続即時起動', 'in'],
  ['Z+', 'Z相 +', 'in'],
  ['Z-', 'Z相 −', 'in'],
  ['SVEND', 'サーボエンド', 'in'],
  ['SVRDY', 'サーボレディ', 'in'],
  ['ALM', 'ドライバアラーム', 'in'],
  ['ALMRES', 'ドライバアラームリセット出力', 'out'],
  ['SVON', 'サーボ ON 出力', 'out'],
  ['CLR', '偏差カウンタクリア出力', 'out'],
  ['FP+', '正転パルス出力 +', 'out'],
  ['FP-', '正転パルス出力 −', 'out'],
  ['RP+', '逆転パルス出力 +', 'out'],
  ['RP-', '逆転パルス出力 −', 'out'],
];

const PLUS_COM = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+' as const] };
const MINUS_COM = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8, conductors: ['-' as const] };

const pins: PinDef[] = [];
const links: { from: string; to: string }[] = [];
for (const [cn, axOdd, axEven] of [
  ['CN1', 1, 2],
  ['CN2', 3, 4],
] as const) {
  SIG.forEach(([s, name], i) => {
    pins.push({ id: `${cn}#${2 * i + 1}`, label: `${axOdd}${s} 軸${axOdd} ${name}`, role: 'signal', optional: true });
    pins.push({ id: `${cn}#${2 * i + 2}`, label: `${axEven}${s} 軸${axEven} ${name}`, role: 'signal', optional: true });
  });
  // オープンコレクタ出力（ALMRES/SVON/CLR）は ON で −COM と導通するとみなす
  for (const i of [10, 11, 12]) {
    links.push({ from: `${cn}#${2 * i + 1}`, to: `${cn}#38` }, { from: `${cn}#${2 * i + 2}`, to: `${cn}#38` });
  }
  pins.push(
    { id: `${cn}#35`, label: '空き', role: 'signal', optional: true },
    { id: `${cn}#36`, label: cn === 'CN1' ? 'FSTOP 強制停止入力（全軸共通）' : '空き', role: 'signal', optional: true },
    { id: `${cn}#37`, label: '+5V_OUT（DC5V 出力 200mA）', role: 'supply', supply: { system: 'DC', voltage: 5, conductor: '+', limitCurrent: 0.2 }, optional: true },
    { id: `${cn}#39`, label: '+COM（DC24V 入力）', role: 'input', accepts: PLUS_COM, optional: true },
    { id: `${cn}#38`, label: '−COM（0V 入力）', role: 'input', accepts: MINUS_COM, optional: true },
    { id: `${cn}#40`, label: '−COM（0V 入力）', role: 'input', accepts: MINUS_COM, optional: true },
  );
  links.push({ from: `${cn}#38`, to: `${cn}#40` });
}
links.push({ from: 'CN1#39', to: 'CN2#39' }, { from: 'CN1#38', to: 'CN2#38' }, { from: 'CN1#37', to: 'CN2#37' });

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-SH04PL', {
    headerH: 30,
    leds: [
      { x: 14, y: 15, label: 'AX1' },
      { x: 30, y: 15, label: 'AX2' },
      { x: 52, y: 15, label: 'AX3', c: 'off' },
      { x: 68, y: 15, label: 'AX4', c: 'off' },
    ],
  })}
  ${milHeaderV(CN1.x, CN1.y, 40)}
  ${milHeaderV(CN2.x, CN2.y, 40)}
  ${text(CN1.x + 14, 178, 'AX1', 2.8, '#d0d3d6', 'start', 'normal')}
  ${text(CN1.x + 14, 182, 'AX2', 2.8, '#d0d3d6', 'start', 'normal')}
  ${text(CN2.x + 13, 178, 'AX3', 2.8, '#d0d3d6', 'start', 'normal')}
  ${text(CN2.x + 13, 182, 'AX4', 2.8, '#d0d3d6', 'start', 'normal')}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-sh04pl',
  name: 'PLC 高速位置決めユニット',
  model: 'KV-SH04PL',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズ専用の 4 軸 高速位置決めユニット（パルス列出力 1Hz〜8MHz、差動ラインドライバ/オープンコレクタを軸ごとに切換）。サーボアンプ・ステッピングモータドライバのパルス入力へ FP±/RP± を配線し、リミット・原点・停止センサ（DC24V）、Z相・サーボエンド・サーボレディ・アラーム（DC5V 可）を入力する。外部接続は MIL 規格 40極コネクタ × 2（CN1 = 軸1/軸2、CN2 = 軸3/軸4、ピン番号は MIL 標準の千鳥番号）。外部 I/O 用電源として +COM（39）に DC24V、−COM（38・40）に 0V を供給する（両コネクタで内部共通、外部 I/O 消費 260mA）。+5V_OUT（37）は DC5V 200mA の出力。ラインレシーバ入力のドライバを使う場合はドライバの SG を −COM につなぐ。ALMRES/SVON/CLR 出力は図面上 ON（−COM と導通）とみなしてチェックする。',
  labelPrefix: 'POS',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'CN1', label: 'CN1 軸1/軸2 (MIL 40P)', x: CN1.x, y: CN1.y, side: 'bottom', role: 'connector', connector: { kind: 'MIL40', pins: 40, width: 23 }, optional: true },
    { id: 'CN2', label: 'CN2 軸3/軸4 (MIL 40P)', x: CN2.x, y: CN2.y, side: 'bottom', role: 'connector', connector: { kind: 'MIL40', pins: 40, width: 23 }, optional: true },
  ],
  pins: pins.sort((a, b) => (a.id.slice(0, 3) === b.id.slice(0, 3) ? Number(a.id.split('#')[1]) - Number(b.id.split('#')[1]) : a.id < b.id ? -1 : 1)),
  links,
};

export default def;
