import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * KEYENCE セーフティコントローラ GC シリーズ メインコントローラ GC-1000R（安全リレー出力内蔵タイプ）。
 * 外形は 幅85 × 高さ90 × 奥行95mm（1mm ≒ 2px）。黒い筐体の上端に黄色の帯（KEYENCE ロゴ・形式）、
 * 正面左に 1.77 型カラー液晶と操作キー・BACK キー・USB(Mini-B)、中央に黒地にオレンジ解除ボタンの
 * プッシュイン式 I/O コネクタ（2 列 × 8 段 × 2 個）、右に安全リレー出力のコネクタ（1 列 × 6 段）と感電注意マークが並ぶ。
 *
 * 端子配列（カタログ「Terminal arrangements」GC-1000R。I/O は左列が偶数・右列が奇数）:
 *   上コネクタ: Si0/Si1, … Si12/Si13, N.C./N.C.
 *   下コネクタ: To0/To1, To2/To3, So0/So1, So2/So3, N.C./N.C., Ao0/Ao1, Ao2/Ao3, +24V/0V
 *   リレー出力コネクタ（上から）: 13, 23, 33, 14, 24, 34（SRo: 安全リレー出力 3a）
 */

const W = 172;
const H = 180;

/** I/O コネクタ: 左列（偶数）と右列（奇数）の電線差込口の中心 */
const COL_L = 81;
const COL_R = 93;
const PITCH = 7.4;
const Y_UP = 45; // 上コネクタ 1 段目
const Y_LOW = 109; // 下コネクタ 1 段目

const UPPER: [string, string][] = [
  ...Array.from({ length: 7 }, (_, i): [string, string] => [`Si${i * 2}`, `Si${i * 2 + 1}`]),
  ['N.C.', 'N.C.'],
];
const LOWER: [string, string][] = [
  ['To0', 'To1'],
  ['To2', 'To3'],
  ['So0', 'So1'],
  ['So2', 'So3'],
  ['N.C.', 'N.C.'],
  ['Ao0', 'Ao1'],
  ['Ao2', 'Ao3'],
  ['+24V', '0V'],
];
/** 端子位置は電線差込口（解除ボタンの右の穴） */
const HOLE_L = COL_L + 1.6;
const HOLE_R = COL_R + 1.6;
const rowsY = (y0: number) => Array.from({ length: 8 }, (_, i) => +(y0 + i * PITCH).toFixed(1));
const UP_Y = rowsY(Y_UP);
const LOW_Y = rowsY(Y_LOW);

