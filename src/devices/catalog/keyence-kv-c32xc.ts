import { INPUT_MODE_PARAM, inputComAccepts, ioPins, kvUnitBus, mil34IoPins, milConnector } from '../keyence/kv-parts';
import type { DeviceDefinition } from '../types';

/**
 * KEYENCE KV-8000 シリーズ 入力ユニット KV-C32XC（32点 コネクタタイプ、DC24V/DC5V 入力）。
 * 外形 W23 × H90 × D80 mm（1mm ≒ 2px）。本体はダークグレー、上部に型式と黄緑の識別ラベル。
 * 正面上部に入力モード（24V/5V）切替スイッチ、その下に MIL 規格 34極（2列×17、2.54mm ピッチ）の
 * ボックスヘッダがあり、上下にロックレバーが付く。入力状態の LED 表示はない（CPU のアクセスウィンドウ等で確認する）。
 *
 * ピン番号: KEYENCE のマニュアルは正面から見て左列が 1〜17（上が 1）、右列が 18〜34 の「横並び番号」。
 * ケーブル接続時に相手側と物理位置で一致させるため、ピンID は MIL 標準の千鳥番号に変換する
 * （KEYENCE の k 番（1〜17）→ CN1#(2k-1)、17+k 番 → CN1#2k）。マニュアル上の番号は label に残す。
 */

const W = 46;
const H = 180;

/** コネクタ（差込口の中心とピン配置） */
const CN = { x: 23.5, y: 111, w: 23 };
/** 列（左列: KEYENCE 1〜17、右列: 18〜34）の X 座標 */
const COL_L = CN.x - 2.54;
const COL_R = CN.x + 2.54;
/** 1 段目（▲側）の Y 座標と段ピッチ（2.54mm） */
const ROW0 = CN.y - 8 * 5.08;
const PITCH = 5.08;

/** KEYENCE のピン番号（1〜34）→ MIL 標準の千鳥番号 */
const stdNo = (k: number) => (k <= 17 ? 2 * k - 1 : 2 * (k - 17));

/**
 * ピン（ラベルはリレー番号。装着位置から決まる先頭番号 + 点数。KV STUDIO の自動割付で CPU の右隣 1 台目なら R000〜R115）。
 * COM は双方向（プラスコモン / マイナスコモンどちらでも可）。
 */
const points = mil34IoPins(
  'CN1',
  { offset: 0, kind: 'in', com: 'com-in', comName: 'COM0 ±共用' },
  { offset: 16, kind: 'in', com: 'com-in', comName: 'COM1 ±共用' },
);

