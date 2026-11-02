/**
 * 富士電機の機器（電磁接触器 SC・サーマルリレー TK-E・G-TWIN の遮断器）の描画で共通に使う部品。
 * id には必ず {{uid}} を含める（機器ごとに置換される）。
 *
 * 富士電機の低圧機器は明るいグレーの樹脂ケースに、濃いグレーの端子部・銘板が付く。
 * 社名の表示は文字だけにする（ロゴの図形は描かない）。
 */

/** グラデーション（本体・端子部・ネジ） */
export const FUJI_DEFS = `
    <linearGradient id="fbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9ccd0"/>
      <stop offset="0.12" stop-color="#e7e9eb"/>
      <stop offset="0.88" stop-color="#e3e5e8"/>
      <stop offset="1" stop-color="#c3c6ca"/>
    </linearGradient>
    <linearGradient id="fpocket-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5d6166"/>
      <stop offset="1" stop-color="#7a7e84"/>
    </linearGradient>
    <linearGradient id="fdark-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4e53"/>
      <stop offset="1" stop-color="#2e3135"/>
    </linearGradient>
    <radialGradient id="fscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>`;

/** 端子ネジ（座金付き +- 溝のなべねじ） */
export const fScrew = (x: number, y: number, r = 5.6) => `
  <rect x="${x - r - 1.8}" y="${y - r - 1.8}" width="${2 * r + 3.6}" height="${2 * r + 3.6}" rx="1.2" fill="#2a2c2f"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#fscrew-{{uid}})" stroke="#666" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

/** 端子記号の印字（白地の小さな枠） */
export const fMark = (x: number, y: number, t: string, w = 15) => `
  <rect x="${x - w / 2}" y="${y - 4.3}" width="${w}" height="6.8" rx="0.8" fill="#f6f7f8" stroke="#80858b" stroke-width="0.4"/>
  <text x="${x}" y="${y + 1.1}" text-anchor="middle" font-family="sans-serif" font-size="${t.length > 4 ? 3.7 : 4.3}" font-weight="bold" fill="#222">${t}</text>`;

/** 社名の表示（文字だけ） */
export const fujiName = (x: number, y: number, size = 4.2, fill = '#1f2a44', anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="bold" font-style="italic" fill="${fill}">Fuji Electric</text>`;

/** 文字 */
export const fText = (x: number, y: number, t: string, size: number, fill = '#222', weight: 'bold' | 'normal' = 'bold', anchor = 'middle') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;
