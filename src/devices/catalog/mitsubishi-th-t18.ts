import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 サーマルリレー（熱動形過負荷継電器）TH-T18。
 * 電磁接触器 S-T10 / S-T12 の二次側に直結して使う。外形はおよそ 幅45 × 高さ55mm（+ 上部の接続ピン）。
 * 上部の銅ピン（1/L1・3/L2・5/L3）を電磁接触器の 2/T1・4/T2・6/T3 に差し込み、下段の 2/T1・4/T2・6/T3 からモーターへ配線する。
 * 正面に青いリセットボタン、電流整定ダイヤル、動作表示窓（緑）、テストレバー、補助接点 95-96(b) / 97-98(a) がある。
 */

const W = 90;
const H = 128;

/** 上部接続ピン（一次側）の横位置と先端 */
const PIN_X = [11, 28, 45];
const PIN_Y = 5;
/** 下段 主回路端子（二次側） */
const MAIN_X = [13, 31, 49];
const BOT_Y = 112;
/** 補助接点端子 */
const AUX_X = [67, 82];
const AUX_TOP_Y = 31;

/** ヒーター呼びと整定電流範囲 [呼び, 最小, 最大]（TH-T18 ラインナップ） */
const HEATERS: [number, number, number][] = [
  [0.12, 0.1, 0.16],
  [0.17, 0.14, 0.22],
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
];
const DEFAULT_HEATER = 9;

/** ヒーター呼びに対応する整定範囲（ラインナップ外の値は呼びの ±20% 程度とする） */
const heaterRange = (h: number): [number, number] => {
  const found = HEATERS.find(([v]) => v === h);
  return found ? [found[1], found[2]] : [+(h * 0.8).toPrecision(2), +(h * 1.2).toPrecision(2)];
};

