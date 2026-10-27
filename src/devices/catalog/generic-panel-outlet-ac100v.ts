import type { DeviceDefinition, ParamValues } from '../types';
import { SCREW_GRADIENT } from '../generic/parts';
import { esc, groundMark, screwTerminal, vShade } from '../generic/power-parts';

/**
 * 盤用コンセント（DIN レール取付、接地極付き 2P 15A 125V）。保守用のパソコン・測定器・工具の電源を盤内で取る。
 * 正面に国内の接地極付きコンセントの差込口（左の長い穴が接地側 W、U 字の穴が接地極）、上側に端子 L・N(W)・⏚。
 * 外形はおよそ 幅 45 × 高さ 90mm（1mm = 2px）。
 * コンセントにつなぐ機器は決まっていないので、想定する電流を params の loadCurrent で選び、上流の保護と比べる。
 */

const W = 90;
const H = 180;
const TY = 18;
const TERMS = [
  { id: 'L', x: 18, label: 'L' },
  { id: 'N', x: 45, label: 'N(W)' },
  { id: 'PE', x: 72, label: '⏚' },
];

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9c8c0"/>
      <stop offset="0.12" stop-color="#f3f2ec"/>
      <stop offset="0.88" stop-color="#efeee7"/>
      <stop offset="1" stop-color="#c3c2ba"/>
    </linearGradient>
    ${vShade('face', '#fbfbf8', '#e7e6df')}
    ${SCREW_GRADIENT}
  </defs>
  <!-- 本体 -->
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="3" fill="url(#body-{{uid}})" stroke="#8d8c84" stroke-width="1"/>
  <!-- 端子部 -->
  <rect x="3" y="3" width="${W - 6}" height="30" rx="2" fill="#3a3d41"/>
  ${TERMS.map((t) => screwTerminal(t.x, TY, 5.4, '#1b1d20')).join('')}
  <rect x="3" y="33" width="${W - 6}" height="10" fill="#f6f6f2" stroke="#a9a8a0" stroke-width="0.4"/>
  <text x="${TERMS[0].x}" y="40.6" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#222">L</text>
  <text x="${TERMS[1].x}" y="40.6" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#222">N(W)</text>
  ${groundMark(TERMS[2].x, 34.4, 0.9)}

  <!-- 差込口（接地極付き 2P） -->
  <rect x="12" y="58" width="${W - 24}" height="74" rx="8" fill="url(#face-{{uid}})" stroke="#a5a49c" stroke-width="0.8"/>
  <rect x="31" y="74" width="5" height="18" rx="1" fill="#2a2b2d"/>
  <rect x="54" y="75" width="5" height="14" rx="1" fill="#2a2b2d"/>
  <path d="M40 106 V112 A5 5 0 0 0 50 112 V106" fill="none" stroke="#2a2b2d" stroke-width="4" stroke-linecap="round"/>
  <text x="33.5" y="70" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#555">W</text>
  <text x="${W / 2}" y="127" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#555">15A 125V</text>

  <!-- 表示 -->
  <text x="${W / 2}" y="148" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#333">コンセント</text>
  <text x="${W / 2}" y="158" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#444">AC100V 接地極付</text>
  <text x="${W / 2}" y="170" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#1d3f74">想定 ${esc(p.loadCurrent)}A</text>
`;

const def: DeviceDefinition = {
  type: 'generic.panel-outlet.ac100v',
  name: '盤用コンセント',
  model: 'DINレール取付 2P 15A 125V 接地極付',
  category: 'load',
  description:
    '制御盤の中で保守用のパソコン・測定器・工具の電源を取る DIN レール取付のコンセント（接地極付き 2P 15A 125V）。L に電圧側、N(W) に接地側、⏚ に接地をつなぐ（逆につなぐと極性の誤り）。つなぐ機器の電流を想定して選ぶ。',
  labelPrefix: 'CN',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'L', hint: '電圧側', note: '電圧側（L）', x: TERMS[0].x, y: TY, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 100, maxVoltage: 125, conductors: ['L'] } },
    { id: 'N', label: 'N(W)', hint: '接地側', note: '接地側（W。差込口の長い穴）', x: TERMS[1].x, y: TY, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 100, maxVoltage: 125, conductors: ['N'] } },
    { id: 'PE', label: '⏚', hint: '接地極', note: '接地極', x: TERMS[2].x, y: TY, side: 'top', role: 'ground' },
  ],
  params: [
    {
      key: 'loadCurrent',
      label: '使う機器の電流（想定）',
      unit: 'A',
      options: [0.5, 1, 2, 3, 5, 10, 15].map((v) => ({ value: v, label: `${v}A` })),
      default: 1,
    },
  ],
  loadCurrent: { param: 'loadCurrent' },
  distinctGroups: [['L', 'N']],
};

export default def;
