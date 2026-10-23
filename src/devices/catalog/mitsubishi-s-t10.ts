import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 電磁接触器 S-T10（MS-Tシリーズ、操作コイル AC200V、補助接点 1a 標準）。
 * 外形はおよそ 幅36 × 高さ75 × 奥行78mm（1mm ≒ 2px）。
 * 正面はアイボリーの樹脂ケースで、上段に一次側 1/L1・3/L2・5/L3・13NO、下段に二次側 2/T1・4/T2・6/T3・14NO、
 * 上部の一段高いブロックに操作コイル端子 A2・A1 が並ぶ。中央には接点の開閉が見える黒い可動部がある。
 */

const W = 72;
const H = 150;

/** 主回路・補助接点端子の横位置（左から 1/L1, 3/L2, 5/L3, 13NO） */
const COLS = [11, 28, 45, 62];
/** 上段（一次側）・下段（二次側）端子ネジの中心 */
const TOP_Y = 40;
const BOT_Y = 126;
/** 操作コイル端子（上部ブロック） */
const COIL_Y = 12;
const A2_X = 22;
const A1_X = 48;

const screw = (x: number, y: number, r = 6) => `
  <circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#3b3b3b"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

/** 端子記号の印字（小さな枠付き） */
const mark = (x: number, y: number, text: string) => `
  <rect x="${x - 7.5}" y="${y - 4.5}" width="15" height="7" rx="0.8" fill="#f7f5ef" stroke="#77736a" stroke-width="0.5"/>
  <text x="${x}" y="${y + 1.2}" text-anchor="middle" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#222">${text}</text>`;

/** 端子の両脇の仕切り（絶縁バリア） */
const barriers = (y: number, h: number) =>
  [2.5, 19.5, 36.5, 53.5, 69.5]
    .map((x) => `<rect x="${x - 1.2}" y="${y}" width="2.4" height="${h}" rx="0.8" fill="#d9d4c7" stroke="#b9b3a4" stroke-width="0.4"/>`)
    .join('');

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dcd8cc"/>
      <stop offset="0.12" stop-color="#efece3"/>
      <stop offset="0.85" stop-color="#ece9df"/>
      <stop offset="1" stop-color="#d2cdc0"/>
    </linearGradient>
    <linearGradient id="pocket-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9c4b6"/>
      <stop offset="1" stop-color="#e4e0d5"/>
    </linearGradient>
    <linearGradient id="slot-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111"/>
      <stop offset="0.5" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#111"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 背面の黒いベース（DINレール取付部）が左右に少し見える -->
  <rect x="0" y="20" width="${W}" height="${H - 22}" rx="3" fill="#232323"/>

  <!-- 操作コイル端子ブロック（一段高い） -->
  <rect x="12" y="1" width="46" height="23" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  ${screw(A2_X, COIL_Y, 5.5)}
  ${screw(A1_X, COIL_Y, 5.5)}
  <rect x="28.5" y="3.5" width="13" height="17" rx="1" fill="#fbfaf6" stroke="#8e897c" stroke-width="0.4"/>
  <text x="35" y="8.5" text-anchor="middle" font-family="sans-serif" font-size="2.6" fill="#333">50/60Hz</text>
  <text x="35" y="13.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#111">200-</text>
  <text x="35" y="18" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#111">240V</text>
  <text x="${A2_X}" y="23" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">A2</text>
  <text x="${A1_X}" y="23" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">A1</text>

  <!-- 本体 -->
  <rect x="2" y="24" width="${W - 4}" height="${H - 27}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>

  <!-- 上段（一次側）端子 -->
  <rect x="3" y="28" width="${W - 6}" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${barriers(27, 26)}
  ${COLS.map((x) => screw(x, TOP_Y)).join('')}
  ${mark(COLS[0], 57, '1/L1')}
  ${mark(COLS[1], 57, '3/L2')}
  ${mark(COLS[2], 57, '5/L3')}
  ${mark(COLS[3], 57, '13NO')}

  <!-- 中央: 形名・可動部（接点開閉表示）・ロゴ -->
  <text x="5" y="85" font-family="sans-serif" font-size="8" font-weight="bold" fill="#333">S-T10</text>
  <rect x="30.5" y="64" width="11" height="38" rx="1.5" fill="url(#slot-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="32.5" y="74" width="7" height="16" rx="1" fill="#1a1a1a" stroke="#4d4d4d" stroke-width="0.6"/>
  <text x="57" y="76" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">AC200V</text>
  <text x="57" y="81" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">1a</text>
  <g transform="translate(46.5 90)">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#d01c1f"/>
  </g>
  <text x="54.5" y="94.5" font-family="sans-serif" font-size="2.5" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="54.5" y="97.5" font-family="sans-serif" font-size="2.5" font-weight="bold" fill="#333">ELECTRIC</text>

  <!-- 下段（二次側）端子 -->
  ${mark(COLS[0], 109, '2/T1')}
  ${mark(COLS[1], 109, '4/T2')}
  ${mark(COLS[2], 109, '6/T3')}
  ${mark(COLS[3], 109, '14NO')}
  <rect x="3" y="114" width="${W - 6}" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${barriers(113, 26)}
  ${COLS.map((x) => screw(x, BOT_Y)).join('')}

  <!-- 下端の黒いベース -->
  <rect x="6" y="${H - 5}" width="${W - 12}" height="5" rx="1.5" fill="#1d1d1d"/>