/** 安全リレー出力コネクタ（1 列 × 6 段、上から 13 23 33 14 24 34） */
const RELAY_X = 141;
const RELAY_Y0 = 80;
const RELAY_PITCH = 11;
const RELAY = ['13', '23', '33', '14', '24', '34'];
const relayY = (i: number) => +(RELAY_Y0 + i * RELAY_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#e8e8e8', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** プッシュイン端子 1 極（オレンジの解除ボタン＋電線差込口） */
const pushIn = (x: number, y: number) => `
  <rect x="${x - 5.6}" y="${y - 3.4}" width="11.2" height="6.8" rx="0.8" fill="#151515" stroke="#3a3a3a" stroke-width="0.3"/>
  <rect x="${x - 5}" y="${y - 2.6}" width="3.2" height="5.2" rx="0.6" fill="url(#orange-{{uid}})"/>
  <circle cx="${x + 1.6}" cy="${y}" r="2.3" fill="#050505" stroke="#555" stroke-width="0.4"/>`;

/** コネクタ 1 個（2 列 × 8 段）と左右の印字 */
const connector = (ys: number[], rows: [string, string][]) => {
  const top = ys[0] - 5;
  const h = ys[ys.length - 1] - ys[0] + 10;
  let s = `<rect x="${COL_L - 7.5}" y="${top}" width="${COL_R - COL_L + 15}" height="${h}" rx="1.2" fill="#202020" stroke="#000" stroke-width="0.6"/>`;
  ys.forEach((y, i) => {
    s += pushIn(COL_L, y) + pushIn(COL_R, y);
    const [l, r] = rows[i];
    s += text(COL_L - 9.5, y + 1.5, l, 3.6, '#f0f0f0', 'end');
    s += text(COL_R + 9.5, y + 1.5, r, 3.6, '#f0f0f0', 'start');
  });
  return s;
};

/** 液晶画面（S-OUT のモニタ表示のイメージ） */
const lcd = () => {
  const x = 12;
  const y = 30;
  const rows = [
    { t: 'S-OUT 0-1', st: 'OFF', c: '#e0302a' },
    { t: 'E-STOP', st: 'ON', c: '#25a244' },
    { t: 'DOOR', st: 'ON', c: '#25a244' },
    { t: 'L/C', st: 'ON', c: '#25a244' },
    { t: 'RESET', st: 'OFF', c: '#e0302a' },
  ];
  return `
  <rect x="${x - 2}" y="${y - 2}" width="50" height="62" rx="1.5" fill="#0a0a0a" stroke="#3c3c3c" stroke-width="0.6"/>
  <rect x="${x}" y="${y}" width="46" height="58" fill="#10151c"/>
  <rect x="${x}" y="${y}" width="46" height="7" fill="#1f5fbf"/>
  ${text(x + 2, y + 5.2, 'Monitor', 4.2, '#fff', 'start', 'bold')}
  ${text(x + 44, y + 5.2, '1/4', 3.6, '#dbe7ff', 'end')}
  ${rows
    .map(
      (r, i) => `
  <rect x="${x + 1.5}" y="${y + 10 + i * 9}" width="2.5" height="6" fill="${r.c}"/>
  ${text(x + 6, y + 14.8 + i * 9, r.t, 4, '#e6edf5', 'start')}
  <rect x="${x + 33}" y="${y + 10 + i * 9}" width="11" height="6.4" rx="0.8" fill="${r.c}"/>
  ${text(x + 38.5, y + 14.9 + i * 9, r.st, 3.8, '#fff', 'middle', 'bold')}`,
    )
    .join('')}`;
};

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1c"/>
      <stop offset="0.08" stop-color="#2d2e30"/>
      <stop offset="0.9" stop-color="#28292b"/>
      <stop offset="1" stop-color="#161718"/>
    </linearGradient>
    <linearGradient id="yellow-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd83a"/>
      <stop offset="1" stop-color="#e8b800"/>
    </linearGradient>
    <linearGradient id="orange-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffab3d"/>
      <stop offset="1" stop-color="#e46d00"/>
    </linearGradient>
    <linearGradient id="key-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4c4f"/>
      <stop offset="1" stop-color="#26282a"/>
    </linearGradient>
    <linearGradient id="shield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e8ea"/>
      <stop offset="1" stop-color="#8e9398"/>
    </linearGradient>
  </defs>

  <!-- 上面の GC-Link ポート・下面のリモート I/O ポート（少しはみ出して見える） -->
  <rect x="34" y="0" width="22" height="4" rx="1" fill="#3a3b3d"/>
  <rect x="34" y="${H - 4}" width="22" height="4" rx="1" fill="#3a3b3d"/>

  <!-- 筐体 -->
  <rect x="1" y="3" width="${W - 2}" height="${H - 6}" rx="3" fill="url(#case-{{uid}})" stroke="#0b0b0b" stroke-width="1"/>
  <!-- 上端の黄色い帯（左下がりに切れ込む） -->
  <path d="M2 4 H${W - 2} V14 H38 L34 18 H2 Z" fill="url(#yellow-{{uid}})"/>
  <text x="5" y="14" font-family="sans-serif" font-size="8.2" font-weight="bold" fill="#111" letter-spacing="0.3" font-style="italic">KEYENCE</text>
  ${text(W - 5, 11.5, 'GC-1000R', 5, '#111', 'end', 'bold')}
  <!-- 下端の黄色い線 -->
  <rect x="2" y="${H - 9}" width="${W - 4}" height="5" fill="url(#yellow-{{uid}})"/>

  <!-- 液晶・操作キー -->
  ${lcd()}
  ${[0, 1, 2].map((i) => `<path d="M${14 + i * 16} 96 H${24 + i * 16} M${14 + i * 16} 98 H${24 + i * 16}" stroke="#8a8d91" stroke-width="0.7"/><rect x="${11 + i * 16}" y="101" width="15" height="8" rx="1.5" fill="url(#key-{{uid}})" stroke="#0e0e0e" stroke-width="0.6"/>`).join('')}
  <circle cx="20" cy="122" r="6.5" fill="url(#key-{{uid}})" stroke="#0e0e0e" stroke-width="0.8"/>
  ${text(33, 123.5, 'BACK', 3.8, '#c9cdd1', 'start')}

  <!-- USB（Mini-B） -->
  ${text(20, 141, 'USB', 3.6, '#c9cdd1')}
  <rect x="12" y="144" width="16" height="9" rx="3" fill="#0e0e0e" stroke="#6b6f74" stroke-width="0.6"/>
  <path d="M15 147 H25 L23.5 150.5 H16.5 Z" fill="url(#shield-{{uid}})"/>

  <!-- 安全リレー出力コネクタ（SRo）と感電注意マーク -->
  <path d="M${RELAY_X} 54 L${RELAY_X + 7} 66 H${RELAY_X - 7} Z" fill="#f2c500" stroke="#111" stroke-width="0.8"/>
  ${text(RELAY_X, 64.5, '!', 7, '#111', 'middle', 'bold')}
  <rect x="${RELAY_X - 10}" y="${RELAY_Y0 - 7}" width="22" height="${5 * RELAY_PITCH + 14}" rx="1.2" fill="#202020" stroke="#000" stroke-width="0.6"/>
  ${RELAY.map(
    (_, i) => `
  <rect x="${RELAY_X - 8.4}" y="${relayY(i) - 4.6}" width="18.8" height="9.2" rx="0.8" fill="#151515" stroke="#3a3a3a" stroke-width="0.3"/>
  <rect x="${RELAY_X - 7.6}" y="${relayY(i) - 3.6}" width="4.4" height="7.2" rx="0.6" fill="url(#orange-{{uid}})"/>
  <circle cx="${RELAY_X + 3}" cy="${relayY(i)}" r="3.2" fill="#050505" stroke="#555" stroke-width="0.4"/>`,
  ).join('')}
  ${RELAY.map((t, i) => text(RELAY_X + 15, relayY(i) + 1.6, t, 4, '#f0f0f0', 'start', 'bold')).join('')}
  ${text(RELAY_X + 1, RELAY_Y0 + 5 * RELAY_PITCH + 14, 'SRo', 4, '#e8e8e8')}

  <!-- POWER / ERROR LED -->
  <rect x="68" y="23" width="4" height="2.6" rx="0.5" fill="#36d655"/>
  ${text(74, 25.6, 'POWER', 3.6, '#e8e8e8', 'start')}
  <rect x="68" y="30" width="4" height="2.6" rx="0.5" fill="#5a1414"/>
  ${text(74, 32.6, 'ERROR', 3.6, '#e8e8e8', 'start')}

  <!-- I/O コネクタ（上: 安全入力 Si、下: テスト出力 To・安全出力 So・AUX 出力 Ao・電源） -->
  ${connector(UP_Y, UPPER)}
  ${connector(LOW_Y, LOWER)}
`;

const sideOf = (col: 'L' | 'R') => (col === 'L' ? 'left' : 'right') as TerminalDef['side'];

const ioTerminal = (id: string, x: number, y: number, col: 'L' | 'R'): TerminalDef => {
  const kind = id.slice(0, 2);
  const label =
    kind === 'Si'
      ? `${id}（安全入力）`
      : kind === 'To'
        ? `${id}（テスト出力）`
        : kind === 'So'
          ? `${id}（安全出力 OSSD）`
          : `${id}（AUX 出力・非安全）`;
  return { id, label, x, y, side: sideOf(col), role: 'signal', optional: true };
};

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };

const used = (t: TerminalDef) => t.id !== 'N.C.';

const terminals: TerminalDef[] = [
  ...UPPER.flatMap(([l, r], i) => [ioTerminal(l, HOLE_L, UP_Y[i], 'L'), ioTerminal(r, HOLE_R, UP_Y[i], 'R')]).filter(used),
  ...LOWER.slice(0, 7).flatMap(([l, r], i) => [ioTerminal(l, HOLE_L, LOW_Y[i], 'L'), ioTerminal(r, HOLE_R, LOW_Y[i], 'R')]).filter(used),
  { id: '+24V', label: '+24V（電源）', x: HOLE_L, y: LOW_Y[7], side: 'left', role: 'input', accepts: { ...power, conductors: ['+'] } },
  { id: '0V', label: '0V（電源）', x: HOLE_R, y: LOW_Y[7], side: 'right', role: 'input', accepts: { ...power, conductors: ['-'] } },
  ...RELAY.map((id, i): TerminalDef => ({
    id,
    label: `${id}（安全リレー出力 SRo ${id[0]}3-${id[0]}4、AC250V 6A）`,
    x: RELAY_X + 3,
    y: relayY(i),
    side: 'right',
    role: 'signal',
    optional: true,
  })),
];

const def: DeviceDefinition = {
  type: 'keyence.gc-1000r',
  name: 'セーフティコントローラ',
  model: 'GC-1000R',
  maker: 'KEYENCE',
  category: 'safety',
  description:
    'KEYENCE GC シリーズのメインコントローラ（安全リレー出力内蔵タイプ）。安全入力 Si0〜Si13（14 点）、テスト出力 To0〜To3、安全出力 So0〜So3（PNP・OSSD、各 500mA）、AUX 出力 Ao0〜Ao3（非安全）、' +
    '安全リレー出力 SRo 3a（13-14、23-24、33-34、AC250V 6A。DC24V のコイルだけでなく AC200V の接触器も直接開閉できる）。電源は +24V / 0V（DC24V ±20%）。PL e / カテゴリ4、SIL3。' +
    '2 チャンネル入力は隣り合う偶数・奇数の Si を組にする（例: 非常停止の b 接点 2 回路を To0→Si0、To1→Si1）。EDM は接触器の b 接点（ミラー接点）を直列にして任意の Si に入れ、設定ソフトで割り付ける。図ではリレー出力の接点を閉とみなす。',
  labelPrefix: 'SC',
  width: W,
  height: H,
  svg,
  terminals,
  links: [
    { from: '13', to: '14' },
    { from: '23', to: '24' },
    { from: '33', to: '34' },
  ],
  // 内部消費 200mA 以下（安全出力・テスト出力の負荷電流は別途）
  loadCurrent: 0.2,
};

export default def;
