/**
 * KEYENCE センサー類（光電・近接・ファイバ・変位・圧力・流量など）の共通部品。
 *
 * センサーのケーブルは、本体から出た黒いシースが途中で各色の芯線に分かれ、先端（棒端子）が端子になる。
 * 端子ID は IEC 60757 の色略号（BN=茶, BU=青, BK=黒, WH=白, GY=灰, PK=桃, VT=紫, GN=緑, OG=橙, YE=黄, RD=赤 など）。
 * 電源線は role 'input' + accepts（茶 = '+'、青 = '-'）、出力線・入力線は role 'signal'（signal で NPN/PNP などの種類を書く）。
 * 出力は内部経路 switch: 'output'（NPN は出力 → 0V、PNP は出力 → +V）で表す（sensorOutputLinks）。
 */
import type { AcceptSpec, ConnectorSpec, InternalLink, ParamValues, PinDef, SignalSpec, TerminalDef } from '../types';

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

/** 芯線の役割（plus / minus は電源、pass はケーブルの中継線、nc はコネクタの未使用ピン、それ以外は信号線） */
export type LeadRole = 'plus' | 'minus' | 'out' | 'in' | 'analog' | 'shield' | 'pass' | 'nc';

export interface Lead {
  /** 端子ID（省略時は色略号） */
  id?: string;
  color: WireColor;
  /** 機能（例: '+V（DC10〜30V）'、'出力（NPN）'） */
  label: string;
  role: LeadRole;
  /** 信号の種類（NPN/PNP の切換などパラメータで変わる場合は関数） */
  signal?: SignalSpec | ((p: ParamValues) => SignalSpec | undefined);
  /** 意味の説明 */
  note?: string;
}

