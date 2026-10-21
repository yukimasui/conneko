/**
 * KEYENCE KV シリーズ（KV-8000 / KV-7000 / KV-X）の拡張ユニット・周辺機器を描くための共通部品。
 *
 * catalog/ 配下の各機器ファイル（1機器1ファイル）から使う。ここには DeviceDefinition を置かない
 * （registry は catalog/ だけを読み込む）。
 *
 * 外観の共通点（実機写真・外形寸法図より）:
 * - 本体はダークグレーの樹脂。高さ 90mm（DINレール取付部）、奥行 80mm。幅はユニットにより 23 / 29 / 36 / 54mm など。
 * - 正面上端に型式の印字と、黄緑の識別ラベル（ユニットの種類を示す帯）がある。
 * - 端子台タイプは脱着式のネジ端子台（2列の千鳥配置、上側にカバー）。コネクタタイプは MIL 規格のボックスヘッダが縦向きに付く。
 */
import type { AcceptSpec, DeviceDefinition, PinDef, TerminalDef, TerminalRole } from '../types';

/** 1mm あたりの px */
export const MM = 2;

/** KV ユニットの本体高さ（90mm） */
export const KV_H = 180;

export const text = (
  x: number,
  y: number,
  t: string,
  size = 4,
  fill = '#d8dadd',
  anchor: 'start' | 'middle' | 'end' = 'middle',
  weight: 'normal' | 'bold' = 'bold',
) =>
  `<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 共通のグラデーション定義（id は {{uid}} 付き）。extra に機器固有の定義を足せる */
export const kvDefs = (extra = '') => `
  <defs>
    <linearGradient id="kvbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1f2123"/>
      <stop offset="0.1" stop-color="#36393d"/>
      <stop offset="0.85" stop-color="#303337"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
    <linearGradient id="kvshroud-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#202124"/>
      <stop offset="0.5" stop-color="#2c2e31"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <linearGradient id="kvlever-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#45484d"/>
      <stop offset="1" stop-color="#2a2c30"/>
    </linearGradient>
    <linearGradient id="kvgreen-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b6f24a"/>
      <stop offset="1" stop-color="#78c41c"/>
    </linearGradient>
    <linearGradient id="kvtb-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2c2f"/>
      <stop offset="0.5" stop-color="#3a3d41"/>
      <stop offset="1" stop-color="#25272a"/>
    </linearGradient>
    <linearGradient id="kvcover-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34373b"/>
      <stop offset="1" stop-color="#2a2d30"/>
    </linearGradient>
    <linearGradient id="kvshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e8ea"/>
      <stop offset="1" stop-color="#8e9398"/>
    </linearGradient>
    <linearGradient id="kvorange-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff9a3c"/>
      <stop offset="1" stop-color="#d9640f"/>
    </linearGradient>
    <radialGradient id="kvpin-{{uid}}" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#b8902e"/>
    </radialGradient>
    <radialGradient id="kvscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
    <radialGradient id="kvledg-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd9"/>
      <stop offset="0.5" stop-color="#45e05f"/>
      <stop offset="1" stop-color="#17872d"/>
    </radialGradient>
    ${extra}
  </defs>`;

/**
 * ユニット本体（ダークグレーの箱、上部の型式印字と黄緑の識別ラベル、右側の連結部の影）。
 * labelW は識別ラベルの幅（省略時は本体幅の 6 割）。
 */
export function kvBody(W: number, H: number, model: string, opts: { modelSize?: number; labelW?: number; top?: number } = {}) {
  const size = opts.modelSize ?? Math.min(5.4, (W - 6) / (model.length * 0.62));
  const lw = opts.labelW ?? Math.min(W * 0.6, 40);
  const top = opts.top ?? 0;
  return `
  <rect x="1" y="${top + 1}" width="${W - 2}" height="${H - top - 2}" rx="2" fill="url(#kvbody-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <rect x="2" y="${top + 2}" width="${W - 4}" height="16" rx="1.5" fill="#26282b"/>
  ${text(W / 2, top + 8.5, model, +size.toFixed(2), '#f2f3f4')}
  <rect x="${(W - lw) / 2}" y="${top + 10.5}" width="${lw}" height="5.5" rx="0.8" fill="url(#kvgreen-{{uid}})" stroke="#4f8a12" stroke-width="0.4"/>
  <rect x="${W - 5}" y="${top + 20}" width="2" height="${H - top - 26}" fill="#000" opacity="0.25"/>`;
}

/**
 * 新しい世代のユニット（KV-SAD04 / KV-XL202 / KV-XLE02 / KV-SH04PL など）の本体。
 * 上部に一段高い表示部があり、左上に型式、右上に緑の状態表示ランプ、その下に LED が並ぶ。
 * headerH は表示部の高さ。
 */
export function kvBody2(W: number, H: number, model: string, opts: { headerH?: number; leds?: { x: number; y: number; label: string; c?: 'g' | 'r' | 'o' | 'off' }[] } = {}) {
  const hh = opts.headerH ?? 28;
  return `
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2" fill="url(#kvbody-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <rect x="2" y="2" width="${W - 7}" height="${hh}" rx="1.5" fill="#1e2022" stroke="#0e0f10" stroke-width="0.5"/>
  ${text(5, 9, model, Math.min(4.2, (W - 26) / (model.length * 0.6)), '#dfe1e3', 'start')}
  <rect x="${W - 17}" y="5" width="9" height="4" rx="0.8" fill="url(#kvgreen-{{uid}})" stroke="#4f8a12" stroke-width="0.3"/>
  ${(opts.leds ?? []).map((l) => `${led(l.x, l.y, l.c ?? 'g', 2.4, 1.8)}${text(l.x, l.y + 4.6, l.label, 2.5, '#b9bcc1', 'middle', 'normal')}`).join('')}
  <rect x="${W - 5}" y="${hh + 4}" width="2" height="${H - hh - 10}" fill="#000" opacity="0.25"/>`;
}

/**
 * プラグイン式の端子台（縦 1 列、プッシュイン/ネジ）。x, y は端子台の左上、n は極数、pitch はピッチ[px]。
 * 各端子の電線差込口（四角）を pos に返す。電線は右（side='right'）に出す想定で、端子名は左側に印字する。
 */
export function plugBlockV(opts: {
  x: number;
  y: number;
  ids: string[];
  pitch: number;
  labels?: Record<string, string>;
  w?: number;
  color?: 'black' | 'green';
  /** 端子名を印字する側（'left' なら電線は右へ、'right' なら電線は左へ出す） */
  labelSide?: 'left' | 'right';
}) {
  const { x, y, ids, pitch } = opts;
  const w = opts.w ?? 10;
  const h = ids.length * pitch + 4;
  const right = opts.labelSide === 'right';
  const fill = opts.color === 'green' ? '#2f9a4a' : '#141516';
  const stroke = opts.color === 'green' ? '#1d6a2a' : '#3a3c40';
  const pos: Record<string, { x: number; y: number; side: 'left' | 'right' }> = {};
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${+h.toFixed(2)}" rx="1" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/>`;
  ids.forEach((id, i) => {
    const cy = +(y + 2 + pitch / 2 + i * pitch).toFixed(2);
    const hx = right ? x + w * 0.38 : x + w * 0.62;
    pos[id] = right ? { x, y: cy, side: 'left' } : { x: +(x + w).toFixed(2), y: cy, side: 'right' };
    const sq = Math.min(pitch * 0.62, 4.4);
    s += `<rect x="${+(hx - sq / 2).toFixed(2)}" y="${+(cy - sq / 2).toFixed(2)}" width="${+sq.toFixed(2)}" height="${+sq.toFixed(2)}" rx="0.4" fill="#050505" stroke="#5c5f63" stroke-width="0.35"/>`;
    const bx = right ? x + w - 3 : x + 1.2;
    s += `<rect x="${+bx.toFixed(2)}" y="${+(cy - sq / 2 + 0.6).toFixed(2)}" width="1.8" height="${+(sq - 1.2).toFixed(2)}" rx="0.3" fill="${opts.color === 'green' ? '#f0a23a' : '#6c6f74'}"/>`;
    s += right
      ? text(x + w + 1.5, cy + 1.2, opts.labels?.[id] ?? id, 2.9, '#d0d3d6', 'start', 'normal')
      : text(x - 1.5, cy + 1.2, opts.labels?.[id] ?? id, 2.9, '#d0d3d6', 'end', 'normal');
  });
  return { svg: s, pos, height: h };
}

