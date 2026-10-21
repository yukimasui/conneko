import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * IDEC セーフティモジュール HR6S-AF（非常停止・安全ドア用、安全出力 3a、着脱式プッシュイン端子台）。
 * 外形は 幅22.5 × 高さ119（プッシュイン端子込み。本体 99）× 奥行117mm（1mm ≒ 2px）。
 * 黒い本体に赤い正面パネル。上部の透明カバーの中に LED（POWER 緑・ERROR 赤・STATE/START/S12/S22 黄）と
 * 縦書きの「SAFETY MODULE」、その下に START（1〜8）・FUNCTION（1〜6）の白枠付きロータリスイッチ、IDEC ロゴがある。
 * 上下に 2 段の黒い 4 極端子台（各段 4 極）が付く。
 *
 * 端子配列（HR6S-AF 取扱説明書 HR9Z-B2192）:
 *   上 外側: A1 13 23 33 / 上 内側: Y1 Y2 S11 S12 / 下 内側: B2 Z1 S21 S22 / 下 外側: A2 14 24 34
 */

const W = 46;
const H = 238;

const XS = [8, 18, 28, 38];
const Y_TOP_OUT = 8;
const Y_TOP_IN = 28;
const Y_BOT_IN = 210;
const Y_BOT_OUT = 230;

const TOP_OUT = ['A1', '13', '23', '33'];
const TOP_IN = ['Y1', 'Y2', 'S11', 'S12'];
const BOT_IN = ['B2', 'Z1', 'S21', 'S22'];
const BOT_OUT = ['A2', '14', '24', '34'];

const text = (x: number, y: number, t: string, size: number, fill = '#fff', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** プッシュイン端子台 1 段（解除レバーと電線差込口が 4 極） */
const tier = (y: number, upward: boolean) => `
  <rect x="2" y="${y - 8}" width="${W - 4}" height="16" rx="1.5" fill="url(#tb-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${XS.map(
    (x) => `
  <rect x="${x - 4.4}" y="${y - 7}" width="8.8" height="14" rx="1.2" fill="#232425" stroke="#000" stroke-width="0.4"/>
  <rect x="${x - 1.4}" y="${upward ? y - 6.5 : y + 0.5}" width="2.8" height="6" rx="0.6" fill="#5b5e62"/>
  <path d="M${x - 3.6} ${upward ? y + 6.5 : y - 6.5} A3.6 3.6 0 0 ${upward ? 1 : 0} ${x + 3.6} ${upward ? y + 6.5 : y - 6.5}" fill="#060606" stroke="#555" stroke-width="0.4"/>`,
  ).join('')}`;

/** ロータリスイッチ（白枠・目盛り付き） */
const dial = (cy: number, n: number, name: string, value: number) => {
  const cx = W / 2;
  const angle = (i: number) => -135 + ((i - 1) * 270) / (n - 1);
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [+(cx + r * Math.sin(a)).toFixed(2), +(cy - r * Math.cos(a)).toFixed(2)];
  };
  const [px, py] = pt(angle(value), 4.6);
  return `
  <rect x="7" y="${cy - 13}" width="${W - 14}" height="28" rx="2" fill="none" stroke="#fff" stroke-width="0.7"/>
  <rect x="7" y="${cy + 9}" width="${W - 14}" height="6" rx="1" fill="#fff"/>
  ${text(cx, cy + 13.6, name, 3.6, '#b51f24')}
  ${Array.from({ length: n }, (_, i) => {
    const [tx, ty] = pt(angle(i + 1), 9.6);
    return text(tx, ty + 1.2, String(i + 1), 3, '#fff', 'middle', 'normal');
  }).join('')}
  <circle cx="${cx}" cy="${cy}" r="5.6" fill="#a51b20" stroke="#fff" stroke-width="0.5" stroke-dasharray="1 0.8"/>
  <path d="M${cx - 3.4} ${cy} H${cx + 3.4} M${cx} ${cy - 3.4} V${cy + 3.4}" stroke="#fff" stroke-width="1.6"/>
  <circle cx="${px}" cy="${py}" r="1" fill="#fff"/>`;
};

