/**
 * 制御盤の電源・保護機器（スイッチング電源・トランス・ヒューズホルダ・ノイズフィルタ・SPD・盤内設備）の描画部品。
 * id には必ず {{uid}} を含める（機器ごとに置換される）。
 */

/** XML として安全な文字列にする（パラメータ値を SVG に埋め込む用） */
export const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 文字列が最大幅[px]に収まるフォントサイズ（文字幅は 1 文字 ≒ ratio × フォントサイズで概算） */
export const fitSize = (text: string, maxWidth: number, base: number, ratio = 0.62) => Math.min(base, +(maxWidth / (Math.max(1, text.length) * ratio)).toFixed(2));

/** 接地記号（⏚）。y は記号の上端 */
export const groundMark = (x: number, y: number, s = 1, stroke = '#222') => `
  <path d="M${x} ${y} V${y + 4 * s} M${x - 3.5 * s} ${y + 4 * s} H${x + 3.5 * s} M${x - 2.3 * s} ${y + 5.4 * s} H${x + 2.3 * s} M${x - 1.1 * s} ${y + 6.8 * s} H${x + 1.1 * s}" stroke="${stroke}" stroke-width="${0.8 * s}" fill="none"/>`;

/** 座金付きのネジ端子（十字ネジ）。座金の四角の色 seat、ネジの半径 r */
export const screwTerminal = (x: number, y: number, r = 5, seat = '#2b2d30') => `
  <rect x="${x - r - 1.8}" y="${y - r - 1.8}" width="${2 * r + 3.6}" height="${2 * r + 3.6}" rx="1.2" fill="${seat}"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="${Math.max(0.9, r * 0.24)}" stroke-linecap="round"/>`;

/** 表示灯（LED）のグラデーション。id: <name>-{{uid}} */
export const ledGradient = (name: string, hi: string, mid: string, dark: string) => `
    <radialGradient id="${name}-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="${hi}"/>
      <stop offset="0.5" stop-color="${mid}"/>
      <stop offset="1" stop-color="${dark}"/>
    </radialGradient>`;

/** 縦方向の陰影（上下の面の丸み）。id: <name>-{{uid}} */
export const vShade = (name: string, top: string, bottom: string) => `
    <linearGradient id="${name}-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>`;

/** 等間隔に並べた端子の x 座標（幅 width の中に n 個） */
export const spread = (width: number, n: number, margin = 0) => Array.from({ length: n }, (_, i) => +(margin + ((width - 2 * margin) * (i + 0.5)) / n).toFixed(2));