const text = (x: number, y: number, t: string, size = 4, fill = '#d8dadd', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** MIL 34極 ボックスヘッダ（ロックレバー付き） */
const milHeader = () => {
  const top = ROW0 - 5;
  const bottom = ROW0 + 16 * PITCH + 5;
  const dots = Array.from({ length: 17 }, (_, i) => {
    const y = ROW0 + i * PITCH;
    return `<rect x="${COL_L - 0.9}" y="${y - 0.9}" width="1.8" height="1.8" fill="url(#pin-{{uid}})"/>
    <rect x="${COL_R - 0.9}" y="${y - 0.9}" width="1.8" height="1.8" fill="url(#pin-{{uid}})"/>`;
  }).join('');
  return `
  <!-- シュラウド -->
  <rect x="${CN.x - 11.5}" y="47" width="23" height="129" rx="1.5" fill="url(#shroud-{{uid}})" stroke="#060607" stroke-width="0.8"/>
  <!-- 上下のロックレバー -->
  <rect x="${CN.x - 9}" y="49" width="18" height="${top - 51}" rx="1" fill="url(#lever-{{uid}})" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${CN.x - 6}" y="52" width="12" height="3" rx="0.6" fill="#1a1b1d"/>
  <rect x="${CN.x - 9}" y="${bottom + 2}" width="18" height="${174 - bottom - 2}" rx="1" fill="url(#lever-{{uid}})" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${CN.x - 6}" y="${170 - 4}" width="12" height="3" rx="0.6" fill="#1a1b1d"/>
  <!-- 差込口とピン -->
  <rect x="${CN.x - 7.5}" y="${top}" width="15" height="${bottom - top}" rx="0.8" fill="#0c0c0d" stroke="#3b3d41" stroke-width="0.6"/>
  <rect x="${CN.x - 9.5}" y="${ROW0 + 8 * PITCH - 3}" width="2.4" height="${PITCH + 1}" fill="#0c0c0d"/>
  ${dots}
  <!-- ▲（1番ピン側） -->
  <path d="M${CN.x - 10} ${top + 3.2} l1.6 -2.8 l1.6 2.8 z" fill="#e8e9eb"/>`;
};

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1f2123"/>
      <stop offset="0.1" stop-color="#36393d"/>
      <stop offset="0.85" stop-color="#303337"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
    <linearGradient id="shroud-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#202124"/>
      <stop offset="0.5" stop-color="#2c2e31"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <linearGradient id="lever-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#45484d"/>
      <stop offset="1" stop-color="#2a2c30"/>
    </linearGradient>
    <linearGradient id="green-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b6f24a"/>
      <stop offset="1" stop-color="#78c41c"/>
    </linearGradient>
    <radialGradient id="pin-{{uid}}" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#b8902e"/>
    </radialGradient>
  </defs>

  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2" fill="url(#body-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <rect x="2" y="2" width="${W - 4}" height="16" rx="1.5" fill="#26282b"/>

  <!-- 型式と識別ラベル -->
  ${text(W / 2, 8.5, 'KV-C32XC', 5.4, '#f2f3f4')}
  <rect x="9" y="10.5" width="28" height="5.5" rx="0.8" fill="url(#green-{{uid}})" stroke="#4f8a12" stroke-width="0.4"/>

  <!-- 入力モード切替スイッチ（24V / 5V） -->
  <rect x="12" y="22" width="22" height="20" rx="1" fill="#1d1f22" stroke="#4a4d52" stroke-width="0.5"/>
  ${text(15, 28, '24V', 3.4, '#d0d2d6', 'start')}
  ${text(15, 39, '5V', 3.4, '#d0d2d6', 'start')}
  <rect x="26" y="24" width="6" height="16" rx="0.8" fill="#0d0e0f"/>
  <rect x="26.6" y="24.6" width="4.8" height="7" rx="0.6" fill="#d9dadc" stroke="#8a8d92" stroke-width="0.4"/>

  ${milHeader()}

  <!-- 右側の縁（連結部） -->
  <rect x="${W - 5}" y="20" width="2" height="${H - 26}" fill="#000" opacity="0.25"/>
  ${text(41, 100, 'CN1', 3, '#9a9da2', 'middle', 'normal')}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-c32xc.input',
  name: 'PLC 入力ユニット',
  model: 'KV-C32XC',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-8000 シリーズの 32点 DC 入力ユニット（コネクタタイプ）。DC24V/DC5V 入力（モード切替、24V モード 5.3mA）、32点 1コモン。双方向フォトカプラ入力のため COM はプラスコモン/マイナスコモンどちらでも使える（COM0・COM1 は内部で共通）。外部接続は MIL 規格 34極コネクタ（KEYENCE ピン番号: 左列 1〜16 = R000〜R015、17 = COM0、右列 18〜33 = R100〜R115、34 = COM1）。ピンのラベルはリレー番号で、CPU に装着すると装着位置から自動で決まる（KV STUDIO の自動割付と同じく右隣 1 台目なら R000 から）。入力モードは params の inputMode。内部消費電流 25mA。ピンID は MIL 標準の千鳥番号（KEYENCE の k 番 → CN1#(2k-1)、17+k 番 → CN1#2k）。',
  labelPrefix: 'IN',
  width: W,
  height: H,
  svg,
  terminals: [
    {
      id: 'CN1',
      label: 'CN1 (MIL 34P)',
      x: CN.x,
      y: CN.y,
      side: 'bottom',
      role: 'connector',
      connector: milConnector(34),
      optional: true,
    },
  ],
  pins: ioPins(points, { inputs: 32, inputAccepts: inputComAccepts }),
  links: [
    // COM0（No.17）と COM1（No.34）は内部で共通
    { from: `CN1#${stdNo(17)}`, to: `CN1#${stdNo(34)}` },
  ],
  params: [INPUT_MODE_PARAM],
  bus: kvUnitBus(25, { inputs: 32 }),
};

export default def;
