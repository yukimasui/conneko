/**
 * 三菱電機 MS-T シリーズ（電磁接触器 S-T、電磁継電器 SR-T）の機器定義で共通に使う部品。
 *
 * 外形・端子位置は MS-T シリーズ カタログ L(NA)02030ENG-K の外形図（p.57〜59・p.69）による。
 * - T12/T20・SR-T5 フレーム: 幅44 × 高さ75mm。上下の端子ネジ（M3.5）は 5 本ずつ、ピッチ約 8.4mm、
 *   上段は上端から 23.7mm、上下間隔 41.6mm。操作コイル端子 A2・A1 は上部の一段高いブロック。
 * - T21/T25 フレーム: 幅63 × 高さ81mm。主回路端子（M4）は中央、補助接点（M3.5）は左右の縁に縦に 2 本ずつ。
 * - T32 フレーム: 幅43 × 高さ81mm。主回路端子（M4）のみ（補助接点は標準で付かない）。
 * 操作コイル AC200V 品の定格は 50/60Hz 200〜240V（同カタログ p.8 のコイル呼び。T10〜T35 フレーム）。
 */
import type { AcceptSpec, TerminalDef } from '../types';

/** 交流操作コイル AC200V 品（200〜240V） */
export const COIL_AC200V: AcceptSpec = { system: 'AC', minVoltage: 200, maxVoltage: 240 };
/** 直流操作コイル DC24V 品（定格の 85〜110%。SD-T12 / SD-T21 の定義と同じ） */
export const COIL_DC24V: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4 };

export type CoilKind = 'AC200V' | 'DC24V';

/** コイル端子ブロックの銘板の文字（1 行目は小さく書く） */
export const coilText = (coil: CoilKind) => (coil === 'DC24V' ? ['−  +', 'DC', '24V'] : ['50/60Hz', '200-', '240V']);

/**
 * 操作コイル端子 A1・A2。直流操作形はコイルに極性がある（A1 が +、A2 が −。カタログ p.23 の注記）。
 */
export function coilTerminals(coil: CoilKind, a1x: number, a2x: number, y: number): TerminalDef[] {
  if (coil === 'DC24V') {
    return [
      { id: 'A1', label: 'A1(+)', hint: 'コイル+', x: a1x, y, side: 'top', role: 'input', accepts: { ...COIL_DC24V, conductors: ['+'] } },
      { id: 'A2', label: 'A2(−)', hint: 'コイル−', x: a2x, y, side: 'top', role: 'input', accepts: { ...COIL_DC24V, conductors: ['-'] } },
    ];
  }
  return [
    { id: 'A1', hint: 'コイル', x: a1x, y, side: 'top', role: 'input', accepts: COIL_AC200V },
    { id: 'A2', hint: 'コイル', x: a2x, y, side: 'top', role: 'input', accepts: COIL_AC200V },
  ];
}

export const defs = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dcd8cc"/>
      <stop offset="0.12" stop-color="#efece3"/>
      <stop offset="0.88" stop-color="#ece9df"/>
      <stop offset="1" stop-color="#d2cdc0"/>
    </linearGradient>
    <linearGradient id="pocket-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9c4b6"/>
      <stop offset="1" stop-color="#e4e0d5"/>
    </linearGradient>
    <linearGradient id="slot-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111"/>
      <stop offset="0.5" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#111"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>`;

/** 端子ネジ（セルフアップ +- 溝のなべねじ） */
export const screw = (x: number, y: number, r = 5.6) => `
  <circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="#3b3b3b"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

/** 端子記号の印字（小さな枠付き） */
export const mark = (x: number, y: number, t: string, w = 14.6) => `
  <rect x="${x - w / 2}" y="${y - 4.5}" width="${w}" height="7" rx="0.8" fill="#f7f5ef" stroke="#77736a" stroke-width="0.5"/>
  <text x="${x}" y="${y + 1.2}" text-anchor="middle" font-family="sans-serif" font-size="${t.length > 4 ? 3.8 : 4.4}" font-weight="bold" fill="#222">${t}</text>`;

/** 三菱マーク（スリーダイヤ）と社名 */
export const logo = (x: number, y: number, withName = true) => `
  <g transform="translate(${x} ${y})">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#d01c1f"/>
  </g>
  ${withName ? `<text x="${x + 9}" y="${y + 4.5}" font-family="sans-serif" font-size="2.5" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="${x + 9}" y="${y + 7.5}" font-family="sans-serif" font-size="2.5" font-weight="bold" fill="#333">ELECTRIC</text>` : ''}`;

/** 操作コイル端子のブロック（一段高い部分）。x0〜x1 がブロックの左右、a2/a1 がネジの X */
export const coilBlock = (x0: number, x1: number, a2: number, a1: number, y: number, voltage: string[]) => {
  const cx = (a2 + a1) / 2;
  return `
  <rect x="${x0}" y="1" width="${x1 - x0}" height="${y + 10}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  ${screw(a2, y, 5.3)}
  ${screw(a1, y, 5.3)}
  <rect x="${cx - 7}" y="3.5" width="14" height="${y + 4}" rx="1" fill="#fbfaf6" stroke="#8e897c" stroke-width="0.4"/>
  ${voltage.map((t, i) => `<text x="${cx}" y="${8.5 + i * 4.6}" text-anchor="middle" font-family="sans-serif" font-size="${i > 0 ? 3.6 : t.length <= 6 ? 4.6 : 2.6}" font-weight="${i === 0 && t.length > 6 ? 'normal' : 'bold'}" fill="#222">${t}</text>`).join('')}
  <text x="${a2}" y="${y + 10}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">A2</text>
  <text x="${a1}" y="${y + 10}" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">A1</text>`;
};

/** 接点の開閉が見える中央の可動部 */
export const slot = (cx: number, y: number, w: number, h: number) => `
  <rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="url(#slot-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="${cx - w / 2 + 2}" y="${y + h * 0.26}" width="${w - 4}" height="${h * 0.42}" rx="1" fill="#1a1a1a" stroke="#4d4d4d" stroke-width="0.6"/>`;

/** 補助接点の端子定義 */
export const auxTerminal = (
  id: string,
  x: number,
  y: number,
  side: TerminalDef['side'],
  kind: 'NO' | 'NC',
  mirror = false,
  /** 同じ種類の接点が複数あるときの区別（'a 接点2' のように番号を付ける） */
  no?: number,
): TerminalDef => ({
  id,
  hint: `${kind === 'NO' ? 'a' : 'b'} 接点${no ?? ''}`,
  label: `${id}${kind}`,
  note: kind === 'NO' ? '補助 a 接点' : mirror ? '補助 b 接点（ミラー接点）' : '補助 b 接点',
  x,
  y,
  side,
  role: 'signal',
  optional: true,
});
