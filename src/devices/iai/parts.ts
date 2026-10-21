/**
 * IAI（アイエイアイ）のコントローラーを描くための共通部品（描画・電気的な定数）。
 *
 * catalog/ 配下の各機器ファイル（1機器1ファイル）から使う。ここには DeviceDefinition を置かない
 * （registry は catalog/ だけを読み込む）。
 *
 * 外観の共通点（総合カタログ CJ9005 の製品写真・外形図より）:
 * - ポジショナー（PCON/ACON/DCON-CB など）は縦長の箱で、側面は明るいグレーの樹脂・放熱フィン、
 *   正面パネルはシリーズごとの色（PCON は深緑、ACON は紺、DCON はえんじ）に白い印字。
 *   上下に金属の取付けタブ（ねじ固定仕様）があり、上にコネクター、下に緑の電源プラグが並ぶ。
 * - プログラムコントローラー（XSEL・MSEL）や SCON は、黒〜濃いグレーの正面パネル。
 */
import type { AcceptSpec, ConnectorSpec, SafetyChannelGroup } from '../types';

/** 1mm あたりの px */
export const MM = 2;

/** 数値を SVG 用に丸める */
export const n2 = (v: number) => +v.toFixed(2);

export const text = (
  x: number,
  y: number,
  t: string,
  size = 4,
  fill = '#f2f4f5',
  anchor: 'start' | 'middle' | 'end' = 'middle',
  weight: 'normal' | 'bold' = 'normal',
  extra = '',
) =>
  `<text x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}"${extra}>${t}</text>`;

/* ------------------------------------------------------------------ */
/* 電気的な定数                                                         */
/* ------------------------------------------------------------------ */

