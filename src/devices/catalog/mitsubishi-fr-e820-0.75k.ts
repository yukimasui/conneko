import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 インバーター FR-E820-0.75K-1（FR-E800 シリーズ 標準品、三相 200V 0.75kW、FM 出力タイプ）。
 * 外形 W68 × H128 × D132.5mm（1mm = 2px。取扱説明書（接続編）IB-0600865ENG 4.4.1）。
 *
 * 主回路端子（取扱説明書 2.5.2 の FR-E820-0.1K〜0.75K の端子配列）: 下段に R/L1・S/L2・T/L3・U・V・W、
 * その上の段に N/-・P1・P/+・PR（P1-P/+ 間は出荷時に短絡片）、下に接地端子。
 * 制御回路端子（2.6.5、ばね式）: S1 S2 PC RUN FU SE / MRS RES SD STF STR / RL RM RH SD / SO SOC FM SD / 10 2 5 4 / A B C。
 * 実機の制御回路端子は前面カバー内の端子台に並ぶが、図面で配線しやすいように、入力系を左、出力・アナログ系を右の縁に並べて描く。
 * SD は実機では 3 か所にあり、内部で導通している。この定義では左の縁の SD と右の縁の SD2（印字 SD）の 2 つにまとめる。
 */

const W = 136;
const H = 256;
const LEFT_X = 5;
const RIGHT_X = 131;
/** 左の縁（接点入力・安全停止入力） */
const LEFT = ['STF', 'STR', 'RH', 'RM', 'RL', 'MRS', 'RES', 'SD', 'PC', 'S1', 'S2'];
const LEFT_Y0 = 72;
/** 右の縁（リレー出力・オープンコレクタ出力・パルス出力・周波数設定） */
const RIGHT = ['A', 'B', 'C', 'RUN', 'FU', 'SE', 'SO', 'SOC', 'FM', 'SD2', '10', '2', '5', '4'];
const RIGHT_Y0 = 61;
const PITCH = 9.5;
/** 主回路端子 */
const MAIN = ['R/L1', 'S/L2', 'T/L3', 'U', 'V', 'W'];
const MAIN_X = [16, 36.5, 57, 79, 99.5, 120];
const MAIN_Y = 226;
const DC = ['N/-', 'P1', 'P/+', 'PR'];
const DC_X = [57, 79, 99.5, 120];
const DC_Y = 204;
const EARTH_X = [58, 79];
const EARTH_Y = 247;

const ly = (i: number) => LEFT_Y0 + i * PITCH;
const ry = (i: number) => RIGHT_Y0 + i * PITCH;
const shown = (id: string) => (id === 'SD2' ? 'SD' : id);

