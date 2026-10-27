import { AZ_MOTOR_CONNECTOR, AZ_MOTOR_OPTIONS, azMotorOf } from '../oriental/az';
import type { DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';

/**
 * オリエンタルモーター αSTEP AZ シリーズ ドライバー AZD-KD（DC 電源入力 24V / 48V、位置決め機能内蔵タイプ）。
 *
 * 出典は src/devices/oriental/az.ts。
 * - CN1（主電源・電磁ブレーキ）: +（DC24V / DC48V ±5%）・−（GND）・MB1・MB2（電磁ブレーキのリード線）。保護接地はフレームの接地端子。
 * - CN4（入出力信号）: 入力 10 点（IN0〜IN9、フォトカプラ。シンク・ソースのどちらにも配線できる）、
 *   出力 6 点（OUT0〜OUT5、フォトカプラ・オープンコレクタ）、エンコーダー出力 ASG・BSG（ラインドライバ）。
 * - CN2: モーター（専用の接続ケーブル）。ほかに USB（データ設定）と RS-485 通信のコネクタがある（この定義では扱わない）。
 *
 * 描き方: 端子は図面用に、CN1 を上、CN4 の入力を左、出力を右の縁、CN2 を下に並べる（1mm ≒ 2px）。
 */

const W = 120;
const H = 230;
const LEFT_X = 6;
const RIGHT_X = W - 6;
const PITCH = 11;
const Y0 = 64;
const yAt = (i: number) => Y0 + i * PITCH;

/** CN1（上）: [ID, 印字, x] */
const CN1: [string, string, number][] = [
  ['MB1', 'MB1', 22],
  ['MB2', 'MB2', 36],
  ['+', '+', 52],
  ['-', '−', 66],
];
const CN1_Y = 7;
const FG = { x: 100, y: 9 };
const CN2 = { x: 60, y: H - 5 };

/** 入力（左）: [ID, 印字, 初期の機能（推定）] */
const INPUTS: [string, string, string][] = [
  ['IN-COM0', 'IN-COM[0-7]', ''],
  ['IN0', 'IN0', 'HOME'],
  ['IN1', 'IN1', 'START'],
  ['IN2', 'IN2', 'M0'],
  ['IN3', 'IN3', 'M1'],
  ['IN4', 'IN4', 'M2'],
  ['IN5', 'IN5', 'FREE'],
  ['IN6', 'IN6', 'STOP'],
  ['IN7', 'IN7', 'ALM-RST'],
  ['IN-COM1', 'IN-COM[8-9]', ''],
  ['IN8', 'IN8', ''],
  ['IN9', 'IN9', ''],
];
/** 出力（右）: [ID, 印字, 初期の機能（推定）] */
const OUTPUTS: [string, string, string][] = [
  ['OUT-COM', 'OUT-COM', ''],
  ['OUT0', 'OUT0', 'HOME-END'],
  ['OUT1', 'OUT1', 'IN-POS'],
  ['OUT2', 'OUT2', 'PLS-RDY'],
  ['OUT3', 'OUT3', 'READY'],
  ['OUT4', 'OUT4', 'MOVE'],
  ['OUT5', 'OUT5', 'ALM-B'],
  ['ASG+', 'ASG+', ''],
  ['ASG-', 'ASG−', ''],
  ['BSG+', 'BSG+', ''],
  ['BSG-', 'BSG−', ''],
  ['GND', 'GND', ''],
];

const FUNC_NOTES: Record<string, string> = {
  HOME: '原点復帰運転の開始',
  START: '位置決め運転の開始',
  M0: '運転データ番号の選択（M0〜M2）',
  M1: '運転データ番号の選択（M0〜M2）',
  M2: '運転データ番号の選択（M0〜M2）',
  FREE: 'モーターの励磁を切り、電磁ブレーキを解放',
  STOP: '運転の停止',
  'ALM-RST': 'アラームの解除',
  'HOME-END': '原点復帰の完了',
  'IN-POS': '位置決めの完了',
  'PLS-RDY': 'パルス入力の準備完了',
  READY: '運転の準備完了',
  MOVE: 'モーターの動作中',
  'ALM-B': 'アラーム（正常時 ON、アラームで OFF）',
};

const svg = (p: ParamValues) => {
  const m = azMotorOf(p.motor);
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2b2d30"/>
      <stop offset="0.5" stop-color="#3b3e42"/>
      <stop offset="1" stop-color="#26282a"/>
    </linearGradient>
    <linearGradient id="green-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3fa35a"/>
      <stop offset="1" stop-color="#2a7a40"/>
    </linearGradient>
  </defs>
  <!-- 本体（前面は黒、左右に放熱の板金） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#body-{{uid}})" stroke="#111" stroke-width="1.2"/>
  <!-- CN1（上、緑のコネクタ） -->
  <rect x="12" y="1" width="64" height="15" rx="1.5" fill="url(#green-{{uid}})" stroke="#1c4d2a" stroke-width="0.7"/>
  ${CN1.map(([, label, x]) => `<rect x="${x - 4}" y="${CN1_Y - 4}" width="8" height="8" rx="1" fill="#16361f"/><circle cx="${x}" cy="${CN1_Y}" r="2.2" fill="#111"/>
  <text x="${x}" y="${CN1_Y + 13.5}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#f0f0f0">${label}</text>`).join('')}
  <text x="44" y="30" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#bbb">CN1 24/48VDC</text>
  <circle cx="${FG.x}" cy="${FG.y}" r="4.5" fill="#d6d6d6" stroke="#555" stroke-width="0.7"/>
  <path d="M${FG.x - 2.6} ${FG.y} H${FG.x + 2.6} M${FG.x} ${FG.y - 2.6} V${FG.y + 2.6}" stroke="#444" stroke-width="1"/>
  <text x="${FG.x}" y="${FG.y + 12}" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#9fd89f">⏚</text>
  <!-- 表示・形名 -->
  <circle cx="44" cy="40" r="2.2" fill="#39d353"/><text x="49" y="41.5" font-family="sans-serif" font-size="3.4" fill="#ccc">PWR/ALM</text>
  <text x="${W / 2}" y="54" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#e8e8e8">ORIENTAL MOTOR</text>
  <!-- CN4（入出力。左右の縁に並べる） -->
  <rect x="1" y="${Y0 - 7}" width="40" height="${(INPUTS.length - 1) * PITCH + 14}" rx="1.5" fill="#d8d9d5" stroke="#888" stroke-width="0.6"/>
  <rect x="${W - 41}" y="${Y0 - 7}" width="40" height="${(OUTPUTS.length - 1) * PITCH + 14}" rx="1.5" fill="#d8d9d5" stroke="#888" stroke-width="0.6"/>
  ${INPUTS.map(
    ([, label, fn], i) => `<rect x="${LEFT_X - 3}" y="${yAt(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${LEFT_X}" cy="${yAt(i)}" r="1.8" fill="#111"/>
  <text x="${LEFT_X + 5}" y="${yAt(i) + (fn ? -0.4 : 1.4)}" font-family="sans-serif" font-size="${label.length > 6 ? 3.2 : 4}" font-weight="bold" fill="#222">${label}</text>${fn ? `<text x="${LEFT_X + 5}" y="${yAt(i) + 4.2}" font-family="sans-serif" font-size="2.8" fill="#666">${fn}</text>` : ''}`,
  ).join('')}
  ${OUTPUTS.map(
    ([, label, fn], i) => `<rect x="${RIGHT_X - 3}" y="${yAt(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${RIGHT_X}" cy="${yAt(i)}" r="1.8" fill="#111"/>
  <text x="${RIGHT_X - 5}" y="${yAt(i) + (fn ? -0.4 : 1.4)}" text-anchor="end" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222">${label}</text>${fn ? `<text x="${RIGHT_X - 5}" y="${yAt(i) + 4.2}" text-anchor="end" font-family="sans-serif" font-size="2.8" fill="#666">${fn}</text>` : ''}`,
  ).join('')}
  <text x="${W / 2}" y="${Y0 + 4}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#bbb">CN4</text>
  <!-- 形名 -->
  <text x="${W / 2}" y="${Y0 + 40}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#f2f2f2" transform="rotate(-90 ${W / 2} ${Y0 + 40})">αSTEP AZ</text>
  <text x="${W / 2}" y="${H - 44}" text-anchor="middle" font-family="sans-serif" font-size="5.2" font-weight="bold" fill="#f2f2f2">AZD-KD</text>
  <text x="${W / 2}" y="${H - 37}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#bbb">${m.frame} 用</text>
  <!-- CN2（モーター） -->
  <rect x="${CN2.x - 12}" y="${CN2.y - 16}" width="24" height="18" rx="2" fill="#111" stroke="#777" stroke-width="0.6"/>
  <rect x="${CN2.x - 8}" y="${CN2.y - 12}" width="16" height="8" rx="1" fill="#444"/>
  <text x="${CN2.x}" y="${CN2.y - 19}" text-anchor="middle" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#f0f0f0">CN2 MOTOR</text>
`;
};

const dc2448 = { system: 'DC' as const, minVoltage: 22.8, maxVoltage: 50.4 };
/** 入出力の共通端子（シンク・ソースのどちらにも配線できる） */
const ioCommon = { system: 'DC' as const, minVoltage: 0, maxVoltage: 26.4, conductors: ['-', '+'] as ('+' | '-')[] };
const sink = (p: ParamValues) => String(p.outLogic) !== 'source';

const terminals = (p: ParamValues): TerminalDef[] => {
  const m = azMotorOf(p.motor);
  const fnNote = (fn: string) => (fn ? `。初期の機能は ${fn}（${FUNC_NOTES[fn]}）。パラメータで割付けを変えられる` : '');
  return [
    ...CN1.map(([id, label, x]): TerminalDef => {
      const base = { id, label, x, y: CN1_Y, side: 'top' as const };
      if (id === '+') return { ...base, role: 'input', accepts: { ...dc2448, conductors: ['+'] }, hint: '主電源+', note: `主電源（DC24V / DC48V ±5%）の＋。入力電流 ${m.inputCurrent}A（${m.frame}）` };
      if (id === '-') return { ...base, role: 'input', accepts: { ...dc2448, conductors: ['-'] }, hint: '主電源−', note: '主電源の GND' };
      return {
        ...base,
        role: 'signal',
        optional: true,
        hint: id === 'MB1' ? 'ブレーキ−' : 'ブレーキ+',
        note: `電磁ブレーキのリード線（${id === 'MB1' ? '黒、−' : '白、＋'}）をつなぐ。ブレーキはドライバーが制御する（電磁ブレーキ付きモーターのみ）`,
      };
    }),
    { id: 'FG', label: '⏚', note: '保護接地（フレームグラウンド）', x: FG.x, y: FG.y, side: 'top', role: 'ground' },
    {
      id: 'CN2',
      label: 'CN2（モーター）',
      note: `AZ シリーズのモーター（${m.frame}AK / ${m.frame}MK）へ、専用の接続ケーブル（モーター・エンコーダー一体）でつなぐ`,
      x: CN2.x,
      y: CN2.y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: AZ_MOTOR_CONNECTOR, pins: 0, width: 16, required: true },
    },
    ...INPUTS.map(([id, label, fn], i): TerminalDef => {
      const base = { id, label, x: LEFT_X, y: yAt(i), side: 'left' as const, optional: true };
      if (id.startsWith('IN-COM'))
        return { ...base, role: 'input', accepts: ioCommon, hint: '入力コモン', note: `入力 ${id === 'IN-COM0' ? 'IN0〜IN7' : 'IN8・IN9'} の共通（シンク入力では +24V、ソース入力では 0V）` };
      const n = Number(id.slice(2));
      return {
        ...base,
        role: 'signal',
        hint: fn || undefined,
        note: `制御入力（フォトカプラ、DC24V）${fnNote(fn)}`,
        signal: { dir: 'in', kind: 'dc', common: n <= 7 ? 'IN-COM0' : 'IN-COM1' },
      };
    }),
    ...OUTPUTS.map(([id, label, fn], i): TerminalDef => {
      const base = { id, label, x: RIGHT_X, y: yAt(i), side: 'right' as const, optional: true };
      if (id === 'OUT-COM')
        return { ...base, role: 'input', accepts: ioCommon, hint: '出力コモン', note: `出力 OUT0〜OUT5 の共通（${sink(p) ? 'シンク出力では 0V' : 'ソース出力では +24V'}）` };
      if (id.startsWith('OUT'))
        return {
          ...base,
          role: 'signal',
          hint: fn || undefined,
          note: `制御出力（フォトカプラ・オープンコレクタ、DC4.5〜30V 40mA 以下）${fnNote(fn)}`,
          signal: { dir: 'out', kind: sink(p) ? 'npn' : 'pnp' },
        };
      if (id === 'GND') return { ...base, role: 'signal', note: 'ASG・BSG の基準（GND）' };
      return { ...base, role: 'signal', note: `エンコーダー出力 ${id.slice(0, 3)} 相（ラインドライバ）`, signal: { dir: 'out', kind: 'line-driver' } };
    }),
  ];
};

const links: InternalLink[] = ['OUT0', 'OUT1', 'OUT2', 'OUT3', 'OUT4', 'OUT5'].map((id) => ({ from: id, to: 'OUT-COM', switch: 'output', ratedCurrent: 0.04 }));

const def: DeviceDefinition = {
  type: 'oriental.azd-kd',
  name: 'ステッピングモータードライバー',
  model: 'AZD-KD',
  maker: 'オリエンタルモーター',
  category: 'load',
  labelPrefix: 'DRV',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  params: [
    { key: 'motor', label: 'モーター', options: AZ_MOTOR_OPTIONS, default: 'AZM46' },
    {
      key: 'outLogic',
      label: '出力の配線',
      options: [
        { value: 'sink', label: 'シンク（OUT-COM を 0V。PLC のプラスコモン入力へ）' },
        { value: 'source', label: 'ソース（OUT-COM を +24V。PLC のマイナスコモン入力へ）' },
      ],
      default: 'sink',
    },
  ],
  distinctGroups: [['+', '-']],
  loadCurrent: (p) => azMotorOf(p.motor).inputCurrent,
  description:
    'オリエンタルモーターのステッピングモーター αSTEP AZ シリーズ（バッテリーレスアブソリュートセンサ搭載）の DC 電源入力ドライバー（位置決め機能内蔵）。' +
    'CN1 の +・− に主電源 DC24V または DC48V（±5%）を入れ、CN2 からモーター（AZM□□AK / MK）を専用の接続ケーブルで駆動する。保護接地は FG へ。' +
    '電磁ブレーキ付きモーター（MK）は、ブレーキのリード線 MB1（黒）・MB2（白）を CN1 の MB1・MB2 につなぐ（ドライバーが制御する）。' +
    'CN4 の入力 IN0〜IN9 はフォトカプラ入力で、IN-COM[0-7]・IN-COM[8-9] を +24V にすればシンク（NPN・接点で 0V へ引き込んで ON）、0V にすればソース。' +
    '出力 OUT0〜OUT5 はフォトカプラ・オープンコレクタ（DC4.5〜30V 40mA）で、OUT-COM の配線でシンク・ソースを選ぶ（パラメータ「出力の配線」）。' +
    'ASG・BSG はエンコーダーの A・B 相のラインドライバ出力。運転データ（位置・速度）はサポートソフト MEXE02（USB）か RS-485 通信で設定し、M0〜M2 で選んで START で運転する。',
  estimated:
    'CN4 のピンの並びと各入出力の初期の機能（HOME・START・IN-POS など）、モーター別の主電源の入力電流（miniドライバ AZD-KRD の値を流用）、外形は推定。' +
    '端子の位置は図面用に整理したもの',
};

export default def;
