import type { DeviceDefinition } from '../types';

/**
 * IDEC 非常停止用押ボタンスイッチ XW1E-BV402MR（Φ22 取付、Φ40 キノコ形、プッシュロック・ターンリセット、2b）。
 * 左に正面から見た操作部（黄色の非常停止銘板＋赤いキノコ形ボタン）、右に背面の接点ブロック
 * （直接開路動作の b 接点 2 個。端子 21-22・41-42）を並べた概念図。縮尺は 1mm ≒ 1.5px。
 * 銘板は別売の黄色い非常停止用銘板（φ60、HWAV-27-Y など）を付けた状態で描く。
 */

const W = 210;
const H = 128;

/** 操作部（正面図）の中心 */
const CX = 62;
const CY = 64;
/** 銘板（Φ60）・キノコ頭（Φ40） */
const PLATE_R = 45;
const HEAD_R = 30;

/**
 * 接点ブロックのネジ位置。XW の端子番号は「1 桁目 = 接点の位置（上 1・左 2・下 3・右 4）、2 桁目 = 1-2 が b 接点」。
 * 2b 品は左（位置 2）と右（位置 4）に b 接点があるので 21-22 と 41-42 になる。
 */
const BLOCKS = [
  { x: 146, top: '21', bottom: '22' },
  { x: 182, top: '41', bottom: '42' },
];
const TOP_Y = 26;
const BOT_Y = 102;

const screw = (x: number, y: number, r = 5.2) => `
  <rect x="${x - r - 2}" y="${y - r - 2}" width="${2 * r + 4}" height="${2 * r + 4}" rx="1.2" fill="#c9c4b8"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.2" stroke-linecap="round"/>`;

