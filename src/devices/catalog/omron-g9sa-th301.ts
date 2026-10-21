import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * オムロン 両手操作コントローラ G9SA-TH301（24VAC/DC、安全出力 3a ＋ 補助 1b、M3 ネジ端子 21 個）。
 * 両手操作押ボタン 2 個（各 1a1b）の同時押し（時間差 0.5 秒以内）でのみ出力が ON する（EN 574 タイプ IIIC）。
 * 外形は 幅45 × 高さ76（対角の取付けタブ込み 94）× 奥行111mm（1mm ≒ 2px）。
 * ライトグレーの筐体の正面中央に赤い表示銘板（LED: PWR・K1・K2 はいずれも緑）、右側にコネクタカバー。
 * 上下に M3 ネジ端子が 2 段ずつ（端子ピッチ 7mm）並ぶ。
 *
 * 端子配列（データシート「Dimensions and Terminal Arrangement」）:
 *   上 外側: 13 23 33 (空) (空) 41 / 上 内側: T11 T12 T13 T31 T32 A1
 *   下 内側: T21 T22 T23 (空) PE A2   / 下 外側: 14 24 34 (空) (空) 42
 */

const W = 92;
const H = 188;
const BODY_Y0 = 18;
const BODY_Y1 = 170;

const XS = [11, 25, 39, 53, 67, 81];
const Y_TOP_OUT = 31;
const Y_TOP_IN = 51;
const Y_BOT_IN = 137;
const Y_BOT_OUT = 157;

type Cell = string | null;
const TOP_OUT: Cell[] = ['13', '23', '33', null, null, '41'];
const TOP_IN: Cell[] = ['T11', 'T12', 'T13', 'T31', 'T32', 'A1'];
const BOT_IN: Cell[] = ['T21', 'T22', 'T23', null, 'PE', 'A2'];
const BOT_OUT: Cell[] = ['14', '24', '34', null, null, '42'];

const text = (x: number, y: number, t: string, size: number, fill = '#111', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, used: boolean, r = 5) =>
  used
    ? `
  <circle cx="${x}" cy="${y}" r="${r + 1.3}" fill="#2b2b2b"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.1" stroke-linecap="round"/>`
    : `<circle cx="${x}" cy="${y}" r="${r + 1.3}" fill="#c9cacb" stroke="#a5a7a9" stroke-width="0.5"/>`;

/** ネジ端子 1 段（段差のついた端子台の棚） */
const tier = (y: number, cells: Cell[]) => `
  <rect x="3" y="${y - 9}" width="${W - 6}" height="18" rx="1.5" fill="url(#shelf-{{uid}})" stroke="#9fa2a5" stroke-width="0.5"/>
  ${cells.map((c, i) => screw(XS[i], y, !!c)).join('')}`;

/** 赤い銘板に印刷された端子名 */
const names = (y: number, cells: Cell[]) => cells.map((c, i) => (c ? text(XS[i], y, c, 3.6, '#fff') : '')).join('');

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c3c5c7"/>
      <stop offset="0.1" stop-color="#e2e3e4"/>
      <stop offset="0.9" stop-color="#dcdddf"/>
      <stop offset="1" stop-color="#b9bbbd"/>
    </linearGradient>
    <linearGradient id="shelf-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9eaeb"/>
      <stop offset="1" stop-color="#cfd1d3"/>
    </linearGradient>
    <linearGradient id="red-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9262a"/>
      <stop offset="1" stop-color="#b81b1f"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 取付けタブ（左上・右下） -->
  <rect x="2" y="0" width="18" height="22" rx="2" fill="#cfd1d3" stroke="#8d9093" stroke-width="0.6"/>
  <circle cx="11" cy="9" r="4.6" fill="#f4f4f4" stroke="#777" stroke-width="0.6"/>
  <rect x="${W - 20}" y="${H - 22}" width="18" height="22" rx="2" fill="#cfd1d3" stroke="#8d9093" stroke-width="0.6"/>
  <circle cx="${W - 11}" cy="${H - 9}" r="4.6" fill="#f4f4f4" stroke="#777" stroke-width="0.6"/>

  <!-- 筐体 -->
  <rect x="1" y="${BODY_Y0}" width="${W - 2}" height="${BODY_Y1 - BODY_Y0}" rx="2.5" fill="url(#case-{{uid}})" stroke="#8d9093" stroke-width="0.9"/>

  <!-- 赤い表示銘板（端子名・LED・形式） -->
  <rect x="3" y="58" width="${W - 6}" height="72" rx="1" fill="url(#red-{{uid}})" stroke="#7d1013" stroke-width="0.5"/>
  ${names(65, TOP_OUT)}
  ${names(72, TOP_IN)}
  ${[
    ['PWR', true],
    ['K1', false],
    ['K2', false],
  ]
    .map(([n, lit], i) => `<rect x="34" y="${80 + i * 7}" width="6" height="3.6" fill="${lit ? '#3ad65a' : '#355a3a'}" stroke="#111" stroke-width="0.3"/>${text(42, 83.4 + i * 7, String(n), 3.6, '#fff', 'start')}`)
    .join('')}
  <rect x="7" y="80" width="18" height="10" rx="1" fill="#fff"/>
  ${text(7, 98, 'OMRON', 4.6, '#fff', 'start')}
  ${text(7, 104, 'G9SA-TH301', 4, '#fff', 'start', 'normal')}
  ${text(7, 109.5, '24VAC/DC', 3.4, '#fff', 'start', 'normal')}
  ${names(117, BOT_IN)}
  ${names(124, BOT_OUT)}
  <!-- 増設ユニット用コネクタカバー -->
  <rect x="62" y="78" width="22" height="34" rx="2" fill="#d6d7d8" stroke="#8d9093" stroke-width="0.6"/>
  <rect x="64" y="84" width="4" height="22" rx="1" fill="#bfc1c3"/>

  <!-- ネジ端子（上 2 段・下 2 段） -->
  ${tier(Y_TOP_OUT, TOP_OUT)}
  ${tier(Y_TOP_IN, TOP_IN)}
  ${tier(Y_BOT_IN, BOT_IN)}
  ${tier(Y_BOT_OUT, BOT_OUT)}