/** 芯線（またはコネクタのピン）の電気的な項目 */
export function leadProps(l: Lead, p: ParamValues, vmin: number, vmax: number): Omit<PinDef, 'id'> {
  const acc = (cond: '+' | '-'): AcceptSpec => ({ system: 'DC', minVoltage: vmin, maxVoltage: vmax, conductors: [cond] });
  const note = l.note ? { note: l.note } : {};
  if (l.role === 'plus') return { ...note, role: 'input', accepts: acc('+') };
  if (l.role === 'minus') return { ...note, role: 'input', accepts: acc('-') };
  if (l.role === 'pass') return { ...note, role: 'pass', optional: true };
  if (l.role === 'nc') return { note: l.note ?? '未使用（何もつながない）', role: 'signal', optional: true };
  const signal = typeof l.signal === 'function' ? l.signal(p) : l.signal;
  return { ...note, role: 'signal', ...(signal ? { signal } : {}), optional: true };
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
export function sensorCable(o: CableOpts): { svg: string; terminals: (p: ParamValues) => TerminalDef[] } {
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

  const terminals = (p: ParamValues): TerminalDef[] =>
    o.leads.map((l, i) => ({
      id: l.id ?? l.color,
      label: `${WIRE_HEX[l.color].name} ${l.label}`,
      x: xs[i],
      y: o.yEnd,
      side: 'bottom' as const,
      ...leadProps(l, p, o.vmin, o.vmax),
    }));
  return { svg: s, terminals };
}

/* ------------------------------------------------------------------ */
/* 出力形式（NPN / PNP）と出力の内部経路                                */
/* ------------------------------------------------------------------ */

/** 出力形式のパラメータ値から信号の種類（'P' は PNP、それ以外は NPN） */
export const outKind = (p: ParamValues): 'npn' | 'pnp' => (p.output === 'P' ? 'pnp' : 'npn');

/** NPN / PNP 切換の制御出力 */
export const switchedOut = (p: ParamValues): SignalSpec => ({ dir: 'out', kind: outKind(p) });

/**
 * センサーの外部入力（チューニング・リセットなど）。NPN タイプは 0V と短絡して ON（内部で +V に引き上げ = プラスコモン相当）、
 * PNP タイプは +V と短絡して ON（マイナスコモン相当）。
 */
export const sensorInput = (p: ParamValues): SignalSpec => ({ dir: 'in', kind: 'dc', commonPolarity: p.output === 'P' ? '-' : '+' });

/**
 * 出力の内部経路（出力 ON で導通）。NPN は出力 → 0V、PNP は出力 → +V。
 * outs は出力線（ピン）の ID、rated は 1 点の定格電流[A]（不明なら undefined）。
 */
export const sensorOutputLinks =
  (outs: string[], rated: number | undefined, power: { plus: string; minus: string } = { plus: 'BN', minus: 'BU' }, kind: (p: ParamValues) => 'npn' | 'pnp' = outKind) =>
  (p: ParamValues): InternalLink[] =>
    outs.map((o) => ({ from: o, to: kind(p) === 'pnp' ? power.plus : power.minus, switch: 'output', ...(rated !== undefined ? { ratedCurrent: rated } : {}) }));

/* ------------------------------------------------------------------ */
/* M8 / M12 コネクタ                                                    */
/* ------------------------------------------------------------------ */

/** M12 / M8 4 ピン（A コード）のセンサー用コネクタ。ピン 1 茶・2 白・3 青・4 黒（IEC 60947-5-2 の標準線色） */
export const roundConnector = (size: 'M12' | 'M8', extra: Partial<ConnectorSpec> = {}): ConnectorSpec => ({
  kind: `${size}-4`,
  pins: 4,
  width: size === 'M12' ? 20 : 14,
  style: 'round',
  pinColors: { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black' },
  ...extra,
});

/** 4 ピンコネクタのピン番号順の芯線色 */
export const ROUND_PIN_COLORS: WireColor[] = ['BN', 'WH', 'BU', 'BK'];

/** コネクタのピン定義（leads はピン 1 から順に並べる） */
export const leadPins =
  (cn: string, leads: Lead[], vmin: number, vmax: number) =>
  (p: ParamValues): PinDef[] =>
    leads.map((l, i) => ({ id: `${cn}#${i + 1}`, label: `${i + 1} ${l.label}`, ...leadProps(l, p, vmin, vmax) }));

/**
 * センサー側の丸形コネクタ（オス）を正面から見た姿。cx, cy は中心、r は外周の半径。ピン 4 本（1 左上・2 右上・3 右下・4 左下）と中央のキー。
 */
export function roundReceptacle(cx: number, cy: number, r = 9.5) {
  const pins = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
    .map(([dx, dy]) => `<circle cx="${+(cx + dx * r * 0.33).toFixed(2)}" cy="${+(cy + dy * r * 0.33).toFixed(2)}" r="${+(r * 0.11).toFixed(2)}" fill="#e2bf55" stroke="#8a6d1c" stroke-width="0.3"/>`)
    .join('');
  return `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.6"/>
  ${Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12;
    return `<line x1="${+(cx + r * 0.84 * Math.cos(a)).toFixed(2)}" y1="${+(cy + r * 0.84 * Math.sin(a)).toFixed(2)}" x2="${+(cx + r * 0.98 * Math.cos(a)).toFixed(2)}" y2="${+(cy + r * 0.98 * Math.sin(a)).toFixed(2)}" stroke="#8d9297" stroke-width="0.4"/>`;
  }).join('')}
  <circle cx="${cx}" cy="${cy}" r="${+(r * 0.72).toFixed(2)}" fill="#2a2b2e" stroke="#0a0a0b" stroke-width="0.5"/>
  <circle cx="${cx}" cy="${cy}" r="${+(r * 0.6).toFixed(2)}" fill="#3a3c40"/>
  ${pins}
  <rect x="${+(cx - r * 0.08).toFixed(2)}" y="${+(cy - r * 0.68).toFixed(2)}" width="${+(r * 0.16).toFixed(2)}" height="${+(r * 0.16).toFixed(2)}" fill="#2a2b2e"/>`;
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

/**
 * M12 / M8 コネクタに差したケーブルのプラグ（ストレート型、下向き）。cx, y はプラグの上端（ローレットナット）。
 * 返り値の y1 がケーブルの出口。
 */
export function cablePlug(cx: number, y: number, size: 'M12' | 'M8' = 'M12') {
  const nw = size === 'M12' ? 15 : 11;
  const bw = size === 'M12' ? 12 : 9;
  const knurl = Array.from({ length: Math.floor(nw / 2) }, (_, i) => `<line x1="${+(cx - nw / 2 + 1.5 + i * 2).toFixed(2)}" y1="${y + 0.8}" x2="${+(cx - nw / 2 + 1.5 + i * 2).toFixed(2)}" y2="${y + 7.2}" stroke="#7a7f84" stroke-width="0.5"/>`).join('');
  return {
    svg: `
  <rect x="${cx - nw / 2}" y="${y}" width="${nw}" height="8" rx="1.2" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.5"/>
  ${knurl}
  <path d="M${cx - bw / 2} ${y + 8} H${cx + bw / 2} V${y + 24} L${cx + bw / 2 - 2.5} ${y + 30} H${cx - bw / 2 + 2.5} L${cx - bw / 2} ${y + 24} Z" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.5"/>
  ${[12, 15, 18, 21].map((d) => `<line x1="${cx - bw / 2}" y1="${y + d}" x2="${cx + bw / 2}" y2="${y + d}" stroke="#3a3c3f" stroke-width="0.6"/>`).join('')}
  <text x="${cx}" y="${y + 28}" text-anchor="middle" font-family="sans-serif" font-size="2.6" fill="#9a9da2">${size}</text>`,
    y1: y + 30,
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

/* ------------------------------------------------------------------ */
/* センサー本体の丸形コネクタ（オス）・ケーブル付コネクタ                 */
/* ------------------------------------------------------------------ */

/**
 * センサー本体から突き出た丸形コネクタ（オス、M8 / M12 のネジ部）を描く。cx, y は本体との境目の中心。
 * dir は突き出る向き（'down' は下、'right' は右）。返り値の tip がコネクタの先端（端子位置）。
 */
export function roundMale(cx: number, y: number, size: 'M8' | 'M12', dir: 'down' | 'right' = 'down') {
  const collarW = size === 'M12' ? 16 : 12;
  const t = size === 'M12' ? 13 : 9;
  const L = size === 'M12' ? 12 : 9;
  const threads = Array.from({ length: Math.floor(L / 1.8) }, (_, i) => {
    const ty = +(y + 4.2 + i * 1.8).toFixed(2);
    return `<line x1="${cx - t / 2}" y1="${ty}" x2="${cx + t / 2}" y2="${+(ty + 0.8).toFixed(2)}" stroke="#7d8287" stroke-width="0.45"/>`;
  }).join('');
  const body = `
  <rect x="${cx - collarW / 2}" y="${y}" width="${collarW}" height="3" rx="0.8" fill="#2a2b2e" stroke="#0a0a0b" stroke-width="0.4"/>
  <rect x="${cx - t / 2}" y="${y + 3}" width="${t}" height="${L}" rx="0.6" fill="url(#rmale-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  ${threads}`;
  const defs = `
  <defs>
    <linearGradient id="rmale-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.4" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
  </defs>`;
  const len = 3 + L;
  if (dir === 'right') {
    return {
      svg: `${defs}<g transform="rotate(-90 ${cx} ${y})">${body}</g>
  <text x="${cx + len / 2}" y="${y - t / 2 - 1.5}" text-anchor="middle" font-family="sans-serif" font-size="3" fill="#444">${size}</text>`,
      tip: { x: cx + len, y },
    };
  }
  return {
    svg: `${defs}${body}
  <text x="${cx + t / 2 + 1.5}" y="${y + len - 1}" font-family="sans-serif" font-size="3" fill="#444">${size}</text>`,
    tip: { x: cx, y: y + len },
  };
}

/** センサーのケーブル（黒いシース）を (x0, y0) から (x1, y1) まで下向きの曲線で描く */
export function sheathPath(x0: number, y0: number, x1: number, y1: number, w = 6.5) {
  const my = (y0 + y1) / 2;
  const d = `M${x0} ${y0} C${x0} ${my} ${x1} ${my} ${x1} ${y1}`;
  return `
  <path d="${d}" fill="none" stroke="#0e0e0f" stroke-width="${w + 1.4}" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="#2b2c2e" stroke-width="${w}" stroke-linecap="round"/>`;
}

/**
 * ケーブルの先に付いた丸形コネクタ（オス、下向き）。cx, y は樹脂モールドの上端（ケーブルの入口）。
 * 返り値の tip がコネクタの先端（端子位置）。
 */
export function pigtailMale(cx: number, y: number, size: 'M8' | 'M12' = 'M12') {
  const bw = size === 'M12' ? 12 : 9;
  const bodyL = size === 'M12' ? 22 : 16;
  const ridges = Array.from({ length: Math.floor((bodyL - 8) / 2.4) }, (_, i) => {
    const ry = +(y + 6 + i * 2.4).toFixed(2);
    return `<line x1="${cx - bw / 2}" y1="${ry}" x2="${cx + bw / 2}" y2="${ry}" stroke="#3a3c3f" stroke-width="0.7"/>`;
  }).join('');
  const male = roundMale(cx, y + bodyL + 2.5, size);
  return {
    svg: `
  <path d="M${cx - bw / 2 + 2} ${y} H${cx + bw / 2 - 2} L${cx + bw / 2} ${y + 5} V${y + bodyL} H${cx - bw / 2} V${y + 5} Z" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.5"/>
  ${ridges}
  <rect x="${cx - bw / 2 - 1}" y="${y + bodyL}" width="${bw + 2}" height="2.5" rx="0.6" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.4"/>
  ${male.svg}`,
    tip: male.tip,
  };
}

/** センサーの形状・出力などの選択肢（params の model）から表示用の情報を引く */
export function pick<T extends { code: string }>(list: T[], code: number | string | undefined): T {
  return list.find((m) => m.code === String(code)) ?? list[0];
}
