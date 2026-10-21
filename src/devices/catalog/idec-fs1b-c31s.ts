import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * IDEC セーフティコントローラ SafetyOne FS1B-C31S（ロジック選択式、プッシュイン式コネクタ 2 個）。
 * 外形は 幅55 × 高さ114.5（取付けタブ込み 122）× 奥行118.9mm（1mm ≒ 2px）。
 * ライトグレーの筐体の上部に IDEC・SafetyOne ロゴ、その下に LOGIC/ERROR の 7 セグメント表示 2 桁と LED パネル、
 * 下半分に入力用（30 極、左）と出力用（22 極、右）のプッシュイン式コネクタが縦に並ぶ。
 * 旧形式の FS1A-C11S/C21S（生産終了）と端子名・配列は同じ（FS1A はネジ…ではなくスプリング式、出力最下段が FE）。
 *
 * 端子配列（FS1B 取扱説明書 B-2244 / FS1A カタログ。コネクタの左列｜右列、上から）:
 *   入力 FS9Z-CN03: T0|X0, T1|X1, … T7|X7, T10|X10, … T15|X15, X16|X17
 *   出力 FS9Z-CN04: Y0|Y1, Y2|Y3, Y4|Y5, Y6|Y7, Y10|Y11, Y12|Y13, Y14|Y15, Y16|Y17, Y20|NC, V+|V−, NC|NC
 */

const W = 112;
const H = 246;
const BODY_Y0 = 8;
const BODY_Y1 = 237;

const PITCH = 7.1;
const IN_Y0 = 118;
const IN_L = 26.5;
const IN_R = 35;
const OUT_Y0 = 147;
const OUT_L = 81;
const OUT_R = 89.5;

const IN_ROWS: [string, string][] = [
  ...[0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15].map((n): [string, string] => [`T${n}`, `X${n}`]),
  ['X16', 'X17'],
];
const OUT_ROWS: [string | null, string | null][] = [
  ['Y0', 'Y1'],
  ['Y2', 'Y3'],
  ['Y4', 'Y5'],
  ['Y6', 'Y7'],
  ['Y10', 'Y11'],
  ['Y12', 'Y13'],
  ['Y14', 'Y15'],
  ['Y16', 'Y17'],
  ['Y20', null],
  ['V+', 'V-'],
  [null, null],
];
const rowY = (y0: number, i: number) => +(y0 + i * PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** プッシュイン式コネクタ（左右の列の外側にオレンジの押しボタン、内側に電線差込口） */
const connector = (xl: number, xr: number, y0: number, rows: number, top: number) => {
  let s = `<rect x="${xl - 12}" y="${top}" width="${xr - xl + 24}" height="${y0 + (rows - 1) * PITCH + 9 - top}" rx="1.2" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>`;
  for (let i = 0; i < rows; i++) {
    const y = rowY(y0, i);
    s += `<rect x="${xl - 10}" y="${y - 2.4}" width="5" height="4.8" rx="0.6" fill="url(#orange-{{uid}})"/>`;
    s += `<rect x="${xr + 5}" y="${y - 2.4}" width="5" height="4.8" rx="0.6" fill="url(#orange-{{uid}})"/>`;
    s += `<circle cx="${xl}" cy="${y}" r="2.9" fill="#070707" stroke="#6b6e72" stroke-width="0.5"/>`;
    s += `<circle cx="${xr}" cy="${y}" r="2.9" fill="#070707" stroke="#6b6e72" stroke-width="0.5"/>`;
  }
  return s;
};

/** 7 セグメント 1 桁（数字 0〜9 のみ） */
const SEG: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
};
const digit = (x: number, y: number, ch: string, color: string) => {
  const on = SEG[ch] ?? '';
  const seg = (k: string, d: string) => `<path d="${d}" stroke="${on.includes(k) ? color : '#2b1a1a'}" stroke-width="1.6" stroke-linecap="round"/>`;
  return [
    seg('a', `M${x + 2} ${y} H${x + 8}`),
    seg('b', `M${x + 9} ${y + 1} V${y + 7}`),
    seg('c', `M${x + 9} ${y + 9} V${y + 15}`),
    seg('d', `M${x + 2} ${y + 16} H${x + 8}`),
    seg('e', `M${x + 1} ${y + 9} V${y + 15}`),
    seg('f', `M${x + 1} ${y + 1} V${y + 7}`),
    seg('g', `M${x + 2} ${y + 8} H${x + 8}`),
  ].join('');
};

