/**
 * KEYENCE センサー類（光電・近接・ファイバ・変位・圧力・流量など）の共通部品。
 *
 * センサーのケーブルは、本体から出た黒いシースが途中で各色の芯線に分かれ、先端（棒端子）が端子になる。
 * 端子ID は IEC 60757 の色略号（BN=茶, BU=青, BK=黒, WH=白, GY=灰, PK=桃, VT=紫, GN=緑, OG=橙, YE=黄, RD=赤 など）。
 * 電源線は role 'input' + accepts（茶 = '+'、青 = '-'）、出力線・入力線は role 'signal'。
 */
import type { AcceptSpec, TerminalDef } from '../types';

export type WireColor = 'BN' | 'BU' | 'BK' | 'WH' | 'GY' | 'PK' | 'VT' | 'GN' | 'OG' | 'YE' | 'RD' | 'LB' | 'PKVT' | 'SH';

export const WIRE_HEX: Record<WireColor, { fill: string; edge: string; name: string; stripe?: string }> = {
  BN: { fill: '#8b4f24', edge: '#4e2a10', name: '茶' },
  BU: { fill: '#1f5fd6', edge: '#0f3480', name: '青' },
  BK: { fill: '#1d1d1d', edge: '#000', name: '黒' },
  WH: { fill: '#f4f4f4', edge: '#8a8a8a', name: '白' },
  GY: { fill: '#8f969e', edge: '#575c62', name: '灰' },
  PK: { fill: '#f39abb', edge: '#b0567a', name: '桃' },
  VT: { fill: '#8040b8', edge: '#4a1e72', name: '紫' },
  GN: { fill: '#2e9d3a', edge: '#17611f', name: '緑' },
  OG: { fill: '#f57c00', edge: '#a04f00', name: '橙' },
  YE: { fill: '#f2d21b', edge: '#a08a00', name: '黄' },
  RD: { fill: '#d6302c', edge: '#871a17', name: '赤' },
  LB: { fill: '#7fc8f0', edge: '#3d84ad', name: '水' },
  PKVT: { fill: '#f39abb', edge: '#b0567a', name: '桃/紫', stripe: '#8040b8' },
  SH: { fill: '#c9c9c9', edge: '#7a7a7a', name: 'シールド' },
};

export type LeadRole = 'plus' | 'minus' | 'out' | 'in' | 'analog' | 'shield';

export interface Lead {
  /** 端子ID（省略時は色略号） */
  id?: string;
  color: WireColor;
  /** 機能（例: '+V（DC10〜30V）'、'出力（NPN）'） */
  label: string;
  role: LeadRole;
}

export interface CableOpts {
  /** ケーブルの出口（本体側）の中心 */
  cx: number;
  y0: number;
  /** シースが芯線に分かれる位置 */
  yFan: number;
  /** 芯線の先端（端子位置）の Y */
  yEnd: number;
  /** 芯線の先端どうしの間隔 */
  pitch: number;
  /** 芯線の先端の中心 X（省略時は cx） */
  centerX?: number;
  leads: Lead[];
  /** 電源電圧の範囲 */
  vmin: number;
  vmax: number;
}

/** ケーブル（黒いシース）と、先端で広がる色付きの芯線を描き、端子定義を返す */
export function sensorCable(o: CableOpts): { svg: string; terminals: TerminalDef[] } {
  const n = o.leads.length;
  const cx = o.centerX ?? o.cx;
  const xs = o.leads.map((_, i) => +(cx + (i - (n - 1) / 2) * o.pitch).toFixed(2));
  const sheathW = Math.min(6 + n * 0.6, 10);
  let s = `
  <path d="M${o.cx} ${o.y0} C${o.cx} ${(o.y0 + o.yFan) / 2} ${cx} ${(o.y0 + o.yFan) / 2} ${cx} ${o.yFan}" fill="none" stroke="#0e0e0f" stroke-width="${sheathW + 1.4}" stroke-linecap="round"/>
  <path d="M${o.cx} ${o.y0} C${o.cx} ${(o.y0 + o.yFan) / 2} ${cx} ${(o.y0 + o.yFan) / 2} ${cx} ${o.yFan}" fill="none" stroke="#2b2c2e" stroke-width="${sheathW}" stroke-linecap="round"/>
  <path d="M${o.cx - sheathW * 0.25} ${o.y0 + 2} C${o.cx - sheathW * 0.25} ${(o.y0 + o.yFan) / 2} ${cx - sheathW * 0.25} ${(o.y0 + o.yFan) / 2} ${cx - sheathW * 0.25} ${o.yFan - 2}" fill="none" stroke="#55575b" stroke-width="0.8" opacity="0.6"/>`;
  const yLead = o.yEnd - 7;
  o.leads.forEach((l, i) => {
    const c = WIRE_HEX[l.color];
    const x = xs[i];
    const off = (i - (n - 1) / 2) * Math.min(1.6, sheathW / n);
    const d = `M${+(cx + off).toFixed(2)} ${o.yFan - 1} C${+(cx + off).toFixed(2)} ${o.yFan + 10} ${x} ${yLead - 14} ${x} ${yLead}`;
    s += `<path d="${d}" fill="none" stroke="${c.edge}" stroke-width="3.2" stroke-linecap="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${c.fill}" stroke-width="2.2" stroke-linecap="round"/>`;
    if (c.stripe) s += `<path d="${d}" fill="none" stroke="${c.stripe}" stroke-width="1" stroke-dasharray="2 2.5"/>`;
    // 棒端子（フェルール）
    s += `<rect x="${x - 1.6}" y="${yLead - 1}" width="3.2" height="${o.yEnd - yLead + 1}" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`;
    s += `<text x="${x}" y="${yLead - 3}" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">${c.name}</text>`;
  });
  // シースの切り口
  s += `<rect x="${cx - sheathW / 2 - 0.6}" y="${o.yFan - 3}" width="${sheathW + 1.2}" height="3" rx="0.8" fill="#1a1b1c"/>`;

  const acc = (cond: '+' | '-'): AcceptSpec => ({ system: 'DC', minVoltage: o.vmin, maxVoltage: o.vmax, conductors: [cond] });
  const terminals: TerminalDef[] = o.leads.map((l, i) => {
    const id = l.id ?? l.color;
    const label = `${WIRE_HEX[l.color].name} ${l.label}`;
    const base = { id, label, x: xs[i], y: o.yEnd, side: 'bottom' as const };
    if (l.role === 'plus') return { ...base, role: 'input', accepts: acc('+') };
    if (l.role === 'minus') return { ...base, role: 'input', accepts: acc('-') };
    return { ...base, role: 'signal', optional: true };
  });
  return { svg: s, terminals };
}