const screw = (x: number, y: number, r = 6) => `
  <rect x="${x - r - 2.5}" y="${y - r - 2.5}" width="${2 * r + 5}" height="${2 * r + 5}" rx="1.2" fill="#3a3a3a"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

/** ばね式の制御回路端子（差込口と解除ボタン） */
const spring = (x: number, y: number, side: 'left' | 'right') => {
  const dx = side === 'left' ? 1 : -1;
  return `
  <rect x="${x - 4}" y="${y - 3.6}" width="8" height="7.2" rx="1" fill="#2a2a2a" stroke="#555" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="2.2" fill="#111"/>
  <rect x="${x + dx * 5 - 1.6}" y="${y - 2.6}" width="3.2" height="5.2" rx="0.6" fill="#f2b417"/>`;
};

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d8d9d6"/>
      <stop offset="0.5" stop-color="#eeefec"/>
      <stop offset="1" stop-color="#d2d3d0"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4f57"/>
      <stop offset="1" stop-color="#2b2f35"/>
    </linearGradient>
    <radialGradient id="dial-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#f4f4f2"/>
      <stop offset="1" stop-color="#9b9c98"/>
    </radialGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#body-{{uid}})" stroke="#8c8d89" stroke-width="1.2"/>
  <!-- 操作パネル（モニタ表示・操作キー・M ダイヤル） -->
  <rect x="12" y="6" width="${W - 24}" height="50" rx="2.5" fill="url(#panel-{{uid}})" stroke="#1d2024" stroke-width="0.8"/>
  <rect x="17" y="11" width="48" height="16" rx="1" fill="#0f1a12" stroke="#000" stroke-width="0.5"/>
  <text x="62" y="23.5" text-anchor="end" font-family="sans-serif" font-size="11" font-weight="bold" fill="#5cff7a">60.00</text>
  <g fill="#8a8f96">
    <circle cx="70" cy="13" r="1.2"/><circle cx="70" cy="18" r="1.2"/><circle cx="70" cy="23" r="1.2"/>
  </g>
  <text x="73" y="14" font-family="sans-serif" font-size="3" fill="#cfd3d8">Hz</text>
  <text x="73" y="19" font-family="sans-serif" font-size="3" fill="#cfd3d8">A</text>
  <text x="73" y="24" font-family="sans-serif" font-size="3" fill="#cfd3d8">RUN</text>
  ${[0, 1, 2]
    .map((i) => `<rect x="${17 + i * 16.5}" y="32" width="14" height="9" rx="1" fill="#e6e8eb" stroke="#8a8f96" stroke-width="0.5"/>`)
    .join('')}
  ${[0, 1, 2]
    .map((i) => `<rect x="${17 + i * 16.5}" y="44" width="14" height="9" rx="1" fill="#e6e8eb" stroke="#8a8f96" stroke-width="0.5"/>`)
    .join('')}
  <text x="24" y="38.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">PU</text>
  <text x="40.5" y="38.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">MODE</text>
  <text x="57" y="38.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">SET</text>
  <text x="24" y="50.5" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#1a7a2a">RUN</text>
  <text x="40.5" y="50.5" text-anchor="middle" font-family="sans-serif" font-size="3" font-weight="bold" fill="#c22">STOP</text>
  <text x="57" y="50.5" text-anchor="middle" font-family="sans-serif" font-size="3" font-weight="bold" fill="#333">RESET</text>
  <circle cx="101" cy="33" r="17" fill="#22262b"/>
  <circle cx="101" cy="33" r="14.5" fill="url(#dial-{{uid}})" stroke="#666" stroke-width="0.6"/>
  ${Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    return `<line x1="${(101 + Math.sin(a) * 9).toFixed(2)}" y1="${(33 - Math.cos(a) * 9).toFixed(2)}" x2="${(101 + Math.sin(a) * 13.5).toFixed(2)}" y2="${(33 - Math.cos(a) * 13.5).toFixed(2)}" stroke="#777" stroke-width="1.2"/>`;
  }).join('')}
  <circle cx="101" cy="33" r="6" fill="#d9dad7" stroke="#888" stroke-width="0.5"/>
  <!-- 形名・ロゴ -->
  <g transform="translate(31 64)">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#e60012"/>
  </g>
  <text x="41" y="69" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="41" y="73" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#333">ELECTRIC</text>
  <text x="31" y="84" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#222">FR-E820</text>
  <text x="31" y="91" font-family="sans-serif" font-size="4.4" fill="#444">-0.75K-1</text>
  <text x="31" y="97" font-family="sans-serif" font-size="3" fill="#666">INVERTER 3φ200V</text>
  <!-- 制御回路の端子台（カバー内。左右の縁に並べて描く） -->
  <rect x="28" y="102" width="80" height="84" rx="2" fill="#e3e4e1" stroke="#a5a6a2" stroke-width="0.6"/>
  <g stroke="#c4c5c1" stroke-width="0.8"><path d="M33 112 H103 M33 120 H95 M33 128 H101 M33 136 H90 M33 144 H103"/></g>
  <rect x="${LEFT_X - 4}" y="${LEFT_Y0 - 7}" width="24" height="${(LEFT.length - 1) * PITCH + 14}" rx="1.5" fill="#cfd0cc" stroke="#9a9b97" stroke-width="0.6"/>
  <rect x="${RIGHT_X - 20}" y="${RIGHT_Y0 - 7}" width="24" height="${(RIGHT.length - 1) * PITCH + 14}" rx="1.5" fill="#cfd0cc" stroke="#9a9b97" stroke-width="0.6"/>
  ${LEFT.map(
    (id, i) => `${spring(LEFT_X + 1, ly(i), 'left')}
  <text x="${LEFT_X + 9}" y="${ly(i) + 1.6}" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#222">${shown(id)}</text>`,
  ).join('')}
  ${RIGHT.map(
    (id, i) => `${spring(RIGHT_X - 1, ry(i), 'right')}
  <text x="${RIGHT_X - 9}" y="${ry(i) + 1.6}" text-anchor="end" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#222">${shown(id)}</text>`,
  ).join('')}
  <text x="34" y="160" font-family="sans-serif" font-size="3.4" fill="#555">SINK</text>
  <rect x="34" y="163" width="8" height="12" rx="1" fill="#333"/><rect x="35" y="164" width="6" height="5" fill="#ddd"/>
  <text x="76" y="182" font-family="sans-serif" font-size="3.4" fill="#555">V/I</text>
  <!-- 主回路端子台 -->
  <rect x="4" y="${DC_Y - 11}" width="${W - 8}" height="${H - DC_Y + 8}" rx="2" fill="#2f3033"/>
  ${DC.map((id, i) => screw(DC_X[i], DC_Y) + `<text x="${DC_X[i]}" y="${DC_Y + 10.5}" text-anchor="middle" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#fff">${id}</text>`).join('')}
  <rect x="${DC_X[1] - 3}" y="${DC_Y - 4}" width="${DC_X[2] - DC_X[1] + 6}" height="8" rx="1.5" fill="#b87333" opacity="0.85"/>
  ${MAIN.map((id, i) => screw(MAIN_X[i], MAIN_Y) + `<text x="${MAIN_X[i]}" y="${MAIN_Y + 11}" text-anchor="middle" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#fff">${id}</text>`).join('')}
  ${EARTH_X.map((x) => screw(x, EARTH_Y, 4.5)).join('')}
  <text x="68.5" y="${EARTH_Y + 1.5}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#fff">⏚</text>
