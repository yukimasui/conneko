import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 サーマルリレー（熱動形過負荷継電器）TH-T25。
 * 電磁接触器 S-T21 / S-T25（SD-T21）の二次側に直結して使う。外形は 幅63 × 高さ53mm（1mm = 2px。カタログ L(NA)02030ENG-K p.70）。
 * 主回路端子（M4）は上段 1/L1・3/L2・5/L3、下段 2/T1・4/T2・6/T3（極間 12.8mm、上段は上端から 22.8mm、上下間隔 18mm）。
 * 補助接点（M3.5）は右下に 96・95（下段の主回路端子と同じ高さ）、その下に 98・97。
 * 右上に電流整定ダイヤルと動作表示（手動トリップ）、上部にリセットバー。
 */

const W = 126;
const H = 106;
const MAIN_X = [15, 40.5, 66.5];
const TOP_Y = 45.5;
const BOT_Y = 81.5;
const AUX_X = [91.5, 112];
const AUX_Y = 81.5;
const AUX2_Y = 99;

/** ヒーター呼びと整定電流範囲 [呼び, 最小, 最大]（TH-T25 の標準ヒーター。カタログ p.33） */
const HEATERS: [number, number, number][] = [
  [0.24, 0.2, 0.32],
  [0.35, 0.28, 0.42],
  [0.5, 0.4, 0.6],
  [0.7, 0.55, 0.85],
  [0.9, 0.7, 1.1],
  [1.3, 1, 1.6],
  [1.7, 1.4, 2],
  [2.1, 1.7, 2.5],
  [2.5, 2, 3],
  [3.6, 2.8, 4.4],
  [5, 4, 6],
  [6.6, 5.2, 8],
  [9, 7, 11],
  [11, 9, 13],
  [15, 12, 18],
  [22, 18, 26],
];
const DEFAULT_HEATER = 15;

const heaterRange = (h: number): [number, number] => {
  const found = HEATERS.find(([v]) => v === h);
  return found ? [found[1], found[2]] : [+(h * 0.8).toPrecision(2), +(h * 1.2).toPrecision(2)];
};

const screw = (x: number, y: number, r = 6) => `
  <circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#2e2e2e"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

const label = (x: number, y: number, text: string, fill = '#222', size = 4.6) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${fill}">${text}</text>`;

/** 整定ダイヤルの目盛り */
const dialTicks = (cx: number, cy: number, r: number) =>
  Array.from({ length: 9 }, (_, i) => {
    const a = ((-135 + i * 33.75) * Math.PI) / 180;
    const x1 = cx + Math.sin(a) * (r - 2.2);
    const y1 = cy - Math.cos(a) * (r - 2.2);
    const x2 = cx + Math.sin(a) * (r - 0.6);
    const y2 = cy - Math.cos(a) * (r - 0.6);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#444" stroke-width="0.6"/>`;
  }).join('');

