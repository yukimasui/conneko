import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 直流操作形電磁接触器 SD-T21（MS-T シリーズ、操作コイル DC24V、補助接点 2a2b 標準）。
 * 外形は 幅63 × 高さ81 × 奥行108mm（1mm ≒ 2px）。端子位置はカタログ L(NA)02030ENG の外形図による。
 * 上部の一段高いブロックに操作コイル端子 A2(−)・A1(+)、中央に主回路端子（上 1/L1・3/L2・5/L3、下 2/T1・4/T2・6/T3）、
 * 左右の縁に補助接点の端子が縦に並ぶ（左: 13・21 / 22・14、右: 43・31 / 32・44）。
 * 補助 b 接点 21-22・31-32 は IEC 60947-4-1 附属書 F のミラー接点。
 */

const W = 126;
const H = 162;

const COIL_Y = 14;
const A2_X = 46.6;
const A1_X = 77.8;
const MAIN_XS = [36.8, 62.2, 87.6];
const MAIN_TOP = 44;
const MAIN_BOT = 142.8;
const AUX_L = 11.4;
const AUX_R = 113;
const AUX_YS = { a: 49.4, b: 67.2, c: 118.8, d: 135.6 };

const screw = (x: number, y: number, r = 5.4) => `
  <circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#3b3b3b"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.2" stroke-linecap="round"/>`;

const mark = (x: number, y: number, t: string, w = 14) => `
  <rect x="${x - w / 2}" y="${y - 4.2}" width="${w}" height="6.4" rx="0.8" fill="#f7f5ef" stroke="#77736a" stroke-width="0.5"/>
  <text x="${x}" y="${y + 1}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#222">${t}</text>`;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dcd8cc"/>
      <stop offset="0.1" stop-color="#efece3"/>
      <stop offset="0.9" stop-color="#ece9df"/>
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

  <!-- 背面の黒いベース -->
  <rect x="2" y="26" width="${W - 4}" height="${H - 30}" rx="3" fill="#232323"/>

  <!-- 操作コイル端子ブロック -->
  <rect x="34" y="2" width="56" height="24" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  ${screw(A2_X, COIL_Y, 5.2)}
  ${screw(A1_X, COIL_Y, 5.2)}
  <rect x="55" y="5" width="14" height="16" rx="1" fill="#fbfaf6" stroke="#8e897c" stroke-width="0.4"/>
  <text x="58.5" y="10" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#111">−</text>
  <text x="65.5" y="10" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#111">+</text>
  <text x="62" y="15" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#111">DC</text>
  <text x="62" y="19.4" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#111">24V</text>
  <text x="${A2_X}" y="25" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">A2</text>
  <text x="${A1_X}" y="25" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">A1</text>

  <!-- 本体（中央の主回路部と左右の補助接点部） -->
  <rect x="24" y="28" width="78" height="${H - 32}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>
  <rect x="3" y="36" width="23" height="${H - 48}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  <rect x="${W - 26}" y="36" width="23" height="${H - 48}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>

  <!-- 主回路端子 -->
  <rect x="26" y="32" width="74" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  <rect x="26" y="${MAIN_BOT - 12}" width="74" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${MAIN_XS.map((x) => screw(x, MAIN_TOP, 6) + screw(x, MAIN_BOT, 6)).join('')}
  ${['1/L1', '3/L2', '5/L3'].map((t, i) => mark(MAIN_XS[i], 61, t)).join('')}
  ${['2/T1', '4/T2', '6/T3'].map((t, i) => mark(MAIN_XS[i], 127, t)).join('')}

  <!-- 補助接点（左: 13 21 / 22 14、右: 43 31 / 32 44） -->
  ${[AUX_L, AUX_R].map((x) => Object.values(AUX_YS).map((y) => screw(x, y, 4.6)).join('')).join('')}
  ${[
    ['13', AUX_YS.a],
    ['21', AUX_YS.b],
    ['22', AUX_YS.c],
    ['14', AUX_YS.d],
  ]
    .map(([t, y]) => `<text x="${AUX_L}" y="${Number(y) + 10}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222">${t}</text>`)
    .join('')}
  ${[
    ['43', AUX_YS.a],
    ['31', AUX_YS.b],
    ['32', AUX_YS.c],
    ['44', AUX_YS.d],
  ]
    .map(([t, y]) => `<text x="${AUX_R}" y="${Number(y) + 10}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222">${t}</text>`)
    .join('')}
  <!-- 補助接点部の窓（接点の開閉表示） -->
  <rect x="7" y="83" width="9" height="20" rx="1" fill="#2a2a2a"/>
  <rect x="${W - 16}" y="83" width="9" height="20" rx="1" fill="#2a2a2a"/>

  <!-- 中央: 可動部・形名・ロゴ -->
  <rect x="50" y="72" width="24" height="34" rx="1.5" fill="url(#slot-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="56" y="78" width="12" height="22" rx="1" fill="#1a1a1a" stroke="#4d4d4d" stroke-width="0.6"/>
  <text x="28" y="80" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#333">SD-</text>
  <text x="28" y="87" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#333">T21</text>
  <text x="28" y="94" font-family="sans-serif" font-size="3.2" fill="#555">DC24V</text>
  <text x="28" y="99" font-family="sans-serif" font-size="3.2" fill="#555">2a2b</text>
  <g transform="translate(80 84)">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#d01c1f"/>
  </g>
  <text x="83" y="98" text-anchor="middle" font-family="sans-serif" font-size="2.4" font-weight="bold" fill="#333">MITSUBISHI</text>

  <rect x="30" y="${H - 4}" width="${W - 60}" height="4" rx="1.5" fill="#1d1d1d"/>
