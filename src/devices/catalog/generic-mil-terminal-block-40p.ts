import type { DeviceDefinition, PinDef, TerminalDef, InternalLink } from '../types';

/**
 * MIL 40極コネクタ付き 変換端子台（汎用品・DINレール取付）。
 * 外形はおよそ 長さ135 × 奥行45mm（1mm ≒ 2px）。奥側に MIL オスコネクタ（2.54mm ピッチ 2列×20）、
 * 手前に M3 ネジ端子が 2段の千鳥配置（ピッチ 5.08mm）で並ぶ。
 *
 * ピン番号は MIL 規格の標準的な千鳥番号（▲マーク側の端が 1・2、奥列が偶数 2,4…40、手前列が奇数 1,3…39）。
 * ネジ端子も同じ番号で、奥段が奇数 1〜39、手前段が偶数 2〜40。コネクタのピン n とネジ端子 n が導通する。
 *
 * 極数違い（34P など）でも使えるよう、定義の生成は buildMilTerminalBlock にまとめている。
 */

export interface MilTerminalBlockOptions {
  /** 極数（偶数） */
  poles: number;
  /** 本体の長さ[mm]（取付けタブを除く） */
  lengthMm: number;
  type: string;
}

const H = 92;

/** ネジ端子 */
const PITCH = 10.16;
const ODD_Y = 50;
const EVEN_Y = 72;

/** コネクタ（ピンピッチ 2.54mm） */
const CN_Y = 18;
const PIN_PITCH = 5.08;
const PIN_EVEN_Y = 15.5;
const PIN_ODD_Y = 20.6;

const screw = (x: number, y: number) => `
  <rect x="${(x - 4.4).toFixed(2)}" y="${y - 4.4}" width="8.8" height="8.8" rx="1" fill="#141414"/>
  <circle cx="${x}" cy="${y}" r="3.6" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.4"/>
  <path d="M${(x - 2.2).toFixed(2)} ${y} H${(x + 2.2).toFixed(2)} M${x} ${y - 2.2} V${y + 2.2}" stroke="#4a4a4a" stroke-width="0.9" stroke-linecap="round"/>`;

