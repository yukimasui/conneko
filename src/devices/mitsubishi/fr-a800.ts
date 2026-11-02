/**
 * 三菱電機 インバーター FR-A800 シリーズ 標準品 FR-A820（三相 200V、高機能形）の共通の作り。
 *
 * 出典: 三菱電機 FA サイト「仕様から探す」FR-A820-1 の仕様表、販売店（モノタロウ・アスクル・設備プロ王国など）の仕様表、
 *       FR-A800 取扱説明書（主回路端子・制御回路端子）の抜粋。
 * - 外形: 高さはどの容量も 260mm。幅は FR-A820-0.4K・0.75K が 110mm（奥行 125mm）、1.5K〜3.7K が 150mm（奥行 140mm）。
 * - 定格出力電流（ND、初期設定）: 0.75K 5.0A、1.5K 8.0A、2.2K 11A、3.7K 17.5A（SLD/LD/HD は別の値。Conneko では ND を使う）。
 * - 定格入力電流は販売店の掲載値（0.75K 6.3A、3.7K 22.6A）。1.5K・2.2K は推定。
 * - 主回路端子: R/L1・S/L2・T/L3（電源）、U・V・W（モーター）、R1/L11・S1/L21（制御回路電源。出荷時は R/L1・S/L2 と短絡片）、
 *   P/+・N/-（直流母線）、P1（DC リアクトル。出荷時は P/+ と短絡片）、PR・PX（ブレーキ抵抗器。0.4K〜7.5K は内蔵のブレーキ抵抗器を
 *   PR-PX 間の短絡片で使い、外付けのブレーキ抵抗器を P/+-PR 間につなぐときは PR-PX 間の短絡片を外す）。
 * - 制御回路端子（ばね式）: 接点入力 STF・STR・STP(STOP)・RH・RM・RL・JOG・RT・MRS・RES・AU・CS（共通 SD、シンクロジックが初期）、
 *   リレー出力 A1-B1-C1（異常出力）・A2-B2-C2、オープンコレクタ出力 RUN・SU・IPF・OL・FU（共通 SE）、パルス出力 FM、アナログ出力 AM、
 *   周波数設定 10E・10・2・4・1・5、安全停止入力 S1・S2・SIC（出荷時は S1-PC・S2-PC・SIC-SD 間に短絡線）、安全モニタ出力 SO・SOC。
 *
 * 描き方（1mm = 2px）: FR-E800（src/devices/mitsubishi/fr-e800.ts）と同じく、制御回路端子を左右の縁、主回路端子を下に並べる。
 * 端子 ID は FR-E820 と共通のもの（R/L1・U・STF・SD・A・RUN・2・5 など）をそろえ、A800 にだけある端子を足した
 * （FR-E820 の異常出力 A・B・C は、A800 では A1・B1・C1 と印字されるが、機種を変えても配線が残るように ID を A・B・C にして印字を A1・B1・C1 にした）。
 */
import type { DeviceDefinition, TerminalDef } from '../types';

export interface FrA800Spec {
  type: string;
  /** 容量の記号（'0.75K' など） */
  capacity: string;
  /** 海外形名の容量コード（'00077' など。説明に書く） */
  code: string;
  /** 適用モーター容量[kW]（ND） */
  kw: number;
  /** 定格出力電流[A]（ND） */
  outputCurrent: number;
  /** 定格入力電流[A]（ND・DC リアクトルなし） */
  inputCurrent: number;
  /** 外形の幅[mm]（110 / 150） */
  widthMm: number;
  /** 奥行[mm] */
  depthMm: number;
  /** 推定の値（機器定義の estimated に書く） */
  estimated: string;
}

