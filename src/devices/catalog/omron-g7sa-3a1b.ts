import type { DeviceDefinition } from '../types';

/**
 * オムロン 強制ガイド式リレー G7SA-3A1B DC24V を表面取付ソケット P7SA-10F-ND（動作表示灯付き）に挿した状態。
 * ソケットの外形は 幅22.5 × 高さ72（上下の取付けタブ各 9mm を除く）× 奥行60.5mm（1mm ≒ 2px）。
 * 黒いソケットに M3 ネジ端子 10 個、中央右寄りに透明カバーのリレー（3A1B は青いカード）が載る。
 *
 * 端子配列（データシート J120「Terminal Arrangement/Internal Connection Diagram (Top View)」）:
 *   上段 左→右: 44 33 34 / 左列 上→下: 43 24 23 12 / 下段 左→右: 11 A2(1, −) A1(0, +)
 *   a 接点: 23-24・33-34・43-44、b 接点: 11-12（いずれかの a 接点が溶着しても b 接点は 0.5mm 以上開いたまま）
 */

const W = 46;
const H = 180;

const COL = [9, 23, 37];
const ROW_TOP = 34;
const ROW_BOT = 146;
const LEFT_ROWS = [
  { id: '43', y: 52.5 },
  { id: '24', y: 71 },
  { id: '23', y: 109 },
  { id: '12', y: 127.5 },
];

const text = (x: number, y: number, t: string, size: number, fill = '#f2f2f2', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 4.4) => `
  <rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="1" fill="#0d0d0e"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1" stroke-linecap="round"/>`;

const svg = `
  <defs>
    <linearGradient id="sock-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1c"/>
      <stop offset="0.15" stop-color="#2e3032"/>
      <stop offset="0.85" stop-color="#2a2c2e"/>
      <stop offset="1" stop-color="#161718"/>
    </linearGradient>
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9e4ea" stop-opacity="0.75"/>
      <stop offset="0.5" stop-color="#f6fbfd" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#c9d6dd" stop-opacity="0.75"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 取付けタブ（上下） -->
  <rect x="6" y="0" width="16" height="20" rx="2" fill="#202123"/>
  <circle cx="14" cy="9" r="3.6" fill="#9aa0a6" stroke="#333" stroke-width="0.5"/>
  <rect x="${W - 22}" y="${H - 20}" width="16" height="20" rx="2" fill="#202123"/>
  <circle cx="${W - 14}" cy="${H - 9}" r="3.6" fill="#9aa0a6" stroke="#333" stroke-width="0.5"/>

  <!-- ソケット本体 -->
  <rect x="0.5" y="18" width="${W - 1}" height="144" rx="2" fill="url(#sock-{{uid}})" stroke="#000" stroke-width="0.7"/>

  <!-- リレー G7SA-3A1B（透明カバー、青いカード、コイル） -->
  <rect x="16" y="44" width="28" height="92" rx="2" fill="#20406e"/>
  <rect x="18" y="48" width="24" height="56" rx="1" fill="#2f6fd0"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="20" y="${52 + i * 13}" width="20" height="4" rx="0.8" fill="#c9a43a"/>`).join('')}
  <rect x="20" y="108" width="20" height="24" rx="2" fill="#b4672c"/>
  ${Array.from({ length: 7 }, (_, i) => `<path d="M20 ${110 + i * 3.2} H40" stroke="#8a4a1c" stroke-width="0.8"/>`).join('')}
  <rect x="16" y="44" width="28" height="92" rx="2" fill="url(#cover-{{uid}})" stroke="#9fb2bd" stroke-width="0.6"/>
  ${text(30, 92, 'G7SA', 4.2, '#fff')}
  ${text(30, 98, '3A1B', 3.6, '#fff', 'middle', 'normal')}
  ${text(30, 104, 'DC24V', 3.2, '#fff', 'middle', 'normal')}

  <!-- 動作表示灯（-ND: 橙） -->
  <circle cx="9" cy="90" r="2.6" fill="#ff9a2a" stroke="#7a3a00" stroke-width="0.5"/>

  <!-- ネジ端子と端子番号 -->
  ${COL.map((x) => screw(x, ROW_TOP)).join('')}
  ${COL.map((x) => screw(x, ROW_BOT)).join('')}
  ${LEFT_ROWS.map((r) => screw(COL[0], r.y)).join('')}
  ${['44', '33', '34'].map((t, i) => text(COL[i], ROW_TOP - 8, t, 4)).join('')}
  ${['11', 'A2', 'A1'].map((t, i) => text(COL[i], ROW_BOT + 11.5, t, 4)).join('')}
  ${LEFT_ROWS.map((r) => text(COL[0], r.y + (r.id === '43' || r.id === '23' ? -7.5 : 10.5), r.id, 3.8)).join('')}
  ${text(COL[1], ROW_BOT - 8, '−', 5, '#f2f2f2')}
  ${text(COL[2], ROW_BOT - 8, '+', 5, '#f2f2f2')}
`;

const coil = { system: 'DC' as const, minVoltage: 18, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'omron.g7sa-3a1b',
  name: '強制ガイド式リレー（ソケット付き）',
  model: 'G7SA-3A1B DC24V + P7SA-10F-ND',
  maker: 'オムロン',
  category: 'contactor',
  description:
    'オムロン G7SA 強制ガイド式リレー（EN 61810-3 タイプA）3a1b、コイル DC24V（15mA、極性あり: A1 が +）。表面取付ソケット P7SA-10F-ND（動作表示灯・サージ吸収ダイオード付き）に挿した状態。接点は AC250V/DC30V 6A（DC13 24V 1A）。' +
    'a 接点 23-24・33-34・43-44、b 接点 11-12。a 接点が溶着しても b 接点は開いたままになるため、安全リレー・安全コントローラーの出力を増設するときは 11-12 を EDM（フィードバックループ）に直列に入れて溶着を検出する。図では接点を閉とみなす。',
  labelPrefix: 'CR',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '44', label: '44（a 接点）', x: COL[0], y: ROW_TOP, side: 'top', role: 'signal', optional: true },
    { id: '33', label: '33（a 接点）', x: COL[1], y: ROW_TOP, side: 'top', role: 'signal', optional: true },
    { id: '34', label: '34（a 接点）', x: COL[2], y: ROW_TOP, side: 'top', role: 'signal', optional: true },
    ...LEFT_ROWS.map((r) => ({
      id: r.id,
      label: `${r.id}（${r.id === '12' ? 'b 接点・EDM 用' : 'a 接点'}）`,
      x: COL[0],
      y: r.y,
      side: 'left' as const,
      role: 'signal' as const,
      optional: true,
    })),
    { id: '11', label: '11（b 接点・EDM 用）', x: COL[0], y: ROW_BOT, side: 'bottom', role: 'signal', optional: true },
    { id: 'A2', label: 'A2（コイル −。旧表記 1）', x: COL[1], y: ROW_BOT, side: 'bottom', role: 'input', accepts: { ...coil, conductors: ['-'] } },
    { id: 'A1', label: 'A1（コイル +。旧表記 0）', x: COL[2], y: ROW_BOT, side: 'bottom', role: 'input', accepts: { ...coil, conductors: ['+'] } },
  ],
  links: [
    { from: '23', to: '24' },
    { from: '33', to: '34' },
    { from: '43', to: '44' },
    { from: '11', to: '12' },
  ],
  // コイル 15mA ＋ 表示灯
  loadCurrent: 0.02,
};

export default def;
