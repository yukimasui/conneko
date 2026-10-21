import type { DeviceDefinition } from '../types';

/**
 * DINレール用ネジ式端子台 6極（汎用品）。
 * 1極あたり幅約8mm のネジ式端子を6個並べ、右端にエンドプレート、両端にエンドストッパを付けた状態を表す（1mm ≒ 2px）。
 * 各極は上側 'na' と下側 'nb'（n = 1〜6）の2端子で、内部で上下がつながっている。
 */

const POLES = 6;
const PITCH = 16;
const STOPPER_W = 11;
const X0 = STOPPER_W + 1;
const END_PLATE_W = 3;
const W = X0 + POLES * PITCH + END_PLATE_W + STOPPER_W + 1;
const H = 96;

const TOP_Y = 16;
const BOT_Y = 80;
const poleX = (i: number) => X0 + PITCH * i + PITCH / 2;

const screw = (x: number, y: number, r = 5) => `
  <rect x="${x - r - 1.5}" y="${y - r - 1.5}" width="${2 * r + 3}" height="${2 * r + 3}" rx="1.2" fill="#3a3d41"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.2" stroke-linecap="round"/>`;

/** 1極分の端子（ハウジング・ネジ・マーカー） */
const pole = (i: number) => {
  const x = X0 + PITCH * i;
  const cx = poleX(i);
  return `
  <rect x="${x + 0.3}" y="3" width="${PITCH - 0.6}" height="${H - 6}" rx="1.5" fill="url(#module-{{uid}})" stroke="#80848a" stroke-width="0.6"/>
  ${screw(cx, TOP_Y)}
  ${screw(cx, BOT_Y)}
  <circle cx="${cx}" cy="${TOP_Y + 11}" r="1.2" fill="#55595e"/>
  <circle cx="${cx}" cy="${BOT_Y - 11}" r="1.2" fill="#55595e"/>
  <rect x="${x + 2}" y="38" width="${PITCH - 4}" height="20" rx="1" fill="#fafafa" stroke="#9a9ea4" stroke-width="0.5"/>
  <text x="${cx}" y="51.5" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#222">${i + 1}</text>`;
};

/** エンドストッパ（レール上で端子台を固定する部品） */
const stopper = (x: number) => `
  <rect x="${x}" y="14" width="${STOPPER_W}" height="68" rx="2" fill="url(#stopper-{{uid}})" stroke="#3f4246" stroke-width="0.6"/>
  <circle cx="${x + STOPPER_W / 2}" cy="48" r="3.4" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x + STOPPER_W / 2 - 2} 48 H${x + STOPPER_W / 2 + 2}" stroke="#444" stroke-width="1"/>`;

const svg = `
  <defs>
    <linearGradient id="module-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a9adb3"/>
      <stop offset="0.2" stop-color="#cdd0d4"/>
      <stop offset="0.8" stop-color="#c9ccd0"/>
      <stop offset="1" stop-color="#9fa3a9"/>
    </linearGradient>
    <linearGradient id="stopper-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5c6066"/>
      <stop offset="0.5" stop-color="#7b8087"/>
      <stop offset="1" stop-color="#55595e"/>
    </linearGradient>
    <linearGradient id="rail-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ebee"/>
      <stop offset="0.5" stop-color="#b4b8bd"/>
      <stop offset="1" stop-color="#d7dade"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- DINレール（35mm 幅。上下のつばだけ見える） -->
  <rect x="0" y="31" width="${W}" height="34" fill="url(#rail-{{uid}})" stroke="#8d9197" stroke-width="0.5"/>

  ${stopper(0)}
  ${Array.from({ length: POLES }, (_, i) => pole(i)).join('')}
  <!-- エンドプレート -->
  <rect x="${X0 + POLES * PITCH}" y="5" width="${END_PLATE_W}" height="${H - 10}" rx="0.8" fill="#9aa0a6" stroke="#6f747a" stroke-width="0.5"/>
  ${stopper(X0 + POLES * PITCH + END_PLATE_W + 1)}
`;

const def: DeviceDefinition = {
  type: 'generic.terminal-block.6p',
  name: '端子台',
  model: 'DINレール用ネジ式端子台 6P',
  category: 'terminal',
  description:
    'DINレールに取り付けるネジ式の中継端子台（6極）。各極の上側 1a〜6a と下側 1b〜6b が内部でつながっている。盤内外の配線の中継や渡りに使う。',
  labelPrefix: 'TB',
  width: W,
  height: H,
  svg,
  terminals: Array.from({ length: POLES }, (_, i) => [
    { id: `${i + 1}a`, x: poleX(i), y: TOP_Y, side: 'top' as const, role: 'pass' as const, optional: true },
    { id: `${i + 1}b`, x: poleX(i), y: BOT_Y, side: 'bottom' as const, role: 'pass' as const, optional: true },
  ]).flat(),
  links: Array.from({ length: POLES }, (_, i) => ({ from: `${i + 1}a`, to: `${i + 1}b` })),
};

export default def;
