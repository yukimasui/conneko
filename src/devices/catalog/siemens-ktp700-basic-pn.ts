import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * シーメンス SIMATIC HMI KTP700 Basic PN（6AV2123-2GB03-0AX0。7 型ワイド TFT カラー 800×480、タッチ + ファンクションキー 8 個、PROFINET、DC24V 電源）。
 * 前面の外形 W214 × H158 mm（大型機器のため 1mm ≒ 1px）。
 *
 * 上段に正面図（濃いグレーのベゼル、操作画面のイメージ、画面の下のファンクションキー F1〜F8、SIEMENS のロゴ）、
 * 下段に背面下部のインタフェース（電源コネクタ +24V・M、機能接地、PROFINET（RJ-45）、USB）を並べた概念図。背面の並びは実機と異なる。
 * 出典: 6AV2123-2GB03-0AX0 のデータシート（DC24V、許容範囲 19.2〜28.8V、定格入力電流 230mA、消費電力 5.5W（標準）、
 *       前面 214 × 158mm、PROFINET インタフェース 1 個）
 */

const FX = 8;
const FY = 6;
const FW = 214;
const FH = 158;
const W = FW + 16;
const RY = FY + FH + 10;
const RH = 64;
const H = RY + RH + 6;
/** 7 型ワイドの有効表示エリア（約 154 × 86mm） */
const SW = 154;
const SH = 86;
/** ファンクションキー F1〜F8（画面の下） */
const KEY_Y = FY + 22 + 86 + 10;
const SX = FX + (FW - SW) / 2;
const SY = FY + 22;

const PY = RY + 44;
const POWER = [
  { id: '+24V', x: 24 },
  { id: 'M', x: 40 },
];
const FE = { x: 74, y: RY + 44 };
const LAN = { x: 118, y: RY + 44 };

const t = (x: number, y: number, s: string, size = 5, fill = '#d6d9dc', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const label = (x: number, y: number, w: number, s: string) => `<rect x="${x}" y="${y}" width="${w}" height="8" rx="1" fill="#3a3d40"/>${t(x + w / 2, y + 5.9, s, 4.6)}`;

const screw = (x: number, y: number) => `
  <rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" rx="1" fill="#101112" stroke="#333" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="4.4" fill="url(#nbscrew-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <path d="M${x - 2.6} ${y} H${x + 2.6} M${x} ${y - 2.6} V${y + 2.6}" stroke="#444" stroke-width="1"/>`;

const screen = `
  <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#f3f5f7"/>
  <rect x="${SX}" y="${SY}" width="${SW}" height="11" fill="#2f6f8f"/>
  ${t(SX + 4, SY + 8, '充填ライン', 6.4, '#ffffff', 'start', 'bold')}
  ${t(SX + SW - 4, SY + 8, 'AUTO', 5.6, '#d8f0ff', 'end', 'bold')}
  ${t(SX + 6, SY + 23, '速度', 5.6, '#333', 'start')}
  <rect x="${SX + 26}" y="${SY + 15}" width="46" height="12" rx="1.5" fill="#101418"/>
  ${t(SX + 70, SY + 25, '120 本/分', 7, '#39ff6a', 'end', 'bold')}
  ${t(SX + 6, SY + 41, '個数', 5.6, '#333', 'start')}
  <rect x="${SX + 26}" y="${SY + 33}" width="46" height="12" rx="1.5" fill="#ffffff" stroke="#7a8590" stroke-width="0.5"/>
  ${t(SX + 70, SY + 43, '4560', 8, '#00646e', 'end', 'bold')}
  ${['#2bd94f', '#f0b429', '#8d9298']
    .map((c, i) => `<circle cx="${SX + 98 + i * 20}" cy="${SY + 26}" r="7" fill="${c}" stroke="#333" stroke-width="0.5"/>${t(SX + 98 + i * 20, SY + 41, ['運転', '注意', '停止'][i], 5, '#333')}`)
    .join('')}
  ${[
    { s: '起動', c: '#3ccf5c' },
    { s: '停止', c: '#f0574d' },
    { s: '原点', c: '#5b8fe8' },
  ]
    .map((b, i) => `<rect x="${SX + 6 + i * 49}" y="${SY + SH - 26}" width="45" height="21" rx="2.5" fill="${b.c}" stroke="#333" stroke-width="0.4"/>${t(SX + 28.5 + i * 49, SY + SH - 12, b.s, 7.4, '#fff', 'middle', 'bold')}`)
    .join('')}
  <path d="M${SX} ${SY} H${SX + SW * 0.36} L${SX + SW * 0.18} ${SY + SH} H${SX} Z" fill="#fff" fill-opacity="0.08"/>`;

const svg = `
  <defs>
    <linearGradient id="nbbezel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#2c2e32"/>
    </linearGradient>
    <linearGradient id="nbrear-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4044"/>
      <stop offset="1" stop-color="#2a2c2f"/>
    </linearGradient>
    <linearGradient id="nbshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <radialGradient id="nbscrew-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
  </defs>

  <!-- ===== 正面図 ===== -->
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="4" fill="url(#nbbezel-{{uid}})" stroke="#111" stroke-width="1.1"/>
  <rect x="${FX + 3}" y="${FY + 3}" width="${FW - 6}" height="${FH - 6}" rx="3" fill="none" stroke="#6a6e73" stroke-width="0.5"/>
  ${t(FX + 10, FY + 14, 'SIEMENS', 9, '#2bb5b8', 'start', 'bold')}
  ${t(FX + FW - 10, FY + 14, 'SIMATIC HMI', 6, '#d6d9dc', 'end', 'bold')}
  <rect x="${SX - 4}" y="${SY - 4}" width="${SW + 8}" height="${SH + 8}" rx="1.5" fill="#0c0d0e" stroke="#4a4d50" stroke-width="0.5"/>
  ${screen}
  ${Array.from({ length: 8 }, (_, i) => {
    const x = SX - 2 + i * ((SW + 4) / 8) + 1;
    const w = (SW + 4) / 8 - 2;
    return `<rect x="${x.toFixed(1)}" y="${KEY_Y}" width="${w.toFixed(1)}" height="12" rx="1.5" fill="#5b5f65" stroke="#1d1f22" stroke-width="0.6"/>${t(+(x + w / 2).toFixed(1), KEY_Y + 8.4, `F${i + 1}`, 5, '#f0f2f4', 'middle', 'bold')}`;
  }).join('')}
  ${t(FX + 10, FY + FH - 8, 'KTP700 Basic PN', 5, '#b9bdc2', 'start', 'bold')}

  <!-- ===== 背面下部のインタフェース（概念図） ===== -->
  <rect x="${FX}" y="${RY}" width="${FW}" height="${RH}" rx="4" fill="url(#nbrear-{{uid}})" stroke="#0e0f10" stroke-width="1"/>
  ${t(FX + 5, RY + 8, '背面 インタフェース', 5, '#9aa0a6', 'start')}
  ${label(12, RY + 14, 40, 'X80 DC24V')}
  ${t(POWER[0].x, RY + 30, '+24V', 5, '#e2e5e8', 'middle', 'bold')}
  ${t(POWER[1].x, RY + 30, 'M', 5, '#e2e5e8', 'middle', 'bold')}
  <rect x="${POWER[0].x - 9}" y="${PY - 9}" width="34" height="18" rx="1.5" fill="#1b1c1e" stroke="#000" stroke-width="0.8"/>
  ${POWER.map((p) => screw(p.x, PY)).join('')}
  ${label(FE.x - 12, RY + 14, 24, 'FE')}
  ${t(FE.x, RY + 30, '⏚', 6, '#e2e5e8', 'middle', 'bold')}
  ${screw(FE.x, FE.y)}
  ${label(LAN.x - 22, RY + 14, 44, 'X1 PROFINET')}
  <rect x="${LAN.x - 12}" y="${LAN.y - 11}" width="24" height="21" rx="1" fill="url(#nbshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <path d="M${LAN.x - 9} ${LAN.y - 8} H${LAN.x + 9} V${LAN.y + 4} H${LAN.x + 4} V${LAN.y + 7} H${LAN.x - 4} V${LAN.y + 4} H${LAN.x - 9} Z" fill="#111"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${LAN.x - 7 + i * 1.9}" y="${LAN.y - 7}" width="1" height="4" fill="#c9a43a"/>`).join('')}
  ${label(156, RY + 14, 30, 'X61 USB')}
  <rect x="164" y="${RY + 38}" width="14" height="7" rx="0.8" fill="url(#nbshield-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="166" y="${RY + 40}" width="10" height="2.4" fill="#1a1a1a"/>