/**
 * RJ45 モジュラジャック（正面から見た差込口。ラッチ側が下）。cx, cy は差込口の中心。
 * 左上・右上に LINK/ACT 表示 LED。
 */
export function rj45(cx: number, cy: number, w = 22, h = 19) {
  return `
  <rect x="${cx - w / 2 - 1.5}" y="${cy - h / 2 - 1.5}" width="${w + 3}" height="${h + 3}" rx="1" fill="url(#kvshield-{{uid}})" stroke="#5d6166" stroke-width="0.6"/>
  <path d="M${cx - w / 2 + 1.5} ${cy - h / 2 + 1.5} H${cx + w / 2 - 1.5} V${cy + h / 2 - 5} H${cx + 4} V${cy + h / 2 - 1.5} H${cx - 4} V${cy + h / 2 - 5} H${cx - w / 2 + 1.5} Z" fill="#0b0c0d"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${+(cx - 7 + i * 1.9).toFixed(2)}" y="${cy - h / 2 + 2}" width="1" height="4" fill="#c9a43a"/>`).join('')}
  <rect x="${cx - w / 2}" y="${cy - h / 2}" width="3.6" height="2.2" fill="#4ad35a"/>
  <rect x="${cx + w / 2 - 3.6}" y="${cy - h / 2}" width="3.6" height="2.2" fill="#ffb12e"/>`;
}

/** 十字穴のネジ頭 */
export const screw = (x: number, y: number, r = 3.6) => `
  <circle cx="${+x.toFixed(2)}" cy="${+y.toFixed(2)}" r="${r}" fill="url(#kvscrew-{{uid}})" stroke="#5a5a5a" stroke-width="0.5"/>
  <path d="M${+(x - r * 0.6).toFixed(2)} ${+y.toFixed(2)} H${+(x + r * 0.6).toFixed(2)} M${+x.toFixed(2)} ${+(y - r * 0.6).toFixed(2)} V${+(y + r * 0.6).toFixed(2)}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

