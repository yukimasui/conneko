/**
 * 東洋技研の IEC35mm（DIN）レール用端子台（中継端子台を 10 極並べた状態）。
 *
 * - VTX-2.5/2: ボタン付きプッシュイン（スプリングロック式）。1 極の幅 5.2mm、長さ 54.6mm。両端に電線挿入口と開閉ボタン、
 *   中央に記名板の溝とチェック穴。右端に側板 VTX-2.5/2E、両端に止め金具 SDV-3。
 * - PTUL2-10-10P: ネジアップ式（M3、脱落防止）の組端子台。1 極の幅 7mm、長さ 41mm。レール・側板・止め金具・カバー・記名板付きの組立品。
 *
 * 端子 ID は汎用の端子台（generic.terminal-block.6p）と同じく、極 n の上側が 'na'、下側が 'nb'。
 */
import type { DeviceDefinition, ParamDef, ParamValues, TerminalDef } from '../types';
import { defs, r2, rail, screw, text, togiLogo } from './parts';

const POLES = 10;

/* ------------------------------------------------------------------ */
/* VTX-2.5/2                                                           */
/* ------------------------------------------------------------------ */

const VTX_COLORS: Record<string, { body: string; edge: string; button: string; name: string }> = {
  gray: { body: '#b9bbb8', edge: '#7d7f7c', button: '#f08a24', name: '灰' },
  BL: { body: '#2f6fc2', edge: '#1d4a85', button: '#c9ccd0', name: '青' },
  R: { body: '#d23a2f', edge: '#8e2019', button: '#c9ccd0', name: '赤' },
  O: { body: '#ef8a2a', edge: '#a85a12', button: '#c9ccd0', name: '橙' },
  B: { body: '#2b2c2e', edge: '#0f0f10', button: '#c9ccd0', name: '黒' },
};

const vtxColorParam: ParamDef = {
  key: 'color',
  label: '絶縁本体の色',
  options: [
    { value: 'gray', label: '灰（VTX-2.5/2）' },
    { value: 'BL', label: '青（VTX-2.5/2BL）' },
    { value: 'R', label: '赤（VTX-2.5/2R）' },
    { value: 'O', label: '橙（VTX-2.5/2O）' },
    { value: 'B', label: '黒（VTX-2.5/2B）' },
  ],
  default: 'gray',
};

const VTX_WIRE = 'プッシュイン、フェルール 0.25〜2.5㎟ / より線 0.14〜2.5㎟ / 単線 φ0.5〜2.0mm、24A';