`;

const coil = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const aux = (id: string, x: number, y: number, side: 'left' | 'right', nc: boolean) => ({
  id,
  label: `${id}（補助 ${nc ? 'b 接点・ミラー接点' : 'a 接点'}）`,
  x,
  y,
  side,
  role: 'signal' as const,
  optional: true,
});

const def: DeviceDefinition = {
  type: 'mitsubishi.sd-t21.dc24v',
  name: '電磁接触器（直流操作）',
  model: 'SD-T21 DC24V 2a2b',
  maker: '三菱電機',
  category: 'contactor',
  description:
    '三菱電機 MS-T シリーズの直流操作形電磁接触器（AC-3 220V 5.5kW / 26A クラス、コイル DC24V 2.4W）。A1(+)-A2(−) に DC24V を加えると主接点 3 極と補助 a 接点 13-14・43-44 が閉じ、補助 b 接点 21-22・31-32 が開く。' +
    '21-22・31-32 はミラー接点（IEC 60947-4-1 附属書 F）で、安全リレー・安全コントローラーの EDM（フィードバックループ）に使える。コイルは極性あり（A1 が +）。',
  labelPrefix: 'MC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1/L1', x: MAIN_XS[0], y: MAIN_TOP, side: 'top', role: 'line' },
    { id: '3/L2', x: MAIN_XS[1], y: MAIN_TOP, side: 'top', role: 'line' },
    { id: '5/L3', x: MAIN_XS[2], y: MAIN_TOP, side: 'top', role: 'line' },
    { id: '2/T1', x: MAIN_XS[0], y: MAIN_BOT, side: 'bottom', role: 'load' },
    { id: '4/T2', x: MAIN_XS[1], y: MAIN_BOT, side: 'bottom', role: 'load' },
    { id: '6/T3', x: MAIN_XS[2], y: MAIN_BOT, side: 'bottom', role: 'load' },
    aux('13', AUX_L, AUX_YS.a, 'left', false),
    aux('21', AUX_L, AUX_YS.b, 'left', true),
    aux('22', AUX_L, AUX_YS.c, 'left', true),
    aux('14', AUX_L, AUX_YS.d, 'left', false),
    aux('43', AUX_R, AUX_YS.a, 'right', false),
    aux('31', AUX_R, AUX_YS.b, 'right', true),
    aux('32', AUX_R, AUX_YS.c, 'right', true),
    aux('44', AUX_R, AUX_YS.d, 'right', false),
    { id: 'A1', label: 'A1(+)', x: A1_X, y: COIL_Y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['+'] } },
    { id: 'A2', label: 'A2(−)', x: A2_X, y: COIL_Y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['-'] } },
  ],
  links: [
    { from: '1/L1', to: '2/T1', directed: true },
    { from: '3/L2', to: '4/T2', directed: true },
    { from: '5/L3', to: '6/T3', directed: true },
    { from: '13', to: '14' },
    { from: '43', to: '44' },
    { from: '21', to: '22' },
    { from: '31', to: '32' },
  ],
  // コイル消費電力 2.4W / 24V
  loadCurrent: 0.1,
};

export default def;
