import type { DeviceDefinition } from '../types';

/**
 * 表示灯（Φ22 パイロットランプ、LED DC24V）。
 * 左斜め前から見た姿で、色付きレンズとベゼル、パネル固定ナット、
 * 背面の端子ブロック（X1/X2 のネジ端子）を描く。
 * 縮尺は 1mm ≒ 2px（ベゼル外径 Φ30 程度）。
 */

const W = 120;
const H = 90;

/** 前面（レンズ）の中心 */
const FX = 30;
const FY = 45;
/** 背面端子のネジ位置 */
const TX = 104;
const X1Y = 30;
const X2Y = 60;

/** レンズ色ごとの配色（ハイライト / 本体色 / 縁の暗部 / 輪郭線） */
const LENS_COLORS: Record<string, { label: string; hi: string; mid: string; dark: string; edge: string }> = {
  red: { label: '赤', hi: '#ff9a8a', mid: '#e5221c', dark: '#8e0c0a', edge: '#6a0706' },
  green: { label: '緑', hi: '#a6ffb8', mid: '#19b33c', dark: '#0a5e1e', edge: '#063f14' },
  yellow: { label: '黄', hi: '#fff8b8', mid: '#f6c700', dark: '#a07c00', edge: '#6e5500' },
  white: { label: '白', hi: '#ffffff', mid: '#f4f1e6', dark: '#b3ae9f', edge: '#7f7a6c' },
  blue: { label: '青', hi: '#b0d4ff', mid: '#1f6fe0', dark: '#0b3a85', edge: '#072a5e' },
};

const screw = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="5" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${x - 3} ${y - 3} L${x + 3} ${y + 3} M${x + 3} ${y - 3} L${x - 3} ${y + 3}" stroke="#444" stroke-width="1"/>`;

const svg = (lensColor: string | number) => {
  const c = LENS_COLORS[String(lensColor)] ?? LENS_COLORS.red;
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2d30"/>
      <stop offset="0.35" stop-color="#5c6166"/>
      <stop offset="1" stop-color="#1c1e20"/>
    </linearGradient>
    <linearGradient id="nut-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7d8287"/>
      <stop offset="0.35" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#6a6f74"/>
    </linearGradient>
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="0.5" stop-color="#b9bec3"/>
      <stop offset="1" stop-color="#7e858c"/>
    </linearGradient>
    <radialGradient id="lens-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="${c.hi}"/>
      <stop offset="0.45" stop-color="${c.mid}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </radialGradient>
    <linearGradient id="block-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f2224"/>
      <stop offset="0.3" stop-color="#4a4f53"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </radialGradient>
  </defs>

  <!-- 胴体（パネル裏に入る円筒部） -->
  <path d="M${FX} ${FY - 21} H74 V${FY + 21} H${FX} Z" fill="url(#body-{{uid}})" stroke="#111" stroke-width="0.8"/>
  <!-- 取付ナット -->
  <path d="M44 ${FY - 25} H54 V${FY + 25} H44 Z" fill="url(#nut-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <line x1="44" y1="${FY - 12}" x2="54" y2="${FY - 12}" stroke="#666" stroke-width="0.6"/>
  <line x1="44" y1="${FY + 12}" x2="54" y2="${FY + 12}" stroke="#666" stroke-width="0.6"/>

  <!-- 端子ブロック（背面）。側面にネジ端子 X1/X2 が並ぶ -->
  <rect x="74" y="${FY - 27}" width="38" height="54" rx="2.5" fill="url(#block-{{uid}})" stroke="#111" stroke-width="0.8"/>
  <line x1="75" y1="${FY}" x2="111" y2="${FY}" stroke="#111" stroke-width="1.2"/>
  <rect x="${TX - 7}" y="${X1Y - 7}" width="14" height="14" rx="1" fill="#b9b4a4" stroke="#6b6658" stroke-width="0.6"/>
  <rect x="${TX - 7}" y="${X2Y - 7}" width="14" height="14" rx="1" fill="#b9b4a4" stroke="#6b6658" stroke-width="0.6"/>
  ${screw(TX, X1Y)}
  ${screw(TX, X2Y)}
  <text x="85" y="${X1Y + 3}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#eee">X1</text>
  <text x="85" y="${X1Y + 11}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ff7b6b">+</text>
  <text x="85" y="${X2Y + 3}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#eee">X2</text>
  <text x="85" y="${X2Y + 11}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#8ab8ff">−</text>
  <text x="64" y="${FY + 3}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#cfd3d6">DC24V</text>

  <!-- ベゼル -->
  <ellipse cx="${FX}" cy="${FY}" rx="17" ry="30" fill="url(#bezel-{{uid}})" stroke="#666" stroke-width="0.9"/>
  <ellipse cx="${FX - 1}" cy="${FY}" rx="13.5" ry="24.5" fill="#55595d"/>
  <!-- レンズ -->
  <ellipse cx="${FX - 2}" cy="${FY}" rx="12.5" ry="23" fill="url(#lens-{{uid}})" stroke="${c.edge}" stroke-width="0.6"/>
  <ellipse cx="${FX - 5}" cy="${FY - 9}" rx="4" ry="8" fill="#fff" fill-opacity="0.45"/>
  <ellipse cx="${FX - 2}" cy="${FY}" rx="7" ry="13" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="1"/>
`;
};

const def: DeviceDefinition = {
  type: 'generic.pilot-lamp.dc24v',
  name: '表示灯',
  model: 'Φ22 LED DC24V',
  category: 'control',
  description:
    'Φ22 取付の LED 表示灯（DC24V）。X1 に +24V、X2 に 0V(-) を接続する。レンズ色は params で選択する。',
  labelPrefix: 'PL',
  width: W,
  height: H,
  svg: (p) => svg(p.lensColor),
  terminals: [
    {
      id: 'X1',
      x: TX,
      y: X1Y,
      side: 'right',
      role: 'input',
      accepts: { system: 'DC', minVoltage: 21, maxVoltage: 27, conductors: ['+'] },
    },
    {
      id: 'X2',
      x: TX,
      y: X2Y,
      side: 'right',
      role: 'input',
      accepts: { system: 'DC', minVoltage: 21, maxVoltage: 27, conductors: ['-'] },
    },
  ],
  params: [
    {
      key: 'lensColor',
      label: 'レンズ色',
      options: Object.entries(LENS_COLORS).map(([value, c]) => ({ value, label: c.label })),
      default: 'red',
    },
  ],
  // LED 表示灯の代表的な定格電流（DC24V で 10〜20mA 程度）
  loadCurrent: 0.02,
  schematic: { elements: [{ kind: 'lamp', terminals: ['X1', 'X2'] }] },
};

export default def;
