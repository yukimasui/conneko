import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 直流操作形電磁接触器 SD-T12（MS-T シリーズ、操作コイル DC24V、補助接点 1a1b 標準）。
 * 外形は 幅44 × 高さ75 × 奥行100mm（1mm ≒ 2px）。
 * 上部の一段高いブロックに操作コイル端子 A2(−)・A1(+)（DC コイルは極性あり）、
 * 上段に 13NO・1/L1・3/L2・5/L3・21NC、下段に 14NO・2/T1・4/T2・6/T3・22NC が並ぶ。
 * 補助 b 接点 21-22 は IEC 60947-4-1 附属書 F のミラー接点（主接点が溶着しても開かない）で、
 * 安全リレー・安全コントローラーの EDM（外部機器監視）帰還に使える。
 */

const W = 88;
const H = 150;

/** 端子の横位置（左から 13NO, 1/L1, 3/L2, 5/L3, 21NC） */
const COLS = [12, 28, 44, 60, 76];
/** 上段は上端から 23.7mm、上下の端子の間隔 41.6mm（外形図 L(NA)02030ENG-K。S-T20 と同じ） */
const TOP_Y = 47.5;
const BOT_Y = 130.5;
/** 操作コイル端子（上部ブロック） */
const COIL_Y = 12;
const A2_X = 30;
const A1_X = 58;

const screw = (x: number, y: number, r = 5.8) => `
  <circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#3b3b3b"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

/** 端子記号の印字（小さな枠付き） */
const mark = (x: number, y: number, t: string, fill = '#222') => `
  <rect x="${x - 7.3}" y="${y - 4.5}" width="14.6" height="7" rx="0.8" fill="#f7f5ef" stroke="#77736a" stroke-width="0.5"/>
  <text x="${x}" y="${y + 1.2}" text-anchor="middle" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="${fill}">${t}</text>`;

const barriers = (y: number, h: number) =>
  [3.5, 20, 36, 52, 68, 84.5]
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

  <!-- 背面の黒いベース -->
  <rect x="0" y="20" width="${W}" height="${H - 22}" rx="3" fill="#232323"/>

  <!-- 操作コイル端子ブロック（一段高い。DC コイルは A1 が +） -->
  <rect x="16" y="1" width="56" height="23" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  ${screw(A2_X, COIL_Y, 5.5)}
  ${screw(A1_X, COIL_Y, 5.5)}
  <rect x="37" y="3.5" width="14" height="17" rx="1" fill="#fbfaf6" stroke="#8e897c" stroke-width="0.4"/>
  <text x="40.5" y="9" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#111">−</text>
  <text x="47.5" y="9" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#111">+</text>
  <text x="44" y="13.8" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#111">DC</text>
  <text x="44" y="18.4" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#111">24V</text>
  <text x="${A2_X}" y="23" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">A2</text>
  <text x="${A1_X}" y="23" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">A1</text>

  <!-- 本体 -->
  <rect x="2" y="24" width="${W - 4}" height="${H - 27}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>

  <!-- 上段端子 -->
  <rect x="3" y="35.5" width="${W - 6}" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${barriers(34.5, 26)}
  ${COLS.map((x) => screw(x, TOP_Y)).join('')}
  ${mark(COLS[0], 64, '13NO')}
  ${mark(COLS[1], 64, '1/L1')}
  ${mark(COLS[2], 64, '3/L2')}
  ${mark(COLS[3], 64, '5/L3')}
  ${mark(COLS[4], 64, '21NC')}

  <!-- 中央: 形名・可動部・ロゴ -->
  <text x="6" y="80" font-family="sans-serif" font-size="8" font-weight="bold" fill="#333">SD-T12</text>
  <text x="6" y="88" font-family="sans-serif" font-size="3.6" fill="#555">DC24V  1a1b</text>
  <rect x="38.5" y="70" width="11" height="36" rx="1.5" fill="url(#slot-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="40.5" y="80" width="7" height="16" rx="1" fill="#1a1a1a" stroke="#4d4d4d" stroke-width="0.6"/>
  <g transform="translate(58 89)">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#d01c1f"/>
  </g>
  <text x="66" y="93.5" font-family="sans-serif" font-size="2.5" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="66" y="96.5" font-family="sans-serif" font-size="2.5" font-weight="bold" fill="#333">ELECTRIC</text>

  <!-- 下段端子 -->
  ${mark(COLS[0], 114, '14NO')}
  ${mark(COLS[1], 114, '2/T1')}
  ${mark(COLS[2], 114, '4/T2')}
  ${mark(COLS[3], 114, '6/T3')}
  ${mark(COLS[4], 114, '22NC')}
  <rect x="3" y="118.5" width="${W - 6}" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${barriers(117.5, 26)}
  ${COLS.map((x) => screw(x, BOT_Y)).join('')}

  <rect x="8" y="${H - 5}" width="${W - 16}" height="5" rx="1.5" fill="#1d1d1d"/>
`;

