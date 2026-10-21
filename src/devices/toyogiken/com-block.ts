/**
 * 東洋技研のコモン端子台（センサーなどの電源・コモンの分岐用、スプリングロック式）。
 *
 * - PCX-COM22 / COM36: 3.5mm ピッチの 2 段（奥段 TB2・手前段 TB1）。標準は奥段が +COM、手前段が −COM の 2 系統、
 *   P は全極 +COM、N は全極 −COM（1 系統）。定格 10A。
 * - PCXV-COM16: レールに縦向きに付ける細長いタイプ。上端に 5mm ピッチの入力端子 2 個（2.5㎟ まで、渡り配線用）、
 *   その下に 3.5mm ピッチの分岐端子 16 個。端子台の色で極性を見分ける（赤・黒・茶・青）。2 色のもの（RB・BRBL）は 8 点ずつ 2 系統。
 */
import type { DeviceDefinition, InternalLink, ParamDef, ParamValues, TerminalDef } from '../types';
import { defs, markerCell, MARK_COLORS, r2, spring35, spring5, text, togiLogo } from './parts';

const PCX_WIRE = 'プッシュイン、フェルール 0.14〜0.75㎟ / より線 0.08〜1.5㎟';
const PCX_METHOD =
  'スプリングロック式（プッシュイン）。フェルール 0.14〜0.75㎟（AWG26〜18、DIN46228-4）と単線 φ0.5〜1.3mm はそのまま差し込み、より線 0.08〜1.5㎟ はボタンを押して差し込む。被覆外径 φ3.2mm 以上の電線は不可';

/* ------------------------------------------------------------------ */
/* PCX-COM22 / COM36                                                   */
/* ------------------------------------------------------------------ */

const polarityParam: ParamDef = {
  key: 'polarity',
  label: '仕様',
  options: [
    { value: 'PN', label: '標準: 奥段 +COM / 手前段 −COM' },
    { value: 'P', label: 'P: 全極 +COM' },
    { value: 'N', label: 'N: 全極 −COM' },
  ],
  default: 'PN',
};

export function buildPcxCom(poles: 22 | 36): DeviceDefinition {
  const n = poles / 2;
  const W = poles === 22 ? 86 : 135;
  const H = 86;
  const P = 7;
  const x0 = W / 2 - ((n - 1) * P) / 2;
  const UY = 34;
  const LY = 57;
  const xs = Array.from({ length: n }, (_, i) => r2(x0 + i * P));
  const sign = (row: 'upper' | 'lower', p: ParamValues) => (p.polarity === 'P' ? '+' : p.polarity === 'N' ? '−' : row === 'upper' ? '+' : '−');
  const model = (p: ParamValues) => `PCX-COM${poles}${p.polarity === 'P' ? 'P' : p.polarity === 'N' ? 'N' : ''}`;

  const svg = (p: ParamValues) => {
    const left = x0 - P / 2 - 1;
    const right = x0 + (n - 1) * P + P / 2 + 1;
    const cell = (x: number, y: number, s: string) => markerCell(x, y, P - 0.2, 5, s, 4, s === '+' ? MARK_COLORS.red : MARK_COLORS.black);
    return `${defs}
  <rect x="1" y="6" width="${W - 2}" height="${H - 12}" rx="2" fill="#ece6d4" stroke="#aaa391" stroke-width="0.8"/>
  <rect x="${r2(W / 2 - 16)}" y="${H - 9}" width="32" height="8.5" rx="2" fill="#f4b21c" stroke="#b07a05" stroke-width="0.5"/>
  ${[-10, -5, 0, 5, 10].map((d) => `<rect x="${r2(W / 2 + d - 0.6)}" y="${H - 7.5}" width="1.2" height="5" fill="#d18f06"/>`).join('')}
  <!-- 銘板 -->
  <rect x="${r2(W / 2 - 22)}" y="8" width="44" height="12" rx="1" fill="#f7f4ea" stroke="#b9b2a0" stroke-width="0.4"/>
  ${text(W / 2, 14, model(p), 3.6, '#333')}
  ${text(W / 2, 18.4, '125V 10A', 2.6, '#555', 'middle', 'normal')}
  <rect x="${r2(left)}" y="22" width="${r2(right - left)}" height="22" rx="1" fill="#c9cbc8" stroke="#8b8d8a" stroke-width="0.6"/>
  <rect x="${r2(left)}" y="45" width="${r2(right - left)}" height="22" rx="1" fill="#c3c5c2" stroke="#8b8d8a" stroke-width="0.6"/>
  ${xs.map((x) => spring35(x, UY) + spring35(x, LY)).join('')}
  ${xs.map((x) => cell(x, UY + 4.2, sign('upper', p)) + cell(x, LY + 4.2, sign('lower', p))).join('')}
  ${togiLogo(W - 14, H - 15.5, 3.4)}`;
  };

  const terminals = (p: ParamValues): TerminalDef[] =>
    xs.flatMap((x, i) => [
      {
        id: `TB2-${i + 1}`,
        label: sign('upper', p) === '+' ? '+' : '−',
        note: `奥段（TB2）の ${i + 1} 番。${p.polarity === 'PN' ? '奥段の ${n} 端子どうしが内部でつながる（+COM）' : '全端子が内部でつながる'}［${PCX_WIRE}］`,
        x,
        y: UY,
        side: 'bottom' as const,
        role: 'pass' as const,
        optional: true,
      },
      {
        id: `TB1-${i + 1}`,
        label: sign('lower', p) === '+' ? '+' : '−',
        note: `手前段（TB1）の ${i + 1} 番。${p.polarity === 'PN' ? '手前段の端子どうしが内部でつながる（−COM）' : '全端子が内部でつながる'}［${PCX_WIRE}］`,
        x,
        y: LY,
        side: 'bottom' as const,
        role: 'pass' as const,
        optional: true,
      },
    ]);

  const links = (p: ParamValues): InternalLink[] => {
    const out: InternalLink[] = [];
    for (let i = 2; i <= n; i++) {
      out.push({ from: `TB2-${i - 1}`, to: `TB2-${i}` });
      out.push({ from: `TB1-${i - 1}`, to: `TB1-${i}` });
    }
    if (p.polarity === 'P' || p.polarity === 'N') out.push({ from: `TB2-${n}`, to: `TB1-${n}` });
    return out;
  };

  return {
    type: `toyogiken.pcx-com${poles}`,
    name: 'コモン端子台',
    model: model({ polarity: 'PN' }),
    maker: '東洋技研',
    category: 'terminal',
    description:
      `東洋技研 PCX-COM${poles}（スプリングロック式コモン端子台、${poles} 極、3.5mm ピッチ、外形 ${W / 2} × 43mm、IEC35mm レール取付け）。` +
      `センサーの電源（+24V / 0V）やコモンを分岐する。標準品は奥段 TB2 の ${n} 端子が +COM、手前段 TB1 の ${n} 端子が −COM（段ごとに内部でつながる）、` +
      `P は全極 +COM、N は全極 −COM（全端子がつながる）。定格 AC/DC125V 10A（1 系統の合計）。結線方式: ${PCX_METHOD}。` +
      '出典: https://www.togi.co.jp/series/interface/222/',
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    params: [polarityParam],
  };
}

