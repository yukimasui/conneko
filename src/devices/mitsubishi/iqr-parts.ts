/**
 * 三菱電機 MELSEC iQ-R のインテリジェント機能ユニット・ネットワークユニット（RJ71EN71・R60AD4・RD62P2 など）の共通の描画部品。
 *
 * 外形は入出力ユニットと同じ W27.8 × H106 mm（1mm ≒ 2px で 56 × 212px）。本体はダークグレー、上部に黒い LED 表示部
 * （型式と RUN・ERR などの LED）、その下に 18 点ネジ端子台・40 ピンコネクタ・RJ-45 ポートのいずれかが付く。
 * 18 点ネジ端子台と 40 ピンコネクタの寸法・番号の付け方は、入出力ユニット（mitsubishi-rx40c7.ts・mitsubishi-rx41c4.ts）にそろえた。
 */
import { fcnPinNo } from '../catalog/mitsubishi-rx41c4';

export const IQR_W = 56;
export const IQR_H = 212;

export const text = (x: number, y: number, t: string, size = 4, fill = '#e8e9eb', anchor = 'middle', weight = 'bold') =>
  `<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** グラデーションなどの定義（本体・表示部・端子台・ネジ・LED・コネクタ） */
export const iqrDefs = () => `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#262833"/>
      <stop offset="0.12" stop-color="#3d4150"/>
      <stop offset="0.88" stop-color="#383b49"/>
      <stop offset="1" stop-color="#23252f"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1b1e"/>
      <stop offset="1" stop-color="#0c0c0e"/>
    </linearGradient>
    <linearGradient id="lower-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#454958"/>
      <stop offset="1" stop-color="#363946"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1d"/>
      <stop offset="0.5" stop-color="#232427"/>
      <stop offset="1" stop-color="#141516"/>
    </linearGradient>
    <linearGradient id="mark-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d8dadc"/>
      <stop offset="1" stop-color="#f4f5f6"/>
    </linearGradient>
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9da1a7"/>
      <stop offset="0.5" stop-color="#c3c6ca"/>
      <stop offset="1" stop-color="#8f9399"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9dadc"/>
      <stop offset="1" stop-color="#8c8e91"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="green-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
    <linearGradient id="frame-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2d303a"/>
      <stop offset="0.5" stop-color="#454958"/>
      <stop offset="1" stop-color="#2a2c36"/>
    </linearGradient>
    <linearGradient id="shell-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121214"/>
      <stop offset="0.45" stop-color="#2e2f33"/>
      <stop offset="1" stop-color="#0e0e10"/>
    </linearGradient>
    <radialGradient id="pin-{{uid}}" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#b8902e"/>
    </radialGradient>
  </defs>`;

export interface IqrLed {
  t: string;
  /** 点灯色（省略時は消灯） */
  on?: 'g' | 'r' | 'o';
}

const ledFill = (on?: 'g' | 'r' | 'o') => (on === 'g' ? 'url(#green-{{uid}})' : on === 'r' ? '#ff4a3d' : on === 'o' ? '#ffae2e' : '#2a2b2e');

/**
 * 本体と上部の LED 表示部。LED は 2 列（左列・右列）に上から並べる。headerH は表示部の高さ[px]。
 * 表示部の下端に定格などの小さな表示（rating）を書く。
 */
export function iqrBody(model: string, leds: IqrLed[], headerH: number, rating?: string) {
  const half = Math.ceil(leds.length / 2);
  const ledSvg = leds
    .map((l, i) => {
      const col = i < half ? 0 : 1;
      const row = i % half;
      const x = col === 0 ? 4 : 30;
      const y = 15 + row * 6;
      return `<rect x="${x}" y="${y}" width="4.4" height="2.6" rx="0.4" fill="${ledFill(l.on)}"/>${text(x + 5.6, y + 2.5, l.t, l.t.length > 7 ? 2.6 : 3.2, '#f2f3f4', 'start')}`;
    })
    .join('');
  return `
  <rect x="0.5" y="0.5" width="${IQR_W - 1}" height="${IQR_H - 1}" rx="1.5" fill="url(#body-{{uid}})" stroke="#111214" stroke-width="1"/>
  <rect x="1.5" y="1.5" width="${IQR_W - 3}" height="${headerH}" rx="1" fill="url(#panel-{{uid}})"/>
  ${text(3.5, 8.6, model, model.length > 9 ? 4.2 : model.length > 7 ? 5 : 5.6, '#ffffff', 'start')}
  <line x1="3.5" y1="11.2" x2="${IQR_W - 3.5}" y2="11.2" stroke="#a9acb1" stroke-width="0.5"/>
  ${ledSvg}
  ${rating ? text(3.5, headerH - 1.6, rating, 2.6, '#d5d7da', 'start') : ''}
  <!-- 下端の固定フック -->
  <rect x="12" y="${IQR_H - 5}" width="30" height="4" rx="1" fill="#2a2c2f" stroke="#111" stroke-width="0.5"/>`;
}

/* ------------------------------------------------------------------ */
/* 18 点ネジ端子台（入出力ユニットと同じ寸法・千鳥配置）                 */
/* ------------------------------------------------------------------ */

const TB_COL_ODD = 36;
const TB_COL_EVEN = 22;
const TB_Y0 = 57;
const TB_STEP = 8.6;

/** 端子番号（1〜18）のネジの位置と電線の出る向き。右列（奥の段）が奇数、左列が偶数 */
export const tb18 = {
  x: (no: number) => (no % 2 === 1 ? TB_COL_ODD : TB_COL_EVEN),
  y: (no: number) => +(TB_Y0 + (no - 1) * TB_STEP).toFixed(2),
  side: (no: number): 'left' | 'right' => (no % 2 === 1 ? 'right' : 'left'),
};

const screw = (x: number, y: number) => `
  <rect x="${x - 5.4}" y="${(y - 5.4).toFixed(2)}" width="10.8" height="10.8" rx="0.8" fill="#0d0d0e" stroke="#2e3033" stroke-width="0.5"/>
  <rect x="${x - 4.6}" y="${(y - 4.6).toFixed(2)}" width="9.2" height="9.2" rx="0.6" fill="url(#washer-{{uid}})"/>
  <circle cx="${x}" cy="${y}" r="3.7" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - 2.3} ${y} H${x + 2.3} M${x} ${(y - 2.3).toFixed(2)} V${(y + 2.3).toFixed(2)}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

