import type { DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * オムロン セーフティリレーユニット G9SE-221-T05
 * （瞬時安全出力 2a ＋ オフディレー安全出力 2a、補助出力 1 点、Push-In Plus 端子、オフディレー 0〜5 秒）。
 * 外形は 幅22.5 × 高さ124（取付けタブ込み約 144.5）× 奥行109mm（1mm ≒ 2px、上下のタブは短く描く）。
 * 赤い筐体の正面上部に黒い表示パネル（OMRON・Sti ロゴ、形式、24VDC、LED: PWR・IN1・IN2・OUT1・OUT2、
 * オフディレー時間設定用ロータリスイッチ）、下部に Push-In Plus 端子が 2 列の千鳥で並ぶ。
 *
 * 端子配列（データシート J198「Terminal Arrangement」、上から 左列｜右列。右列は半ピッチ下がる）:
 *   A1|A2, T11|T12, T21|T22, T31|T32, T33|X1, 13|14, 23|24, 37|38, 47|48
 */

const W = 46;
const H = 266;
const BODY_Y0 = 9;
const BODY_Y1 = 257;

const COL_L = 15;
const COL_R = 31;
const ROW0 = 108;
const PITCH = 15.4;
const leftY = (i: number) => +(ROW0 + i * PITCH).toFixed(1);
const rightY = (i: number) => +(ROW0 + PITCH / 2 + i * PITCH).toFixed(1);

const ROWS: [string, string][] = [
  ['A1', 'A2'],
  ['T11', 'T12'],
  ['T21', 'T22'],
  ['T31', 'T32'],
  ['T33', 'X1'],
  ['13', '14'],
  ['23', '24'],
  ['37', '38'],
  ['47', '48'],
];

/** オフディレー時間の目盛（T05: 0〜5 秒の 16 段階。インストラクションシートの設定値。工場出荷時は 0） */
const DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5];

const text = (x: number, y: number, t: string, size: number, fill = '#f2f2f2', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const pushIn = (x: number, y: number) => `
  <rect x="${x - 2.6}" y="${y - 9}" width="5.2" height="3.4" rx="0.8" fill="#3c3f43" stroke="#0c0c0c" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="4.3" fill="#0a0a0a" stroke="#5a5d61" stroke-width="0.7"/>
  <circle cx="${x}" cy="${y}" r="2.1" fill="#2e3033"/>`;

const led = (y: number, name: string, on: string, lit: boolean) => `
  <rect x="30" y="${y - 3.4}" width="3.2" height="4.4" rx="0.5" fill="${lit ? on : '#4a2a22'}" stroke="#000" stroke-width="0.3"/>
  ${text(34.3, y, name, 2.9, '#e8e8e8', 'start', 'normal')}`;

/** オフディレー時間設定ロータリスイッチ（目盛を円周に並べ、選んだ値をポインタで指す） */
const dial = (delay: number) => {
  const cx = 27;
  const cy = 80;
  const found = DELAYS.indexOf(delay);
  const idx = found < 0 ? DELAYS.indexOf(1) : found;
  const angle = (i: number) => -150 + (i * 300) / (DELAYS.length - 1);
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [+(cx + r * Math.sin(a)).toFixed(2), +(cy - r * Math.cos(a)).toFixed(2)];
  };
  const [px, py] = pt(angle(idx), 4.2);
  const [qx, qy] = pt(angle(idx) + 180, 4.2);
  // 16 段階の目盛を円周に並べる（文字が重ならないよう小さめ）
  const scale = DELAYS.map((d, i) => {
    const [tx, ty] = pt(angle(i), 10.4);
    return text(tx, ty + 0.75, String(d), 2.05, i === idx ? '#ffd23a' : '#e8e8e8', 'middle', i === idx ? 'bold' : 'normal');
  }).join('');
  return `
  ${scale}
  <circle cx="${cx}" cy="${cy}" r="5.6" fill="#d9dcdf" stroke="#111" stroke-width="0.5"/>
  <path d="M${qx} ${qy} L${px} ${py}" stroke="#222" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="${px}" cy="${py}" r="0.9" fill="#d01c1f"/>
  ${text(4.5, 88, 'OFF-', 2.6, '#e8e8e8', 'start')}
  ${text(4.5, 91.4, 'DELAY', 2.6, '#e8e8e8', 'start')}`;
};