/**
 * ネジ型の近接センサ（検出面を上に向けて描く）。cx は中心、y は検出面の上端、dia は径[px]、len はネジ部の長さ[px]。
 * 検出面（樹脂キャップ）・ネジ部・ナット 2 個と歯付座金・ケーブルプロテクタを描き、ケーブル出口の Y を返す。
 */
export function proxBody(cx: number, y: number, dia: number, len: number, face = '#c8742a') {
  const r = dia / 2;
  const threads = Array.from({ length: Math.floor(len / 2.2) }, (_, i) => {
    const ty = +(y + 4 + i * 2.2).toFixed(2);
    return `<line x1="${cx - r}" y1="${ty}" x2="${cx + r}" y2="${ty + 0.8}" stroke="#8d9297" stroke-width="0.45"/>`;
  }).join('');
  const nutW = dia * 1.45;
  const nut = (ny: number) => `
  <rect x="${+(cx - nutW / 2).toFixed(2)}" y="${ny}" width="${+nutW.toFixed(2)}" height="${+(dia * 0.32).toFixed(2)}" rx="0.6" fill="url(#pxnut-{{uid}})" stroke="#5a5f64" stroke-width="0.5"/>
  <line x1="${+(cx - nutW * 0.25).toFixed(2)}" y1="${ny}" x2="${+(cx - nutW * 0.25).toFixed(2)}" y2="${+(ny + dia * 0.32).toFixed(2)}" stroke="#7b8085" stroke-width="0.4"/>
  <line x1="${+(cx + nutW * 0.25).toFixed(2)}" y1="${ny}" x2="${+(cx + nutW * 0.25).toFixed(2)}" y2="${+(ny + dia * 0.32).toFixed(2)}" stroke="#7b8085" stroke-width="0.4"/>`;
  const n1 = +(y + len * 0.28).toFixed(2);
  const n2 = +(n1 + dia * 0.32 + 1.6).toFixed(2);
  const pY = y + len;
  const pW = Math.max(dia * 0.62, 7);
  return {
    svg: `
  <defs>
    <linearGradient id="pxbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.35" stop-color="#eef0f2"/>
      <stop offset="0.7" stop-color="#b4b9be"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
    <linearGradient id="pxnut-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9aa0a6"/>
      <stop offset="0.4" stop-color="#e4e7ea"/>
      <stop offset="1" stop-color="#8a9096"/>
    </linearGradient>
  </defs>
  <rect x="${cx - r}" y="${y}" width="${dia}" height="${len}" rx="1" fill="url(#pxbody-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  ${threads}
  <rect x="${cx - r + 0.8}" y="${y - 2.4}" width="${dia - 1.6}" height="4" rx="1.4" fill="${face}" stroke="#6d3a10" stroke-width="0.5"/>
  ${nut(n1)}
  <rect x="${+(cx - nutW * 0.54).toFixed(2)}" y="${+(n1 + dia * 0.32).toFixed(2)}" width="${+(nutW * 1.08).toFixed(2)}" height="1.6" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.3"/>
  ${nut(n2)}
  <!-- ケーブルプロテクタ -->
  <rect x="${cx - pW / 2}" y="${pY}" width="${pW}" height="12" rx="1.5" fill="#222325" stroke="#0b0b0c" stroke-width="0.5"/>
  ${[2.5, 5, 7.5, 10].map((d) => `<line x1="${cx - pW / 2}" y1="${pY + d}" x2="${cx + pW / 2}" y2="${pY + d}" stroke="#3d3f42" stroke-width="0.8"/>`).join('')}
  <rect x="${cx - pW / 2 - 1}" y="${pY + 2}" width="1.2" height="3" fill="#ffb12e"/>`,
    cableY: pY + 12,
  };
}

/** 出力形式のパラメータ（NPN / PNP） */
export const OUTPUT_PARAM = {
  key: 'output',
  label: '出力形式',
  options: [
    { value: 'N', label: 'NPN' },
    { value: 'P', label: 'PNP' },
  ],
  default: 'N',
};

export const outName = (p: Record<string, number | string>) => (p.output === 'P' ? 'PNP' : 'NPN');