/** 小さな LED（色: 'g' 緑 / 'r' 赤 / 'o' 橙 / 'off' 消灯） */
export const led = (x: number, y: number, c: 'g' | 'r' | 'o' | 'off' = 'g', w = 3.2, h = 2) => {
  const fill = c === 'g' ? 'url(#kvledg-{{uid}})' : c === 'r' ? '#ff4a3d' : c === 'o' ? '#ffae2e' : '#4a2a2a';
  return `<rect x="${+(x - w / 2).toFixed(2)}" y="${+(y - h / 2).toFixed(2)}" width="${w}" height="${h}" rx="0.5" fill="${fill}" stroke="#111" stroke-width="0.3"/>`;
};

/* ------------------------------------------------------------------ */
/* MIL コネクタ                                                        */
/* ------------------------------------------------------------------ */

/**
 * KEYENCE の「横並び番号」（正面から見て左列が 1〜n/2（上から）、右列が n/2+1〜n）を
 * MIL 標準の千鳥番号に変換する。左列（極性キーの切欠き側）が奇数、右列が偶数、▲（上端）が 1・2。
 */
export const keyenceToStd = (k: number, poles: number) => (k <= poles / 2 ? 2 * k - 1 : 2 * (k - poles / 2));

/**
 * 縦向きの MIL ボックスヘッダ（上下にロックレバー付き）。cx, cy は差込口の中心。
 * 左列が奇数（▲側の上端が 1）、右列が偶数。左側面の中央に極性キーの切欠き。
 */