`;

/** 端子の注記 */
const NOTES: Record<string, string> = {
  STF: '正転始動',
  STR: '逆転始動',
  RH: '多段速度選択（高速）',
  RM: '多段速度選択（中速）',
  RL: '多段速度選択（低速）',
  MRS: '出力停止',
  RES: 'リセット',
  SD: '接点入力コモン（シンク）・DC24V 電源のコモン',
  SD2: 'FM・接点入力のコモン。SD と内部で導通',
  PC: 'DC24V 電源（22〜26.5V、0.1A）・安全停止入力のコモン',
  S1: '安全停止入力（チャンネル 1）。使わない場合は PC と短絡（出荷時は短絡線あり）',
  S2: '安全停止入力（チャンネル 2）。使わない場合は PC と短絡（出荷時は短絡線あり）',
  A: 'リレー出力（異常出力）a 接点側。異常で A-C 導通',
  B: 'リレー出力（異常出力）b 接点側。正常時 B-C 導通',
  C: 'リレー出力（異常出力）の共通',
  RUN: 'インバータ運転中（オープンコレクタ、DC24V 0.1A）',
  FU: '周波数検出（オープンコレクタ、DC24V 0.1A）',
  SE: 'オープンコレクタ出力の共通',
  SO: '安全モニタ出力（オープンコレクタ、DC24V 0.1A）',
  SOC: '安全モニタ出力の共通',
  FM: '計器用パルス出力（1440 パルス/s at 60Hz）',
  '10': '周波数設定用電源（DC5V、10mA）',
  '2': '周波数設定（電圧 0〜5V / 0〜10V）',
  '5': '周波数設定の共通（SD・SE とは絶縁）',
  '4': '周波数設定（電流 4〜20mA）',
  'N/-': '直流母線（−）。ブレーキユニット・電源回生コンバータ用',
  P1: 'DC リアクトル接続（出荷時は P/+ と短絡片）',
  'P/+': '直流母線（＋）。ブレーキ抵抗器・ブレーキユニット・DC リアクトル用',
  PR: 'ブレーキ抵抗器接続（P/+-PR 間）',
};

const ac200: TerminalDef['accepts'] = { system: 'AC', minVoltage: 170, maxVoltage: 264 };
const RST = ['R', 'S', 'T'] as const;

const sig = (id: string, x: number, y: number, side: 'left' | 'right', extra: Partial<TerminalDef> = {}): TerminalDef => ({
  id,
  label: shown(id),
  note: NOTES[id],
  x,
  y,
  side,
  role: 'signal',
  optional: true,
  ...extra,
});

const terminals: TerminalDef[] = [
  // 主回路
  ...MAIN.slice(0, 3).map((id, i): TerminalDef => ({ id, x: MAIN_X[i], y: MAIN_Y, side: 'bottom', role: 'input', accepts: ac200, note: '電源入力（三相 AC200〜240V）' })),
  ...MAIN.slice(3).map(
    (id, i): TerminalDef => ({
      id,
      x: MAIN_X[i + 3],
      y: MAIN_Y,
      side: 'bottom',
      role: 'supply',
      supply: { system: 'AC', voltage: 200, conductor: RST[i], limitCurrent: 5 },
      note: 'インバータ出力（モーターへ。定格出力電流 5.0A）',
    }),
  ),
  ...DC.map((id, i): TerminalDef => ({ id, note: NOTES[id], x: DC_X[i], y: DC_Y, side: 'top', role: 'signal', optional: true })),
  { id: 'E', label: '⏚', note: '接地', x: EARTH_X[0], y: EARTH_Y, side: 'bottom', role: 'ground' },
  { id: 'E2', label: '⏚', note: '接地', x: EARTH_X[1], y: EARTH_Y, side: 'bottom', role: 'ground', optional: true },
  // 制御回路（左の縁）
  ...LEFT.map((id, i): TerminalDef => {
    if (id === 'PC') return { id, note: NOTES[id], x: LEFT_X, y: ly(i), side: 'left', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1 }, optional: true };
    if (id === 'SD') return { id, note: NOTES[id], x: LEFT_X, y: ly(i), side: 'left', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: 0.1 }, optional: true };
    if (id === 'S1' || id === 'S2') return sig(id, LEFT_X, ly(i), 'left');
    // 接点入力（シンクロジック。外部から電圧をかけない。SD との間を接点・NPN トランジスタで短絡して ON）
    return sig(id, LEFT_X, ly(i), 'left', { signal: { dir: 'in', kind: 'dry' } });
  }),
  // 制御回路（右の縁）
  ...RIGHT.map((id, i): TerminalDef => {
    const y = ry(i);
    if (id === 'RUN' || id === 'FU' || id === 'SO') return sig(id, RIGHT_X, y, 'right', { signal: { dir: 'out', kind: 'npn' } });
    if (id === 'SE' || id === 'SOC') {
      return { id, note: NOTES[id], x: RIGHT_X, y, side: 'right', role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 27, conductors: ['-', '+'] }, optional: true };
    }
    if (id === '10') return { id, note: NOTES[id], x: RIGHT_X, y, side: 'right', role: 'supply', supply: { system: 'DC', voltage: 5, conductor: '+', limitCurrent: 0.01 }, optional: true };
    if (id === '2') return sig(id, RIGHT_X, y, 'right', { signal: { dir: 'in', kind: 'analog-v', ref: '5' } });
    if (id === '4') return sig(id, RIGHT_X, y, 'right', { signal: { dir: 'in', kind: 'analog-i', ref: '5' } });
    return sig(id, RIGHT_X, y, 'right');
  }),
];

const def: DeviceDefinition = {
  type: 'mitsubishi.fr-e820-0.75k',
  name: 'インバーター',
  model: 'FR-E820-0.75K-1',
  maker: '三菱電機',
  category: 'load',
  description:
    '三菱電機の汎用インバーター FR-E800 シリーズ 三相 200V 0.75kW（ND 定格出力電流 5.0A、定格入力電流 7.0A（DC リアクトルなし））。' +
    'R/L1・S/L2・T/L3 に三相 AC200V を入れ、U・V・W からモーターを可変速運転する。接点入力はシンクロジック（出荷時。STF などと SD の間を接点か NPN トランジスタで短絡して ON）、' +
    'RUN・FU はオープンコレクタ出力（共通 SE）、A-B-C は異常出力のリレー接点（AC240V 2A / DC30V 1A）。周波数は 10-2-5 にボリューム、または 2-5 に電圧・4-5 に電流を入れて設定する。' +
    'S1・S2 は安全停止入力（使わない場合は PC と短絡）。',
  labelPrefix: 'INV',
  width: W,
  height: H,
  svg,
  terminals,
  links: [
    // SD は内部で導通
    { from: 'SD', to: 'SD2' },
    // 異常出力: 異常（動作）で A-C 閉・B-C 開
    { from: 'C', to: 'A', switch: 'NO', ratedCurrent: 2 },
    { from: 'C', to: 'B', switch: 'NC', ratedCurrent: 2 },
    // オープンコレクタ出力（シンク）
    { from: 'RUN', to: 'SE', switch: 'output', ratedCurrent: 0.1 },
    { from: 'FU', to: 'SE', switch: 'output', ratedCurrent: 0.1 },
    { from: 'SO', to: 'SOC', switch: 'output', ratedCurrent: 0.1 },
  ],
  distinctGroups: [['R/L1', 'S/L2', 'T/L3']],
  loadCurrent: 7,
  estimated: '制御回路端子の並び（左右の縁）は図面用に整理したもの。実機はカバー内の端子台（取扱説明書 2.6.5）に並ぶ',
};

export default def;