const screw = (x: number, y: number, r = 6) => `
  <circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#2e2e2e"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

const label = (x: number, y: number, text: string, fill = '#222', size = 4.8) =>
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

  <!-- 上部の接続ピン（電磁接触器の二次側端子へ差し込む） -->
  ${PIN_X.map(
    (x) => `
  <rect x="${x - 1.6}" y="${PIN_Y - 3}" width="3.2" height="${24 - PIN_Y}" rx="1" fill="url(#pin-{{uid}})" stroke="#6e3a16" stroke-width="0.4"/>
  <rect x="${x - 4.5}" y="16" width="9" height="8" rx="1.2" fill="#262626"/>`,
  ).join('')}

  <!-- 本体（黒） -->
  <rect x="1" y="22" width="${W - 2}" height="62" rx="3" fill="url(#black-{{uid}})" stroke="#111" stroke-width="0.8"/>

  <!-- 補助接点 97 / 95（上側） -->
  <rect x="58" y="23" width="31" height="20" rx="1.5" fill="url(#ivory-{{uid}})" stroke="#9c978a" stroke-width="0.6"/>
  <rect x="73.6" y="23" width="1.8" height="20" fill="#cbc6b8"/>
  ${screw(AUX_X[0], AUX_TOP_Y, 5)}
  ${screw(AUX_X[1], AUX_TOP_Y, 5)}
  ${label(AUX_X[0], 47.5, '97', '#eee', 4.4)}
  ${label(AUX_X[1], 47.5, '95', '#eee', 4.4)}

  <!-- 形名・ロゴ -->
  <g transform="translate(5 26)">
    <path d="M3 0 L4.4 2.4 L3 4.8 L1.6 2.4 Z M3 4.8 L0.2 4.8 L-1.2 7.2 L1.6 7.2 Z M3 4.8 L5.8 4.8 L7.2 7.2 L4.4 7.2 Z" fill="#e8e8e8"/>
  </g>
  <text x="14" y="31" font-family="sans-serif" font-size="5" font-weight="bold" fill="#e8e8e8">TH-T18</text>

  <!-- 手動/自動復帰の表示とリセットボタン（青） -->
  ${label(8, 44.5, 'H', '#ddd', 4)}
  ${label(22, 44.5, 'A', '#ddd', 4)}
  <rect x="4" y="47" width="22" height="17" rx="2" fill="url(#blue-{{uid}})" stroke="#0d3d80" stroke-width="0.8"/>
  <rect x="6" y="49" width="18" height="3" rx="1" fill="#79b4ff" opacity="0.6"/>
  ${label(15, 59, 'RESET', '#fff', 4)}

  <!-- 電流整定ダイヤル（つまみに整定範囲の目盛り数字。上の赤い指標に呼び電流を合わせた状態） -->
  <circle cx="43" cy="56" r="12.5" fill="#151515"/>
  <circle cx="43" cy="56" r="11" fill="url(#dial-{{uid}})" stroke="#8d8672" stroke-width="0.6"/>
  ${dialTicks(43, 56, 11)}
  <path d="M40 58.5 H46 M43 55.5 V61.5" stroke="#6a6352" stroke-width="1.6" stroke-linecap="round"/>
  <text x="43" y="52.6" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#222">${heater}</text>
  <text x="36.6" y="61.5" text-anchor="middle" font-family="sans-serif" font-size="2.9" fill="#333">${min}</text>
  <text x="49.4" y="61.5" text-anchor="middle" font-family="sans-serif" font-size="2.9" fill="#333">${max}</text>
  <path d="M43 45.5 L41.4 42.8 H44.6 Z" fill="#e33"/>
  <text x="43" y="73.5" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#eee">${heater}A</text>

  <!-- 動作表示窓（緑）とテストレバー（赤） -->
  <rect x="60" y="52" width="9" height="9" rx="1" fill="#0b2f14" stroke="#555" stroke-width="0.5"/>
  <rect x="61.5" y="53.5" width="6" height="6" rx="0.6" fill="#2fbf4f"/>
  <rect x="73" y="53" width="12" height="7" rx="1.5" fill="#d4332a" stroke="#7d1a14" stroke-width="0.5"/>
  ${label(79, 67, 'TEST', '#ddd', 3.4)}
  ${label(64.5, 67, 'TRIP', '#ddd', 3.4)}

  <!-- 下段 端子ブロック（アイボリー） -->
  <rect x="1" y="80" width="${W - 2}" height="${H - 81}" rx="2.5" fill="url(#ivory-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  <rect x="2.5" y="100" width="${W - 5}" height="25" rx="1.5" fill="#d6d1c3"/>
  ${[2.5, 22, 40, 58.5, 75, 87.5]
    .map((x) => `<rect x="${x - 1.2}" y="98" width="2.4" height="28" rx="0.8" fill="#e3dfd3" stroke="#b9b3a4" stroke-width="0.4"/>`)
    .join('')}
  ${label(MAIN_X[0], 92, '2/T1')}
  ${label(MAIN_X[1], 92, '4/T2')}
  ${label(MAIN_X[2], 92, '6/T3')}
  ${label(AUX_X[0], 92, '98')}
  ${label(AUX_X[1], 92, '96')}
  ${MAIN_X.map((x) => screw(x, BOT_Y, 6.5)).join('')}
  ${AUX_X.map((x) => screw(x, BOT_Y, 5)).join('')}
`;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.th-t18',
  name: 'サーマルリレー',
  model: 'TH-T18',
  maker: '三菱電機',
  category: 'contactor',
  description:
    '三菱電機の熱動形過負荷継電器（サーマルリレー）。S-T10 / S-T12 の二次側に直結し、モーターの過負荷で補助接点 95-96(b) を開き、97-98(a) を閉じる。ヒーター呼び（整定電流範囲）をモーターの定格電流に合わせて選ぶ。',
  labelPrefix: 'THR',
  width: W,
  height: H,
  svg: (p) => svg(Number(p.heater) || DEFAULT_HEATER),
  terminals: [
    // 一次側（上部の接続ピン）
    { id: '1/L1', hint: '一次側', x: PIN_X[0], y: PIN_Y, side: 'top', role: 'line' },
    { id: '3/L2', hint: '一次側', x: PIN_X[1], y: PIN_Y, side: 'top', role: 'line' },
    { id: '5/L3', hint: '一次側', x: PIN_X[2], y: PIN_Y, side: 'top', role: 'line' },
    // 二次側
    { id: '2/T1', hint: '二次側', x: MAIN_X[0], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '4/T2', hint: '二次側', x: MAIN_X[1], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '6/T3', hint: '二次側', x: MAIN_X[2], y: BOT_Y, side: 'bottom', role: 'load' },
    // 補助接点 97-98(a) / 95-96(b)
    { id: '97', hint: 'a 接点', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: AUX_TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '95', hint: 'b 接点', note: 'b 接点（トリップで開）', x: AUX_X[1], y: AUX_TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '98', hint: 'a 接点', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: '96', hint: 'b 接点', note: 'b 接点（トリップで開）', x: AUX_X[1], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
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
};

export default def;