export function milHeaderV(cx: number, cy: number, poles: number, opts: { levers?: boolean; label?: string } = {}) {
  const rows = poles / 2;
  const P = 2.54 * MM;
  const row0 = cy - ((rows - 1) / 2) * P;
  const top = row0 - 5;
  const bottom = row0 + (rows - 1) * P + 5;
  const levers = opts.levers ?? true;
  const lv = 12;
  const dots = Array.from({ length: rows }, (_, i) => {
    const y = +(row0 + i * P).toFixed(2);
    return `<rect x="${+(cx - 2.54 - 0.9).toFixed(2)}" y="${+(y - 0.9).toFixed(2)}" width="1.8" height="1.8" fill="url(#kvpin-{{uid}})"/><rect x="${+(cx + 2.54 - 0.9).toFixed(2)}" y="${+(y - 0.9).toFixed(2)}" width="1.8" height="1.8" fill="url(#kvpin-{{uid}})"/>`;
  }).join('');
  const shTop = top - (levers ? lv + 3 : 3);
  const shBot = bottom + (levers ? lv + 3 : 3);
  return `
  <rect x="${cx - 11.5}" y="${+shTop.toFixed(2)}" width="23" height="${+(shBot - shTop).toFixed(2)}" rx="1.5" fill="url(#kvshroud-{{uid}})" stroke="#060607" stroke-width="0.8"/>
  ${
    levers
      ? `<rect x="${cx - 9}" y="${+(top - lv - 1).toFixed(2)}" width="18" height="${lv}" rx="1" fill="url(#kvlever-{{uid}})" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${cx - 6}" y="${+(top - lv + 1.5).toFixed(2)}" width="12" height="2.6" rx="0.6" fill="#1a1b1d"/>
  <rect x="${cx - 9}" y="${+(bottom + 1).toFixed(2)}" width="18" height="${lv}" rx="1" fill="url(#kvlever-{{uid}})" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${cx - 6}" y="${+(bottom + lv - 4.1).toFixed(2)}" width="12" height="2.6" rx="0.6" fill="#1a1b1d"/>`
      : ''
  }
  <rect x="${cx - 7.5}" y="${+top.toFixed(2)}" width="15" height="${+(bottom - top).toFixed(2)}" rx="0.8" fill="#0c0c0d" stroke="#3b3d41" stroke-width="0.6"/>
  <rect x="${cx - 9.5}" y="${+(cy - P / 2 - 0.5).toFixed(2)}" width="2.4" height="${+(P + 1).toFixed(2)}" fill="#0c0c0d"/>
  ${dots}
  <path d="M${cx - 10} ${+(top + 3.2).toFixed(2)} l1.6 -2.8 l1.6 2.8 z" fill="#e8e9eb"/>
  ${opts.label ? text(cx, +(shBot + 5).toFixed(2), opts.label, 3.4, '#b9bcc1') : ''}`;
}

/** 縦向き MIL ボックスヘッダの外形の高さ[px]（レバー込み） */
export const milHeaderVHeight = (poles: number, levers = true) => (poles / 2 - 1) * 2.54 * MM + 10 + (levers ? 2 * (12 + 3) : 6);

/* ------------------------------------------------------------------ */
/* ピン定義                                                            */
/* ------------------------------------------------------------------ */

/** 入力ユニットの COM（双方向フォトカプラ: プラスコモン/マイナスコモンどちらでも可） */
export const INPUT_COM_ACCEPTS: AcceptSpec = { system: 'DC', minVoltage: 4.5, maxVoltage: 26.4, conductors: ['+', '-'] };
/** シンク（NPN / N-ch MOSFET）出力の COM: 負荷電源の 0V 側をつなぐ */
export const SINK_COM_ACCEPTS: AcceptSpec = { system: 'DC', minVoltage: 5, maxVoltage: 30, conductors: ['-'] };
/** ソース（PNP / P-ch）出力の COM: 負荷電源の +V 側をつなぐ */
export const SOURCE_COM_ACCEPTS: AcceptSpec = { system: 'DC', minVoltage: 5, maxVoltage: 30, conductors: ['+'] };

/**
 * ピンの種類
 * - in / out: 入出力点（signal）
 * - com-in: 入力の COM（双方向）
 * - com-sink / com-source: 出力の COM（負荷電源の 0V / +V）
 * - pass: 向きのない中継（リレー接点の COM など）
 * - nc: 未使用ピン
 */
export type IoKind = 'in' | 'out' | 'com-in' | 'com-sink' | 'com-source' | 'pass' | 'nc';

export interface IoPoint {
  /** ピン / 端子の ID（コネクタなら '<CN>#<標準番号>'） */
  id: string;
  /** 表示名（例: 'R000 (No.1)'） */
  label: string;
  kind: IoKind;
}

export function ioRole(kind: IoKind): { role: Exclude<TerminalRole, 'connector'>; accepts?: AcceptSpec } {
  switch (kind) {
    case 'com-in':
      return { role: 'input', accepts: INPUT_COM_ACCEPTS };
    case 'com-sink':
      return { role: 'input', accepts: SINK_COM_ACCEPTS };
    case 'com-source':
      return { role: 'input', accepts: SOURCE_COM_ACCEPTS };
    case 'pass':
      return { role: 'pass' };
    default:
      return { role: 'signal' };
  }
}

export const toPins = (pts: IoPoint[]): PinDef[] =>
  pts
    .map((p) => ({ id: p.id, label: p.label, ...ioRole(p.kind), optional: true }))
    .sort((a, b) => {
      const [ca, na] = a.id.split('#');
      const [cb, nb] = b.id.split('#');
      return ca === cb ? Number(na) - Number(nb) : ca < cb ? -1 : 1;
    });

/**
 * 信号名（ユニットの先頭リレー番号からの相対番号。チャンネル ch、ビット bit → 'IN 000' / 'OUT 115' など）。
 * 実際のリレー番号は KV STUDIO の割付（装着位置）で決まる（例: 先頭 R1000 なら IN 000 → R1000）。
 */
export const signalName = (kind: 'in' | 'out', ch: number, bit: number) =>
  `${kind === 'in' ? 'IN' : 'OUT'} ${ch}${String(bit).padStart(2, '0')}`;

/**
 * KEYENCE 34極 I/O コネクタ（左列 No.1〜16 = 16点 + No.17 = COM、右列 No.18〜33 = 16点 + No.34 = COM）のピン。
 * left / right: 左列・右列のチャンネル（信号名の百の位）、入出力の種類、COM の種類と名前。
 */
export function mil34IoPins(
  cn: string,
  left: { ch: number; kind: 'in' | 'out'; com: IoKind; comName: string },
  right: { ch: number; kind: 'in' | 'out'; com: IoKind; comName: string },
): IoPoint[] {
  const pts: IoPoint[] = [];
  for (let k = 1; k <= 34; k++) {
    const id = `${cn}#${keyenceToStd(k, 34)}`;
    const side = k <= 17 ? left : right;
    const bit = k <= 17 ? k - 1 : k - 18;
    if (k === 17 || k === 34) pts.push({ id, label: `${side.comName} (No.${k})`, kind: side.com });
    else pts.push({ id, label: `${signalName(side.kind, side.ch, bit)} (No.${k})`, kind: side.kind });
  }
  return pts;
}