const svg = (delay: number) => `
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
  <rect x="14" y="0" width="18" height="12" rx="2" fill="#1b1c1d"/>
  <circle cx="23" cy="5" r="2.6" fill="#8d9298"/>
  <rect x="14" y="${H - 12}" width="18" height="12" rx="2" fill="#1b1c1d"/>
  <circle cx="23" cy="${H - 5}" r="2.6" fill="#8d9298"/>

  <!-- 赤い筐体 -->
  <rect x="0.5" y="${BODY_Y0}" width="${W - 1}" height="${BODY_Y1 - BODY_Y0}" rx="2" fill="url(#red-{{uid}})" stroke="#5e0b09" stroke-width="0.8"/>

  <!-- 表示パネル -->
  <rect x="3" y="${BODY_Y0 + 3}" width="${W - 6}" height="84" rx="1" fill="url(#panel-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${text(4.5, 20, 'OMRON', 3.9, '#f2f2f2', 'start')}
  ${text(4.5, 28.5, 'Sti', 6, '#f2f2f2', 'start')}
  ${text(4.5, 38, 'G9SE', 4, '#f2f2f2', 'start')}
  ${text(4.5, 43, '-221-T05', 3.6, '#f2f2f2', 'start')}
  ${text(4.5, 51, '24VDC', 3.4, '#f2f2f2', 'start')}
  ${led(22, 'PWR', '#38d24f', true)}
  ${led(29, 'IN1', '#ff6a2a', false)}
  ${led(36, 'IN2', '#ff6a2a', false)}
  ${led(43, 'OUT1', '#ff6a2a', false)}
  ${led(50, 'OUT2', '#ff6a2a', false)}
  ${dial(delay)}

  <!-- Push-In Plus 端子部 -->
  <rect x="3" y="99" width="${W - 6}" height="${BODY_Y1 - 105}" rx="1" fill="#1d1e20" stroke="#000" stroke-width="0.5"/>
  ${ROWS.map((_, i) => pushIn(COL_L, leftY(i)) + pushIn(COL_R, rightY(i))).join('')}
  ${ROWS.map(([l, r], i) => text(COL_L - 5.6, leftY(i) - 5.6, l, 3.1, '#f2f2f2', 'start') + text(COL_R + 5.4, rightY(i) - 5.6, r, 3.1, '#f2f2f2', 'end')).join('')}
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
  '13': '13（瞬時安全出力 1）',
  '14': '14（瞬時安全出力 1）',
  '23': '23（瞬時安全出力 2）',
  '24': '24（瞬時安全出力 2）',
  '37': '37（オフディレー安全出力 1）',
  '38': '38（オフディレー安全出力 1）',
  '47': '47（オフディレー安全出力 2）',
  '48': '48（オフディレー安全出力 2）',
};

/** テスト出力（テストパルス。T11/T21 から接点を通って T12/T22 へ戻す） */
const TEST: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test' };

/** 電源以外の端子の電気的な役割と安全回路での機能 */
const SPEC: Record<string, Partial<TerminalDef>> = {
  T11: { role: 'supply', supply: TEST, function: 'test-output', channel: 1 },
  T12: { function: 'safety-input', channel: 1 },
  T21: { role: 'supply', supply: TEST, function: 'test-output', channel: 2 },
  T22: { function: 'safety-input', channel: 2 },
  // 手動リセット: T31 → リセットスイッチ → 接触器の b 接点 → T32、T33 は +24V。
  // 自動リセット: T31 → 接触器の b 接点 → T33、T32 は +24V。どちらになるかは配線で決まるので、T32・T33 とも reset にする
  // （リセット入力に押しボタンの a 接点が入っていなければ自動リセットと判定される）
  T31: { function: 'edm' },
  T32: { function: 'reset' },
  T33: { function: 'reset' },
  X1: { function: 'aux-output', signal: { dir: 'out', kind: 'pnp' } },
};

const terminal = (id: string, x: number, y: number, side: 'left' | 'right'): TerminalDef => {
  if (id === 'A1') return { id, label: 'A1（+24V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
  if (id === 'A2') return { id, label: 'A2（0V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
  // 数字の端子は安全出力のリレー接点
  const spec = /^\d+$/.test(id) ? { function: 'safety-contact' as const } : SPEC[id];
  return { id, label: LABELS[id], x, y, side, role: 'signal', optional: true, ...spec };
};

const def: DeviceDefinition = {
  type: 'omron.g9se-221-t05',
  name: 'セーフティリレーユニット（オフディレー）',
  model: 'G9SE-221-T05',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン G9SE シリーズのオフディレー付きセーフティリレーユニット（幅22.5mm、Push-In Plus 端子）。電源 A1(+)/A2(−) は DC24V（−15%/+10%）。' +
    '安全出力はリレー接点で、瞬時 2a（13-14、23-24）とオフディレー 2a（37-38、47-48。入力が OFF してから設定時間 0〜5 秒後に開く。停止カテゴリ1 用）、AC250V/DC30V 5A。補助出力 X1（PNP）。PL e / カテゴリ4、SIL3。' +
    'オフディレー時間は正面と側面のロータリスイッチ（両方を同じ値に設定）で選び、params の offDelay で表示に反映する。' +
    '入力・リセットの配線は G9SE-201 と同じ（非常停止 b 接点を T11-T12 と T21-T22、手動リセットは T31 → リセットスイッチ → 接触器 b 接点 → T32、T33 を +24V）。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg: (p) => svg(Number(p.offDelay)),
  terminals: ROWS.flatMap(([l, r], i) => [terminal(l, COL_L, leftY(i), 'left'), terminal(r, COL_R, rightY(i), 'right')]),
  // 安全出力のリレー接点（a 接点）
  links: [
    { from: '13', to: '14', switch: 'NO' },
    { from: '23', to: '24', switch: 'NO' },
    { from: '37', to: '38', switch: 'NO' },
    { from: '47', to: '48', switch: 'NO' },
  ],
  safetyChannels: [
    // 非常停止などの b 接点 2 回路、またはライトカーテンの OSSD1/OSSD2 を T12/T22 へ直接つなぐ
    { id: 'IN', label: '安全入力（CH1: T11→T12、CH2: T21→T22、または OSSD）', kind: 'input', mode: ['nc-nc', 'ossd'], channels: [{ source: 'T11', input: 'T12' }, { source: 'T21', input: 'T22' }] },
    { id: 'OUT', label: '瞬時安全出力 13-14・23-24', kind: 'output', channels: [{ output: '13' }, { output: '23' }] },
    { id: 'OUT-DELAY', label: 'オフディレー安全出力 37-38・47-48', kind: 'output', channels: [{ output: '37' }, { output: '47' }] },
  ],
  safety: { pl: 'e', category: '4', sil: 3, standards: ['ISO 13849-1', 'IEC 61508', 'IEC 62061'] },
  params: [
    {
      key: 'offDelay',
      label: 'オフディレー時間',
      unit: '秒',
      options: DELAYS.map((d) => ({ value: d, label: `${d} 秒` })),
      default: 1,
    },
  ],
  // 消費電力 4W 以下 / 24V
  loadCurrent: 0.17,
};

export default def;