export function buildVtx25(): DeviceDefinition {
  const PITCH = 10.4;
  const STOP = 18;
  const X0 = STOP + 1;
  const PLATE = 3;
  const W = r2(X0 + POLES * PITCH + PLATE + 1 + STOP);
  const H = 112;
  const TOP = 1.5;
  const LEN = 109;
  const TOP_Y = 13;
  const BOT_Y = TOP + LEN - 11.5;
  const poleX = (i: number) => r2(X0 + PITCH * i + PITCH / 2);

  const pole = (i: number, c: (typeof VTX_COLORS)[string]) => {
    const x = X0 + PITCH * i;
    const cx = poleX(i);
    return `
  <rect x="${r2(x + 0.25)}" y="${TOP}" width="${r2(PITCH - 0.5)}" height="${LEN}" rx="1.2" fill="${c.body}" stroke="${c.edge}" stroke-width="0.5"/>
  <!-- 電線挿入口（上下）と開閉ボタン -->
  <rect x="${r2(cx - 3.4)}" y="${TOP_Y - 3.6}" width="6.8" height="7.2" rx="1.6" fill="#202122" stroke="#6d7074" stroke-width="0.4"/>
  <circle cx="${cx}" cy="${TOP_Y}" r="1.6" fill="#44474b"/>
  <rect x="${r2(cx - 3)}" y="${TOP_Y + 6}" width="6" height="8" rx="0.8" fill="${c.button}" stroke="#7a4410" stroke-width="0.35"/>
  <rect x="${r2(cx - 3.4)}" y="${BOT_Y - 3.6}" width="6.8" height="7.2" rx="1.6" fill="#202122" stroke="#6d7074" stroke-width="0.4"/>
  <circle cx="${cx}" cy="${BOT_Y}" r="1.6" fill="#44474b"/>
  <rect x="${r2(cx - 3)}" y="${BOT_Y - 14}" width="6" height="8" rx="0.8" fill="${c.button}" stroke="#7a4410" stroke-width="0.35"/>
  <!-- チェック穴と記名板 -->
  <circle cx="${cx}" cy="34" r="1" fill="#2b2b2b"/>
  <circle cx="${cx}" cy="${H - 34}" r="1" fill="#2b2b2b"/>
  <rect x="${r2(x + 1.2)}" y="47" width="${r2(PITCH - 2.4)}" height="18" rx="0.6" fill="#fafafa" stroke="#9a9ea4" stroke-width="0.4"/>
  ${text(cx, 58.4, String(i + 1), 5, '#222')}`;
  };

  const stopper = (x: number) => `
  <rect x="${x}" y="22" width="${STOP}" height="68" rx="2" fill="#6b7076" stroke="#3f4246" stroke-width="0.6"/>
  <circle cx="${x + STOP / 2}" cy="56" r="3.6" fill="url(#tgscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x + STOP / 2 - 2.2} 56 H${x + STOP / 2 + 2.2}" stroke="#444" stroke-width="1"/>`;

  const svg = (p: ParamValues) => {
    const c = VTX_COLORS[String(p.color)] ?? VTX_COLORS.gray;
    return `${defs}
  ${rail(0, 21, W, 70)}
  ${stopper(0)}
  ${Array.from({ length: POLES }, (_, i) => pole(i, c)).join('')}
  <!-- 側板 -->
  <rect x="${r2(X0 + POLES * PITCH)}" y="${TOP + 2}" width="${PLATE}" height="${LEN - 4}" rx="0.8" fill="${c.body}" stroke="${c.edge}" stroke-width="0.5" opacity="0.9"/>
  ${stopper(r2(X0 + POLES * PITCH + PLATE + 1))}
  ${togiLogo(1.5, H - 1, 4)}`;
  };

  const terminals: TerminalDef[] = Array.from({ length: POLES }, (_, i) => [
    { id: `${i + 1}a`, label: `${i + 1}`, note: `${i + 1} 番の上側（下側 ${i + 1}b と導通）［${VTX_WIRE}］`, x: poleX(i), y: TOP_Y, side: 'top' as const, role: 'pass' as const, optional: true },
    { id: `${i + 1}b`, label: `${i + 1}`, note: `${i + 1} 番の下側（上側 ${i + 1}a と導通）［${VTX_WIRE}］`, x: poleX(i), y: BOT_Y, side: 'bottom' as const, role: 'pass' as const, optional: true },
  ]).flat();

  return {
    type: 'toyogiken.vtx-2.5-2.10p',
    name: '端子台（プッシュイン）',
    model: 'VTX-2.5/2 ×10P',
    maker: '東洋技研',
    category: 'terminal',
    description:
      '東洋技研 VTX-2.5/2（ボタン付きプッシュインタイプのスプリングロック式中継端子台、IEC35mm レール用）を 10 極並べ、側板 VTX-2.5/2E と止め金具 SDV-3 を付けた状態。' +
      '1 極は幅 5.2mm、長さ 54.6mm、2 点（上 na・下 nb が導通）。定格 800V 24A（UL 600V 20A）。' +
      '適合電線: フェルール 0.25〜2.5㎟（0.25〜0.34㎟ は長さ 12mm、0.5〜2.5㎟ は 10mm。2 本接続用フェルール 0.5㎟ 可）と単線 φ0.5〜2.0mm はそのまま差し込み（プッシュイン）、' +
      'より線 0.14〜2.5㎟（むき長さ 10〜12mm、被覆外径 φ4.8mm 以下）はボタンを押して差し込む。ショートバー BX2.5 で渡り可能。色は灰・青・赤・橙・黒（パラメータ）。' +
      '出典: https://www.togi.co.jp/series/terminalblock/511/ （VTX シリーズ カタログ）',
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    links: Array.from({ length: POLES }, (_, i) => ({ from: `${i + 1}a`, to: `${i + 1}b` })),
    params: [vtxColorParam],
  };
}

/* ------------------------------------------------------------------ */
/* PTUL2-10-10P                                                        */
/* ------------------------------------------------------------------ */