/** 制御電源・I/O 電源の DC24V ±10%（+24V 側） */
export const DC24_PLUS: AcceptSpec = { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+'] };
/** 同 0V 側 */
export const DC24_MINUS: AcceptSpec = { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['-'] };
/** DeviceNet の通信電源（DeviceNet 規格の DC11〜25V） */
export const DNET_PLUS: AcceptSpec = { system: 'DC', minVoltage: 11, maxVoltage: 25, conductors: ['+'] };
export const DNET_MINUS: AcceptSpec = { system: 'DC', minVoltage: 11, maxVoltage: 25, conductors: ['-'] };
/** 単相 AC100〜230V（SCON・XSEL の制御電源など。−10%〜+10% を含めて 90〜253V） */
export const AC_1P_100_230: AcceptSpec = { system: 'AC', minVoltage: 90, maxVoltage: 253 };
/** AC200〜230V（モーター電源など。−10%〜+10% を含めて 180〜253V） */
export const AC_200_230: AcceptSpec = { system: 'AC', minVoltage: 180, maxVoltage: 253 };

/**
 * 内蔵 24V から非常停止スイッチ・イネーブルスイッチを通して戻す停止入力の組（1 チャンネル）。
 * 接点の種類（b 接点・直接開路動作か）をチェックするために書く。セーフティリレーの安全接点（a 接点）を
 * ループに入れる構成もあるため、指摘は注意（configurable）にとどめる。
 */
export const stopLoop = (id: string, label: string, input: string): SafetyChannelGroup => ({
  id,
  label,
  kind: 'input',
  mode: 'nc-nc',
  configurable: true,
  channels: [{ input }],
});

/* ------------------------------------------------------------------ */
/* コネクターの仕様                                                     */
/* ------------------------------------------------------------------ */

/**
 * ハーフピッチ MIL（ヒロセ HIF6、1.27mm ピッチ 2 列）のボックスヘッダの ConnectorSpec。
 * IAI の PIO コネクター（PCON/ACON/DCON-CB・MSEL・RCON など 40 極、XSEL の 96 点用 100 極）に使う。
 * 正面に差し、縦に長い（side は left / right を想定。width はコネクターの長手方向の長さ）。
 */
export const hif6Connector = (poles: number): ConnectorSpec => ({
  kind: `HIF6-${poles}`,
  pins: poles,
  width: n2((poles / 2) * 1.27 * MM + 12),
  length: 16,
  facing: 'front',
});

/** MIL 規格（2.54mm ピッチ）のフラットケーブル用ボックスヘッダの ConnectorSpec（XSEL の 50 極など） */
export const milConnectorSide = (poles: number): ConnectorSpec => ({
  kind: `MIL${poles}`,
  pins: poles,
  width: n2((poles / 2) * 2.54 * MM + 15),
  length: 20,
  facing: 'front',
});

/** RJ-45（左右に出す向き。正面に差す） */
export const rj45Side = (protocols: string[]): ConnectorSpec => ({ kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols });

/* ------------------------------------------------------------------ */
/* 描画部品                                                             */
/* ------------------------------------------------------------------ */

/** 共通のグラデーション（id は {{uid}} 付き）。panel は正面パネルの色、extra に機器固有の定義を足せる */
export const iaiDefs = (panel: [string, string], extra = '') => `
  <defs>
    <linearGradient id="iaipanel-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${panel[1]}"/>
      <stop offset="0.12" stop-color="${panel[0]}"/>
      <stop offset="0.88" stop-color="${panel[0]}"/>
      <stop offset="1" stop-color="${panel[1]}"/>
    </linearGradient>
    <linearGradient id="iaibody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#aeb3b8"/>
      <stop offset="0.25" stop-color="#dfe2e5"/>
      <stop offset="0.75" stop-color="#d3d6da"/>
      <stop offset="1" stop-color="#9da2a8"/>
    </linearGradient>
    <linearGradient id="iaitab-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9ea2a6"/>
      <stop offset="0.5" stop-color="#e3e5e7"/>
      <stop offset="1" stop-color="#a5a9ad"/>
    </linearGradient>
    <linearGradient id="iaiblack-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#16171a"/>
      <stop offset="0.5" stop-color="#2b2d31"/>
      <stop offset="1" stop-color="#121315"/>
    </linearGradient>
    <linearGradient id="iaigreen-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1f8a3d"/>
      <stop offset="0.5" stop-color="#39b45a"/>
      <stop offset="1" stop-color="#1c7a36"/>
    </linearGradient>
    <linearGradient id="iaiwhite-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9dcdf"/>
      <stop offset="0.5" stop-color="#fbfbfb"/>
      <stop offset="1" stop-color="#cfd2d5"/>
    </linearGradient>
    <linearGradient id="iaishield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#959a9f"/>
    </linearGradient>
    <radialGradient id="iaipin-{{uid}}" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#b8902e"/>
    </radialGradient>
    <radialGradient id="iaiscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
    <radialGradient id="iaifan-{{uid}}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#101113"/>
    </radialGradient>
    ${extra}
  </defs>`;

/** 小さな LED（色: 'g' 緑 / 'r' 赤 / 'o' 橙 / 'off' 消灯） */
export const led = (x: number, y: number, c: 'g' | 'r' | 'o' | 'off' = 'off', w = 3, h = 2.2) => {
  const fill = c === 'g' ? '#49e05f' : c === 'r' ? '#ff4a3d' : c === 'o' ? '#ffae2e' : '#3b3f3c';
  return `<rect x="${n2(x - w / 2)}" y="${n2(y - h / 2)}" width="${w}" height="${h}" rx="0.4" fill="${fill}" stroke="#0c0c0c" stroke-width="0.4"/>`;
};

/** 十字穴のネジ頭 */
export const screw = (x: number, y: number, r = 3.4) => `
  <circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="url(#iaiscrew-{{uid}})" stroke="#5a5a5a" stroke-width="0.5"/>
  <path d="M${n2(x - r * 0.6)} ${n2(y)} H${n2(x + r * 0.6)} M${n2(x)} ${n2(y - r * 0.6)} V${n2(y + r * 0.6)}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

/** IAI のロゴ（斜体の太字） */
export const iaiLogo = (x: number, y: number, size = 7, fill = '#ffffff') =>
  `<text x="${n2(x)}" y="${n2(y)}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" font-style="italic" fill="${fill}" letter-spacing="0.6">IAI</text>`;

/**
 * 縦向きのハーフピッチ MIL（HIF6）ボックスヘッダ。cx, cy は差込口の中心、poles は極数。
 * 上下にロックの張り出しがある黒いヘッダで、2 列（A 列・B 列）の金色のピンが 1.27mm ピッチで並ぶ。
 */
export function hif6HeaderV(cx: number, cy: number, poles: number) {
  const rows = poles / 2;
  const P = 1.27 * MM;
  const len = (rows - 1) * P;
  const top = cy - len / 2 - 4;
  const bottom = cy + len / 2 + 4;
  const pins = Array.from({ length: rows }, (_, i) => {
    const y = n2(cy - len / 2 + i * P);
    return `<rect x="${n2(cx - 1.27 - 0.55)}" y="${n2(y - 0.55)}" width="1.1" height="1.1" fill="url(#iaipin-{{uid}})"/><rect x="${n2(cx + 1.27 - 0.55)}" y="${n2(y - 0.55)}" width="1.1" height="1.1" fill="url(#iaipin-{{uid}})"/>`;
  }).join('');
  return `
  <rect x="${n2(cx - 7.5)}" y="${n2(top - 5)}" width="15" height="${n2(bottom - top + 10)}" rx="1.2" fill="url(#iaiblack-{{uid}})" stroke="#050506" stroke-width="0.7"/>
  <rect x="${n2(cx - 6)}" y="${n2(top - 4)}" width="12" height="3" rx="0.8" fill="#2f3135" stroke="#0a0a0a" stroke-width="0.4"/>
  <rect x="${n2(cx - 6)}" y="${n2(bottom + 1)}" width="12" height="3" rx="0.8" fill="#2f3135" stroke="#0a0a0a" stroke-width="0.4"/>
  <rect x="${n2(cx - 4.4)}" y="${n2(top)}" width="8.8" height="${n2(bottom - top)}" rx="0.6" fill="#0a0a0b" stroke="#3a3c40" stroke-width="0.5"/>
  <rect x="${n2(cx - 6.4)}" y="${n2(cy - 3)}" width="2.2" height="6" fill="#0a0a0b"/>
  ${pins}
  <path d="M${n2(cx - 6.6)} ${n2(top + 2.6)} l1.3 -2.2 l1.3 2.2 z" fill="#e8e9eb"/>`;
}

/**
 * 縦向きの MIL（2.54mm ピッチ）ボックスヘッダ（ロックレバー付き）。cx, cy は差込口の中心。
 * 左列が奇数（▲側の上端が 1）、右列が偶数。
 */
export function milHeaderV(cx: number, cy: number, poles: number) {
  const rows = poles / 2;
  const P = 2.54 * MM;
  const len = (rows - 1) * P;
  const top = cy - len / 2 - 5;
  const bottom = cy + len / 2 + 5;
  const pins = Array.from({ length: rows }, (_, i) => {
    const y = n2(cy - len / 2 + i * P);
    return `<rect x="${n2(cx - 2.54 - 0.9)}" y="${n2(y - 0.9)}" width="1.8" height="1.8" fill="url(#iaipin-{{uid}})"/><rect x="${n2(cx + 2.54 - 0.9)}" y="${n2(y - 0.9)}" width="1.8" height="1.8" fill="url(#iaipin-{{uid}})"/>`;
  }).join('');
  return `
  <rect x="${n2(cx - 11)}" y="${n2(top - 13)}" width="22" height="${n2(bottom - top + 26)}" rx="1.5" fill="url(#iaiblack-{{uid}})" stroke="#050506" stroke-width="0.8"/>
  <rect x="${n2(cx - 8.5)}" y="${n2(top - 11)}" width="17" height="9" rx="1" fill="#3a3c41" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${n2(cx - 8.5)}" y="${n2(bottom + 2)}" width="17" height="9" rx="1" fill="#3a3c41" stroke="#0a0a0a" stroke-width="0.5"/>
  <rect x="${n2(cx - 7.2)}" y="${n2(top)}" width="14.4" height="${n2(bottom - top)}" rx="0.8" fill="#0b0b0c" stroke="#3b3d41" stroke-width="0.6"/>
  <rect x="${n2(cx - 9.2)}" y="${n2(cy - P / 2 - 0.5)}" width="2.4" height="${n2(P + 1)}" fill="#0b0b0c"/>
  ${pins}
  <path d="M${n2(cx - 10)} ${n2(top + 3.2)} l1.6 -2.8 l1.6 2.8 z" fill="#e8e9eb"/>`;
}

/**
 * 縦に並ぶ差込み式のプラグ（フェニックス・コンタクト MC1.5 / MSTB など）。
 * x, y はプラグの左上、ids は上からの端子ID、pitch はピッチ[px]。電線は wire の向き（既定は左）へ出る。
 * labels はパネルの印字（プラグの wire と反対側に書く）。返り値の pos は電線の差込口（端子位置）。
 */
export function plugV(opts: {
  x: number;
  y: number;
  ids: string[];
  pitch: number;
  w?: number;
  labels?: Record<string, string>;
  wire?: 'left' | 'right';
  color?: 'green' | 'black' | 'orange';
  labelColor?: string;
  labelSize?: number;
}) {
  const { x, y, ids, pitch } = opts;
  const w = opts.w ?? 12;
  const h = ids.length * pitch + 3;
  const left = (opts.wire ?? 'left') === 'left';
  const fill = opts.color === 'black' ? 'url(#iaiblack-{{uid}})' : opts.color === 'orange' ? '#e0731c' : 'url(#iaigreen-{{uid}})';
  const pos: Record<string, { x: number; y: number; side: 'left' | 'right' }> = {};
  let s = `<rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${n2(h)}" rx="1" fill="${fill}" stroke="#0d3317" stroke-width="0.5"/>`;
  ids.forEach((id, i) => {
    const cy = n2(y + 1.5 + pitch / 2 + i * pitch);
    pos[id] = left ? { x: n2(x), y: cy, side: 'left' } : { x: n2(x + w), y: cy, side: 'right' };
    const sq = Math.min(pitch * 0.62, 4.6);
    // 電線の差込口（四角）と、開放用のボタン
    const hx = left ? x + w * 0.32 : x + w * 0.68;
    const bx = left ? x + w * 0.66 : x + w * 0.2;
    s += `<rect x="${n2(hx - sq / 2)}" y="${n2(cy - sq / 2)}" width="${n2(sq)}" height="${n2(sq)}" rx="0.4" fill="#06140a" stroke="#0f4a20" stroke-width="0.3"/>`;
    s += `<rect x="${n2(bx)}" y="${n2(cy - sq / 2 + 0.4)}" width="${n2(w * 0.16)}" height="${n2(sq - 0.8)}" rx="0.3" fill="#5fd27c" opacity="0.8"/>`;
    const lbl = opts.labels?.[id];
    if (lbl !== undefined && lbl !== '') {
      s += left
        ? text(x + w + 1.6, cy + 1.2, lbl, opts.labelSize ?? 2.8, opts.labelColor ?? '#e9eef0', 'start')
        : text(x - 1.6, cy + 1.2, lbl, opts.labelSize ?? 2.8, opts.labelColor ?? '#e9eef0', 'end');
    }
  });
  return { svg: s, pos, height: h };
}

