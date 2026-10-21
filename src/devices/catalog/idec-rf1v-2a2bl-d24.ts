import type { DeviceDefinition } from '../types';

/**
 * IDEC フォースガイドリレー RF1V-2A2BL-D24（2a2b、LED 表示付き、コイル DC24V）を DIN レール用ソケット SF1V-4-07L に挿した状態。
 * ソケットの外形は 幅22.4 × 高さ75（上下の取付けタブ各 6.5mm を除く）× 奥行62.4mm（1mm ≒ 2px）。
 * 黒いソケットに M3 ネジ端子 10 個、中央右寄りに琥珀色の透明カバーのリレー（中に銅色のコイルが見える）が載る。
 *
 * 端子番号は 1〜10 の通し番号（カタログ EP1260「SF1V-4-07L Top View」）:
 *   上段 左→右: 10 7 8 / 左列 上→下: 9 6 5 4 / 下段 左→右: 3 2 1
 *   コイル 1(+)・2(−)、b 接点 3-4・5-6、a 接点 7-8・9-10（強制ガイド: a 接点が溶着しても b 接点は開いたまま）
 */

const W = 46;
const H = 180;

const COL = [9, 23, 37];
const ROW_TOP = 34;
const ROW_BOT = 146;
const LEFT_ROWS = [
  { id: '9', y: 52.5 },
  { id: '6', y: 71 },
  { id: '5', y: 109 },
  { id: '4', y: 127.5 },
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
      <stop offset="0" stop-color="#e8c86a" stop-opacity="0.7"/>
      <stop offset="0.5" stop-color="#fff0b8" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#d9b555" stop-opacity="0.7"/>
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

  <!-- リレー RF1V（琥珀色の透明カバー、接点部、銅色のコイル、LED） -->
  <rect x="16" y="44" width="28" height="92" rx="2" fill="#5a4a2a"/>
  <rect x="18" y="48" width="24" height="56" rx="1" fill="#8a7a55"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="20" y="${52 + i * 13}" width="20" height="4" rx="0.8" fill="#c9a43a"/>`).join('')}
  <rect x="20" y="108" width="20" height="24" rx="2" fill="#b4672c"/>
  ${Array.from({ length: 7 }, (_, i) => `<path d="M20 ${110 + i * 3.2} H40" stroke="#8a4a1c" stroke-width="0.8"/>`).join('')}
  <rect x="16" y="44" width="28" height="92" rx="2" fill="url(#cover-{{uid}})" stroke="#a08a3a" stroke-width="0.6"/>
  ${text(30, 90, 'IDEC', 4.2, '#2a2a2a')}
  ${text(30, 96, 'RF1V', 3.8, '#2a2a2a', 'middle', 'normal')}
  ${text(30, 102, '2A2BL', 3.2, '#2a2a2a', 'middle', 'normal')}
  <circle cx="38" cy="50" r="2.2" fill="#ff5a3a" stroke="#7a1a00" stroke-width="0.4"/>

  <text x="9" y="92" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#cfd2d5" transform="rotate(-90 9 92)">SF1V</text>

  <!-- ネジ端子と端子番号 -->
  ${COL.map((x) => screw(x, ROW_TOP)).join('')}
  ${COL.map((x) => screw(x, ROW_BOT)).join('')}
  ${LEFT_ROWS.map((r) => screw(COL[0], r.y)).join('')}
  ${['10', '7', '8'].map((t, i) => text(COL[i], ROW_TOP - 8, t, 4)).join('')}
  ${['3', '2', '1'].map((t, i) => text(COL[i], ROW_BOT + 11.5, t, 4)).join('')}
  ${LEFT_ROWS.map((r) => text(COL[0], r.y + (r.id === '9' || r.id === '5' ? -7.5 : 10.5), r.id, 3.8)).join('')}
  ${text(COL[1], ROW_BOT - 8, '−', 5, '#f2f2f2')}
  ${text(COL[2], ROW_BOT - 8, '+', 5, '#f2f2f2')}
`;

const coil = { system: 'DC' as const, minVoltage: 18, maxVoltage: 26.4 };

const LEFT_LABELS: Record<string, string> = {
  '9': '9（a 接点 9-10）',
  '6': '6（b 接点 5-6）',
  '5': '5（b 接点 5-6）',
  '4': '4（b 接点 3-4・EDM 用）',
};

const def: DeviceDefinition = {
  type: 'idec.rf1v-2a2bl-d24',
  name: 'フォースガイドリレー（ソケット付き）',
  model: 'RF1V-2A2BL-D24 + SF1V-4-07L',
  maker: 'IDEC',
  category: 'contactor',
  description:
    'IDEC RF1V フォースガイドリレー（EN 50205 タイプA）2a2b、LED 表示付き、コイル DC24V（約 17mA、極性あり: 1 が +）。DIN レール用ソケット SF1V-4-07L に挿した状態。接点は AC250V/DC30V 6A（DC13 24V 1A）。' +
    '端子番号は通し番号で、コイル 1(+)・2(−)、b 接点 3-4・5-6、a 接点 7-8・9-10。安全リレー・安全コントローラーの出力増設に使い、b 接点（3-4 など）を EDM（フィードバックループ）に直列に入れて溶着を検出する。図では接点を閉とみなす。',
  labelPrefix: 'CR',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '10', label: '10（a 接点 9-10）', x: COL[0], y: ROW_TOP, side: 'top', role: 'signal', optional: true },
    { id: '7', label: '7（a 接点 7-8）', x: COL[1], y: ROW_TOP, side: 'top', role: 'signal', optional: true },
    { id: '8', label: '8（a 接点 7-8）', x: COL[2], y: ROW_TOP, side: 'top', role: 'signal', optional: true },
    ...LEFT_ROWS.map((r) => ({
      id: r.id,
      label: LEFT_LABELS[r.id],
      x: COL[0],
      y: r.y,
      side: 'left' as const,
      role: 'signal' as const,
      optional: true,
    })),
    { id: '3', label: '3（b 接点 3-4・EDM 用）', x: COL[0], y: ROW_BOT, side: 'bottom', role: 'signal', optional: true },
    { id: '2', label: '2（コイル −）', x: COL[1], y: ROW_BOT, side: 'bottom', role: 'input', accepts: { ...coil, conductors: ['-'] } },
    { id: '1', label: '1（コイル +）', x: COL[2], y: ROW_BOT, side: 'bottom', role: 'input', accepts: { ...coil, conductors: ['+'] } },
  ],
  links: [
    { from: '3', to: '4' },
    { from: '5', to: '6' },
    { from: '7', to: '8' },
    { from: '9', to: '10' },
  ],
  // コイル 15mA ＋ LED 約 2mA
  loadCurrent: 0.017,
};

export default def;