const text = (x: number, y: number, t: string, size: number, fill = '#222', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 直接開路動作マーク（丸の中に矢印） */
const directOpening = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="4.6" fill="none" stroke="#222" stroke-width="0.8"/>
  <path d="M${x} ${y - 3.2} V${y + 2.4} M${x - 1.8} ${y + 0.4} L${x} ${y + 2.8} L${x + 1.8} ${y + 0.4}" fill="none" stroke="#222" stroke-width="0.8"/>`;

/** b 接点の図記号（縦向き） */
const ncSymbol = (x: number, y: number) => `
  <path d="M${x} ${y} V${y + 6} M${x} ${y + 18} V${y + 24} M${x - 4} ${y + 6} H${x + 1} M${x - 4} ${y + 6} L${x + 3} ${y + 19}" fill="none" stroke="#222" stroke-width="0.9"/>`;

const block = (x: number, n: number) => `
  <!-- 接点ブロック NC${n} -->
  <rect x="${x - 15}" y="12" width="30" height="104" rx="2" fill="url(#block-{{uid}})" stroke="#8f897b" stroke-width="0.8"/>
  <rect x="${x - 12}" y="40" width="24" height="48" rx="1.5" fill="#f6f3ec" stroke="#a49e90" stroke-width="0.5"/>
  ${text(x, 48, 'NC', 5.2, '#c0161b')}
  ${ncSymbol(x, 52)}
  ${directOpening(x, 82)}
  ${screw(x, TOP_Y)}
  ${screw(x, BOT_Y)}`;

const svg = `
  <defs>
    <radialGradient id="head-{{uid}}" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#ff8a7e"/>
      <stop offset="0.35" stop-color="#e3221b"/>
      <stop offset="0.85" stop-color="#a50f0c"/>
      <stop offset="1" stop-color="#6e0807"/>
    </radialGradient>
    <radialGradient id="plate-{{uid}}" cx="0.45" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#ffe65a"/>
      <stop offset="0.8" stop-color="#f7cf0a"/>
      <stop offset="1" stop-color="#d9a900"/>
    </radialGradient>
    <linearGradient id="block-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d8d3c6"/>
      <stop offset="0.2" stop-color="#ece9e0"/>
      <stop offset="0.85" stop-color="#e7e3d8"/>
      <stop offset="1" stop-color="#c8c2b4"/>
    </linearGradient>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d51"/>
      <stop offset="0.5" stop-color="#2c2e31"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
    <path id="arcTop-{{uid}}" d="M${CX - 37} ${CY} A37 37 0 0 1 ${CX + 37} ${CY}"/>
    <path id="arcBot-{{uid}}" d="M${CX - 41.5} ${CY} A41.5 41.5 0 0 0 ${CX + 41.5} ${CY}"/>
  </defs>

  <!-- 本体（パネル裏の胴部）: 操作部から接点ブロックへ -->
  <rect x="${CX + 20}" y="${CY - 18}" width="${BLOCKS[0].x - CX - 30}" height="36" rx="3" fill="url(#body-{{uid}})"/>
  <rect x="112" y="${CY - 24}" width="16" height="48" rx="2" fill="#2a2c2f" stroke="#111" stroke-width="0.6"/>
  <text x="120" y="${CY + 2}" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#aeb3b8" transform="rotate(-90 120 ${CY})">XW</text>

  <!-- 黄色の非常停止銘板（Φ60） -->
  <circle cx="${CX}" cy="${CY}" r="${PLATE_R + 1}" fill="#9a7a00"/>
  <circle cx="${CX}" cy="${CY}" r="${PLATE_R}" fill="url(#plate-{{uid}})"/>
  <text font-family="sans-serif" font-size="8" font-weight="bold" fill="#1d1d1d" letter-spacing="1">
    <textPath href="#arcTop-{{uid}}" startOffset="50%" text-anchor="middle">非常停止</textPath>
  </text>
  <text font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#1d1d1d" letter-spacing="0.4">
    <textPath href="#arcBot-{{uid}}" startOffset="50%" text-anchor="middle">EMERGENCY STOP</textPath>
  </text>

  <!-- ロックリング（ベゼル） -->
  <circle cx="${CX}" cy="${CY}" r="${HEAD_R - 6}" fill="#3a3c3f"/>

  <!-- 赤いキノコ形ボタン（Φ40） -->
  <circle cx="${CX + 1.5}" cy="${CY + 2}" r="${HEAD_R}" fill="#000" opacity="0.25"/>
  <circle cx="${CX}" cy="${CY}" r="${HEAD_R}" fill="url(#head-{{uid}})" stroke="#5a0605" stroke-width="0.8"/>
  <circle cx="${CX}" cy="${CY}" r="${HEAD_R - 5}" fill="none" stroke="#7d0a08" stroke-width="0.8" opacity="0.6"/>
  <!-- ターンリセットの矢印 -->
  <path d="M${CX - 12} ${CY - 8} A14 14 0 0 1 ${CX + 6} ${CY - 13}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>
  <path d="M${CX + 6} ${CY - 13} l-4.5 -2.6 M${CX + 6} ${CY - 13} l-3.2 3.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>
  <path d="M${CX + 12} ${CY + 8} A14 14 0 0 1 ${CX - 6} ${CY + 13}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>
  <path d="M${CX - 6} ${CY + 13} l4.5 2.6 M${CX - 6} ${CY + 13} l3.2 -3.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>
  <ellipse cx="${CX - 9}" cy="${CY - 11}" rx="10" ry="6" fill="#fff" opacity="0.28" transform="rotate(-30 ${CX - 9} ${CY - 11})"/>

  <!-- 接点ブロック（2b） -->
  ${BLOCKS.map((b, i) => block(b.x, i + 1)).join('')}
  ${BLOCKS.map((b) => text(b.x, TOP_Y + 12.5, b.top, 5) + text(b.x, BOT_Y - 8.6, b.bottom, 5)).join('')}
  ${text(164, 124, 'XW1E-BV402MR', 5, '#333', 'normal')}
`;

const def: DeviceDefinition = {
  type: 'idec.xw1e-bv402mr',
  name: '非常停止押ボタンスイッチ',
  model: 'XW1E-BV402MR 2b',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC XW シリーズの非常停止用押ボタンスイッチ（Φ22 取付、Φ40 キノコ形、プッシュロック・ターンリセット、M3 ネジ端子）。直接開路動作（IEC 60947-5-5）の b 接点（NC）21-22・41-42 の 2 回路を持ち（DC-13 30V 1A）、安全リレー・安全コントローラーの 2 チャンネル入力（例: G9SE の T11-T12 と T21-T22）にそれぞれ 1 回路ずつ接続する。' +
    '接点ブロックが外れると b 接点が開くセーフブレークアクション付き。図では接点を閉（押されていない状態）とみなす。',
  labelPrefix: 'EMG',
  width: W,
  height: H,
  svg,
  terminals: BLOCKS.flatMap((b, i) => [
    { id: b.top, label: `${b.top}（b 接点 ${i + 1}・直接開路）`, x: b.x, y: TOP_Y, side: 'top' as const, role: 'signal' as const },
    { id: b.bottom, label: `${b.bottom}（b 接点 ${i + 1}・直接開路）`, x: b.x, y: BOT_Y, side: 'bottom' as const, role: 'signal' as const },
  ]),
  links: BLOCKS.map((b) => ({ from: b.top, to: b.bottom })),
};

export default def;