/**
 * 横向き（電線が下へ出る）の差込み式プラグ。x, y は左上、ids は左からの端子ID。
 * labels はプラグの上に印字する。返り値の pos は端子位置（side: 'bottom'）。
 */
export function plugH(opts: {
  x: number;
  y: number;
  ids: string[];
  pitch: number;
  h?: number;
  labels?: Record<string, string>;
  color?: 'green' | 'black' | 'orange';
  labelColor?: string;
  labelSize?: number;
  /** ネジ式（上面にネジ頭）にする */
  screws?: boolean;
}) {
  const { x, y, ids, pitch } = opts;
  const h = opts.h ?? 12;
  const w = ids.length * pitch + 3;
  const fill = opts.color === 'black' ? 'url(#iaiblack-{{uid}})' : opts.color === 'orange' ? '#e0731c' : 'url(#iaigreen-{{uid}})';
  const pos: Record<string, { x: number; y: number; side: 'bottom' }> = {};
  let s = `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${h}" rx="1" fill="${fill}" stroke="#0d3317" stroke-width="0.5"/>`;
  ids.forEach((id, i) => {
    const cx = n2(x + 1.5 + pitch / 2 + i * pitch);
    pos[id] = { x: cx, y: n2(y + h), side: 'bottom' };
    const sq = Math.min(pitch * 0.62, 4.6);
    if (opts.screws) s += screw(cx, y + h * 0.3, Math.min(pitch * 0.36, 2.6));
    else s += `<rect x="${n2(cx - sq * 0.35)}" y="${n2(y + 1.2)}" width="${n2(sq * 0.7)}" height="${n2(h * 0.24)}" rx="0.3" fill="#5fd27c" opacity="0.8"/>`;
    s += `<rect x="${n2(cx - sq / 2)}" y="${n2(y + h - sq - 1)}" width="${n2(sq)}" height="${n2(sq)}" rx="0.4" fill="#06140a" stroke="#0f4a20" stroke-width="0.3"/>`;
    const lbl = opts.labels?.[id];
    if (lbl) s += text(cx, y - 1.6, lbl, opts.labelSize ?? 2.6, opts.labelColor ?? '#e9eef0');
  });
  return { svg: s, pos, width: w };
}

