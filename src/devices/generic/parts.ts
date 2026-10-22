/**
 * 汎用の制御機器（リレー・ソケット・押しボタン・表示灯・タイマーなど）の描画部品。
 * id には必ず {{uid}} を含める（機器ごとに置換される）。
 */

/** 文字（sans-serif・中央ぞろえ） */
export const text = (x: number, y: number, t: string, size: number, fill = '#222', weight: 'bold' | 'normal' = 'bold', anchor = 'middle') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** ネジ端子（十字ネジ）。座金の四角の色 seat を変えられる */
export const screw = (x: number, y: number, r = 4.4, seat = '#0d0d0e') => `
  <rect x="${x - r - 1.6}" y="${y - r - 1.6}" width="${2 * r + 3.2}" height="${2 * r + 3.2}" rx="1" fill="${seat}"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1" stroke-linecap="round"/>`;

/** ネジの金属のグラデーション（id: screw-{{uid}}） */
export const SCREW_GRADIENT = `
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>`;

/** 横方向の陰影（樹脂の箱の側面の丸み）。id: <name>-{{uid}} */
export const sideShade = (name: string, edge: string, mid: string) => `
    <linearGradient id="${name}-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${edge}"/>
      <stop offset="0.15" stop-color="${mid}"/>
      <stop offset="0.85" stop-color="${mid}"/>
      <stop offset="1" stop-color="${edge}"/>
    </linearGradient>`;

/** a 接点の図記号（縦向き、上端 y から 24px） */
export const noSymbol = (x: number, y: number, stroke = '#222') => `
  <path d="M${x} ${y} V${y + 7} M${x} ${y + 17} V${y + 24} M${x} ${y + 7} L${x - 5} ${y + 16}" fill="none" stroke="${stroke}" stroke-width="0.9" stroke-linecap="round"/>`;

/** b 接点の図記号（縦向き、上端 y から 24px） */
export const ncSymbol = (x: number, y: number, stroke = '#222') => `
  <path d="M${x} ${y} V${y + 7} M${x} ${y + 17} V${y + 24} M${x + 4} ${y + 7} H${x - 1} M${x + 4} ${y + 7} L${x - 3} ${y + 18}" fill="none" stroke="${stroke}" stroke-width="0.9" stroke-linecap="round"/>`;

/** レンズ・ボタンの色（ハイライト / 本体色 / 縁の暗部 / 輪郭線） */
export interface Tint {
  label: string;
  /** 色の記号（表示用の既定。型式の色記号は機器ごとに決める） */
  code: string;
  hi: string;
  mid: string;
  dark: string;
  edge: string;
}

export const TINTS: Record<string, Tint> = {
  red: { label: '赤', code: 'R', hi: '#ff9a8a', mid: '#e5221c', dark: '#8e0c0a', edge: '#6a0706' },
  green: { label: '緑', code: 'G', hi: '#a6ffb8', mid: '#19b33c', dark: '#0a5e1e', edge: '#063f14' },
  yellow: { label: '黄', code: 'Y', hi: '#fff8b8', mid: '#f6c700', dark: '#a07c00', edge: '#6e5500' },
  white: { label: '白', code: 'W', hi: '#ffffff', mid: '#f1eee4', dark: '#b3ae9f', edge: '#7f7a6c' },
  blue: { label: '青', code: 'S', hi: '#b0d4ff', mid: '#1f6fe0', dark: '#0b3a85', edge: '#072a5e' },
  black: { label: '黒', code: 'B', hi: '#8a8d91', mid: '#2a2c2f', dark: '#111214', edge: '#000' },
  orange: { label: '橙', code: 'O', hi: '#ffd0a0', mid: '#f57c00', dark: '#9a4a00', edge: '#6a3300' },
};

/** 色のグラデーション（放射状、id: <name>-{{uid}}） */
export const tintGradient = (name: string, c: Tint) => `
    <radialGradient id="${name}-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="${c.hi}"/>
      <stop offset="0.45" stop-color="${c.mid}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </radialGradient>`;