/** 直流操作コイルの許容電圧（定格の 85〜110%） */
const coil = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'mitsubishi.sd-t12.dc24v',
  name: '電磁接触器（直流操作）',
  model: 'SD-T12 DC24V 1a1b',
  maker: '三菱電機',
  category: 'contactor',
  description:
    '三菱電機 MS-T シリーズの直流操作形電磁接触器（AC-3 220V 3.5kW / 13A、コイル DC24V 2.2W）。A1(+)-A2(−) に DC24V を加えると主接点 3 極と補助 a 接点 13-14 が閉じ、補助 b 接点 21-22 が開く。' +
    '21-22 はミラー接点（IEC 60947-4-1 附属書 F）で、安全リレーの出力や安全コントローラーの OSSD で 2 台（K1/K2）を駆動し、両方の 21-22 を直列にして EDM（外部機器監視）・フィードバックループへ戻す使い方をする。コイルは極性あり（A1 が +）。',
  labelPrefix: 'MC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1/L1', hint: '一次側', x: COLS[1], y: TOP_Y, side: 'top', role: 'line' },
    { id: '3/L2', hint: '一次側', x: COLS[2], y: TOP_Y, side: 'top', role: 'line' },
    { id: '5/L3', hint: '一次側', x: COLS[3], y: TOP_Y, side: 'top', role: 'line' },
    { id: '2/T1', hint: '二次側', x: COLS[1], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '4/T2', hint: '二次側', x: COLS[2], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '6/T3', hint: '二次側', x: COLS[3], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '13', hint: 'a 接点', label: '13NO（補助 a 接点）', x: COLS[0], y: TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '14', hint: 'a 接点', label: '14NO（補助 a 接点）', x: COLS[0], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: '21', hint: 'b 接点', label: '21NC（補助 b 接点・ミラー接点）', x: COLS[4], y: TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '22', hint: 'b 接点', label: '22NC（補助 b 接点・ミラー接点）', x: COLS[4], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: 'A1', label: 'A1(+)', hint: 'コイル+', x: A1_X, y: COIL_Y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['+'] } },
    { id: 'A2', label: 'A2(−)', hint: 'コイル−', x: A2_X, y: COIL_Y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['-'] } },
  ],
  // 主接点・補助 a 接点 13-14 は a 接点、補助 b 接点 21-22 はミラー接点（主接点が溶着すると開かない）
  links: [
    { from: '1/L1', to: '2/T1', directed: true, switch: 'NO', ratedCurrent: 13 },
    { from: '3/L2', to: '4/T2', directed: true, switch: 'NO', ratedCurrent: 13 },
    { from: '5/L3', to: '6/T3', directed: true, switch: 'NO', ratedCurrent: 13 },
    { from: '13', to: '14', switch: 'NO' },
    { from: '21', to: '22', switch: 'NC', linked: 'mirror' },
  ],
  // 電磁接触器自体には PL の定めがない（B10d から安全回路の構成で求める）
  safety: { standards: ['IEC 60947-4-1 附属書 F（ミラー接点）'] },
  // コイル消費電力 2.2W / 24V
  loadCurrent: 0.09,
};

export default def;