`;

const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const LABELS: Record<string, string> = {
  T11: 'T11（押ボタン S12 の b 接点側）',
  T12: 'T12（押ボタン S12 の共通側）',
  T13: 'T13（押ボタン S12 の a 接点側）',
  T21: 'T21（押ボタン S11 の b 接点側）',
  T22: 'T22（押ボタン S11 の共通側）',
  T23: 'T23（押ボタン S11 の a 接点側）',
  T31: 'T31（フィードバック入力）',
  T32: 'T32（フィードバック入力）',
  '13': '13（安全出力 1）',
  '14': '14（安全出力 1）',
  '23': '23（安全出力 2）',
  '24': '24（安全出力 2）',
  '33': '33（安全出力 3）',
  '34': '34（安全出力 3）',
  '41': '41（補助出力 b 接点・非安全）',
  '42': '42（補助出力 b 接点・非安全）',
};

const row = (cells: Cell[], y: number, side: 'top' | 'bottom'): TerminalDef[] =>
  cells.flatMap((id, i): TerminalDef[] => {
    if (!id) return [];
    const x = XS[i];
    if (id === 'A1') return [{ id, label: 'A1（+24V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['+'] } }];
    if (id === 'A2') return [{ id, label: 'A2（0V）', x, y, side, role: 'input', accepts: { ...power, conductors: ['-'] } }];
    if (id === 'PE') return [{ id, label: 'PE（保護接地）', x, y, side, role: 'ground' }];
    return [{ id, label: LABELS[id], x, y, side, role: 'signal', optional: true }];
  });

const def: DeviceDefinition = {
  type: 'omron.g9sa-th301',
  name: '両手操作コントローラ',
  model: 'G9SA-TH301 24VAC/DC',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン G9SA シリーズの両手操作コントローラ（幅45mm、M3 ネジ端子）。プレスなどで作業者の両手を危険区域の外に置かせるため、2 個の押ボタンを 0.5 秒以内に同時に押している間だけ安全出力が閉じる。' +
    '電源 A1/A2 は 24V（AC/DC。図では DC24V として扱い A2 が −）。安全出力 3a（13-14、23-24、33-34）、補助出力 1b（41-42）。PE は保護接地。' +
    '押ボタンはそれぞれ 1a1b（a 接点と b 接点）を使う: 押ボタン S12 は共通を T12、b 接点を T11、a 接点を T13 へ、押ボタン S11 は共通を T22、b 接点を T21、a 接点を T23 へ配線する。' +
    'フィードバック: 接触器 KM1・KM2 の b 接点（ミラー接点）を直列にして T31-T32 へ。図では接点を閉とみなす。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg,
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
    { from: '41', to: '42' },
  ],
  // 消費電力 1.7W / 24V
  loadCurrent: 0.07,
};

export default def;