const H = 520;
/** 左の縁（接点入力・安全停止入力）: [ID, 印字] */
const LEFT: [string, string][] = [
  ['STF', 'STF'],
  ['STR', 'STR'],
  ['STP', 'STP(STOP)'],
  ['RH', 'RH'],
  ['RM', 'RM'],
  ['RL', 'RL'],
  ['JOG', 'JOG'],
  ['RT', 'RT'],
  ['MRS', 'MRS'],
  ['RES', 'RES'],
  ['AU', 'AU'],
  ['CS', 'CS'],
  ['SD', 'SD'],
  ['PC', 'PC'],
  ['S1', 'S1'],
  ['S2', 'S2'],
  ['SIC', 'SIC'],
];
/** 右の縁（リレー出力・オープンコレクタ出力・パルス / アナログ出力・周波数設定）: [ID, 印字] */
const RIGHT: [string, string][] = [
  ['A', 'A1'],
  ['B', 'B1'],
  ['C', 'C1'],
  ['A2', 'A2'],
  ['B2', 'B2'],
  ['C2', 'C2'],
  ['RUN', 'RUN'],
  ['SU', 'SU'],
  ['IPF', 'IPF'],
  ['OL', 'OL'],
  ['FU', 'FU'],
  ['SE', 'SE'],
  ['SO', 'SO'],
  ['SOC', 'SOC'],
  ['FM', 'FM'],
  ['SD2', 'SD'],
  ['AM', 'AM'],
  ['10E', '10E'],
  ['10', '10'],
  ['2', '2'],
  ['4', '4'],
  ['1', '1'],
  ['5', '5'],
];
const LEFT_Y0 = 150;
const RIGHT_Y0 = 120;
const PITCH = 11;
const ly = (i: number) => LEFT_Y0 + i * PITCH;
const ry = (i: number) => RIGHT_Y0 + i * PITCH;

/** 主回路（下段）と直流母線・制御回路電源（上段） */
const MAIN = ['R/L1', 'S/L2', 'T/L3', 'U', 'V', 'W'];
const UPPER = ['R1/L11', 'S1/L21', 'N/-', 'P1', 'P/+', 'PR', 'PX'];
const MAIN_Y = 488;
const UPPER_Y = 452;
const EARTH_Y = 510;

const NOTES: Record<string, string> = {
  STF: '正転始動',
  STR: '逆転始動',
  STP: '始動自己保持選択（3 ワイヤ運転の停止）',
  RH: '多段速度選択（高速）',
  RM: '多段速度選択（中速）',
  RL: '多段速度選択（低速）',
  JOG: 'JOG 運転選択',
  RT: '第 2 機能選択',
  MRS: '出力停止',
  RES: 'リセット',
  AU: '端子 4 入力選択（電流入力を有効にする）',
  CS: '瞬停再始動選択',
  SD: '接点入力コモン（シンク）・DC24V 電源のコモン',
  SD2: 'FM・接点入力のコモン。SD と内部で導通',
  PC: 'DC24V 電源（0.1A）。ソースロジックの接点入力コモン。出荷時は S1・S2 と短絡線',
  S1: '安全停止入力（チャンネル 1）。使わない場合は PC と短絡（出荷時は短絡線あり）',
  S2: '安全停止入力（チャンネル 2）。使わない場合は PC と短絡（出荷時は短絡線あり）',
  SIC: '安全停止入力のコモン（出荷時は SD と短絡線）',
  A: 'リレー出力 1（異常出力）a 接点側。異常で A1-C1 導通',
  B: 'リレー出力 1（異常出力）b 接点側。正常時 B1-C1 導通',
  C: 'リレー出力 1（異常出力）の共通',
  A2: 'リレー出力 2 a 接点側（初期は運転中）',
  B2: 'リレー出力 2 b 接点側',
  C2: 'リレー出力 2 の共通',
  RUN: 'インバータ運転中（オープンコレクタ、DC24V 0.1A）',
  SU: '周波数到達（オープンコレクタ、DC24V 0.1A）',
  IPF: '瞬時停電（オープンコレクタ、DC24V 0.1A）',
  OL: '過負荷警報（オープンコレクタ、DC24V 0.1A）',
  FU: '周波数検出（オープンコレクタ、DC24V 0.1A）',
  SE: 'オープンコレクタ出力の共通',
  SO: '安全モニタ出力（オープンコレクタ、DC24V 0.1A）',
  SOC: '安全モニタ出力の共通',
  FM: '計器用パルス出力',
  AM: 'アナログ電圧出力（0〜±10V、1mA）',
  '10E': '周波数設定用電源（DC10V、10mA）',
  '10': '周波数設定用電源（DC5V、10mA）',
  '2': '周波数設定（電圧 0〜5V / 0〜10V）',
  '4': '周波数設定（電流 4〜20mA。AU 信号で有効）',
  '1': '周波数設定の補助（電圧 0〜±10V）',
  '5': '周波数設定・アナログ出力の共通（SD・SE とは絶縁）',
  'R1/L11': '制御回路電源（出荷時は R/L1 と短絡片。別電源にするときは短絡片を外す）',
  'S1/L21': '制御回路電源（出荷時は S/L2 と短絡片。別電源にするときは短絡片を外す）',
  'N/-': '直流母線（−）。ブレーキユニット・電源回生コンバータ用',
  P1: 'DC リアクトル接続（出荷時は P/+ と短絡片）',
  'P/+': '直流母線（＋）。ブレーキ抵抗器・ブレーキユニット・DC リアクトル用',
  PR: 'ブレーキ抵抗器接続（外付けのブレーキ抵抗器は P/+-PR 間。そのときは PR-PX 間の短絡片を外す）',
  PX: '内蔵ブレーキ抵抗器（出荷時は PR と短絡片で内蔵のブレーキ抵抗器を使う）',
};

