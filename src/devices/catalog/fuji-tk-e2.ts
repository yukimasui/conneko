import type { DeviceDefinition, ParamValues } from '../types';
import { FUJI_DEFS, fMark, fScrew, fText, fujiName } from '../fuji/parts';

/**
 * 富士電機 サーマルリレー（熱動形過負荷継電器）TK-E2。
 * 電磁接触器の二次側に直結して使う 3 極・2 素子以上のサーマルリレー（調整範囲 4〜54A）。
 * 上部の接続ピン（1/L1・3/L2・5/L3）を電磁接触器の 2/T1・4/T2・6/T3 に差し込み、下段の 2/T1・4/T2・6/T3 からモーターへ配線する。
 * 補助接点は 95-96（b 接点）・97-98（a 接点）。端子 ID は三菱電機 TH-T18 / TH-T25 とそろえた。
 *
 * 出典: 販売店（AutomationDirect）の富士電機のカタログ（TK-E2 の形式と調整範囲: -600 4〜6A … -5400 44〜54A、
 * 組み合わせる接触器 SC-E1〜SC-E2S）。外形・端子の位置は推定。
 */

const W = 90;
const H = 132;
const PIN_X = [15, 33, 51];
const PIN_Y = 5;
const MAIN_X = [15, 33, 51];
const BOT_Y = 116;
const AUX_X = [68, 83];
const AUX_TOP_Y = 34;

/** 形式の末尾（調整範囲の上限×100）と調整範囲 [最小, 最大] */
const RANGES: [number, number, number][] = [
  [600, 4, 6],
  [800, 5, 8],
  [900, 6, 9],
  [1100, 7, 11],
  [1300, 9, 13],
  [1800, 12, 18],
  [2600, 18, 26],
  [3600, 24, 36],
  [4200, 32, 42],
  [5000, 40, 50],
  [5400, 44, 54],
];
const DEFAULT = 18;

const rangeOf = (max: number) => RANGES.find((r) => r[2] === max) ?? RANGES[5];

const svg = (p: ParamValues) => {
  const [code, min, max] = rangeOf(Number(p.heater));
  return `
  <defs>${FUJI_DEFS}
    <linearGradient id="pin-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9a5a2c"/>
      <stop offset="0.45" stop-color="#f0b080"/>
      <stop offset="1" stop-color="#8a4c22"/>
    </linearGradient>
    <radialGradient id="dial-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c4c8cc"/>
    </radialGradient>
  </defs>
  <!-- 上部の接続ピン（電磁接触器の二次側の端子へ差し込む） -->
  ${PIN_X.map(
    (x) => `
  <rect x="${x - 1.6}" y="${PIN_Y - 3}" width="3.2" height="${26 - PIN_Y}" rx="1" fill="url(#pin-{{uid}})" stroke="#6e3a16" stroke-width="0.4"/>
  <rect x="${x - 4.5}" y="18" width="9" height="8" rx="1.2" fill="#2a2c2f"/>`,
  ).join('')}
  <!-- 本体 -->
  <rect x="1" y="24" width="${W - 2}" height="${H - 25}" rx="3" fill="url(#fbody-{{uid}})" stroke="#8d9196" stroke-width="0.9"/>
  <!-- 補助接点 97・95（上側） -->
  <rect x="58" y="25" width="31" height="20" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${fScrew(AUX_X[0], AUX_TOP_Y, 5)}
  ${fScrew(AUX_X[1], AUX_TOP_Y, 5)}
  ${fMark(AUX_X[0], 51, '97', 12)}
  ${fMark(AUX_X[1], 51, '95', 12)}
  ${fujiName(5, 32, 4)}
  ${fText(5, 41, 'TK-E2', 6, '#1b1d20', 'bold', 'start')}
  <!-- 電流整定ダイヤル・リセットボタン・テスト -->
  <circle cx="22" cy="62" r="11.5" fill="#3a3d41"/>
  <circle cx="22" cy="62" r="10" fill="url(#dial-{{uid}})" stroke="#6c7076" stroke-width="0.6"/>
  <path d="M22 54 V60" stroke="#c22" stroke-width="1.6" stroke-linecap="round"/>
  ${fText(22, 67, `${min}-${max}A`, 3.6, '#222')}
  <rect x="38" y="54" width="18" height="16" rx="2" fill="#2f5fb3" stroke="#183a75" stroke-width="0.7"/>
  ${fText(47, 64, 'RESET', 3.4, '#fff')}
  <rect x="60" y="57" width="10" height="9" rx="1" fill="#16181a" stroke="#555" stroke-width="0.5"/>
  <rect x="61.8" y="58.8" width="6.4" height="5.4" rx="0.6" fill="#f2c200"/>
  <rect x="74" y="58" width="11" height="7" rx="1.5" fill="#d4332a" stroke="#7d1a14" stroke-width="0.5"/>
  ${fText(65, 73, 'TRIP', 3.2, '#333')}
  ${fText(79.5, 73, 'TEST', 3.2, '#333')}
  ${fText(5, 85, `TK-E2-${code}`, 4.2, '#333', 'bold', 'start')}
  <!-- 下段 端子 -->
  ${MAIN_X.map((x, i) => fMark(x, 94, ['2/T1', '4/T2', '6/T3'][i], 16)).join('')}
  ${fMark(AUX_X[0], 94, '98', 12)}
  ${fMark(AUX_X[1], 94, '96', 12)}
  <rect x="3" y="101" width="${W - 6}" height="29" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${MAIN_X.map((x) => fScrew(x, BOT_Y, 6)).join('')}
  ${AUX_X.map((x) => fScrew(x, BOT_Y, 5)).join('')}
`;
};