/**
 * 18 点ネジ端子台。marks は端子番号 → 端子台左の表示板の印字（'V+'、'SLD' など。空き端子は '' か省略）。
 * 右のカバーの表示ラベルには、cover に渡した文字（チャネル名など）を 4 段ずつ書く。
 */
export function tb18Svg(marks: Record<number, string>, cover: string[] = []) {
  const markSvg = Object.entries(marks)
    .map(([k, m]) => {
      const no = Number(k);
      const x = no % 2 === 1 ? 10.6 : 5.6;
      const size = m.length >= 4 ? 2 : m.length === 3 ? 2.4 : m.length === 2 ? 2.9 : 3.6;
      return m ? text(x, tb18.y(no) + size * 0.36, m, size, '#2a2c30') : '';
    })
    .join('');
  const barriers = Array.from({ length: 17 }, (_, i) => {
    const no = i + 1;
    const x = tb18.x(no);
    const y = (tb18.y(no) + TB_STEP).toFixed(2);
    return `<line x1="${x - 6.2}" y1="${y}" x2="${x + 6.2}" y2="${y}" stroke="#2c2e31" stroke-width="0.8"/>`;
  }).join('');
  const coverH = (IQR_H - 57.5) / Math.max(1, cover.length);
  return `
  <rect x="2" y="46.5" width="${IQR_W - 4}" height="${IQR_H - 52}" rx="1" fill="#1b1c1e" stroke="#0b0b0c" stroke-width="0.6"/>
  <rect x="2.6" y="47.2" width="11" height="${IQR_H - 53.5}" rx="0.8" fill="url(#mark-{{uid}})"/>
  ${markSvg}
  <rect x="15.2" y="47.2" width="27.6" height="${IQR_H - 53.5}" rx="0.8" fill="url(#tb-{{uid}})"/>
  ${barriers}
  ${Array.from({ length: 18 }, (_, i) => screw(tb18.x(i + 1), tb18.y(i + 1))).join('')}
  <rect x="43.6" y="47.2" width="10" height="${IQR_H - 53.5}" rx="0.8" fill="url(#cover-{{uid}})" stroke="#6f7379" stroke-width="0.4"/>
  ${cover
    .map((c, i) => {
      const y = 49 + i * coverH;
      return `<rect x="45" y="${y.toFixed(2)}" width="7.4" height="${(coverH - 2).toFixed(2)}" rx="0.5" fill="#fafafa" stroke="#9a9ea3" stroke-width="0.3"/>
  <text transform="translate(${48.7 + 1.2} ${(y + (coverH - 2) / 2).toFixed(2)}) rotate(90)" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#2a2c30">${c}</text>`;
    })
    .join('')}`;
}

/* ------------------------------------------------------------------ */
/* 40 ピンコネクタ（FCN 系、A6CON）                                     */
/* ------------------------------------------------------------------ */

const PITCH = 5.08;

/**
 * 縦向きの 40 ピンコネクタ（台形シェル・上下の固定ネジ付き）。cx, cy は差込口の中心。
 * B 列が左、A 列が右、20 番が上（入出力ユニットの RX41C4 と同じ向き）。narrow は 2 個並べるときの細い枠。
 */
export function fcn40Svg(cx: number, cy: number, label: string, narrow = false) {
  const rowTop = cy - 9.5 * PITCH;
  const top = rowTop - 6;
  const bottom = rowTop + 19 * PITCH + 6;
  const fw = narrow ? 9.6 : 11;
  const pins = Array.from({ length: 20 }, (_, i) => {
    const y = +(rowTop + i * PITCH).toFixed(2);
    return `<rect x="${cx - 2.54 - 0.8}" y="${(y - 1.1).toFixed(2)}" width="1.6" height="2.2" rx="0.3" fill="url(#pin-{{uid}})"/><rect x="${cx + 2.54 - 0.8}" y="${(y - 1.1).toFixed(2)}" width="1.6" height="2.2" rx="0.3" fill="url(#pin-{{uid}})"/>`;
  }).join('');
  const fix = (y: number) => `
    <circle cx="${cx}" cy="${y.toFixed(2)}" r="${narrow ? 3 : 3.6}" fill="url(#screw-{{uid}})" stroke="#4a4a4a" stroke-width="0.5"/>
    <path d="M${cx - 2} ${y.toFixed(2)} H${cx + 2}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;
  return `
  <rect x="${cx - fw}" y="${(top - 15).toFixed(2)}" width="${fw * 2}" height="${(bottom - top + 30).toFixed(2)}" rx="1.5" fill="url(#frame-{{uid}})" stroke="#0c0c0d" stroke-width="0.7"/>
  ${fix(top - 8.5)}
  ${fix(bottom + 8.5)}
  <path d="M${cx - 6.6} ${top.toFixed(2)} H${cx + 6.6} V${bottom.toFixed(2)} H${cx - 6.6} Z" fill="url(#shell-{{uid}})" stroke="#4a4d55" stroke-width="0.6"/>
  <path d="M${cx - 5} ${(top + 2.5).toFixed(2)} H${cx + 4.2} L${cx + 5} ${(top + 4).toFixed(2)} V${(bottom - 4).toFixed(2)} L${cx + 4.2} ${(bottom - 2.5).toFixed(2)} H${cx - 5} Z" fill="#060607" stroke="#3a3c42" stroke-width="0.5"/>
  ${pins}
  ${text(cx - 2.54, top - 1.2, 'B', 2.4, '#c9ccd0')}
  ${text(cx + 2.54, top - 1.2, 'A', 2.4, '#c9ccd0')}
  ${text(cx, bottom + 15.5, label, 2.6, '#c9ccd0', 'middle', 'normal')}`;
}

