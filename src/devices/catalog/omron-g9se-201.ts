import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * オムロン セーフティリレーユニット G9SE-201（安全出力 2a、補助出力 1 点、Push-In Plus 端子）。
 * 外形は 幅17.5 × 高さ124（取付けタブ込み約 144.5）× 奥行109mm（1mm ≒ 2px、上下のタブは短く描く）。
 * 赤い筐体の正面上部に黒い表示パネル（OMRON・Sti ロゴ、形式、24VDC、LED: PWR・IN1・IN2・OUT）、
 * 下部に Push-In Plus 端子が 2 列の千鳥で並ぶ（各端子は四角い解除穴の下に丸い電線差込口）。
 *
 * 端子配列（データシート J198「Terminal Arrangement」、上から 左列｜右列。右列は半ピッチ下がる）:
 *   A1|A2, T11|T12, T21|T22, T31|T32, T33|X1, (空き)|(空き), (空き)|(空き), 13|14, 23|24
 */

const W = 36;
const H = 266;
const BODY_Y0 = 9;
const BODY_Y1 = 257;

const COL_L = 12;
const COL_R = 24.5;
const ROW0 = 96;
const PITCH = 15.6;
const leftY = (i: number) => +(ROW0 + i * PITCH).toFixed(1);
const rightY = (i: number) => +(ROW0 + PITCH / 2 + i * PITCH).toFixed(1);

/** 行ごとの端子（null は端子のない空き位置） */
const ROWS: [string | null, string | null][] = [
  ['A1', 'A2'],
  ['T11', 'T12'],
  ['T21', 'T22'],
  ['T31', 'T32'],
  ['T33', 'X1'],
  [null, null],
  [null, null],
  ['13', '14'],
  ['23', '24'],
];

