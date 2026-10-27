import type { DeviceDefinition } from '../types';
import { SCREW_GRADIENT } from '../generic/parts';
import { groundMark, screwTerminal, vShade } from '../generic/power-parts';

/**
 * 盤内照明（LED、AC100〜240V）。制御盤の扉の内側・天井に付ける棒形の LED 照明。
 * アルミの本体に乳白色の拡散カバー、右端に電源の端子台（L・N・⏚）。
 * 消費電力は 4〜5W クラスの代表値（篠原電機 CLED シリーズの AC100V 時 4.5W 程度）とし、負荷電流を 0.08A とした。
 * 実物は長さ 300mm 前後あるため、見やすさを優先して縮小して描く。
 * 扉を開けたときだけ点けるには、盤用ドアスイッチ（generic.door-switch）の b 接点を L に直列に入れる。
 */

const W = 240;
const H = 70;
const TY = 52;
const TERMS = [
  { id: 'L', x: 182 },
  { id: 'N', x: 204 },
  { id: 'PE', x: 226 },
];

const svg = `
  <defs>
    ${vShade('body', '#e1e4e7', '#a7adb3')}
    <linearGradient id="diffuser-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#fbfbf3"/>
      <stop offset="1" stop-color="#e6e6da"/>
    </linearGradient>
    <radialGradient id="glow-{{uid}}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fffbe0" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fffbe0" stop-opacity="0"/>
    </radialGradient>
    ${vShade('tb', '#3a3d41', '#222428')}
    ${SCREW_GRADIENT}
  </defs>

  <!-- 本体（アルミ押出し） -->
  <rect x="2" y="8" width="${W - 4}" height="34" rx="6" fill="url(#body-{{uid}})" stroke="#7d848b" stroke-width="1"/>
  <!-- 取付の磁石・ネジ穴 -->
  <circle cx="14" cy="25" r="3.2" fill="#5b6168" stroke="#3d4247" stroke-width="0.6"/>
  <circle cx="${W - 14}" cy="25" r="3.2" fill="#5b6168" stroke="#3d4247" stroke-width="0.6"/>
  <!-- 拡散カバーと LED -->
  <rect x="24" y="12" width="${W - 48}" height="26" rx="4" fill="url(#diffuser-{{uid}})" stroke="#c9c9bd" stroke-width="0.8"/>
  ${Array.from({ length: 12 }, (_, i) => `<circle cx="${34 + i * 16}" cy="25" r="6" fill="url(#glow-{{uid}})"/><rect x="${31 + i * 16}" y="22" width="6" height="6" rx="1" fill="#fff6c8" stroke="#e5d78d" stroke-width="0.5"/>`).join('')}
  <text x="${W / 2}" y="6.5" text-anchor="middle" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#333">LED 盤内照明  AC100〜240V</text>

  <!-- 電源の端子台（右端の下） -->
  <path d="M168 42 V44" stroke="#7d848b" stroke-width="1"/>
  <rect x="168" y="42" width="${W - 170}" height="24" rx="2" fill="url(#tb-{{uid}})"/>
  ${TERMS.map((t) => screwTerminal(t.x, TY, 5, '#121416')).join('')}
  <text x="${TERMS[0].x}" y="${TY - 7}" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#e6e8ea">L</text>
  <text x="${TERMS[1].x}" y="${TY - 7}" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#e6e8ea">N</text>
  ${groundMark(TERMS[2].x, TY - 13.5, 0.85, '#e6e8ea')}
`;

const accepts = { system: 'AC' as const, minVoltage: 100, maxVoltage: 240 };

const def: DeviceDefinition = {
  type: 'generic.panel-light.led',
  name: '盤内照明（LED）',
  model: 'LED AC100〜240V 約 5W',
  category: 'load',
  description:
    '制御盤の中を照らす棒形の LED 照明（AC100〜240V、約 5W）。L・N に電源をつなぎ、金属の本体は ⏚ で接地する。扉の開閉で点灯させるときは盤用ドアスイッチの b 接点（扉を開けると閉じる）を L 側に入れる。',
  labelPrefix: 'LT',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'L', hint: 'AC入力', x: TERMS[0].x, y: TY, side: 'bottom', role: 'input', accepts },
    { id: 'N', hint: 'AC入力', x: TERMS[1].x, y: TY, side: 'bottom', role: 'input', accepts },
    { id: 'PE', label: '⏚', hint: '接地', note: '接地（金属の本体）', x: TERMS[2].x, y: TY, side: 'bottom', role: 'ground', optional: true },
  ],
  // 4〜5W クラスの代表値（AC100V 時。力率を含めて 0.08A）
  loadCurrent: 0.08,
  distinctGroups: [['L', 'N']],
  schematic: { elements: [{ kind: 'lamp', terminals: ['L', 'N'] }] },
};

export default def;