const svg = (start: number, func: number) => `
  <defs>
    <linearGradient id="face-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#98171b"/>
      <stop offset="0.12" stop-color="#bd2228"/>
      <stop offset="0.88" stop-color="#b81f25"/>
      <stop offset="1" stop-color="#8e1519"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2e2f31"/>
      <stop offset="1" stop-color="#151617"/>
    </linearGradient>
  </defs>

  <!-- 黒い本体と赤い正面パネル -->
  <rect x="0.5" y="16" width="${W - 1}" height="${H - 32}" rx="2" fill="#1b1c1d"/>
  <rect x="2" y="37" width="${W - 4}" height="${H - 74}" rx="1.5" fill="url(#face-{{uid}})" stroke="#5e0b0e" stroke-width="0.6"/>

  <!-- 端子台（上: 外側 A1 13 23 33 / 内側 Y1 Y2 S11 S12） -->
  ${tier(Y_TOP_OUT, true)}
  ${tier(Y_TOP_IN, true)}

  <!-- 透明カバーの中の LED 表示部 -->
  <rect x="6" y="44" width="${W - 12}" height="64" rx="6" fill="#a31c21" stroke="#6f1014" stroke-width="0.7"/>
  <text x="11" y="104" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#fff" transform="rotate(-90 11 104)">SAFETY MODULE</text>
  <path d="M13.5 58 V104" stroke="#fff" stroke-width="0.5"/>
  ${[
    ['POWER', '#2fbf4f'],
    ['ERROR', '#e8262b'],
    ['STATE', '#f6e21a'],
    ['START', '#f6e21a'],
    ['S12', '#f6e21a'],
    ['S22', '#f6e21a'],
  ]
    .map(([n, c], i) => `<rect x="16" y="${62 + i * 6.5}" width="5" height="3.8" fill="${c}" stroke="#111" stroke-width="0.3"/>${text(23, 65.4 + i * 6.5, n, 3, '#fff', 'start', 'normal')}`)
    .join('')}

  <!-- START / FUNCTION ロータリスイッチ -->
  ${dial(125, 8, 'START', start)}
  ${dial(157, 6, 'FUNCTION', func)}

  <!-- IDEC ロゴ・形式 -->
  <rect x="6" y="178" width="3" height="10" fill="#fff"/>
  <path d="M10.5 178 H13.5 V188 H10.5" fill="none" stroke="#fff" stroke-width="1"/>
  ${text(15, 187, 'IDEC', 8.4, '#fff', 'start')}
  ${text(6, 195, 'HR6S-AF', 4, '#fff', 'start', 'normal')}

  <!-- 端子台（下: 内側 B2 Z1 S21 S22 / 外側 A2 14 24 34） -->
  ${tier(Y_BOT_IN, false)}
  ${tier(Y_BOT_OUT, false)}

  <!-- 端子名（端子台の脇の印字） -->
  ${TOP_OUT.map((l, i) => text(XS[i], 19, l, 3, '#e6e6e6', 'middle', 'normal')).join('')}
  ${TOP_IN.map((l, i) => text(XS[i], 40.5, l, 3.2, '#fff')).join('')}
  ${BOT_IN.map((l, i) => text(XS[i], 200.5, l, 3.2, '#fff')).join('')}
  ${BOT_OUT.map((l, i) => text(XS[i], 222.6, l, 3, '#e6e6e6', 'middle', 'normal')).join('')}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };

const LABELS: Record<string, string> = {
  Y1: 'Y1（スタート入力 DC+ 出力）',
  Y2: 'Y2（スタート入力。Y1-Y2 間にリセットボタン＋フィードバック）',
  S11: 'S11（テストパルス出力 CH1）',
  S12: 'S12（入力 CH1）',
  S21: 'S21（テストパルス出力 CH2）',
  S22: 'S22（入力 CH2）',
  B2: 'B2（外部給電の入力信号用 0V 基準）',
  Z1: 'Z1（診断出力・非安全 24V 20mA）',
  '13': '13（安全出力 1）',
  '14': '14（安全出力 1）',
  '23': '23（安全出力 2）',
  '24': '24（安全出力 2）',
  '33': '33（安全出力 3）',
  '34': '34（安全出力 3）',
};

const row = (ids: string[], y: number, side: 'top' | 'bottom'): TerminalDef[] =>
  ids.map((id, i) => {
    if (id === 'A1') return { id, label: 'A1（+24V）', x: XS[i], y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
    if (id === 'A2') return { id, label: 'A2（0V）', x: XS[i], y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
    return { id, label: LABELS[id], x: XS[i], y, side, role: 'signal', optional: true };
  });

const def: DeviceDefinition = {
  type: 'idec.hr6s-af',
  name: 'セーフティモジュール',
  model: 'HR6S-AF',
  maker: 'IDEC',
  category: 'control',
  description:
    'IDEC HR6S シリーズの非常停止・安全ドア用セーフティモジュール（幅22.5mm、着脱式端子台。プッシュイン HR6S-AF1C／ネジ HR6S-AF1P）。電源 A1/A2 は DC24V（±20%。AC24V 品としても使える）。安全出力 3a（13-14、23-24、33-34、DC-13 24V 3A）。PL e / カテゴリ4、SIL3。' +
    '2 チャンネル入力（FUNCTION 1）: 非常停止の b 接点 1 回路目を S11-S12、2 回路目を S21-S22 に接続する（S11/S21 のテストパルスで横絡を検出）。' +
    'スタート: START スイッチで自動／手動／監視付きを選ぶ。自動は Y1-Y2 を短絡、手動はリセットボタンと接触器の b 接点（ミラー接点）を直列にして Y1-Y2 に入れる（フィードバックループ）。図では接点を閉とみなす。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg: (p) => svg(Number(p.start) || 1, Number(p.function) || 1),
  terminals: [
    ...row(TOP_OUT, Y_TOP_OUT, 'top'),
    ...row(TOP_IN, Y_TOP_IN, 'top'),
    ...row(BOT_IN, Y_BOT_IN, 'bottom'),
    ...row(BOT_OUT, Y_BOT_OUT, 'bottom'),
  ],
  links: [
    { from: '13', to: '14' },
    { from: '23', to: '24' },
    { from: '33', to: '34' },
  ],
  params: [
    {
      key: 'start',
      label: 'START スイッチ（スタート機能）',
      options: Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
      default: 1,
    },
    {
      key: 'function',
      label: 'FUNCTION スイッチ（入力機能）',
      options: Array.from({ length: 6 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
      default: 1,
    },
  ],
  // 消費電力 2W / 24V
  loadCurrent: 0.09,
};

export default def;
