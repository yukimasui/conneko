/**
 * 盤の計器（交流電流計・交流電圧計）と計器用の切換スイッチ（AS・VS）の描画部品。
 * id には必ず {{uid}} を含める（機器ごとに置換される）。
 *
 * 計器は扉に付ける角形 80mm の可動鉄片形の指示計器を、見やすさのため 1mm ≒ 1.5px に縮小して正面から描く。
 * 端子は実物では背面にあるため、正面の下に「背面端子」の帯を描いてそこに置く。
 */
import { SCREW_GRADIENT } from './parts';
import { screwTerminal } from './power-parts';

/** 目盛りの数字の並び（最大値から 5 等分程度の切りのよい値） */
export function scaleTicks(max: number): number[] {
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200];
  const step = steps.find((s) => max / s <= 6 && Number.isInteger(max / s)) ?? max / 5;
  return Array.from({ length: Math.round(max / step) + 1 }, (_, i) => +(i * step).toFixed(2));
}

/**
 * 角形の指示計器の正面（四角い枠・白い目盛り板・黒い指針）。size は枠の一辺[px]。
 * unit は単位の記号（'A'・'V'）、max は目盛りの最大値、note は目盛り板の下の小さな文字（'CT 100/5A' など）
 */
export function meterFace(size: number, unit: string, max: number, note: string, value = 0.62): string {
  const c = size / 2;
  const cy = size * 0.66;
  const r = size * 0.42;
  const ticks = scaleTicks(max);
  // 目盛りは左 135° から右 45°（90° の扇形）
  const ang = (f: number) => ((-135 + 90 * f) * Math.PI) / 180;
  const pt = (f: number, rr: number) => [c + Math.cos(ang(f)) * rr, cy + Math.sin(ang(f)) * rr] as const;
  const minor = Array.from({ length: (ticks.length - 1) * 5 + 1 }, (_, i) => i / ((ticks.length - 1) * 5));
  const [ax, ay] = pt(0, r);
  const [bx, by] = pt(1, r);
  const [nx, ny] = pt(value, r * 1.02);
  return `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#16181b"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="3" fill="url(#bezel-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <rect x="${size * 0.07}" y="${size * 0.07}" width="${size * 0.86}" height="${size * 0.86}" rx="2" fill="#fbfaf5" stroke="#777" stroke-width="0.6"/>
  <path d="M${ax.toFixed(2)} ${ay.toFixed(2)} A${r} ${r} 0 0 1 ${bx.toFixed(2)} ${by.toFixed(2)}" fill="none" stroke="#222" stroke-width="0.9"/>
  ${(() => {
    // 定格（目盛りの 1/1.2 程度）から上を赤い帯にする
    const [rx1, ry1] = pt(1 / 1.2, r + 2.5);
    const [rx2, ry2] = pt(1, r + 2.5);
    return `<path d="M${rx1.toFixed(2)} ${ry1.toFixed(2)} A${r + 2.5} ${r + 2.5} 0 0 1 ${rx2.toFixed(2)} ${ry2.toFixed(2)}" fill="none" stroke="#d32f2f" stroke-width="2.2"/>`;
  })()}
  ${minor
    .map((f, i) => {
      const major = i % 5 === 0;
      const [x1, y1] = pt(f, r);
      const [x2, y2] = pt(f, r - (major ? 5 : 2.6));
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#222" stroke-width="${major ? 0.9 : 0.5}"/>`;
    })
    .join('')}
  ${ticks
    .map((t, i) => {
      const [x, y] = pt(i / (ticks.length - 1), r - 10);
      return `<text x="${x.toFixed(2)}" y="${(y + 2).toFixed(2)}" text-anchor="middle" font-family="sans-serif" font-size="${size * 0.065}" font-weight="bold" fill="#222">${t}</text>`;
    })
    .join('')}
  <text x="${c}" y="${cy - r * 0.32}" text-anchor="middle" font-family="sans-serif" font-size="${size * 0.13}" font-weight="bold" fill="#222">${unit}</text>
  <text x="${c}" y="${cy + size * 0.13}" text-anchor="middle" font-family="sans-serif" font-size="${size * 0.055}" fill="#444">${note}</text>
  <line x1="${c}" y1="${cy}" x2="${nx.toFixed(2)}" y2="${ny.toFixed(2)}" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="${c}" cy="${cy}" r="${size * 0.04}" fill="#222"/>
  <text x="${size * 0.12}" y="${size * 0.88}" font-family="sans-serif" font-size="${size * 0.05}" fill="#666">AC</text>
  <text x="${size * 0.88}" y="${size * 0.88}" text-anchor="end" font-family="sans-serif" font-size="${size * 0.05}" fill="#666">CLASS 2.5</text>`;
}

/** 正面の下の「背面端子」の帯と端子ネジ。y0 は帯の上端、xs は端子の x、labels は印字 */
export function rearTerminals(width: number, y0: number, h: number, xs: number[], labels: string[]): string {
  return `
  <rect x="2" y="${y0}" width="${width - 4}" height="${h}" rx="2" fill="#2f3236" stroke="#111" stroke-width="0.6"/>
  ${xs.map((x) => screwTerminal(x, y0 + h - 9, 4.2, '#1b1d20')).join('')}
  ${xs.map((x, i) => `<text x="${x}" y="${y0 + 8}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#eee">${labels[i]}</text>`).join('')}`;
}

/**
 * 切換スイッチ（カムスイッチ）の正面: 四角い銘板・黒いつまみ・位置の文字。positions は左から右の位置の名前、current はつまみの位置
 */
export function switchFace(size: number, title: string, positions: string[], current: number): string {
  const c = size / 2;
  const cy = size * 0.58;
  const r = size * 0.27;
  const span = positions.length > 1 ? 120 : 0;
  const ang = (i: number) => ((-90 - span / 2 + (span * i) / Math.max(1, positions.length - 1)) * Math.PI) / 180;
  const a = ang(current);
  return `
  <defs>
    ${SCREW_GRADIENT}
    <radialGradient id="knob-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#6a6d72"/>
      <stop offset="1" stop-color="#121315"/>
    </radialGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="3" fill="#202225" stroke="#000" stroke-width="0.8"/>
  <rect x="${size * 0.06}" y="${size * 0.06}" width="${size * 0.88}" height="${size * 0.88}" rx="2" fill="#e9e9e4" stroke="#888" stroke-width="0.6"/>
  <text x="${size * 0.12}" y="${size * 0.9}" font-family="sans-serif" font-size="${size * 0.09}" font-weight="bold" fill="#222">${title}</text>
  ${positions
    .map((p, i) => {
      const x = c + Math.cos(ang(i)) * (r + size * 0.11);
      const y = cy + Math.sin(ang(i)) * (r + size * 0.11);
      return `<text x="${x.toFixed(2)}" y="${(y + 2).toFixed(2)}" text-anchor="middle" font-family="sans-serif" font-size="${size * 0.075}" font-weight="bold" fill="#222">${p}</text>`;
    })
    .join('')}
  <circle cx="${c}" cy="${cy}" r="${r * 0.8}" fill="url(#knob-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <g transform="rotate(${((a * 180) / Math.PI + 90).toFixed(1)} ${c} ${cy})">
    <rect x="${c - size * 0.055}" y="${cy - r * 1.05}" width="${size * 0.11}" height="${r * 2.1}" rx="${size * 0.04}" fill="#1a1b1d" stroke="#000" stroke-width="0.6"/>
    <path d="M${c} ${cy - r} V${cy - r * 0.5}" stroke="#f2f2f2" stroke-width="1.6" stroke-linecap="round"/>
  </g>`;
}