/** 出力ピンと COM の導通（出力 ON / 接点「閉」とみなす）。sink は出力→COM、source は COM→出力 */
export const outputLinks = (pts: IoPoint[], com: string) =>
  pts.filter((p) => p.kind === 'out').map((p) => ({ from: p.id, to: com }));

/* ------------------------------------------------------------------ */
/* 脱着式ネジ端子台（KV-B16XC など 18 端子・2列千鳥）                    */
/* ------------------------------------------------------------------ */

/**
 * 2列千鳥の脱着式ネジ端子台。左列が上寄り、右列が半ピッチ下がる（KEYENCE の結線図の並び）。
 * 返り値の pos は各端子のネジ中心。左列は電線が左へ、右列は右へ出る想定。
 */
export function staggeredBlock(opts: {
  x: number;
  y: number;
  w: number;
  rows: number;
  pitch: number;
  left: string[];
  right: string[];
  /** 端子に印字する文字（省略時は ID） */
  labels?: Record<string, string>;
}) {
  const { x, y, w, rows, pitch } = opts;
  const lx = x + w * 0.25;
  const rx = x + w * 0.75;
  const h = rows * pitch + pitch / 2 + 6;
  const pos: Record<string, { x: number; y: number; side: 'left' | 'right' }> = {};
  let s = `
  <rect x="${x}" y="${y}" width="${w}" height="${+h.toFixed(2)}" rx="1.5" fill="url(#kvtb-{{uid}})" stroke="#0b0b0c" stroke-width="0.7"/>`;
  opts.left.forEach((id, i) => {
    const cy = +(y + 3 + pitch / 2 + i * pitch).toFixed(2);
    pos[id] = { x: +lx.toFixed(2), y: cy, side: 'left' };
  });
  opts.right.forEach((id, i) => {
    const cy = +(y + 3 + pitch + i * pitch).toFixed(2);
    pos[id] = { x: +rx.toFixed(2), y: cy, side: 'right' };
  });
  // 端子の仕切りと番号
  const r = Math.min(3.6, pitch * 0.4);
  for (const [id, p] of Object.entries(pos)) {
    const bw = w * 0.47;
    const bx = p.side === 'left' ? x + 1.2 : x + w - bw - 1.2;
    s += `<rect x="${+bx.toFixed(2)}" y="${+(p.y - pitch / 2 + 0.6).toFixed(2)}" width="${+bw.toFixed(2)}" height="${+(pitch - 1.2).toFixed(2)}" rx="0.8" fill="#141516" stroke="#45484c" stroke-width="0.4"/>`;
    s += screw(p.x, p.y, r);
    const label = opts.labels?.[id] ?? id;
    s +=
      p.side === 'left'
        ? text(p.x + r + 1.2, p.y + 1.3, label, 3.3, '#e6e7e9', 'start')
        : text(p.x - r - 1.2, p.y + 1.3, label, 3.3, '#e6e7e9', 'end');
  }
  return { svg: s, pos, height: h };
}