/** RJ-45 ジャック（正面。ラッチ側が左の縦向き）。cx, cy は差込口の中心。LINK/ACT の LED 付き */
export function rj45V(cx: number, cy: number) {
  const w = 26;
  const h = 30;
  return `
  <rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${w}" height="${h}" rx="1" fill="url(#iaishield-{{uid}})" stroke="#5d6166" stroke-width="0.6"/>
  <path d="M${n2(cx + w / 2 - 3)} ${n2(cy - h / 2 + 3)} V${n2(cy + h / 2 - 3)} H${n2(cx - w / 2 + 8)} V${n2(cy + 4)} H${n2(cx - w / 2 + 3)} V${n2(cy - 4)} H${n2(cx - w / 2 + 8)} V${n2(cy - h / 2 + 3)} Z" fill="#0b0c0d"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${n2(cx + w / 2 - 7)}" y="${n2(cy - 7.4 + i * 1.9)}" width="3.6" height="1" fill="#c9a43a"/>`).join('')}
  <rect x="${n2(cx - w / 2 + 1)}" y="${n2(cy - h / 2 + 1)}" width="3" height="3.4" fill="#4ad35a"/>
  <rect x="${n2(cx - w / 2 + 1)}" y="${n2(cy + h / 2 - 4.4)}" width="3" height="3.4" fill="#ffb12e"/>`;
}

/** D-sub 9 ピン（メス、縦向き）。cx, cy は中心 */
export function dsub9V(cx: number, cy: number) {
  const pins = [...Array.from({ length: 5 }, (_, i) => [cx - 1.6, cy - 5.5 + i * 2.75]), ...Array.from({ length: 4 }, (_, i) => [cx + 1.6, cy - 4.1 + i * 2.75])]
    .map(([x, y]) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="0.75" fill="#0a0a0a" stroke="#888" stroke-width="0.25"/>`)
    .join('');
  return `
  <rect x="${n2(cx - 6.5)}" y="${n2(cy - 15.5)}" width="13" height="31" rx="1.5" fill="url(#iaishield-{{uid}})" stroke="#5d6166" stroke-width="0.6"/>
  <circle cx="${n2(cx)}" cy="${n2(cy - 12.4)}" r="1.4" fill="#444"/><circle cx="${n2(cx)}" cy="${n2(cy + 12.4)}" r="1.4" fill="#444"/>
  <path d="M${n2(cx - 3.8)} ${n2(cy - 8.4)} L${n2(cx + 3.8)} ${n2(cy - 6.8)} V${n2(cy + 6.8)} L${n2(cx - 3.8)} ${n2(cy + 8.4)} Z" fill="#1a1b1d" stroke="#777" stroke-width="0.4"/>
  ${pins}`;
}