const svg = (heater: number) => {
  const [min, max] = heaterRange(heater);
  return `
  <defs>
    <linearGradient id="black-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#1c1c1c"/>
    </linearGradient>
    <linearGradient id="ivory-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9d5c8"/>
      <stop offset="0.12" stop-color="#eeebe2"/>
      <stop offset="0.88" stop-color="#ebe8de"/>
      <stop offset="1" stop-color="#cfcabd"/>
    </linearGradient>
    <linearGradient id="pin-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9a5a2c"/>
      <stop offset="0.45" stop-color="#f0b080"/>
      <stop offset="1" stop-color="#8a4c22"/>
    </linearGradient>
    <linearGradient id="blue-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3f8ff0"/>
      <stop offset="1" stop-color="#1b5fc0"/>
    </linearGradient>
    <radialGradient id="dial-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fbf8ef"/>
      <stop offset="1" stop-color="#cfc8b4"/>
    </radialGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 上部の接続導体の端（電磁接触器の二次側へ差し込む部分）と端子記号の札 -->
  ${MAIN_X.map(
    (x, i) => `
  <rect x="${x - 5}" y="12" width="10" height="8" rx="1" fill="url(#pin-{{uid}})" stroke="#6e3a16" stroke-width="0.4"/>
  <rect x="${x - 8}" y="18" width="16" height="7" rx="1" fill="#f1eee6" stroke="#8e897c" stroke-width="0.4"/>
  ${label(x, 23.4, ['1/L1', '3/L2', '5/L3'][i], '#222', 3.8)}`,
  ).join('')}

  <!-- 本体（黒） -->
  <rect x="1" y="26" width="${W - 2}" height="${H - 27}" rx="3" fill="url(#black-{{uid}})" stroke="#111" stroke-width="0.8"/>
  <!-- 主回路の端子部（アイボリー） -->
  <rect x="2" y="32" width="78" height="${H - 34}" rx="2" fill="url(#ivory-{{uid}})" stroke="#9c978a" stroke-width="0.7"/>
  ${[2.5, 27.5, 53.5, 79]
    .map((x) => `<rect x="${x - 1.2}" y="32" width="2.4" height="${H - 34}" rx="0.8" fill="#e3dfd3" stroke="#b9b3a4" stroke-width="0.4"/>`)
    .join('')}
  <rect x="3" y="60" width="76" height="8" fill="#d6d1c3"/>
  ${MAIN_X.map((x) => screw(x, TOP_Y, 6.4) + screw(x, BOT_Y, 6.4)).join('')}
  ${label(MAIN_X[0], 66, '2/T1', '#222', 4)}
  ${label(MAIN_X[1], 66, '4/T2', '#222', 4)}
  ${label(MAIN_X[2], 66, '6/T3', '#222', 4)}

  <!-- リセットバー（青）・形名 -->
  <rect x="84" y="30" width="16" height="10" rx="1.5" fill="url(#blue-{{uid}})" stroke="#0d3d80" stroke-width="0.7"/>
  ${label(92, 37, 'RESET', '#fff', 3)}
  <text x="84" y="47" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#e8e8e8">TH-T25</text>
  <text x="84" y="53" font-family="sans-serif" font-size="3" fill="#ccc">H ⇄ A</text>

  <!-- 電流整定ダイヤル（つまみに整定範囲の目盛り数字。上の赤い指標に呼び電流を合わせた状態） -->
  <circle cx="112" cy="47" r="11.5" fill="#151515"/>
  <circle cx="112" cy="47" r="10" fill="url(#dial-{{uid}})" stroke="#8d8672" stroke-width="0.6"/>
  ${dialTicks(112, 47, 10)}
  <path d="M109 49.5 H115 M112 46.5 V52.5" stroke="#6a6352" stroke-width="1.5" stroke-linecap="round"/>
  <text x="112" y="44" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#222">${heater}</text>
  <text x="106" y="52.5" text-anchor="middle" font-family="sans-serif" font-size="2.7" fill="#333">${min}</text>
  <text x="118" y="52.5" text-anchor="middle" font-family="sans-serif" font-size="2.7" fill="#333">${max}</text>
  <path d="M112 37.5 L110.5 35 H113.5 Z" fill="#e33"/>
  <!-- 動作表示（手動トリップ） -->
  <rect x="85" y="57" width="8" height="8" rx="1" fill="#0b2f14" stroke="#555" stroke-width="0.5"/>
  <rect x="86.3" y="58.3" width="5.4" height="5.4" rx="0.6" fill="#2fbf4f"/>
  <rect x="104" y="60" width="11" height="5" rx="1.2" fill="#d4332a" stroke="#7d1a14" stroke-width="0.5"/>
  ${label(109.5, 70, `${heater}A`, '#eee', 3.6)}

  <!-- 補助接点 96・95（上）、98・97（下） -->
  <rect x="82" y="73" width="${W - 84}" height="${H - 75}" rx="1.5" fill="url(#ivory-{{uid}})" stroke="#9c978a" stroke-width="0.6"/>
  <rect x="101" y="73" width="1.8" height="${H - 75}" fill="#cbc6b8"/>
  ${AUX_X.map((x) => screw(x, AUX_Y, 5) + screw(x, AUX2_Y, 4.4)).join('')}
  ${label(AUX_X[0] - 7.5, 76.5, '96', '#222', 3.4)}
  ${label(AUX_X[1] + 7.5, 76.5, '95', '#222', 3.4)}
  ${label(AUX_X[0] - 7.5, 104, '98', '#222', 3.4)}
  ${label(AUX_X[1] + 7.5, 104, '97', '#222', 3.4)}
`;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.th-t25',
  name: 'サーマルリレー',
  model: 'TH-T25',
  maker: '三菱電機',
  category: 'contactor',
  description:
    '三菱電機の熱動形過負荷継電器（サーマルリレー）。S-T21 / S-T25 の二次側に直結し（単独で使う場合は取付ユニット UN-RM20）、モーターの過負荷で補助接点 95-96(b) を開き、97-98(a) を閉じる。' +
    'ヒーター呼び（整定電流範囲 0.2〜26A）をモーターの定格電流に合わせて選ぶ。上段 1/L1・3/L2・5/L3 が電源側（接触器側）、下段 2/T1・4/T2・6/T3 がモーター側。',
  labelPrefix: 'THR',
  width: W,
  height: H,
  svg: (p) => svg(Number(p.heater) || DEFAULT_HEATER),
  terminals: [
    { id: '1/L1', x: MAIN_X[0], y: TOP_Y, side: 'top', role: 'line' },
    { id: '3/L2', x: MAIN_X[1], y: TOP_Y, side: 'top', role: 'line' },
    { id: '5/L3', x: MAIN_X[2], y: TOP_Y, side: 'top', role: 'line' },
    { id: '2/T1', x: MAIN_X[0], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '4/T2', x: MAIN_X[1], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '6/T3', x: MAIN_X[2], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '96', note: 'b 接点（トリップで開）', x: AUX_X[0], y: AUX_Y, side: 'left', role: 'signal', optional: true },
    { id: '95', note: 'b 接点（トリップで開）', x: AUX_X[1], y: AUX_Y, side: 'right', role: 'signal', optional: true },
    { id: '98', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: AUX2_Y, side: 'bottom', role: 'signal', optional: true },
    { id: '97', note: 'a 接点（トリップで閉）', x: AUX_X[1], y: AUX2_Y, side: 'bottom', role: 'signal', optional: true },
  ],
  links: [
    { from: '1/L1', to: '2/T1', directed: true, protects: true },
    { from: '3/L2', to: '4/T2', directed: true, protects: true },
    { from: '5/L3', to: '6/T3', directed: true, protects: true },
    // 補助接点: 95-96 は b 接点（過負荷のトリップで開く）、97-98 は a 接点（トリップで閉じる）
    { from: '95', to: '96', switch: 'NC' },
    { from: '97', to: '98', switch: 'NO' },
  ],
  params: [
    {
      key: 'heater',
      label: 'ヒーター呼び',
      unit: 'A',
      options: HEATERS.map(([value, min, max]) => ({ value, label: `${value}A（整定 ${min}〜${max}A）` })),
      default: DEFAULT_HEATER,
    },
  ],
  protectionCurrent: { param: 'heater' },
  estimated: '補助接点 98・97 の位置（96・95 の下側）は外形図の引出線からの推定',
};

export default def;