export function buildPtul2(): DeviceDefinition {
  const PITCH = 14;
  const SIDE = 6;
  /** レール 120mm（取付ピッチ 110mm） */
  const W = 240;
  const H = 90;
  const L = POLES * PITCH + 2 * SIDE;
  const X0 = (W - L) / 2;
  const TOP = 4;
  const LEN = 82;
  const TOP_Y = 19;
  const BOT_Y = 71;
  const poleX = (i: number) => r2(X0 + SIDE + PITCH * i + PITCH / 2);

  const pole = (i: number) => {
    const x = X0 + SIDE + PITCH * i;
    const cx = poleX(i);
    return `
  <rect x="${r2(x + 0.3)}" y="${TOP}" width="${PITCH - 0.6}" height="${LEN}" rx="1" fill="#2b2c2e" stroke="#0b0b0c" stroke-width="0.5"/>
  <rect x="${r2(x + 1.6)}" y="${TOP_Y - 6.5}" width="${PITCH - 3.2}" height="13" rx="0.8" fill="#4b4d50"/>
  <rect x="${r2(x + 1.6)}" y="${BOT_Y - 6.5}" width="${PITCH - 3.2}" height="13" rx="0.8" fill="#4b4d50"/>
  ${screw(cx, TOP_Y, 4.8)}
  ${screw(cx, BOT_Y, 4.8)}
  <rect x="${r2(x + 1.2)}" y="36" width="${PITCH - 2.4}" height="18" rx="0.5" fill="#fafafa" stroke="#9a9ea4" stroke-width="0.4"/>
  ${text(cx, 48.6, String(i + 1), 6, '#222')}`;
  };

  const svg = `${defs}
  ${rail(0, 10, W, 70)}
  <!-- 止め金具 HDV-1 -->
  <rect x="${r2(X0 - 22)}" y="16" width="16" height="58" rx="2" fill="#9aa0a6" stroke="#5d6166" stroke-width="0.6"/>
  <circle cx="${r2(X0 - 14)}" cy="45" r="3.6" fill="url(#tgscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="${r2(X0 + L + 6)}" y="16" width="16" height="58" rx="2" fill="#9aa0a6" stroke="#5d6166" stroke-width="0.6"/>
  <circle cx="${r2(X0 + L + 14)}" cy="45" r="3.6" fill="url(#tgscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <!-- レールの取付け穴（ピッチ 110mm） -->
  <circle cx="10" cy="45" r="3" fill="#6d7177"/><circle cx="${W - 10}" cy="45" r="3" fill="#6d7177"/>
  <!-- 側板 PTU-10L2 -->
  <rect x="${X0}" y="${TOP + 1}" width="${SIDE}" height="${LEN - 2}" rx="1" fill="#1d1e20" stroke="#000" stroke-width="0.5"/>
  <rect x="${X0 + L - SIDE}" y="${TOP + 1}" width="${SIDE}" height="${LEN - 2}" rx="1" fill="#1d1e20" stroke="#000" stroke-width="0.5"/>
  ${Array.from({ length: POLES }, (_, i) => pole(i)).join('')}
  <!-- 透明カバー CA-34 -->
  <rect x="${X0}" y="${TOP}" width="${L}" height="${LEN}" rx="1.5" fill="#dfe8ef" opacity="0.12" stroke="#c9d4dc" stroke-width="0.5"/>
  ${text(W - 4, H - 2, 'PTUL2-10-10P', 4, '#4a4d51', 'end')}
  ${togiLogo(4, H - 2, 4)}`;

  const WIRE = 'M3 ネジアップ式、丸形 / Y 形圧着端子、1.25㎟ 15A';
  const terminals: TerminalDef[] = Array.from({ length: POLES }, (_, i) => [
    { id: `${i + 1}a`, label: `${i + 1}`, note: `${i + 1} 番の上側（下側 ${i + 1}b と導通）［${WIRE}］`, x: poleX(i), y: TOP_Y, side: 'top' as const, role: 'pass' as const, optional: true },
    { id: `${i + 1}b`, label: `${i + 1}`, note: `${i + 1} 番の下側（上側 ${i + 1}a と導通）［${WIRE}］`, x: poleX(i), y: BOT_Y, side: 'bottom' as const, role: 'pass' as const, optional: true },
  ]).flat();

  return {
    type: 'toyogiken.ptul2-10-10p',
    name: '端子台（ネジ式）',
    model: 'PTUL2-10-10P',
    maker: '東洋技研',
    category: 'terminal',
    description:
      '東洋技研 PTUL2-10-10P（PTU-10 のレール式組端子台、10 極。中間板 PTU-10 ×10、側板 PTU-10L2、カバー CA-34、記名板 AM-10、レール DAV4（120mm）、止め金具 HDV-1 の組立完成品）。' +
      'ネジアップ式（M3×7.3L、脱落防止）で、締付トルク 0.5〜1.0N・m。定格 AC/DC800V、0.75㎟ 11A / 1.25㎟ 15A（UL・TÜV 600V 15A、AWG20〜16）。' +
      '端子台全長 76mm（= 7mm × 10 極 + 側板 6mm）、1 極の長さ 41mm。圧着端子（丸形・Y 形、幅 6mm 以下）で結線する。上 na・下 nb が導通。' +
      '出典: https://www.togi.co.jp/series/terminalblock/101/ （PTU シリーズ カタログ）',
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    links: Array.from({ length: POLES }, (_, i) => ({ from: `${i + 1}a`, to: `${i + 1}b` })),
  };
}