/** 小さな角形の通信コネクター（MECHATROLINK・CompoNet など）。cx, cy は中心、w×h */
export function smallPort(cx: number, cy: number, w: number, h: number, fill = 'url(#iaishield-{{uid}})') {
  return `
  <rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${w}" height="${h}" rx="1" fill="${fill}" stroke="#5d6166" stroke-width="0.6"/>
  <rect x="${n2(cx - w / 2 + 2)}" y="${n2(cy - h / 2 + 2)}" width="${n2(w - 4)}" height="${n2(h - 4)}" rx="0.6" fill="#0b0c0d"/>
  <rect x="${n2(cx - w / 2 + 3.5)}" y="${n2(cy - 1)}" width="${n2(w - 7)}" height="2" fill="#c9a43a"/>`;
}

/** ミニ DIN 8 ピン（SIO・ティーチングポート）。cx, cy は中心、r は半径 */
export function miniDin(cx: number, cy: number, r = 6.5) {
  const pins = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    return `<circle cx="${n2(cx + Math.cos(a) * r * 0.5)}" cy="${n2(cy + Math.sin(a) * r * 0.5)}" r="0.55" fill="#c9a43a"/>`;
  }).join('');
  return `
  <circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r + 1.4)}" fill="#1b1c1f" stroke="#050505" stroke-width="0.5"/>
  <circle cx="${n2(cx)}" cy="${n2(cy)}" r="${r}" fill="#0b0b0c" stroke="#5c5f63" stroke-width="0.6"/>
  <rect x="${n2(cx - 1.2)}" y="${n2(cy - r)}" width="2.4" height="2" fill="#5c5f63"/>
  ${pins}`;
}