/** LED パネルの表示灯（安全入力・リセット入力・安全出力・ソレノイド出力） */
const ledPanel = () => {
  const x0 = 56;
  const cols = [64, 75, 88, 99];
  const rowsY = [83, 89.5, 96, 102.5, 109, 115.5, 122, 129];
  const sq = (x: number, y: number, on = false) =>
    `<rect x="${x - 1.6}" y="${y - 1.6}" width="3.2" height="3.2" fill="${on ? '#ff9a1a' : '#f4f4f2'}" stroke="#333" stroke-width="0.35"/>`;
  let s = `<rect x="${x0}" y="60" width="52" height="74" rx="1.5" fill="#c9ccd0" stroke="#8d9094" stroke-width="0.6"/>`;
  // タイマー表示（8 個の縦長 LED）
  for (let i = 0; i < 8; i++) s += `<rect x="${60 + i * 6}" y="66" width="2.6" height="6" rx="1.3" fill="#f4f4f2" stroke="#333" stroke-width="0.35"/>`;
  s += text(82, 79, 'TIMER', 2.6, '#333', 'middle', 'normal');
  rowsY.slice(0, 7).forEach((y, i) => (s += sq(cols[0], y, i === 0) + sq(cols[1], y, i === 0)));
  s += sq(cols[0], rowsY[7]) + sq(cols[1], rowsY[7]);
  [rowsY[1], rowsY[2], rowsY[5]].forEach((y) => (s += sq(cols[2], y) + sq(cols[3], y)));
  s += text(69.5, 136, 'SAFE-IN', 2.4, '#333', 'middle', 'normal');
  s += text(93.5, 86, 'SAFE-OUT', 2.4, '#333', 'middle', 'normal');
  s += text(93.5, 112, 'SOL-OUT', 2.4, '#333', 'middle', 'normal');
  return s;
};

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9bcc0"/>
      <stop offset="0.08" stop-color="#dfe1e3"/>
      <stop offset="0.92" stop-color="#dbdddf"/>
      <stop offset="1" stop-color="#b2b5b9"/>
    </linearGradient>
    <linearGradient id="orange-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffab3d"/>
      <stop offset="1" stop-color="#e46d00"/>
    </linearGradient>
  </defs>

  <!-- 取付けタブ（下） -->
  <rect x="44" y="${BODY_Y1 - 2}" width="24" height="11" rx="2" fill="#a7abb0" stroke="#6d7176" stroke-width="0.6"/>
  <circle cx="56" cy="${H - 5}" r="3" fill="#f4f4f4" stroke="#666" stroke-width="0.5"/>

  <!-- 筐体 -->
  <rect x="1" y="${BODY_Y0}" width="${W - 2}" height="${BODY_Y1 - BODY_Y0}" rx="4" fill="url(#case-{{uid}})" stroke="#7d8186" stroke-width="0.9"/>
  <path d="M3 ${BODY_Y0 + 50} H${W - 3}" stroke="#9a9ea3" stroke-width="0.8"/>
  <!-- ロゴ -->
  <rect x="8" y="${BODY_Y0 + 9}" width="3" height="9" fill="#333"/>
  <path d="M12.5 ${BODY_Y0 + 9} H15 V${BODY_Y0 + 18} H12.5" fill="none" stroke="#333" stroke-width="1"/>
  ${text(17, BODY_Y0 + 17.6, 'IDEC', 8, '#333', 'start')}
  ${text(W - 6, BODY_Y0 + 17, 'SafetyOne', 6, '#333', 'end')}
  ${text(W - 6, BODY_Y0 + 26, 'FS1B-C31S', 4.2, '#555', 'end', 'normal')}

  <!-- LOGIC / ERROR 表示（7 セグメント 2 桁） -->
  <rect x="4" y="61" width="49" height="30" rx="1.5" fill="#2a2c2f" stroke="#111" stroke-width="0.6"/>
  <rect x="9" y="65" width="16" height="22" fill="#120c0c"/>
  <rect x="31" y="65" width="16" height="22" fill="#120c0c"/>
  ${digit(12, 68, '0', '#3ddc5a')}
  ${digit(34, 68, '1', '#3ddc5a')}
  ${text(28.5, 97, 'LOGIC / ERROR', 3, '#333', 'middle', 'normal')}
  ${ledPanel()}

  <!-- 入力コネクタ（左、30 極）・出力コネクタ（右、22 極） -->
  ${connector(IN_L, IN_R, IN_Y0, IN_ROWS.length, IN_Y0 - 9)}
  ${connector(OUT_L, OUT_R, OUT_Y0, OUT_ROWS.length, OUT_Y0 - 9)}
  ${IN_ROWS.map(([l, r], i) => text(IN_L - 14, rowY(IN_Y0, i) + 1.3, l, 3.3, '#222', 'end') + text(IN_R + 14, rowY(IN_Y0, i) + 1.3, r, 3.3, '#222', 'start')).join('')}
  ${OUT_ROWS.map(([l, r], i) => (l ? text(OUT_L - 14, rowY(OUT_Y0, i) + 1.3, l, 3.3, '#222', 'end') : '') + (r ? text(OUT_R + 14, rowY(OUT_Y0, i) + 1.3, r === 'V-' ? 'V−' : r, 3.3, '#222', 'start') : '')).join('')}
  <!-- ENTER ボタン -->
  <circle cx="58" cy="${BODY_Y1 - 12}" r="3.6" fill="#e9eaeb" stroke="#555" stroke-width="0.6"/>
