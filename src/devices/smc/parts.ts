/**
 * SMC のエア機器（3 点セット・継手・速度制御・圧力スイッチ・真空機器）の描画部品と共通の定義。
 * id には必ず {{uid}} を含める（機器ごとに置換される）。
 */
import type { ParamDef, TerminalSide } from '../types';

/** 文字（sans-serif・中央ぞろえ） */
export const text = (x: number, y: number, t: string, size: number, fill = '#222', weight: 'bold' | 'normal' = 'bold', anchor = 'middle') =>
  `<text x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 小数第 2 位で丸める（SVG の座標用） */
export const r2 = (v: number) => Math.round(v * 100) / 100;

/** 圧力の表示（0.4 → '0.4'、0.45 → '0.45'） */
export const mpa = (v: number) => String(Math.round(v * 1000) / 1000);

/** ワンタッチ管継手のチューブ外径の選択肢 */
export const tubeOdParam = (key: string, label: string, ods: number[], def: number): ParamDef => ({
  key,
  label,
  unit: 'mm',
  options: ods.map((od) => ({ value: od, label: `φ${od}` })),
  default: def,
});

/** 設定圧力（レギュレータ）の選択肢: 0.1〜0.8MPa を 0.05MPa 刻み */
export const setPressureParam = (def = 0.4, max = 0.8): ParamDef => ({
  key: 'setPressure',
  label: '設定圧力',
  unit: 'MPa',
  options: Array.from({ length: Math.round((max - 0.1) / 0.05) + 1 }, (_, i) => ({ value: Math.round((0.1 + i * 0.05) * 100) / 100 })),
  default: def,
});

/** ねじの呼びの表示（'01' → 'Rc1/8'）。JIS の管用テーパめねじ */
export const RC: Record<string, string> = { M5: 'M5', '01': 'Rc1/8', '02': 'Rc1/4', '03': 'Rc3/8', '04': 'Rc1/2' };
/** おねじ（R）の表示 */
export const R_MALE: Record<string, string> = { M5: 'M5', '01': 'R1/8', '02': 'R1/4', '03': 'R3/8', '04': 'R1/2' };

/** 金属・樹脂のグラデーション（id: smc-metal-{{uid}}、smc-white-{{uid}}、smc-clear-{{uid}}、smc-knob-{{uid}}） */
export const SMC_GRADIENTS = `
    <linearGradient id="smc-metal-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eef0f2"/>
      <stop offset="0.5" stop-color="#c3c8cd"/>
      <stop offset="1" stop-color="#8d949a"/>
    </linearGradient>
    <linearGradient id="smc-white-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9dde1"/>
      <stop offset="0.18" stop-color="#fbfbfc"/>
      <stop offset="0.8" stop-color="#f1f2f4"/>
      <stop offset="1" stop-color="#c9ced3"/>
    </linearGradient>
    <linearGradient id="smc-clear-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9fb8c8" stop-opacity="0.7"/>
      <stop offset="0.25" stop-color="#eaf5fb" stop-opacity="0.35"/>
      <stop offset="0.6" stop-color="#d6e8f2" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#8aa6b8" stop-opacity="0.75"/>
    </linearGradient>
    <linearGradient id="smc-knob-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#16181a"/>
      <stop offset="0.35" stop-color="#4a4e53"/>
      <stop offset="0.7" stop-color="#2a2d30"/>
      <stop offset="1" stop-color="#101113"/>
    </linearGradient>`;

/**
 * ワンタッチ管継手（KQ2 シリーズ。白い樹脂の本体・薄い灰色の解放リング）。
 * (x, y) はチューブを差し込む口の中心（端子の位置）、side はチューブが出ていく向き、len は本体側へ伸びる長さ。
 */
export function oneTouch(x: number, y: number, side: TerminalSide, od: number, len = 12) {
  const w = Math.max(7, Math.min(12, od + 3));
  const horiz = side === 'left' || side === 'right';
  const dir = side === 'left' || side === 'top' ? 1 : -1; // 本体へ向かう向き
  const ring = 3.2;
  if (horiz) {
    const x0 = dir > 0 ? x : x - len;
    const rx = dir > 0 ? x : x - ring;
    return `
  <rect x="${r2(x0)}" y="${r2(y - w / 2)}" width="${len}" height="${w}" rx="1.4" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <rect x="${r2(rx)}" y="${r2(y - w / 2 - 1)}" width="${ring}" height="${w + 2}" rx="1" fill="#c7cbcf" stroke="#6b7177" stroke-width="0.5"/>
  <circle cx="${r2(x + dir * 0.4)}" cy="${y}" r="${r2(w * 0.28)}" fill="#3b3f43"/>`;
  }
  const y0 = dir > 0 ? y : y - len;
  const ry = dir > 0 ? y : y - ring;
  return `
  <rect x="${r2(x - w / 2)}" y="${r2(y0)}" width="${w}" height="${len}" rx="1.4" fill="url(#smc-white-{{uid}})" stroke="#7d848a" stroke-width="0.6"/>
  <rect x="${r2(x - w / 2 - 1)}" y="${r2(ry)}" width="${w + 2}" height="${ring}" rx="1" fill="#c7cbcf" stroke="#6b7177" stroke-width="0.5"/>
  <circle cx="${x}" cy="${r2(y + dir * 0.4)}" r="${r2(w * 0.28)}" fill="#3b3f43"/>`;
}

/** 圧力の値 v[MPa] の目盛りの角度（度。SVG の向き: 0° が右・90° が下）。左下 135° から右下 405° まで 270° 回る */
const dialAngle = (v: number, max: number) => 135 + (270 * Math.min(Math.max(v, 0), max)) / max;
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [r2(cx + r * Math.cos(a)), r2(cy + r * Math.sin(a))] as const;
};

/**
 * 丸形の圧力計（SMC G36・G46 の姿。目盛り 0〜max MPa、リミット表示付き）。
 * value の位置に針を描き、設定圧力の前後をリミット表示（緑）で示す。
 */
export function roundGauge(cx: number, cy: number, r: number, value: number, max = 1) {
  const ticks: string[] = [];
  const steps = Math.round(max / 0.1);
  for (let i = 0; i <= steps * 2; i++) {
    const deg = dialAngle((i * max) / (steps * 2), max);
    const major = i % 2 === 0;
    const [x1, y1] = polar(cx, cy, r * (major ? 0.66 : 0.72), deg);
    const [x2, y2] = polar(cx, cy, r * 0.8, deg);
    ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#222" stroke-width="${major ? 0.7 : 0.4}"/>`);
  }
  const nums = [0, max / 2, max]
    .map((v) => {
      const [x, y] = polar(cx, cy, r * 0.48, dialAngle(v, max));
      return text(x, y + r * 0.08, mpa(v), r2(r * 0.2), '#222', 'normal');
    })
    .join('');
  // リミット表示（設定圧力の前後 0.05MPa）
  const lo = dialAngle(value - 0.05, max);
  const hi = dialAngle(value + 0.05, max);
  const [ax, ay] = polar(cx, cy, r * 0.86, lo);
  const [bx, by] = polar(cx, cy, r * 0.86, hi);
  const zone = `<path d="M${ax} ${ay} A${r2(r * 0.86)} ${r2(r * 0.86)} 0 0 1 ${bx} ${by}" fill="none" stroke="#2ea44f" stroke-width="${r2(r * 0.1)}"/>`;
  const [nx, ny] = polar(cx, cy, r * 0.74, dialAngle(value, max));
  const [tx, ty] = polar(cx, cy, r * 0.16, dialAngle(value, max) + 180);
  return `
  <circle cx="${cx}" cy="${cy}" r="${r + 1.6}" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fdfdfb" stroke="#8d949a" stroke-width="0.4"/>
  ${zone}
  ${ticks.join('')}
  ${nums}
  ${text(cx, cy + r * 0.42, 'MPa', r2(r * 0.17), '#444', 'normal')}
  <line x1="${tx}" y1="${ty}" x2="${nx}" y2="${ny}" stroke="#c62020" stroke-width="${r2(Math.max(0.7, r * 0.06))}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${r2(r * 0.09)}" fill="#333"/>
  <circle cx="${r2(cx - r * 0.35)}" cy="${r2(cy - r * 0.4)}" r="${r2(r * 0.3)}" fill="#fff" opacity="0.35"/>`;
}