/** ロータリースイッチ（16 進。軸番号設定など）。cx, cy は中心 */
export function rotarySwitch(cx: number, cy: number, r = 4.6) {
  const marks = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 16 - Math.PI / 2;
    return `<circle cx="${n2(cx + Math.cos(a) * (r + 1.6))}" cy="${n2(cy + Math.sin(a) * (r + 1.6))}" r="0.35" fill="#e6e8ea"/>`;
  }).join('');
  return `
  <rect x="${n2(cx - r - 2.6)}" y="${n2(cy - r - 2.6)}" width="${n2(2 * r + 5.2)}" height="${n2(2 * r + 5.2)}" rx="0.8" fill="#dfe3e8" stroke="#8a9096" stroke-width="0.4"/>
  ${marks}
  <circle cx="${n2(cx)}" cy="${n2(cy)}" r="${r}" fill="#2f73c9" stroke="#1d4b85" stroke-width="0.5"/>
  <circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.62)}" fill="#f2c94c" stroke="#a88a2a" stroke-width="0.4"/>
  <path d="M${n2(cx - r * 0.45)} ${n2(cy)} H${n2(cx + r * 0.45)} M${n2(cx)} ${n2(cy - r * 0.45)} l-1 1.4 h2 z" stroke="#333" stroke-width="0.6" fill="#333"/>`;
}

/** 2 位置のスライドスイッチ（横）。cx, cy は中心 */
export const slideSwitch = (cx: number, cy: number, w = 9, h = 5) => `
  <rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${w}" height="${h}" rx="0.6" fill="#141517" stroke="#4a4d52" stroke-width="0.4"/>
  <rect x="${n2(cx - w / 2 + 0.8)}" y="${n2(cy - h / 2 + 0.7)}" width="${n2(w * 0.45)}" height="${n2(h - 1.4)}" rx="0.4" fill="#d9dadc" stroke="#8a8d92" stroke-width="0.3"/>`;

/** 白い樹脂のコネクター（モーター・エンコーダーなど、縦向き）。x, y は左上 */
export function whiteConnectorV(x: number, y: number, w: number, h: number, rows: number) {
  const pitch = (h - 4) / rows;
  const holes = Array.from({ length: rows }, (_, i) => {
    const yy = y + 2 + pitch * (i + 0.5);
    return `<rect x="${n2(x + w * 0.22)}" y="${n2(yy - pitch * 0.32)}" width="${n2(w * 0.22)}" height="${n2(pitch * 0.64)}" fill="#8f949a"/><rect x="${n2(x + w * 0.56)}" y="${n2(yy - pitch * 0.32)}" width="${n2(w * 0.22)}" height="${n2(pitch * 0.64)}" fill="#8f949a"/>`;
  }).join('');
  return `
  <rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${h}" rx="0.8" fill="url(#iaiwhite-{{uid}})" stroke="#8a8f94" stroke-width="0.5"/>
  ${holes}
  <rect x="${n2(x + w - 1.5)}" y="${n2(y + h * 0.15)}" width="2.6" height="${n2(h * 0.7)}" rx="0.4" fill="#e8eaec" stroke="#8a8f94" stroke-width="0.3"/>`;
}