const def: DeviceDefinition = {
  type: 'fuji.tk-e2',
  name: 'サーマルリレー',
  model: 'TK-E2',
  modelOf: (p) => `TK-E2-${rangeOf(Number(p.heater))[0]}`,
  maker: '富士電機',
  category: 'contactor',
  description:
    '富士電機の熱動形過負荷継電器（サーマルリレー）TK-E2。電磁接触器の二次側に直結し、モーターの過負荷で補助接点 95-96（b 接点）を開き、97-98（a 接点）を閉じる。' +
    '調整範囲（形式の末尾）をモーターの定格電流に合わせて選ぶ（4〜6A の TK-E2-600 から 44〜54A の TK-E2-5400 まで）。富士電機の資料では SC-E1〜SC-E2S と組み合わせる。',
  estimated: '外形と端子の位置（三菱電機 TH-T18 と同じ並びとした）は推定。',
  labelPrefix: 'THR',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1/L1', hint: '一次側', x: PIN_X[0], y: PIN_Y, side: 'top', role: 'line' },
    { id: '3/L2', hint: '一次側', x: PIN_X[1], y: PIN_Y, side: 'top', role: 'line' },
    { id: '5/L3', hint: '一次側', x: PIN_X[2], y: PIN_Y, side: 'top', role: 'line' },
    { id: '2/T1', hint: '二次側', x: MAIN_X[0], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '4/T2', hint: '二次側', x: MAIN_X[1], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '6/T3', hint: '二次側', x: MAIN_X[2], y: BOT_Y, side: 'bottom', role: 'load' },
    { id: '97', hint: 'a 接点', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: AUX_TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '95', hint: 'b 接点', note: 'b 接点（トリップで開）', x: AUX_X[1], y: AUX_TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: '98', hint: 'a 接点', note: 'a 接点（トリップで閉）', x: AUX_X[0], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: '96', hint: 'b 接点', note: 'b 接点（トリップで開）', x: AUX_X[1], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
  ],
  links: [
    { from: '1/L1', to: '2/T1', directed: true, protects: true },
    { from: '3/L2', to: '4/T2', directed: true, protects: true },
    { from: '5/L3', to: '6/T3', directed: true, protects: true },
    { from: '95', to: '96', switch: 'NC' },
    { from: '97', to: '98', switch: 'NO' },
  ],
  params: [
    {
      // 保護電流には調整範囲の上限を使う（整定はモーターの定格電流に合わせる）
      key: 'heater',
      label: '調整範囲',
      unit: 'A',
      options: RANGES.map(([code, min, max]) => ({ value: max, label: `${min}〜${max}A（TK-E2-${code}）` })),
      default: DEFAULT,
    },
  ],
  protectionCurrent: { param: 'heater' },
};

export default def;