/* ------------------------------------------------------------------ */
/* MIL コネクタタイプのユニット（KV-C64XC / C32TD / SIR32XT など）       */
/* ------------------------------------------------------------------ */

export interface MilUnitSpec {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  width: number;
  height?: number;
  connectors: { id: string; cx: number; cy: number; poles: number; label: string; tag?: string }[];
  pins: IoPoint[];
  links?: { from: string; to: string }[];
  /** 本体の上に重ねて描く要素（スイッチ・LED など） */
  extra?: string;
  /** 型式の文字サイズ */
  modelSize?: number;
}

export function buildMilUnit(s: MilUnitSpec): DeviceDefinition {
  const W = s.width;
  const H = s.height ?? KV_H;
  const svg = `
  ${kvDefs()}
  ${kvBody(W, H, s.model, { modelSize: s.modelSize })}
  ${s.extra ?? ''}
  ${s.connectors
    .map((c) => {
      const h = milHeaderVHeight(c.poles);
      return `${milHeaderV(c.cx, c.cy, c.poles)}${c.tag ? text(c.cx, +(c.cy - h / 2 - 1.5).toFixed(2), c.tag, 3.6, '#e6e7e9') : ''}`;
    })
    .join('')}`;
  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'KEYENCE',
    category: 'plc',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals: s.connectors.map(
      (c): TerminalDef => ({
        id: c.id,
        label: c.label,
        x: c.cx,
        y: c.cy,
        side: 'bottom',
        role: 'connector',
        connector: { kind: `MIL${c.poles}`, pins: c.poles, width: 23 },
        optional: true,
      }),
    ),
    pins: toPins(s.pins),
    links: s.links,
  };
}