/**
 * 角形埋込形の圧力計（SMC の「E」。ボディの正面に埋め込んだ横長の窓に、扇形の目盛りと針）。
 * (cx, cy) は窓の中心、w は窓の幅。
 */
export function squareGauge(cx: number, cy: number, w: number, value: number, max = 1) {
  const h = w * 0.62;
  const pivotY = cy + h * 0.42;
  const rr = h * 0.72;
  const a = (v: number) => 215 + (110 * Math.min(Math.max(v, 0), max)) / max; // 左上 215° から右上 325° まで
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const deg = a((i * max) / 10);
    const [x1, y1] = polar(cx, pivotY, rr * (i % 5 === 0 ? 0.78 : 0.86), deg);
    const [x2, y2] = polar(cx, pivotY, rr, deg);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#222" stroke-width="${i % 5 === 0 ? 0.6 : 0.35}"/>`;
  }).join('');
  const [lx, ly] = polar(cx, pivotY, rr * 1.02, a(value - 0.05));
  const [hx, hy] = polar(cx, pivotY, rr * 1.02, a(value + 0.05));
  const [nx, ny] = polar(cx, pivotY, rr * 0.95, a(value));
  return `
  <rect x="${r2(cx - w / 2 - 1.2)}" y="${r2(cy - h / 2 - 1.2)}" width="${r2(w + 2.4)}" height="${r2(h + 2.4)}" rx="2" fill="#3a3d41"/>
  <rect x="${r2(cx - w / 2)}" y="${r2(cy - h / 2)}" width="${r2(w)}" height="${r2(h)}" rx="1.4" fill="#fdfdfb"/>
  <path d="M${lx} ${ly} A${r2(rr * 1.02)} ${r2(rr * 1.02)} 0 0 1 ${hx} ${hy}" fill="none" stroke="#2ea44f" stroke-width="1.6"/>
  ${ticks}
  ${text(r2(cx - w * 0.36), r2(cy + h * 0.38), '0', r2(h * 0.2), '#222', 'normal')}
  ${text(r2(cx + w * 0.36), r2(cy + h * 0.38), mpa(max), r2(h * 0.2), '#222', 'normal')}
  ${text(cx, r2(cy + h * 0.36), 'MPa', r2(h * 0.16), '#444', 'normal')}
  <line x1="${cx}" y1="${r2(pivotY)}" x2="${nx}" y2="${ny}" stroke="#c62020" stroke-width="0.8" stroke-linecap="round"/>`;
}

/** 流れの向きの矢印（左から右）。x1 → x2 */
export const flowArrow = (x1: number, x2: number, y: number, color = '#1f5fa8') => `
  <path d="M${r2(x1)} ${r2(y)} H${r2(x2 - 3)}" stroke="${color}" stroke-width="1.1"/>
  <path d="M${r2(x2)} ${r2(y)} l-3.6 -2.2 v4.4 Z" fill="${color}"/>`;

/** SMC のロゴ風の文字 */
export const smcLogo = (x: number, y: number, size = 5) => text(x, y, 'SMC', size, '#1f5fa8');