const HINTS: Record<string, string> = {
  STF: '正転',
  STR: '逆転',
  STP: '自己保持',
  MRS: '出力停止',
  RES: 'リセット',
  SD: '入力コモン',
  PC: '+24V',
  S1: '安全停止1',
  S2: '安全停止2',
  SIC: '安全コモン',
  A: '異常 a',
  B: '異常 b',
  C: '異常 共通',
  RUN: '運転中',
  SU: '周波数到達',
  SE: '出力コモン',
  '10': '設定電源',
  '2': '電圧設定',
  '4': '電流設定',
  '5': '設定コモン',
  'R1/L11': '制御電源',
  'S1/L21': '制御電源',
};

const screw = (x: number, y: number, r = 6.5) => `
  <rect x="${x - r - 2.5}" y="${y - r - 2.5}" width="${2 * r + 5}" height="${2 * r + 5}" rx="1.2" fill="#3a3a3a"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#ascrew-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

/** ばね式の制御回路端子（差込口と解除ボタン） */
const spring = (x: number, y: number, side: 'left' | 'right') => {
  const dx = side === 'left' ? 1 : -1;
  return `
  <rect x="${x - 4.2}" y="${y - 4}" width="8.4" height="8" rx="1" fill="#2a2a2a" stroke="#555" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="2.4" fill="#111"/>
  <rect x="${x + dx * 5.4 - 1.7}" y="${y - 2.8}" width="3.4" height="5.6" rx="0.6" fill="#f2b417"/>`;
};

const ac200: TerminalDef['accepts'] = { system: 'AC', minVoltage: 170, maxVoltage: 264 };
const RST = ['R', 'S', 'T'] as const;

/** FR-A820 の機器定義を作る */
export function buildFrA800(s: FrA800Spec): DeviceDefinition {
  const W = s.widthMm * 2;
  const LEFT_X = 6;
  const RIGHT_X = W - 6;
  const cx = W / 2;
  // 主回路の端子ネジの x（幅に合わせて広げる）
  const span = W - 44;
  const MAIN_X = MAIN.map((_, i) => +(22 + (span * i) / (MAIN.length - 1)).toFixed(2));
  const UPPER_X = UPPER.map((_, i) => +(22 + (span * i) / (UPPER.length - 1)).toFixed(2));
  const ux = (id: string) => UPPER_X[UPPER.indexOf(id)];
  // 接地端子は主回路の端子の間（印字と重ならない位置）
  const EARTH_X = [+((MAIN_X[0] + MAIN_X[1]) / 2).toFixed(2), +((MAIN_X[4] + MAIN_X[5]) / 2).toFixed(2)];
  const model = `FR-A820-${s.capacity}-1`;
  // 操作パネル（FR-DU08）の大きさ
  const pw = 150;
  const px = cx - pw / 2;

  const svg = `
  <defs>
    <linearGradient id="abody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d4d6d3"/>
      <stop offset="0.5" stop-color="#eceeeb"/>
      <stop offset="1" stop-color="#cfd1ce"/>
    </linearGradient>
    <linearGradient id="acover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8e9e6"/>
      <stop offset="1" stop-color="#d9dad7"/>
    </linearGradient>
    <linearGradient id="apanel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4b5058"/>
      <stop offset="1" stop-color="#2a2e34"/>
    </linearGradient>
    <radialGradient id="adial-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#f6f6f4"/>
      <stop offset="1" stop-color="#9a9b97"/>
    </radialGradient>
    <radialGradient id="ascrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- 本体（冷却フィンの上に樹脂のカバー） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="5" fill="url(#abody-{{uid}})" stroke="#8c8d89" stroke-width="1.2"/>
  <g fill="#b6b8b4">${Array.from({ length: Math.floor((W - 40) / 9) }, (_, i) => `<rect x="${22 + i * 9}" y="4" width="5" height="2.4" rx="1.1"/>`).join('')}</g>
  <!-- 前面カバー（上段）の合わせ目 -->
  <path d="M10 104 H${W - 10}" stroke="#a9aba7" stroke-width="0.8"/>
  <!-- 操作パネル FR-DU08（5 桁 LED・M ダイヤル・操作キー） -->
  <rect x="${px}" y="14" width="${pw}" height="80" rx="4" fill="url(#apanel-{{uid}})" stroke="#1d2024" stroke-width="0.9"/>
  <rect x="${px + 8}" y="21" width="76" height="22" rx="1.2" fill="#160d0b" stroke="#000" stroke-width="0.5"/>
  <text x="${px + 81}" y="38.5" text-anchor="end" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ff5a3c">60.00</text>
  ${['Hz', 'A', 'V', 'MON'].map((t, i) => `<circle cx="${px + 90}" cy="${23 + i * 5.6}" r="1.3" fill="${i === 0 ? '#ff5a3c' : '#6a6f76'}"/><text x="${px + 93}" y="${24.4 + i * 5.6}" font-family="sans-serif" font-size="3.4" fill="#cfd3d8">${t}</text>`).join('')}
  ${[
    ['PU', 'EXT'],
    ['MODE', ''],
    ['ESC', ''],
  ]
    .map(([a, b], i) => `<rect x="${px + 8 + i * 26}" y="50" width="23" height="12" rx="1.5" fill="#e6e8eb" stroke="#8a8f96" stroke-width="0.5"/>
  <text x="${px + 19.5 + i * 26}" y="${b ? 55 : 58}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#333">${a}</text>${b ? `<text x="${px + 19.5 + i * 26}" y="60" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#333">${b}</text>` : ''}`)
    .join('')}
  ${[
    ['FWD', '#1a7a2a'],
    ['REV', '#1a7a2a'],
    ['STOP', '#c22'],
  ]
    .map(([a, c], i) => `<rect x="${px + 8 + i * 26}" y="68" width="23" height="12" rx="1.5" fill="#e6e8eb" stroke="#8a8f96" stroke-width="0.5"/>
  <text x="${px + 19.5 + i * 26}" y="75.6" text-anchor="middle" font-family="sans-serif" font-size="${a === 'STOP' ? 3.4 : 4}" font-weight="bold" fill="${c}">${a}</text>`)
    .join('')}
  <text x="${px + 73.5}" y="88" text-anchor="middle" font-family="sans-serif" font-size="2.8" fill="#cfd3d8">RESET</text>
  <circle cx="${px + 122}" cy="54" r="24" fill="#202328"/>
  <circle cx="${px + 122}" cy="54" r="20.5" fill="url(#adial-{{uid}})" stroke="#666" stroke-width="0.6"/>
  ${Array.from({ length: 16 }, (_, i) => {
    const a = (i * 22.5 * Math.PI) / 180;
    return `<line x1="${(px + 122 + Math.sin(a) * 13).toFixed(2)}" y1="${(54 - Math.cos(a) * 13).toFixed(2)}" x2="${(px + 122 + Math.sin(a) * 19).toFixed(2)}" y2="${(54 - Math.cos(a) * 19).toFixed(2)}" stroke="#7a7a7a" stroke-width="1.2"/>`;
  }).join('')}
  <circle cx="${px + 122}" cy="54" r="8.5" fill="#dcdcda" stroke="#888" stroke-width="0.5"/>
  <rect x="${px + 112}" y="82" width="20" height="8" rx="1.4" fill="#e6e8eb" stroke="#8a8f96" stroke-width="0.5"/>
  <text x="${px + 122}" y="87.6" text-anchor="middle" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">SET</text>
  <!-- ロゴ・形名（前面カバー） -->
  <g transform="translate(${cx - 46} 116)">
    <path d="M3 0 L4.6 2.8 L3 5.6 L1.4 2.8 Z M3 5.6 L0 5.6 L-1.6 8.4 L1.6 8.4 Z M3 5.6 L6 5.6 L7.6 8.4 L4.4 8.4 Z" fill="#e60012"/>
  </g>
  <text x="${cx - 36}" y="121" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="${cx - 36}" y="126" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">ELECTRIC</text>
  <text x="${cx}" y="146" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#222">FREQROL-A800</text>
  <text x="${cx}" y="160" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#333">${model}</text>
  <text x="${cx}" y="170" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#555">INVERTER 3φ200V ${s.kw}kW (ND)</text>
  <!-- 前面カバー（下段。中に制御回路の端子台） -->
  <rect x="34" y="180" width="${W - 68}" height="236" rx="3" fill="url(#acover-{{uid}})" stroke="#a5a6a2" stroke-width="0.7"/>
  <g stroke="#c3c4c0" stroke-width="0.9">${Array.from({ length: 9 }, (_, i) => `<path d="M44 ${200 + i * 22} H${W - 44 - (i % 3) * 12}"/>`).join('')}</g>
  <text x="${cx}" y="404" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#666">CHARGE</text>
  <circle cx="${cx}" cy="394" r="3" fill="#7a1a12" stroke="#333" stroke-width="0.5"/>
  <!-- 左右の縁の制御回路端子（図面用に並べた） -->
  <rect x="${LEFT_X - 5}" y="${LEFT_Y0 - 8}" width="30" height="${(LEFT.length - 1) * PITCH + 16}" rx="1.5" fill="#cfd0cc" stroke="#9a9b97" stroke-width="0.6"/>
  <rect x="${RIGHT_X - 25}" y="${RIGHT_Y0 - 8}" width="30" height="${(RIGHT.length - 1) * PITCH + 16}" rx="1.5" fill="#cfd0cc" stroke="#9a9b97" stroke-width="0.6"/>
  ${LEFT.map(
    ([, label], i) => `${spring(LEFT_X + 1, ly(i), 'left')}
  <text x="${LEFT_X + 10}" y="${ly(i) + 1.7}" font-family="sans-serif" font-size="${label.length > 5 ? 3.2 : 4.4}" font-weight="bold" fill="#222">${label}</text>`,
  ).join('')}
  ${RIGHT.map(
    ([, label], i) => `${spring(RIGHT_X - 1, ry(i), 'right')}
  <text x="${RIGHT_X - 10}" y="${ry(i) + 1.7}" text-anchor="end" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#222">${label}</text>`,
  ).join('')}
  <!-- 主回路端子台 -->
  <rect x="4" y="${UPPER_Y - 14}" width="${W - 8}" height="${H - UPPER_Y + 10}" rx="2" fill="#2f3033"/>
  ${UPPER.map((id) => screw(ux(id), UPPER_Y, 5.5) + `<text x="${ux(id)}" y="${UPPER_Y + 13}" text-anchor="middle" font-family="sans-serif" font-size="${id.length > 4 ? 3.4 : 4}" font-weight="bold" fill="#fff">${id}</text>`).join('')}
  <!-- 短絡片（P1-P/+、PR-PX） -->
  <rect x="${ux('P1') - 3}" y="${UPPER_Y - 4}" width="${ux('P/+') - ux('P1') + 6}" height="8" rx="1.5" fill="#b87333" opacity="0.85"/>
  <rect x="${ux('PR') - 3}" y="${UPPER_Y - 4}" width="${ux('PX') - ux('PR') + 6}" height="8" rx="1.5" fill="#b87333" opacity="0.85"/>
  ${MAIN.map((id, i) => screw(MAIN_X[i], MAIN_Y) + `<text x="${MAIN_X[i]}" y="${MAIN_Y + 13}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#fff">${id}</text>`).join('')}
  ${EARTH_X.map((x) => screw(x, EARTH_Y, 4.5)).join('')}
  <text x="${cx}" y="${EARTH_Y + 2}" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#fff">⏚</text>
`;

  const sig = (id: string, label: string, x: number, y: number, side: 'left' | 'right', extra: Partial<TerminalDef> = {}): TerminalDef => ({
    id,
    ...(label !== id ? { label } : {}),
    note: NOTES[id],
    ...(HINTS[id] ? { hint: HINTS[id] } : {}),
    x,
    y,
    side,
    role: 'signal',
    optional: true,
    ...extra,
  });

  const terminals: TerminalDef[] = [
    ...MAIN.slice(0, 3).map((id, i): TerminalDef => ({ id, x: MAIN_X[i], y: MAIN_Y, side: 'bottom', role: 'input', accepts: ac200, note: '電源入力（三相 AC200〜240V）' })),
    ...MAIN.slice(3).map(
      (id, i): TerminalDef => ({
        id,
        x: MAIN_X[i + 3],
        y: MAIN_Y,
        side: 'bottom',
        role: 'supply',
        supply: { system: 'AC', voltage: 200, conductor: RST[i], limitCurrent: s.outputCurrent },
        note: `インバータ出力（モーターへ。ND 定格出力電流 ${s.outputCurrent.toFixed(1)}A）`,
      }),
    ),
    ...UPPER.map((id): TerminalDef => {
      if (id === 'R1/L11' || id === 'S1/L21')
        return { id, note: NOTES[id], hint: HINTS[id], x: ux(id), y: UPPER_Y, side: 'top', role: 'input', accepts: ac200, optional: true };
      return { id, note: NOTES[id], x: ux(id), y: UPPER_Y, side: 'top', role: 'signal', optional: true };
    }),
    { id: 'E', label: '⏚', note: '接地', x: EARTH_X[0], y: EARTH_Y, side: 'bottom', role: 'ground' },
    { id: 'E2', label: '⏚', note: '接地（モーターの接地用）', x: EARTH_X[1], y: EARTH_Y, side: 'bottom', role: 'ground', optional: true },
    ...LEFT.map(([id, label], i): TerminalDef => {
      const y = ly(i);
      if (id === 'PC') return { id, note: NOTES[id], hint: HINTS[id], x: LEFT_X, y, side: 'left', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1 }, optional: true };
      if (id === 'SD') return { id, note: NOTES[id], hint: HINTS[id], x: LEFT_X, y, side: 'left', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: 0.1 }, optional: true };
      if (id === 'S1' || id === 'S2' || id === 'SIC') return sig(id, label, LEFT_X, y, 'left');
      // 接点入力（シンクロジック。SD との間を接点・NPN トランジスタで短絡して ON）
      return sig(id, label, LEFT_X, y, 'left', { signal: { dir: 'in', kind: 'dry' } });
    }),
    ...RIGHT.map(([id, label], i): TerminalDef => {
      const y = ry(i);
      if (['RUN', 'SU', 'IPF', 'OL', 'FU', 'SO'].includes(id)) return sig(id, label, RIGHT_X, y, 'right', { signal: { dir: 'out', kind: 'npn' } });
      if (id === 'SE' || id === 'SOC')
        return { id, note: NOTES[id], hint: HINTS[id], x: RIGHT_X, y, side: 'right', role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 27, conductors: ['-', '+'] }, optional: true };
      if (id === '10') return { id, note: NOTES[id], hint: HINTS[id], x: RIGHT_X, y, side: 'right', role: 'supply', supply: { system: 'DC', voltage: 5, conductor: '+', limitCurrent: 0.01 }, optional: true };
      if (id === '10E') return { id, note: NOTES[id], x: RIGHT_X, y, side: 'right', role: 'supply', supply: { system: 'DC', voltage: 10, conductor: '+', limitCurrent: 0.01 }, optional: true };
      if (id === '2') return sig(id, label, RIGHT_X, y, 'right', { signal: { dir: 'in', kind: 'analog-v', ref: '5' } });
      if (id === '1') return sig(id, label, RIGHT_X, y, 'right', { signal: { dir: 'in', kind: 'analog-v', ref: '5' } });
      if (id === '4') return sig(id, label, RIGHT_X, y, 'right', { signal: { dir: 'in', kind: 'analog-i', ref: '5' } });
      if (id === 'AM') return sig(id, label, RIGHT_X, y, 'right', { signal: { dir: 'out', kind: 'analog-v' } });
      return sig(id, label, RIGHT_X, y, 'right');
    }),
  ];

  return {
    type: s.type,
    name: 'インバーター',
    model,
    maker: '三菱電機',
    category: 'load',
    description:
      `三菱電機の高機能インバーター FR-A800 シリーズ 三相 200V ${s.kw}kW（FR-A820-${s.code}。ND 定格出力電流 ${s.outputCurrent.toFixed(1)}A、定格入力電流 ${s.inputCurrent}A（DC リアクトルなし）。` +
      `外形 W${s.widthMm} × H260 × D${s.depthMm}mm）。R/L1・S/L2・T/L3 に三相 AC200V を入れ、U・V・W からモーターを可変速運転する（ベクトル制御・PM モーター制御にも対応）。` +
      '制御回路電源 R1/L11・S1/L21 は出荷時に R/L1・S/L2 と短絡片でつながっている（停電中もモニタ・異常出力を保ちたいときは短絡片を外して別電源を入れる）。' +
      '接点入力はシンクロジック（出荷時。STF などと SD の間を接点か NPN トランジスタで短絡して ON）、RUN・SU・IPF・OL・FU はオープンコレクタ出力（共通 SE）、' +
      'A1-B1-C1 は異常出力、A2-B2-C2 はリレー出力（どちらも AC230V 0.3A / DC30V 0.3A）。周波数は 10-2-5 にボリューム、2-5 に電圧、4-5 に電流（AU を ON）を入れて設定する。' +
      'S1・S2 は安全停止入力（使わない場合は PC と短絡、SIC は SD と短絡）。' +
      'ブレーキ抵抗器を内蔵しており（PR-PX 間の短絡片）、高頻度の制動には外付けのブレーキ抵抗器（MRS 形・FR-ABR 形）を P/+-PR 間につなぐ（そのときは PR-PX 間の短絡片を外す）。',
    labelPrefix: 'INV',
    width: W,
    height: H,
    svg,
    terminals,
    links: [
      { from: 'SD', to: 'SD2' },
      { from: 'C', to: 'A', switch: 'NO', ratedCurrent: 0.3 },
      { from: 'C', to: 'B', switch: 'NC', ratedCurrent: 0.3 },
      { from: 'C2', to: 'A2', switch: 'NO', ratedCurrent: 0.3 },
      { from: 'C2', to: 'B2', switch: 'NC', ratedCurrent: 0.3 },
      ...['RUN', 'SU', 'IPF', 'OL', 'FU'].map((id) => ({ from: id, to: 'SE', switch: 'output' as const, ratedCurrent: 0.1 })),
      { from: 'SO', to: 'SOC', switch: 'output', ratedCurrent: 0.1 },
    ],
    distinctGroups: [
      ['R/L1', 'S/L2', 'T/L3'],
      ['R1/L11', 'S1/L21'],
    ],
    loadCurrent: s.inputCurrent,
    estimated: s.estimated,
  };
}

/** 制御回路端子の並びの説明（各容量の estimated の頭に付ける） */
export const FR_A800_LAYOUT_NOTE =
  '制御回路端子・主回路端子の並びは図面用に整理したもの（実機は前面カバー内の端子台に並ぶ）。リレー出力の定格（AC230V 0.3A / DC30V 0.3A）は推定';
