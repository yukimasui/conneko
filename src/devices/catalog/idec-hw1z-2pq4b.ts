import type { DeviceDefinition } from '../types';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

/**
 * IDEC Φ22 ブザー HW1Z-2PQ4B（HW シリーズ、連続音、DC12〜24V）。
 * 左に正面から見た黒いベゼルと音の出る穴、右に裏の端子 X1・X2 を描く（1mm ≒ 1.5px）。
 *
 * 出典: IDEC HW シリーズ ブザーのデータシート（Farnell 掲載 3213148.pdf の内容。販売店の仕様表で同じ値を確認）:
 *   定格電圧 DC12〜24V（許容 DC10.8〜26.4V）、電流 9mA（DC24V、連続音）、音圧 70dB 以上（1m）、IP65
 *   端子 X1・X2 は極性なし
 * 裏の端子の位置（上 X1・下 X2）は推定。
 */

const W = 160;
const H = 128;
const CX = 48;
const CY = 62;
const BEZEL_R = 22.5;
const TX = 136;
const TOP_Y = 26;
const BOT_Y = 102;

const holes = Array.from({ length: 6 }, (_, i) => {
  const a = (i * Math.PI) / 3;
  return `<circle cx="${(CX + 9 * Math.cos(a)).toFixed(2)}" cy="${(CY + 9 * Math.sin(a)).toFixed(2)}" r="1.6" fill="#050505"/>`;
}).join('');

const svg = `
  <defs>
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a5d61"/>
      <stop offset="0.5" stop-color="#2a2c2f"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <radialGradient id="face-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#55585c"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>
  <!-- 胴部 -->
  <rect x="${CX + 16}" y="${CY - 15}" width="${TX - 15 - CX - 16}" height="30" rx="3" fill="#2c2e31"/>
  <rect x="${CX + 30}" y="${CY - 21}" width="12" height="42" rx="2" fill="#2a2c2f" stroke="#111" stroke-width="0.6"/>
  <!-- ベゼルと発音部 -->
  <circle cx="${CX + 1.2}" cy="${CY + 1.6}" r="${BEZEL_R}" fill="#000" opacity="0.22"/>
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R}" fill="url(#bezel-{{uid}})" stroke="#0c0c0d" stroke-width="0.8"/>
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R - 4}" fill="url(#face-{{uid}})" stroke="#3c3e41" stroke-width="0.6"/>
  <circle cx="${CX}" cy="${CY}" r="2.4" fill="#050505"/>
  ${holes}
  <!-- 端子部 -->
  <rect x="${TX - 15}" y="12" width="30" height="104" rx="2" fill="#2a2c2f" stroke="#0c0c0d" stroke-width="0.8"/>
  <rect x="${TX - 12}" y="40" width="24" height="48" rx="1.5" fill="#f6f3ec" stroke="#a49e90" stroke-width="0.5"/>
  ${text(TX, 49, 'BZ', 5.2, '#222')}
  ${text(TX, 57, 'DC12-24V', 3.4, '#333', 'normal')}
  <path d="M${TX - 6} 64 h4 l6 -5 v18 l-6 -5 h-4 Z" fill="none" stroke="#222" stroke-width="0.9"/>
  ${screw(TX, TOP_Y, 5, '#c9cdd1')}
  ${screw(TX, BOT_Y, 5, '#c9cdd1')}
  ${text(TX, TOP_Y + 13, 'X1', 5, '#f2f2f2')}
  ${text(TX, BOT_Y - 8.6, 'X2', 5, '#f2f2f2')}
  ${text(CX, 122, 'HW1Z-2PQ4B', 4.6, '#333', 'normal')}
`;

const ACC = { system: 'DC' as const, minVoltage: 10.8, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'idec.hw1z-2pq4b',
  name: 'ブザー',
  model: 'HW1Z-2PQ4B',
  maker: 'IDEC',
  category: 'control',
  description:
    'IDEC の Φ22 ブザー HW1Z-2PQ4B（HW シリーズ、連続音、DC12〜24V（許容 10.8〜26.4V）、9mA（DC24V）、70dB 以上（1m）、IP65）。' +
    '端子 X1・X2 は極性なし。断続音は HW1Z-F2PQ4B。裏の端子の位置は推定。',
  labelPrefix: 'BZ',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'X1', label: 'X1', note: 'ブザー電源（DC12〜24V、極性なし）', x: TX, y: TOP_Y, side: 'top', role: 'input', accepts: ACC },
    { id: 'X2', label: 'X2', note: 'ブザー電源（DC12〜24V、極性なし）', x: TX, y: BOT_Y, side: 'bottom', role: 'input', accepts: ACC },
  ],
  loadCurrent: 0.009,
  estimated: '裏の端子 X1・X2 の位置（上 X1・下 X2）は推定',
};

export default def;