/* ------------------------------------------------------------------ */
/* 18端子 ネジ端子台タイプのユニット（KV-B16XC / B16TD / B16RC など）    */
/* ------------------------------------------------------------------ */

export interface BlockUnitSpec {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  /** 左列・右列の端子ID（上から）。blocks を指定した場合は使わない */
  left?: string[];
  right?: string[];
  /** 端子台が複数ある場合（KV-TF40 など）。x は端子台の左端、w は幅 */
  blocks?: { x: number; w: number; left: string[]; right: string[] }[];
  /** 端子ごとの表示名と種類（print は端子台の印字。省略時は ID） */
  points: Record<string, { label: string; kind: IoKind; print?: string }>;
  links?: { from: string; to: string }[];
  /** 左上の小窓（'switch' は 24V/5V 切替スイッチ、'none' は小窓のみ、'off' は描かない） */
  window?: 'switch' | 'none' | 'off';
  /** 左下の表示（IN / OUT / I/O） */
  tag: string;
  /** 本体幅[px]（既定 58 = 29mm） */
  width?: number;
  /** 本体の上に重ねて描く要素 */
  extra?: string;
  /** 端子台のピッチ[px] */
  pitch?: number;
}

/** 18端子 ネジ端子台ユニットを作る（既定は幅 29mm・端子台 1 個） */
export function buildBlockUnit(s: BlockUnitSpec): DeviceDefinition {
  const W = s.width ?? 58;
  const H = KV_H;
  const labels = Object.fromEntries(Object.entries(s.points).map(([id, p]) => [id, p.print ?? id]));
  const specs = s.blocks ?? [{ x: 15, w: 41, left: s.left ?? [], right: s.right ?? [] }];
  const blocks = specs.map((b) => ({
    b,
    block: staggeredBlock({
      x: b.x,
      y: 22,
      w: b.w,
      rows: Math.max(b.left.length, b.right.length),
      pitch: s.pitch ?? 15.6,
      left: b.left,
      right: b.right,
      labels,
    }),
  }));
  const win =
    s.window === 'off'
      ? ''
      : s.window === 'switch'
        ? `
  <rect x="3.5" y="22" width="10" height="20" rx="1" fill="#1d1f22" stroke="#4a4d52" stroke-width="0.5"/>
  <rect x="6" y="24" width="5" height="16" rx="0.8" fill="#0d0e0f"/>
  <rect x="6.5" y="24.6" width="4" height="7" rx="0.6" fill="#d9dadc" stroke="#8a8d92" stroke-width="0.4"/>
  ${text(8.5, 46.5, '24V', 3, '#c9ccd0')}
  ${text(8.5, 50.5, '5V', 3, '#9a9da2', 'middle', 'normal')}`
        : `
  <rect x="3.5" y="22" width="10" height="20" rx="1" fill="#1d1f22" stroke="#4a4d52" stroke-width="0.5"/>
  <rect x="5" y="23.5" width="7" height="17" rx="0.6" fill="#141517"/>`;
  const svg = `
  ${kvDefs()}
  ${kvBody(W, H, s.model)}
  ${win}
  ${blocks.map(({ b, block }) => `<rect x="${b.x - 2.5}" y="21" width="2.5" height="${+(block.height + 2).toFixed(2)}" rx="1" fill="#1a1b1d"/>${block.svg}`).join('')}
  ${s.extra ?? ''}
  ${text(8.5, 172, s.tag, 3.6, '#b9bcc1')}`;
  const terminals: TerminalDef[] = blocks.flatMap(({ b, block }) =>
    [...b.left, ...b.right].map((id) => {
      const p = block.pos[id];
      const pt = s.points[id];
      return { id, label: pt.label, x: p.x, y: p.y, side: p.side, ...ioRole(pt.kind), optional: true };
    }),
  );
  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'KEYENCE',
    category: 'plc',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals,
    links: s.links,
  };
}
