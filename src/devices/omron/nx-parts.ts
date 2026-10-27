/**
 * オムロン NX シリーズ（NX1P2 CPU ユニット・NX ユニット）の描画部品と共通の定数。
 *
 * 見た目: 本体はライトグレー、着脱式のスクリューレス・クランプ端子台（プッシュイン）はグレー。
 * 端子は電線の差込口（角穴）と、ドライバーで押す開放穴（細長い穴）が 1 組で並ぶ。
 */
import type { AcceptSpec } from '../types';

/** NX1P2 の CPU ユニットの右に NX ユニットを連結するバスの種類 */
export const NX_BUS = 'omron-nx';

/**
 * NX バスの I/O 電源（IOV / IOG）の電路の名前（busNet）。
 * NX1P2 は NX ユニットへ I/O 電源を供給しないので、増設 I/O 電源ユニット NX-PF0630 の IOV / IOG 端子から、
 * 連結した入出力ユニットの I/O 電源（画面に出さないピン）へつながる
 */
export const NX_IOV = 'NX-IOV';
export const NX_IOG = 'NX-IOG';

/** NX1P2 の電源（ユニット電源）: DC24V（20.4〜28.8V） */
export const UNIT_POWER = (c: '+' | '-'): AcceptSpec => ({ system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: [c] });

export const text = (x: number, y: number, t: string, size = 4, fill = '#2b2d30', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 共通のグラデーション */
export const nxDefs = (extra = '') => `
  <defs>
    <linearGradient id="nxbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d6d8d5"/>
      <stop offset="0.12" stop-color="#e8e9e6"/>
      <stop offset="0.88" stop-color="#e4e5e2"/>
      <stop offset="1" stop-color="#cfd1ce"/>
    </linearGradient>
    <linearGradient id="nxtb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9ea2a5"/>
      <stop offset="1" stop-color="#868a8e"/>
    </linearGradient>
    <linearGradient id="nxcover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9cbc8"/>
      <stop offset="1" stop-color="#b8bab7"/>
    </linearGradient>
    <radialGradient id="nxledg-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
    <radialGradient id="nxledy-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fff6d0"/>
      <stop offset="0.5" stop-color="#ffc21a"/>
      <stop offset="1" stop-color="#b07a00"/>
    </radialGradient>${extra}
  </defs>`;

/**
 * プッシュイン端子 1 個（電線の差込口と開放穴）。x, y は差込口の中心。
 * slot は開放穴の位置（差込口の上 'up' / 下 'down'）
 */
export function pushIn(x: number, y: number, slot: 'up' | 'down', size = 1): string {
  const w = 6.4 * size;
  const h = 5.6 * size;
  const sy = slot === 'up' ? y - h / 2 - 4.2 * size : y + h / 2 + 1.2 * size;
  return `
  <rect x="${r2(x - w / 2)}" y="${r2(y - h / 2)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(1.2 * size)}" fill="#2a2c2f" stroke="#55595d" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="${r2(1.5 * size)}" fill="#0f1011"/>
  <rect x="${r2(x - 1.8 * size)}" y="${r2(sy)}" width="${r2(3.6 * size)}" height="${r2(3 * size)}" rx="0.5" fill="#55595d" stroke="#3d4043" stroke-width="0.3"/>`;
}

/** NC（空き）端子: 差込口だけでネジ・ばねのない穴 */
export function blankHole(x: number, y: number, size = 1): string {
  const w = 6.4 * size;
  const h = 5.6 * size;
  return `<rect x="${r2(x - w / 2)}" y="${r2(y - h / 2)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(1.2 * size)}" fill="#7c8084" stroke="#6b6f73" stroke-width="0.4"/>`;
}

/** RJ-45 の差込口（正面から見た形）。cx, cy は差込口の中心 */
export function rj45(cx: number, cy: number, w = 22, h = 19): string {
  return `
  <rect x="${r2(cx - w / 2 - 1.5)}" y="${r2(cy - h / 2 - 1.5)}" width="${w + 3}" height="${h + 3}" rx="1.2" fill="#b8bcc0" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${r2(cx - w / 2)}" y="${r2(cy - h / 2)}" width="${w}" height="${h}" fill="#0c0d0e"/>
  <rect x="${r2(cx - 5)}" y="${r2(cy + h / 2 - 4.5)}" width="10" height="4.5" fill="#2a2c2f"/>
  <path d="M${r2(cx - 7)} ${r2(cy - h / 2 + 3)} H${r2(cx + 7)}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>
  <rect x="${r2(cx - w / 2 + 1)}" y="${r2(cy - h / 2 - 4.6)}" width="3.6" height="2.4" rx="0.5" fill="url(#nxledg-{{uid}})"/>
  <rect x="${r2(cx + w / 2 - 4.6)}" y="${r2(cy - h / 2 - 4.6)}" width="3.6" height="2.4" rx="0.5" fill="url(#nxledy-{{uid}})"/>`;
}

/** 表示 LED（小さな角形） */
export const led = (x: number, y: number, on = false, w = 2.6, h = 1.8) =>
  `<rect x="${r2(x - w / 2)}" y="${r2(y - h / 2)}" width="${w}" height="${h}" rx="0.4" fill="${on ? 'url(#nxledg-{{uid}})' : '#c9d2c3'}" stroke="#7d827a" stroke-width="0.3"/>`;

/** オムロンのロゴ（青の文字） */
export const omronLogo = (x: number, y: number, size: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="#1d4fa0" letter-spacing="${r2(size * 0.04)}">OMRON</text>`;

export const r2 = (n: number) => Math.round(n * 100) / 100;
