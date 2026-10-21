/**
 * KEYENCE の DIN レール取付アンプ（ファイバアンプ FS-N、レーザアンプ LV-N、変位アンプ IL、接触式 GT2 など）の共通描画。
 *
 * 側面から見た姿を描く: 黒い本体、上部の透明カバー越しに見える 2 段のデジタル表示（赤・緑）と操作ボタン、
 * 側面の銘板シール、下部の DIN レール取付部、左端にヘッド（またはファイバ）の接続部、右端からケーブルが出る。
 */

export const ampDefs = `
  <defs>
    <linearGradient id="ampbody-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34363a"/>
      <stop offset="1" stop-color="#16171a"/>
    </linearGradient>
    <linearGradient id="ampcover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fb3c4" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#3f4a55" stop-opacity="0.75"/>
    </linearGradient>
  </defs>`;

/** 7セグ風の数字表示 */
const seg = (x: number, y: number, txt: string, color: string, size: number) =>
  `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" fill="${color}" letter-spacing="0.4">${txt}</text>`;

export interface AmpOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  model: string;
  /** 表示（上段・下段） */
  top: string;
  bottom?: string;
  /** 左端の接続部（'fiber' はファイバ差込口 2 個、'head' はヘッドケーブルのコネクタ） */
  left: 'fiber' | 'head';
  /** 右上のアクセント色（FS-N は赤いカバー端） */
  accent?: string;
  /** 銘板のシリーズ名 */
  series?: string;
}

export function ampBody(o: AmpOpts) {
  const { x, y, w, h } = o;
  const ch = h * 0.42;
  const dispX = x + w * 0.3;
  return `
  <!-- DIN レール取付部 -->
  <rect x="${x + w * 0.3}" y="${y + h - 2}" width="${w * 0.42}" height="6" rx="1" fill="#55585d" stroke="#2a2c2f" stroke-width="0.6"/>
  <!-- 本体 -->
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#ampbody-{{uid}})" stroke="#060607" stroke-width="0.9"/>
  <!-- 透明カバー -->
  <path d="M${x + 4} ${y + 1} H${x + w - 6} Q${x + w - 1} ${y + 1} ${x + w - 1} ${y + 6} V${y + ch} H${x + 4} Z" fill="url(#ampcover-{{uid}})" stroke="#2a3138" stroke-width="0.6"/>
  ${o.accent ? `<rect x="${x + w - 12}" y="${y + 1}" width="11" height="5" rx="1.2" fill="${o.accent}"/>` : ''}
  <!-- 表示 -->
  <rect x="${dispX - 2}" y="${y + 3.5}" width="${w * 0.42}" height="${ch - 6}" rx="1" fill="#0b0c0d"/>
  ${seg(dispX, y + (o.bottom ? ch * 0.48 : ch * 0.72), o.top, '#ff3b30', o.bottom ? ch * 0.38 : ch * 0.6)}
  ${o.bottom ? seg(dispX, y + ch * 0.9, o.bottom, '#3cff6a', ch * 0.36) : ''}
  <!-- 操作ボタン・表示灯 -->
  <rect x="${x + w * 0.76}" y="${y + 4}" width="6" height="4" rx="1" fill="#c9ccd0"/>
  <rect x="${x + w * 0.76 + 8}" y="${y + 4}" width="6" height="4" rx="1" fill="#c9ccd0"/>
  <rect x="${x + w * 0.76}" y="${y + 10}" width="14" height="4" rx="1" fill="#8a8e93"/>
  <rect x="${x + w * 0.2}" y="${y + 5}" width="4" height="2.4" rx="0.5" fill="#ff9d2e"/>
  <rect x="${x + w * 0.2}" y="${y + 9}" width="4" height="2.4" rx="0.5" fill="#45e05f"/>
  <!-- 銘板 -->
  <rect x="${x + w * 0.38}" y="${y + ch + 4}" width="${w * 0.4}" height="${h - ch - 9}" rx="1" fill="#e9ebed" stroke="#9da1a6" stroke-width="0.4"/>
  <text x="${x + w * 0.4}" y="${y + ch + 10}" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#1d2a3a">KEYENCE</text>
  <text x="${x + w * 0.4}" y="${y + ch + 15.5}" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222">${o.model}</text>
  ${o.series ? `<text x="${x + w * 0.4}" y="${y + ch + 20.5}" font-family="sans-serif" font-size="3.2" fill="#555">${o.series}</text>` : ''}
  <!-- 左端の接続部 -->
  ${
    o.left === 'fiber'
      ? `<rect x="${x - 2}" y="${y + ch - 2}" width="10" height="${h - ch - 4}" rx="1.5" fill="#26282b" stroke="#0b0b0c" stroke-width="0.6"/>
  <circle cx="${x + 3}" cy="${y + ch + 6}" r="2.4" fill="#0a0a0a" stroke="#6b7076" stroke-width="0.5"/>
  <circle cx="${x + 3}" cy="${y + ch + 13}" r="2.4" fill="#0a0a0a" stroke="#6b7076" stroke-width="0.5"/>
  <text x="${x + 9.5}" y="${y + ch + 7.4}" font-family="sans-serif" font-size="3" fill="#c9ccd0">T</text>
  <text x="${x + 9.5}" y="${y + ch + 14.4}" font-family="sans-serif" font-size="3" fill="#c9ccd0">R</text>`
      : `<rect x="${x - 3}" y="${y + ch}" width="9" height="${h - ch - 6}" rx="1.5" fill="#4a4d52" stroke="#0b0b0c" stroke-width="0.6"/>
  <rect x="${x - 1}" y="${y + ch + 3}" width="5" height="${h - ch - 12}" rx="1" fill="#1a1b1d"/>`
  }`;
}