/* ------------------------------------------------------------------ */
/* PCXV-COM16（カラー）                                                 */
/* ------------------------------------------------------------------ */

const COLORS: Record<string, { fill: string; name: string }> = {
  R: { fill: '#d23a2f', name: '赤' },
  B: { fill: '#2b2c2e', name: '黒' },
  BR: { fill: '#7b4a2b', name: '茶' },
  BL: { fill: '#2f5fb3', name: '青' },
};

/** 色の組（単色は 1 系統、2 色は [入力 1・下 8 点の色, 入力 2・上 8 点の色] の 2 系統） */
const COLOR_SETS: Record<string, string[]> = {
  R: ['R'],
  B: ['B'],
  BR: ['BR'],
  BL: ['BL'],
  RB: ['R', 'B'],
  BRBL: ['BR', 'BL'],
};

const colorParam: ParamDef = {
  key: 'color',
  label: '端子台の色',
  options: [
    { value: 'R', label: 'R: 赤（全点 1 系統）' },
    { value: 'B', label: 'B: 黒（全点 1 系統）' },
    { value: 'BR', label: 'BR: 茶（全点 1 系統）' },
    { value: 'BL', label: 'BL: 青（全点 1 系統）' },
    { value: 'RB', label: 'RB: 赤 8 点 + 黒 8 点（2 系統）' },
    { value: 'BRBL', label: 'BRBL: 茶 8 点 + 青 8 点（2 系統）' },
  ],
  default: 'R',
};