const num = (x: number, y: number, n: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#f2f2f2">${n}</text>`;

/** MIL コネクタ変換端子台の機器定義を生成する */
export function buildMilTerminalBlock({ poles, lengthMm, type }: MilTerminalBlockOptions): DeviceDefinition {
  const COLS = poles / 2;
  /** 全幅（本体 + 左右の取付けタブ 7px ずつ） */
  const W = lengthMm * 2 + 14;
  const CN_X = W / 2;

  /** ネジ端子は奇数段・偶数段を半ピッチずらして中央にそろえる */
  const ODD_X0 = Math.round(CN_X - ((COLS - 1) * PITCH + PITCH / 2) / 2);
  const EVEN_X0 = ODD_X0 + PITCH / 2;
  const termX = (n: number) => {
    const col = Math.floor((n - 1) / 2);
    return +((n % 2 === 1 ? ODD_X0 : EVEN_X0) + col * PITCH).toFixed(2);
  };
  const termY = (n: number) => (n % 2 === 1 ? ODD_Y : EVEN_Y);

  /** コネクタ外形（ピン列の長さ + 両端のロックレバー分） */
  const HOUSING_W = Math.round((COLS - 1) * PIN_PITCH + 27.5);
  const HALF = HOUSING_W / 2;
  const SHROUD_W = HOUSING_W - 20;
  const CN_WIDTH = HOUSING_W - 8;
  const PIN_X0 = CN_X - ((COLS - 1) / 2) * PIN_PITCH;

  const nums = Array.from({ length: poles }, (_, i) => i + 1);

  /** 端子を固定する段（端子ブロック） */
  const strip = (y: number, h: number, x0: number) => `
  <rect x="${x0 - 6}" y="${y}" width="${(COLS - 1) * PITCH + 12}" height="${h}" rx="1.5" fill="url(#strip-{{uid}})" stroke="#0e0e0e" stroke-width="0.6"/>
  ${Array.from({ length: COLS - 1 }, (_, i) => {
    const x = (x0 + (i + 0.5) * PITCH).toFixed(2);
    return `<line x1="${x}" y1="${y + 1.5}" x2="${x}" y2="${y + h - 1.5}" stroke="#5d6167" stroke-width="0.7"/>`;
  }).join('')}`;

  /** ベース上下の切欠き（DINレール取付部の窓） */
  const notches: number[] = [];
  for (let x = 30; x + 14 < W - 30; x += 50) notches.push(x);

  const svg = `
  <defs>
    <linearGradient id="base-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b3e42"/>
      <stop offset="1" stop-color="#25272a"/>
    </linearGradient>
    <linearGradient id="strip-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4b4f54"/>
      <stop offset="1" stop-color="#2f3236"/>
    </linearGradient>
    <linearGradient id="plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#161616"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 取付け穴付きのタブ（左下・右上） -->
  <rect x="0" y="55" width="12" height="15" rx="1.5" fill="#2b2d30" stroke="#111" stroke-width="0.6"/>
  <circle cx="4.5" cy="62.5" r="2.8" fill="#9aa0a6" stroke="#444" stroke-width="0.5"/>
  <rect x="${W - 12}" y="22" width="12" height="15" rx="1.5" fill="#2b2d30" stroke="#111" stroke-width="0.6"/>
  <circle cx="${W - 4.5}" cy="29.5" r="2.8" fill="#9aa0a6" stroke="#444" stroke-width="0.5"/>

  <!-- ベース -->
  <rect x="7" y="1" width="${W - 14}" height="${H - 2}" rx="3" fill="url(#base-{{uid}})" stroke="#111" stroke-width="1"/>
  <rect x="10" y="4" width="${W - 20}" height="${H - 8}" rx="2" fill="none" stroke="#4a4d52" stroke-width="0.6"/>
  ${notches
    .map((x) => `<rect x="${x}" y="1.5" width="14" height="2.5" fill="#17181a"/><rect x="${x}" y="${H - 4}" width="14" height="2.5" fill="#17181a"/>`)
    .join('')}

  <!-- MIL ${poles}極 オスコネクタ（ボックスヘッダ） -->
  <rect x="${CN_X - HALF}" y="6" width="${HOUSING_W}" height="25" rx="1.5" fill="url(#plug-{{uid}})" stroke="#080808" stroke-width="0.8"/>
  <!-- 両端のロックレバー -->
  <rect x="${CN_X - HALF + 1}" y="8" width="7" height="21" rx="1" fill="#2c2c2c" stroke="#555" stroke-width="0.5"/>
  <rect x="${CN_X + HALF - 8}" y="8" width="7" height="21" rx="1" fill="#2c2c2c" stroke="#555" stroke-width="0.5"/>
  <!-- 差込口 -->
  <rect x="${CN_X - SHROUD_W / 2}" y="10" width="${SHROUD_W}" height="16.5" rx="0.8" fill="#0b0b0b" stroke="#444" stroke-width="0.5"/>
  ${Array.from({ length: COLS }, (_, i) => {
    const x = (PIN_X0 + i * PIN_PITCH).toFixed(2);
    return `<rect x="${(+x - 0.8).toFixed(2)}" y="${PIN_EVEN_Y - 0.8}" width="1.6" height="1.6" fill="#e0b84a"/><rect x="${(+x - 0.8).toFixed(2)}" y="${PIN_ODD_Y - 0.8}" width="1.6" height="1.6" fill="#e0b84a"/>`;
  }).join('')}
  <!-- 極性キーの切欠き（奇数列側の中央） -->
  <rect x="${CN_X - 4.5}" y="26" width="9" height="3.2" fill="#0b0b0b"/>
  <!-- 1番ピンの▲マークとピン番号 -->
  <path d="M${PIN_X0} 27.4 L${PIN_X0 - 2} 30.4 H${PIN_X0 + 2} Z" fill="#f2f2f2"/>
  <text x="${CN_X - HALF - 3}" y="17" text-anchor="end" font-family="sans-serif" font-size="4.2" fill="#ddd">2</text>
  <text x="${CN_X - HALF - 3}" y="22.5" text-anchor="end" font-family="sans-serif" font-size="4.2" fill="#ddd">1</text>
  <text x="${CN_X + HALF + 3}" y="17" font-family="sans-serif" font-size="4.2" fill="#ddd">${poles}</text>
  <text x="${CN_X + HALF + 3}" y="22.5" font-family="sans-serif" font-size="4.2" fill="#ddd">${poles - 1}</text>
  <text x="22" y="20" font-family="sans-serif" font-size="5" font-weight="bold" fill="#cfd2d6">MIL ${poles}P</text>

  <!-- ネジ端子（奥段: 奇数、手前段: 偶数） -->
  ${strip(36, 21, ODD_X0)}
  ${strip(58.5, 24, EVEN_X0)}
  ${nums.map((n) => num(termX(n), n % 2 === 1 ? 41.5 : 64, n)).join('')}
  ${nums.map((n) => screw(termX(n), termY(n))).join('')}
`;

  const terminals: TerminalDef[] = [
    {
      id: 'CN',
      x: CN_X,
      y: CN_Y,
      side: 'top',
      role: 'connector',
      connector: { kind: `MIL${poles}`, pins: poles, width: CN_WIDTH },
    },
    ...nums.map(
      (n): TerminalDef => ({ id: String(n), x: termX(n), y: termY(n), side: 'bottom', role: 'pass', optional: true }),
    ),
  ];

  const pins: PinDef[] = nums.map((n) => ({ id: `CN#${n}`, role: 'pass', optional: true }));

  const links: InternalLink[] = nums.map((n) => ({ from: `CN#${n}`, to: String(n) }));

  return {
    type,
    name: 'MILコネクタ変換端子台',
    model: `MIL ${poles}P 中継端子台`,
    category: 'terminal',
    description: `PLC の I/O ユニットなどの MIL ${poles}極コネクタをネジ端子に変換する中継端子台。コネクタのピン n とネジ端子 n が導通する（ピン番号は MIL 標準の千鳥番号: 1・2 が▲側の端、奇数/偶数で列が分かれる）。`,
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
  };
}

const def: DeviceDefinition = buildMilTerminalBlock({
  poles: 40,
  lengthMm: 135,
  type: 'generic.mil-terminal-block.40p',
});

export default def;
