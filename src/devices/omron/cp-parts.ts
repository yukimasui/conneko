/**
 * オムロン SYSMAC CP シリーズ（CP2E CPU ユニット・CP1W 増設 I/O ユニット）の描画部品と共通の定数。
 *
 * 見た目: 本体はライトグレー、上下に黒いネジ端子台（M3、2 段千鳥）。端子台の内側に白い印字帯（端子名）。
 * 入出力番号はチャネル.ビット（CIO。入力は 0 チャネル・出力は 100 チャネルから）で、IoFormat の 'omron' で表す。
 */
import { ioName } from '../resolve';
import type { ParamValues } from '../types';

/** CP2E の CPU ユニットの右に CP1W 増設ユニットを連結するバスの種類 */
export const CP_BUS = 'omron-cp';

/** 端子ピッチ（7.62mm ≒ 15.2px） */
export const CP_PITCH = 15.2;

export const text = (x: number, y: number, t: string, size = 4, fill = '#232427', anchor = 'middle', weight = 'bold') =>
  `<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

export const cpDefs = () => `
  <defs>
    <linearGradient id="cpbody-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e3e4e1"/>
      <stop offset="0.5" stop-color="#d6d8d4"/>
      <stop offset="1" stop-color="#c8cac6"/>
    </linearGradient>
    <linearGradient id="cppanel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#36383c"/>
    </linearGradient>
    <linearGradient id="cptb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2c2f"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <linearGradient id="cpwasher-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e0e1e3"/>
      <stop offset="1" stop-color="#8e9093"/>
    </linearGradient>
    <radialGradient id="cpscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="cpledg-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
    <radialGradient id="cpledo-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fff2c8"/>
      <stop offset="0.5" stop-color="#ffae2e"/>
      <stop offset="1" stop-color="#b56a00"/>
    </radialGradient>
  </defs>`;

/** 端子ネジ（M3、角座金付き） */
export const cpScrew = (x: number, y: number) => `
  <rect x="${+(x - 6.4).toFixed(2)}" y="${+(y - 6.4).toFixed(2)}" width="12.8" height="12.8" rx="0.8" fill="#0e0e0f" stroke="#2f3134" stroke-width="0.5"/>
  <rect x="${+(x - 5.2).toFixed(2)}" y="${+(y - 5.2).toFixed(2)}" width="10.4" height="10.4" rx="0.6" fill="url(#cpwasher-{{uid}})"/>
  <circle cx="${+x.toFixed(2)}" cy="${+y.toFixed(2)}" r="4.1" fill="url(#cpscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${+(x - 2.5).toFixed(2)} ${+y.toFixed(2)} H${+(x + 2.5).toFixed(2)} M${+x.toFixed(2)} ${+(y - 2.5).toFixed(2)} V${+(y + 2.5).toFixed(2)}" stroke="#444" stroke-width="1" stroke-linecap="round"/>`;

/** 空き端子（NC。ネジだけで何もつながらない） */
export const cpVacant = (x: number, y: number) => `
  <rect x="${+(x - 6.4).toFixed(2)}" y="${+(y - 6.4).toFixed(2)}" width="12.8" height="12.8" rx="0.8" fill="#0e0e0f" stroke="#2f3134" stroke-width="0.5"/>
  <circle cx="${+x.toFixed(2)}" cy="${+y.toFixed(2)}" r="3.4" fill="#5d6064"/>`;

/** 端子台の 1 個分（ID・印字・位置・電線の出る向き） */
export interface CpSlot {
  /** 端子ID（'' は空き端子 NC） */
  id: string;
  /** 印字（端子名の帯に書く） */
  print: string;
  x: number;
  y: number;
  side: 'top' | 'bottom';
}

/**
 * 2 段千鳥の端子台（outer は外側の段、inner は内側の段。内側の段が半ピッチ右へずれる）。
 * names は [ID, 印字] の配列（ID が '' なら空き端子）。x0 は外側の段の先頭の X 座標。
 */
export function cpBlock(opts: {
  x0: number;
  outerY: number;
  innerY: number;
  side: 'top' | 'bottom';
  outer: [string, string][];
  inner: [string, string][];
}): CpSlot[] {
  const row = (names: [string, string][], x0: number, y: number) =>
    names.map(([id, print], i): CpSlot => ({ id, print, x: +(x0 + i * CP_PITCH).toFixed(2), y, side: opts.side }));
  return [...row(opts.outer, opts.x0, opts.outerY), ...row(opts.inner, opts.x0 + CP_PITCH / 2, opts.innerY)];
}

/** 端子台の描画（台・ネジ・端子名の帯）。strip は端子名の帯の上端 Y、printY は帯の中の 2 段の文字の Y（外側・内側） */
export function cpBlockSvg(slots: CpSlot[], o: { x: number; y: number; w: number; h: number; strip: number; outerY: number; innerY: number; printOuter: number; printInner: number }) {
  return `
  <rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="1.5" fill="url(#cptb-{{uid}})" stroke="#0a0a0b" stroke-width="0.6"/>
  ${slots.map((s) => (s.id ? cpScrew(s.x, s.y) : cpVacant(s.x, s.y))).join('')}
  <rect x="${o.x}" y="${o.strip}" width="${o.w}" height="12" fill="#f2f3f1" stroke="#b5b8bc" stroke-width="0.4"/>
  ${slots
    .map((s) => {
      const y = s.y === o.outerY ? o.printOuter : o.printInner;
      const t = s.print;
      return text(s.x, y, t, t.length >= 4 ? 2.4 : t.length === 3 ? 2.8 : 3.3, '#232427');
    })
    .join('')}`;
}

/** 入出力番号（チャネル.ビット）。head は先頭の点数（チャネル × 16）、offset はユニット内の点数（下位チャネルの 00 から） */
export const cpIo = (dir: 'in' | 'out', head: number, offset: number) => ioName('omron', dir, head + offset);

/** 装着で決まる先頭番号。未装着なら最初の増設ユニットの位置（入力 CIO 2・出力 CIO 102）とみなす */
export function cpHead(p: ParamValues, dir: 'in' | 'out'): number {
  const n = Number(dir === 'in' ? p.ioIn : p.ioOut);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return (dir === 'in' ? 2 : 102) * 16;
}

/** オムロンのロゴ（文字） */
export const omronLogo = (x: number, y: number, size = 9, fill = '#ffffff') =>
  `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" font-weight="bold" letter-spacing="0.8" fill="${fill}">OMRON</text>`;