export function buildPcxvCom16(): DeviceDefinition {
  const W = 30;
  const H = 158;
  const IN_Y = 14;
  const IN_X = [10, 20];
  const BR_X = 18;
  const BR_Y0 = 33;
  const BP = 7;
  const brY = (i: number) => r2(BR_Y0 + i * BP);
  /** 分岐端子 k（1〜16、上から）の系統（0: 入力 1 側、1: 入力 2 側） */
  const groupOf = (k: number, p: ParamValues) => ((COLOR_SETS[String(p.color)] ?? ['R']).length === 1 ? 0 : k <= 8 ? 1 : 0);
  const colorOf = (g: number, p: ParamValues) => {
    const set = COLOR_SETS[String(p.color)] ?? ['R'];
    return COLORS[set[Math.min(g, set.length - 1)]];
  };

  const svg = (p: ParamValues) => `${defs}
  <!-- ケース（黒） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2" fill="#2b2d30" stroke="#0e0e0f" stroke-width="0.8"/>
  <!-- 入力端子（5mm ピッチ 2 個） -->
  ${IN_X.map((x, i) => `<rect x="${x - 5}" y="3" width="10" height="23" rx="1" fill="${colorOf(i, p).fill}" stroke="#111" stroke-width="0.5"/>${spring5(x, IN_Y, '#1c1c1d', '#9a9da1')}`).join('')}
  <!-- 分岐端子（3.5mm ピッチ 16 個） -->
  ${Array.from({ length: 16 }, (_, i) => {
    const y = brY(i);
    const c = colorOf(groupOf(i + 1, p), p).fill;
    return `<rect x="4" y="${r2(y - BP / 2)}" width="22" height="${BP}" fill="${c}" stroke="#111" stroke-width="0.4"/>
    <rect x="6" y="${r2(y - 1.8)}" width="5" height="3.6" rx="0.6" fill="#f39a2b" stroke="#b8650f" stroke-width="0.3"/>
    <circle cx="${BR_X}" cy="${y}" r="2.3" fill="#1c1c1d" stroke="#9a9da1" stroke-width="0.5"/>
    ${text(24, y + 1.1, String(i + 1), 2.4, '#f2f2f2', 'middle', 'normal')}`;
  }).join('')}
  ${text(W / 2, 147, `PCXV-COM16${String(p.color)}`, 2.3, '#c9cbce')}
  <!-- レールのロックボタン -->
  <rect x="5" y="${H - 7}" width="20" height="6" rx="1.2" fill="#f4b21c" stroke="#8a5a08" stroke-width="0.5"/>`;

  const terminals: TerminalDef[] = [
    ...IN_X.map(
      (x, i): TerminalDef => ({
        id: `IN${i + 1}`,
        label: `IN${i + 1}`,
        note: `入力端子 ${i + 1}（5mm ピッチ、渡り配線用。単色品は IN1・IN2 と分岐 1〜16 がすべてつながる。2 色品は IN1 と分岐 9〜16、IN2 と分岐 1〜8 がつながる）［プッシュイン、フェルール 0.14〜2.5㎟ / より線 0.08〜2.5㎟］`,
        x,
        y: IN_Y,
        side: 'top',
        role: 'pass',
        optional: true,
      }),
    ),
    ...Array.from(
      { length: 16 },
      (_, i): TerminalDef => ({
        id: String(i + 1),
        label: String(i + 1),
        note: `分岐端子 ${i + 1}（上から）［${PCX_WIRE}］`,
        x: BR_X,
        y: brY(i),
        side: 'right',
        role: 'pass',
        optional: true,
      }),
    ),
  ];

  const links = (p: ParamValues): InternalLink[] => {
    const two = (COLOR_SETS[String(p.color)] ?? ['R']).length === 2;
    const out: InternalLink[] = [];
    for (let k = 2; k <= 16; k++) if (!two || k !== 9) out.push({ from: String(k - 1), to: String(k) });
    if (two) {
      out.push({ from: 'IN1', to: '9' });
      out.push({ from: 'IN2', to: '1' });
    } else {
      out.push({ from: 'IN1', to: 'IN2' });
      out.push({ from: 'IN1', to: '1' });
    }
    return out;
  };

  return {
    type: 'toyogiken.pcxv-com16',
    name: 'コモン端子台',
    model: 'PCXV-COM16R',
    maker: '東洋技研',
    category: 'terminal',
    description:
      '東洋技研 PCXV-COM16（スプリングロック式コモン端子台、カラー、レールに縦向き取付け、外形 14.8 × 78.8mm）。' +
      '上端の入力端子 2 個（5mm ピッチ、フェルール 0.14〜2.5㎟、渡り配線用）から、分岐端子 16 個（3.5mm ピッチ）へセンサーの電源やコモンを分ける。' +
      '端子台の色（赤 R・黒 B・茶 BR・青 BL）で極性を見分ける。単色品は全点 1 系統、2 色品（RB・BRBL）は IN1 と下 8 点（赤 / 茶）、IN2 と上 8 点（黒 / 青）の 2 系統。' +
      `定格 125V 10A。結線方式: ${PCX_METHOD}（入力端子はフェルール 0.14〜2.5㎟ / より線 0.08〜2.5㎟ / 単線 φ0.3〜1.6mm）。` +
      '出典: https://www.togi.co.jp/series/interface/605/ （製品データシート PCXV-COM16R ほか）',
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    params: [colorParam],
  };
}