const text = (x: number, y: number, t: string, size: number, fill = '#f2f2f2', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** Push-In Plus 端子 1 極（上に解除穴、下に電線差込口）。端子位置は差込口の中心 */
const pushIn = (x: number, y: number, used: boolean) => `
  <rect x="${x - 2.6}" y="${y - 9}" width="5.2" height="3.4" rx="0.8" fill="${used ? '#3c3f43' : '#2a2c2f'}" stroke="#0c0c0c" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="4.3" fill="${used ? '#0a0a0a' : '#1c1d1f'}" stroke="#5a5d61" stroke-width="0.7"/>
  ${used ? `<circle cx="${x}" cy="${y}" r="2.1" fill="#2e3033"/>` : ''}`;

/** LED（PWR は点灯、ほかは消灯で描く） */
const led = (y: number, name: string, on: string, lit: boolean) => `
  <rect x="21" y="${y - 3.4}" width="3.2" height="4.4" rx="0.5" fill="${lit ? on : '#4a2a22'}" stroke="#000" stroke-width="0.3"/>
  ${text(25.3, y, name, 2.9, '#e8e8e8', 'start', 'normal')}`;

const svg = `
  <defs>
    <linearGradient id="red-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a31512"/>
      <stop offset="0.15" stop-color="#d42420"/>
      <stop offset="0.85" stop-color="#cf221e"/>
      <stop offset="1" stop-color="#9a1310"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2b2d"/>
      <stop offset="1" stop-color="#151617"/>
    </linearGradient>
  </defs>

  <!-- 取付けタブ（上下） -->
  <rect x="9" y="0" width="18" height="12" rx="2" fill="#1b1c1d"/>
  <circle cx="18" cy="5" r="2.6" fill="#8d9298"/>
  <rect x="9" y="${H - 12}" width="18" height="12" rx="2" fill="#1b1c1d"/>
  <circle cx="18" cy="${H - 5}" r="2.6" fill="#8d9298"/>

  <!-- 赤い筐体 -->
  <rect x="0.5" y="${BODY_Y0}" width="${W - 1}" height="${BODY_Y1 - BODY_Y0}" rx="2" fill="url(#red-{{uid}})" stroke="#5e0b09" stroke-width="0.8"/>

  <!-- 表示パネル -->
  <rect x="3" y="${BODY_Y0 + 3}" width="${W - 6}" height="62" rx="1" fill="url(#panel-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${text(4.5, 20, 'OMRON', 3.9, '#f2f2f2', 'start')}
  ${text(4.5, 28.5, 'Sti', 6, '#f2f2f2', 'start')}
  ${text(4.5, 40, 'G9SE', 4, '#f2f2f2', 'start')}
  ${text(4.5, 45, '-201', 4, '#f2f2f2', 'start')}
  ${text(4.5, 54, '24VDC', 3.4, '#f2f2f2', 'start')}
  ${led(26, 'PWR', '#38d24f', true)}
  ${led(34, 'IN1', '#ff6a2a', false)}
  ${led(42, 'IN2', '#ff6a2a', false)}
  ${led(50, 'OUT', '#ff6a2a', false)}

  <!-- Push-In Plus 端子部 -->
  <rect x="3" y="78" width="${W - 6}" height="${BODY_Y1 - 84}" rx="1" fill="#1d1e20" stroke="#000" stroke-width="0.5"/>
  ${ROWS.map(([l, r], i) => pushIn(COL_L, leftY(i), !!l) + pushIn(COL_R, rightY(i), !!r)).join('')}
  ${ROWS.map(([l, r], i) => (l ? text(COL_L - 5.6, leftY(i) - 5.6, l, 3.1, '#f2f2f2', 'start') : '') + (r ? text(COL_R + 5.4, rightY(i) - 5.6, r, 3.1, '#f2f2f2', 'end') : '')).join('')}
`;

const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const LABELS: Record<string, string> = {
  T11: 'T11（テスト出力 CH1）',
  T12: 'T12（安全入力 CH1）',
  T21: 'T21（テスト出力 CH2）',
  T22: 'T22（安全入力 CH2）',
  T31: 'T31（リセット・フィードバック入力）',
  T32: 'T32（手動リセット入力）',
  T33: 'T33（自動リセット入力）',
  X1: 'X1（補助出力 PNP 100mA・非安全）',
  '13': '13（安全出力 1）',
  '14': '14（安全出力 1）',
  '23': '23（安全出力 2）',
  '24': '24（安全出力 2）',
};

const terminal = (id: string, x: number, y: number, side: 'left' | 'right'): TerminalDef => {
  if (id === 'A1') return { id, label: 'A1（+24V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
  if (id === 'A2') return { id, label: 'A2（0V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
  return { id, label: LABELS[id], x, y, side, role: 'signal', optional: true };
};

const def: DeviceDefinition = {
  type: 'omron.g9se-201',
  name: 'セーフティリレーユニット',
  model: 'G9SE-201',
  maker: 'オムロン',
  category: 'control',
  description:
    'オムロン G9SE シリーズのセーフティリレーユニット（幅17.5mm、Push-In Plus 端子）。電源 A1(+)/A2(−) は DC24V（−15%/+10%）。安全出力はリレー接点 2a（13-14、23-24、AC250V/DC30V 5A）、補助出力 X1（PNP）。PL e / カテゴリ4、SIL3。' +
    '2 チャンネル入力: 非常停止の b 接点 1 回路目を T11-T12、2 回路目を T21-T22 に接続する（テストパルスで入力間短絡を検出）。' +
    '手動リセット: T31 → リセットスイッチ → 接触器 KM1・KM2 の b 接点（ミラー接点）→ T32 を直列に配線し、T33 を +24V に接続。自動リセット: T31 → KM の b 接点 → T33、T32 を +24V に接続。' +
    '出力: +24V → 13-14 → KM1 コイル、+24V → 23-24 → KM2 コイルのように 2 台の接触器を駆動する。図では接点 13-14・23-24 を閉とみなす。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg,
  terminals: ROWS.flatMap(([l, r], i) => [
    ...(l ? [terminal(l, COL_L, leftY(i), 'left')] : []),
    ...(r ? [terminal(r, COL_R, rightY(i), 'right')] : []),
  ]),
  links: [
    { from: '13', to: '14' },
    { from: '23', to: '24' },
  ],
  // 消費電力 3W 以下 / 24V
  loadCurrent: 0.13,
};

export default def;