/** 三菱のピン番号（'B20' など）→ ピンID（変換ケーブルで MIL 40 極と同じ番号になる千鳥番号。RX41C4 と同じ） */
export const fcnPin = (cn: string, name: string) => `${cn}#${fcnPinNo(name[0] as 'A' | 'B', Number(name.slice(1)))}`;

/* ------------------------------------------------------------------ */
/* RJ-45 ポート                                                         */
/* ------------------------------------------------------------------ */

/** RJ-45 の差込口（正面から見た形。ラッチが下）と左の LED。cx, cy は差込口の中心 */
export function rj45Svg(cx: number, cy: number, w = 23, h = 21) {
  return `
  <rect x="${cx - w / 2 - 1.5}" y="${cy - h / 2 - 1.5}" width="${w + 3}" height="${h + 3}" rx="1" fill="#b9bdc2" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="#0b0c0d"/>
  <rect x="${cx - 6}" y="${cy + h / 2 - 4}" width="12" height="4" fill="#2a2c2f"/>
  <path d="M${cx - 7} ${cy - 5} H${cx + 7}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>`;
}

/** 三菱電機のスリーダイヤマーク（白） */
export const threeDiamonds = (x: number, y: number, s: number, fill = '#ffffff') => {
  const w = +(s * 0.577).toFixed(2);
  const d = `M0 0 L${-w} ${-s} L0 ${-2 * s} L${w} ${-s} Z`;
  return [0, 120, 240].map((r) => `<path d="${d}" fill="${fill}" transform="translate(${x} ${y}) rotate(${r})"/>`).join('');
};