/** 7 セグメント表示（消灯時の赤い表示器）。x, y は左上、w×h、digits は桁数 */
export const sevenSeg = (x: number, y: number, w: number, h: number, digits = 4) => `
  <rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="1" fill="#1a0b0b" stroke="#000" stroke-width="0.6"/>
  ${Array.from({ length: digits }, (_, i) => {
    const cx = x + (w / digits) * (i + 0.5);
    const sw = w / digits - Math.min(7, w / digits / 2.5);
    const m = Math.min(5, h / 5);
    return `<path d="M${n2(cx - sw / 2)} ${n2(y + m)} h${n2(sw)} M${n2(cx - sw / 2)} ${n2(y + h / 2)} h${n2(sw)} M${n2(cx - sw / 2)} ${n2(y + h - m)} h${n2(sw)} M${n2(cx - sw / 2)} ${n2(y + m)} v${n2(h - 2 * m)} M${n2(cx + sw / 2)} ${n2(y + m)} v${n2(h - 2 * m)}" stroke="#4a1a1a" stroke-width="${n2(Math.max(1, sw / 5))}" stroke-linecap="round"/>`;
  }).join('')}`;

/** 半ピッチの D-sub 風コネクター（エンコーダー・ティーチングなど。縦向き）。cx, cy は中心、h は高さ */
export function dshellV(cx: number, cy: number, h: number, w = 14, body = 'url(#iaishield-{{uid}})') {
  return `
  <rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${w}" height="${n2(h)}" rx="1.2" fill="${body}" stroke="#5d6166" stroke-width="0.6"/>
  <path d="M${n2(cx - w / 2 + 3)} ${n2(cy - h / 2 + 6)} L${n2(cx + w / 2 - 3)} ${n2(cy - h / 2 + 7.5)} V${n2(cy + h / 2 - 7.5)} L${n2(cx - w / 2 + 3)} ${n2(cy + h / 2 - 6)} Z" fill="#1a1b1d" stroke="#777" stroke-width="0.4"/>
  ${screw(cx, cy - h / 2 + 2.8, 1.5)}${screw(cx, cy + h / 2 - 2.8, 1.5)}`;
}

/** 黒い小さなコネクター（バッテリーなど）。x, y は左上 */
export const smallBlackConnector = (x: number, y: number, w: number, h: number, pins = 2) => `
  <rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${h}" rx="0.6" fill="#16171a" stroke="#000" stroke-width="0.4"/>
  ${Array.from({ length: pins }, (_, i) => `<rect x="${n2(x + w / 2 - 0.6)}" y="${n2(y + 1.2 + (i * (h - 2.4)) / Math.max(1, pins - 1) - 0.6)}" width="1.2" height="1.2" fill="#c9a43a"/>`).join('')}`;

/** 金属の取付けタブ（ねじ固定）。cx はタブの中心、y はタブの上端、top=true なら穴、false なら下向きの U 字溝 */
export function mountTab(cx: number, y: number, w: number, h: number, top: boolean) {
  const hole = top
    ? `<circle cx="${n2(cx)}" cy="${n2(y + h * 0.5)}" r="${n2(h * 0.26)}" fill="#ffffff" stroke="#6f7478" stroke-width="0.6"/>`
    : `<path d="M${n2(cx - h * 0.26)} ${n2(y + h)} V${n2(y + h * 0.5)} A${n2(h * 0.26)} ${n2(h * 0.26)} 0 0 1 ${n2(cx + h * 0.26)} ${n2(y + h * 0.5)} V${n2(y + h)} Z" fill="#ffffff" stroke="#6f7478" stroke-width="0.6"/>`;
  return `<rect x="${n2(cx - w / 2)}" y="${n2(y)}" width="${w}" height="${h}" rx="1.2" fill="url(#iaitab-{{uid}})" stroke="#6f7478" stroke-width="0.6"/>${hole}`;
}

/** 放熱フィン（縦のスリット）。x, y, w, h の範囲に n 本 */
export const fins = (x: number, y: number, w: number, h: number, n: number, color = '#3d4146') =>
  Array.from({ length: n }, (_, i) => `<rect x="${n2(x + (i * w) / n + 0.6)}" y="${n2(y)}" width="${n2(w / n - 1.2)}" height="${h}" rx="0.6" fill="${color}"/>`).join('');

/** 接地記号 */
export const groundMark = (x: number, y: number, color = '#e9eef0') =>
  `<path d="M${n2(x)} ${n2(y - 3)} v3 M${n2(x - 2.5)} ${n2(y)} h5 M${n2(x - 1.7)} ${n2(y + 1.2)} h3.4 M${n2(x - 0.9)} ${n2(y + 2.4)} h1.8" stroke="${color}" stroke-width="0.6"/>`;