`;

const def: DeviceDefinition = {
  type: 'mitsubishi.s-t10.ac200v',
  name: '電磁接触器',
  model: 'S-T10 AC200V 1a',
  maker: '三菱電機',
  category: 'contactor',
  description:
    '三菱電機 MS-Tシリーズの電磁接触器（AC-3 220V 2.2kW / 11A クラス）。操作コイル A1-A2 に AC200V（200〜240V）を加えると主接点 3極と補助接点 13-14（1a）が閉じる。',
  labelPrefix: 'MC',
  width: W,
  height: H,
  svg,
  terminals: [
    // 主接点 一次側
    { id: '1/L1', hint: '一次側', x: COLS[0], y: TOP_Y, side: 'top', role: 'line' },
    { id: '3/L2', hint: '一次側', x: COLS[1], y: TOP_Y, side: 'top', role: 'line' },
    { id: '5/L3', hint: '一次側', x: COLS[2], y: TOP_Y, side: 'top', role: 'line' },
    // 主接点 二次側
    { id: '2/T1', hint: '二次側', x: COLS[0], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '4/T2', hint: '二次側', x: COLS[1], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '6/T3', hint: '二次側', x: COLS[2], y: BOT_Y, side: 'bottom', role: 'load' },
    // 補助接点 1a（13-14）
    { id: '13', hint: 'a 接点', label: '13NO', note: '補助 a 接点', x: COLS[3], y: TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '14', hint: 'a 接点', label: '14NO', note: '補助 a 接点', x: COLS[3], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    // 操作コイル（AC200V品の定格は 50/60Hz 200〜240V）
    {
      id: 'A1',
      hint: 'コイル',
      x: A1_X,
      y: COIL_Y,
      side: 'top',
      role: 'input',
      accepts: { system: 'AC', minVoltage: 200, maxVoltage: 240 },
    },
    {
      id: 'A2',
      hint: 'コイル',
      x: A2_X,
      y: COIL_Y,
      side: 'top',
      role: 'input',
      accepts: { system: 'AC', minVoltage: 200, maxVoltage: 240 },
    },
  ],
  // 主接点 3極と補助接点 13-14 は a 接点（コイル A1-A2 の通電で閉じる）。
  // 主接点の ratedCurrent は AC-3（AC220V）の定格使用電流 11A
  links: [
    { from: '1/L1', to: '2/T1', directed: true, switch: 'NO', ratedCurrent: 11 },
    { from: '3/L2', to: '4/T2', directed: true, switch: 'NO', ratedCurrent: 11 },
    { from: '5/L3', to: '6/T3', directed: true, switch: 'NO', ratedCurrent: 11 },
    { from: '13', to: '14', switch: 'NO' },
  ],
  distinctGroups: [['A1', 'A2']],
};

export default def;
