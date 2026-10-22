import type { DeviceDefinition } from '../types';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

/**
 * オムロン ソリッドステート・リレー G3NA-210B（入力 DC5〜24V、出力 AC24〜240V 10A、ネジ取付け）。
 * 上から見た姿（43 × 58mm、1mm ≒ 2px）。上の辺に出力端子 1・2、下の辺に入力端子 4(−)・3(+) が並ぶ。
 *
 * 出典: オムロン G3NA データシート（Terminal Arrangement / Dimensions）:
 *   出力 1（左上）・2（右上）は極性なし、入力 4(−)（左下）・3(+)（右下）
 *   入力: 定格 DC5〜24V、使用電圧 DC4〜32V、入力電流 7mA 以下（定電流）
 *   出力: 定格負荷電圧 AC24〜240V（AC19〜264V）、負荷電流 0.1〜10A（放熱器付き。放熱器なしは 4A）
 */

const W = 86;
const H = 116;
const LX = 18;
const RX = 68;
const OUT_Y = 18;
const IN_Y = 98;

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a4d51"/>
      <stop offset="1" stop-color="#202224"/>
    </linearGradient>
    <linearGradient id="base-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9cdd1"/>
      <stop offset="1" stop-color="#8d9297"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>
  <!-- 取付け用の金属ベース（両端の取付け穴） -->
  <rect x="0.5" y="44" width="${W - 1}" height="28" rx="2" fill="url(#base-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  <circle cx="5" cy="58" r="3" fill="#f4f6f8" stroke="#5c6166" stroke-width="0.6"/>
  <circle cx="${W - 5}" cy="58" r="3" fill="#f4f6f8" stroke="#5c6166" stroke-width="0.6"/>
  <!-- 本体 -->
  <rect x="10" y="2" width="${W - 20}" height="${H - 4}" rx="4" fill="url(#case-{{uid}})" stroke="#0c0c0d" stroke-width="0.8"/>
  <rect x="${W / 2 - 20}" y="38" width="40" height="40" rx="2" fill="#f2f2ee" stroke="#9a9a92" stroke-width="0.5"/>
  ${text(W / 2, 47, 'OMRON', 5.6, '#1a1a1a')}
  ${text(W / 2, 55, 'G3NA-210B', 4.6, '#1a1a1a', 'normal')}
  ${text(W / 2, 62, 'OUT AC24-240V 10A', 3.2, '#333', 'normal')}
  ${text(W / 2, 68, 'IN DC5-24V', 3.2, '#333', 'normal')}
  <circle cx="${W / 2}" cy="73.5" r="2" fill="#ffd21e" stroke="#8a6d00" stroke-width="0.4"/>
  <!-- 端子カバーの仕切り -->
  <rect x="${W / 2 - 2}" y="6" width="4" height="26" rx="1" fill="#141516"/>
  <rect x="${W / 2 - 2}" y="${H - 32}" width="4" height="26" rx="1" fill="#141516"/>
  ${screw(LX, OUT_Y, 5.6, '#a9adb1')}
  ${screw(RX, OUT_Y, 5.6, '#a9adb1')}
  ${screw(LX, IN_Y, 5.6, '#a9adb1')}
  ${screw(RX, IN_Y, 5.6, '#a9adb1')}
  ${text(LX, OUT_Y + 15, '1', 6, '#f2f2f2')}
  ${text(RX, OUT_Y + 15, '2', 6, '#f2f2f2')}
  ${text(LX, IN_Y - 10, '4 −', 5.4, '#9fc2ff')}
  ${text(RX, IN_Y - 10, '3 +', 5.4, '#ff9f94')}
`;

const def: DeviceDefinition = {
  type: 'omron.g3na-210b',
  name: 'ソリッドステート・リレー',
  model: 'G3NA-210B DC5-24',
  maker: 'オムロン',
  category: 'contactor',
  description:
    'オムロンのソリッドステート・リレー G3NA-210B（ゼロクロス、入力 DC5〜24V（使用電圧 DC4〜32V、7mA 以下）、出力 AC24〜240V 0.1〜10A（放熱器付き。放熱器なしは 4A））。' +
    '入力 3(+)・4(−) を PLC の出力などで ON すると、出力 1-2 の間（極性なし）が導通する。ヒーターなどの交流負荷の開閉に使い、直流の負荷には使えない。',
  labelPrefix: 'SSR',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1', label: '1', note: '出力（AC24〜240V、極性なし）', x: LX, y: OUT_Y, side: 'top', role: 'line' },
    { id: '2', label: '2', note: '出力（AC24〜240V、極性なし）', x: RX, y: OUT_Y, side: 'top', role: 'load' },
    { id: '4', label: '4', note: '入力 −', x: LX, y: IN_Y, side: 'bottom', role: 'input', accepts: { system: 'DC', minVoltage: 4, maxVoltage: 32, conductors: ['-'] } },
    { id: '3', label: '3', note: '入力 +（DC5〜24V）', x: RX, y: IN_Y, side: 'bottom', role: 'input', accepts: { system: 'DC', minVoltage: 4, maxVoltage: 32, conductors: ['+'] } },
  ],
  // 出力は入力 ON で導通する（展開図では電磁接触器の主接点 1 極として描く）
  links: [{ from: '1', to: '2', switch: 'NO' }],
  loadCurrent: 0.007,
};

export default def;