`;

const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8 };

const labelOf = (id: string): string => {
  const n = Number(id.slice(1));
  if (id.startsWith('T')) return `${id}（安全入力用パルス出力。${id.replace('T', 'X')} と組）`;
  if (id === 'X16' || id === 'X17') return `${id}（リセット入力）`;
  if (id.startsWith('X')) return `${id}（安全入力）`;
  if (n <= 3) return `${id}（安全出力 500mA）`;
  if (id === 'Y17' || id === 'Y20') return `${id}（ソレノイド・ランプ出力）`;
  return `${id}（モニタ出力・非安全）`;
};

const terminal = (id: string, x: number, y: number, side: 'left' | 'right'): TerminalDef => {
  if (id === 'V+') return { id, label: 'V+（+24V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
  if (id === 'V-') return { id, label: 'V−（0V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
  return { id, label: labelOf(id), x, y, side, role: 'signal', optional: true };
};

const def: DeviceDefinition = {
  type: 'idec.fs1b-c31s',
  name: 'セーフティコントローラ',
  model: 'FS1B-C31S SafetyOne',
  maker: 'IDEC',
  category: 'safety',
  description:
    'IDEC SafetyOne FS1B-C31S（ロジック選択式セーフティコントローラ。プログラム不要で、LOGIC スイッチで用途別のロジックを選ぶ。FS1A-C11S/C21S の後継）。PL e / カテゴリ4、SIL3。電源は V+ / V−（DC24V、20.4〜28.8V、無負荷 6W）。' +
    '安全入力は Tn（パルス出力）と Xn（入力）の組で、例えば非常停止の b 接点 1 回路目を T0→X0、2 回路目を T1→X1 に配線する。X16/X17 はリセット入力。' +
    '安全出力 Y0〜Y3（各 500mA、Y0/Y1 と Y2/Y3 がそれぞれ 2 チャンネルの組）、モニタ出力 Y4〜Y16（非安全）、ソレノイド・ランプ出力 Y17/Y20。EDM は例えば T14 → 接触器の b 接点（ミラー接点）→ X14 のように入力に戻す（ロジックによる）。',
  labelPrefix: 'SC',
  width: W,
  height: H,
  svg,
  terminals: [
    ...IN_ROWS.flatMap(([l, r], i) => [terminal(l, IN_L, rowY(IN_Y0, i), 'left'), terminal(r, IN_R, rowY(IN_Y0, i), 'right')]),
    ...OUT_ROWS.flatMap(([l, r], i) => [
      ...(l ? [terminal(l, OUT_L, rowY(OUT_Y0, i), 'left')] : []),
      ...(r ? [terminal(r, OUT_R, rowY(OUT_Y0, i), 'right')] : []),
    ]),
  ],
  // 無負荷時 6W / 24V（出力の負荷電流は別途）
  loadCurrent: 0.25,
};

export default def;