`;

const acc = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8, conductors: [c] });

const terminals: TerminalDef[] = [
  { id: '+24V', label: '+24V DC', hint: '電源+', x: POWER[0].x, y: PY, side: 'bottom', role: 'input', accepts: acc('+') },
  { id: 'M', label: 'M (0V)', hint: '電源 0V', x: POWER[1].x, y: PY, side: 'bottom', role: 'input', accepts: acc('-') },
  { id: 'FE', label: '⏚ 機能接地', hint: '機能接地', x: FE.x, y: FE.y, side: 'bottom', role: 'ground' },
  {
    id: 'X1',
    label: 'X1 PROFINET (RJ45)',
    note: 'PROFINET（10/100Mbps）。S7-1200・S7-1500 などの PLC と LAN ケーブルでつなぐ',
    x: LAN.x,
    y: LAN.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 22, length: 19, facing: 'front', protocols: ['ethernet', 'profinet'] },
    optional: true,
  },
];

const def: DeviceDefinition = {
  type: 'siemens.ktp700-basic-pn',
  name: 'タッチパネルディスプレイ',
  model: 'KTP700 Basic PN',
  maker: 'シーメンス',
  category: 'control',
  description:
    'シーメンス SIMATIC HMI KTP700 Basic PN（6AV2123-2GB03-0AX0）。7 型ワイド TFT カラー（800×480）のタッチパネルと、画面の下のファンクションキー F1〜F8。電源は DC24V（19.2〜28.8V）を背面の電源コネクタ（X80）の +24V・M に入れ、機能接地をとる。定格入力電流 230mA（消費電力 5.5W 標準）。PROFINET ポート（X1、RJ-45）で S7-1200・S7-1500 などの PLC とつなぐ。USB（X61）。TIA Portal（WinCC Basic）で画面を作る。図の下段は背面のインタフェースの概念図（並びは実機と異なる）。',
  estimated: '背面のインタフェースの並び（概念図）と機能接地の端子の位置',
  labelPrefix: 'HMI',
  width: W,
  height: H,
  svg,
  terminals,
  loadCurrent: 0.23,
};

export default def;
