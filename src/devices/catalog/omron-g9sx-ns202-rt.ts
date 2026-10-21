import type { DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * オムロン 非接触ドアスイッチコントローラ G9SX-NS202-RT（D40A/D40Z 専用、半導体安全出力 2 点、ネジ端子）。
 * 外形は 幅22.5 × 高さ100 × 奥行115mm（1mm ≒ 2px）。ライトグレーの筐体に赤い前面パネル、LED（PWR・FB・AND・NS・EI・ERR）。
 * 上下に 2 段ずつ端子が並ぶ。
 *
 * 端子配列（D40A/G9SX-NS データシート「Dimensions and Terminal Arrangement」）:
 *   上 外側: T31 T32 T33 D3 / 上 内側: D1 D2 X1 A1
 *   下 内側: T41 T42 X2 A2 / 下 外側: S14 S24 L1 D4
 */

const W = 46;
const H = 204;

const XS = [8, 18, 28, 38];
const Y_TOP_OUT = 10;
const Y_TOP_IN = 26;
const Y_BOT_IN = 176;
const Y_BOT_OUT = 192;

const TOP_OUT = ['T31', 'T32', 'T33', 'D3'];
const TOP_IN = ['D1', 'D2', 'X1', 'A1'];
const BOT_IN = ['T41', 'T42', 'X2', 'A2'];
const BOT_OUT = ['S14', 'S24', 'L1', 'D4'];

const text = (x: number, y: number, t: string, size: number, fill = '#f2f2f2', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 3.6) => `
  <rect x="${x - 4.6}" y="${y - 5}" width="9.2" height="10" rx="1" fill="#0d0d0e"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

const tier = (y: number) => `
  <rect x="2" y="${y - 6.5}" width="${W - 4}" height="13" rx="1.2" fill="#1b1c1e" stroke="#000" stroke-width="0.5"/>
  ${XS.map((x) => screw(x, y)).join('')}`;

const LEDS: [string, string, boolean][] = [
  ['PWR', '#3ad65a', true],
  ['FB', '#f2b705', false],
  ['AND', '#f2b705', false],
  ['NS', '#f2b705', false],
  ['EI', '#ff5a3a', false],
  ['ERR', '#ff5a3a', false],
];

const svg = `
  <defs>
    <linearGradient id="red-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a51b1f"/>
      <stop offset="0.15" stop-color="#d42a2e"/>
      <stop offset="0.85" stop-color="#cf2629"/>
      <stop offset="1" stop-color="#9a1619"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- ライトグレーの筐体と赤い前面パネル -->
  <rect x="0.5" y="2" width="${W - 1}" height="${H - 4}" rx="2" fill="#c9ccd0" stroke="#6d7176" stroke-width="0.8"/>
  <rect x="3" y="44" width="${W - 6}" height="114" rx="1.5" fill="url(#red-{{uid}})" stroke="#5e0b0e" stroke-width="0.5"/>

  <!-- 端子台と端子名 -->
  ${tier(Y_TOP_OUT)}
  ${tier(Y_TOP_IN)}
  ${TOP_OUT.map((l, i) => text(XS[i], 37, l, 3, '#222', 'middle', 'normal')).join('')}
  ${TOP_IN.map((l, i) => text(XS[i], 41.5, l, 3, '#222', 'middle', 'normal')).join('')}
  ${text(5, 54, 'OMRON', 4.2, '#fff', 'start')}
  ${text(5, 61, 'G9SX-NS202', 3.6, '#fff', 'start', 'normal')}
  ${text(5, 66.5, '24VDC', 3.2, '#fff', 'start', 'normal')}
  ${LEDS.map(([n, c, lit], i) => {
    const x = i % 2 === 0 ? 8 : 26;
    const y = 80 + Math.floor(i / 2) * 9;
    return `<rect x="${x}" y="${y}" width="4" height="5" fill="${lit ? c : '#4a3a2a'}" stroke="#111" stroke-width="0.3"/>${text(x + 6, y + 4.2, n, 3.4, '#fff', 'start', 'normal')}`;
  }).join('')}
  ${text(W / 2, 128, 'NON-CONTACT', 3, '#fff', 'middle', 'normal')}
  ${text(W / 2, 133, 'DOOR SWITCH', 3, '#fff', 'middle', 'normal')}
  ${text(W / 2, 138, 'CONTROLLER', 3, '#fff', 'middle', 'normal')}
  ${BOT_IN.map((l, i) => text(XS[i], 163.5, l, 3, '#222', 'middle', 'normal')).join('')}
  ${BOT_OUT.map((l, i) => text(XS[i], 168, l, 3, '#222', 'middle', 'normal')).join('')}
  ${tier(Y_BOT_IN)}
  ${tier(Y_BOT_OUT)}
`;

const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const LABELS: Record<string, string> = {
  D1: 'D1（ドアスイッチ入力。1 台目の D40A の白へ）',
  D2: 'D2（ドアスイッチ戻り。最終段の D40A の黒から）',
  D3: 'D3（ドアスイッチ電源 +。D40A の茶へ）',
  D4: 'D4（ドアスイッチ電源 −。D40A の青へ）',
  T31: 'T31（フィードバック・リセット入力）',
  T32: 'T32（手動リセット入力）',
  T33: 'T33（自動リセット入力）',
  T41: 'T41（論理 AND 接続入力）',
  T42: 'T42（論理 AND 接続入力）',
  S14: 'S14（安全出力 PNP 0.8A）',
  S24: 'S24（安全出力 PNP 0.8A）',
  L1: 'L1（論理 AND 接続出力）',
  X1: 'X1（補助モニタ出力・非安全）',
  X2: 'X2（補助エラー出力・非安全）',
};

/** ドアスイッチの入力信号（D1 から D40A の白 → 黒 → … → D2 へ戻す） */
const TEST: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test' };

/** 安全出力（PNP 各 0.8A） */
const OSSD: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 0.8 };

/** 電源以外の端子の電気的な役割と安全回路での機能 */
const SPEC: Record<string, Partial<TerminalDef>> = {
  D1: { role: 'supply', supply: TEST, function: 'test-output', channel: 1 },
  D2: { function: 'safety-input', channel: 1 },
  S14: { role: 'supply', supply: OSSD, function: 'ossd', channel: 1 },
  S24: { role: 'supply', supply: OSSD, function: 'ossd', channel: 2 },
  // T31 から 接触器の b 接点（フィードバックループ）・リセットスイッチを通って T32（手動）/ T33（自動）へ戻す
  T31: { function: 'edm' },
  T32: { function: 'reset' },
  T33: { function: 'reset' },
  X1: { function: 'aux-output', signal: { dir: 'out', kind: 'pnp' } },
  X2: { function: 'aux-output', signal: { dir: 'out', kind: 'pnp' } },
};

const row = (ids: string[], y: number, side: 'top' | 'bottom'): TerminalDef[] =>
  ids.map((id, i) => {
    if (id === 'A1') return { id, label: 'A1（+24V）', x: XS[i], y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
    if (id === 'A2') return { id, label: 'A2（0V）', x: XS[i], y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
    return { id, label: LABELS[id], x: XS[i], y, side, role: 'signal', optional: true, ...SPEC[id] };
  });

const def: DeviceDefinition = {
  type: 'omron.g9sx-ns202-rt',
  name: '非接触ドアスイッチコントローラ',
  model: 'G9SX-NS202-RT',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン G9SX-NS202 非接触ドアスイッチコントローラ（D40A / D40Z 専用、最大 30 台を直列接続、幅22.5mm、ネジ端子）。電源 A1/A2 は DC24V（−15%/+10%、3W）。安全出力 S14・S24（PNP 各 0.8A、内部で冗長化）。D40A と組み合わせて PL d / カテゴリ3（D40Z なら PL e / カテゴリ4）。' +
    'ドアスイッチの配線: D3 → 各 D40A の茶（電源 +）、D4 → 青（電源 −）、D1 → 1 台目の白、前段の黒 → 次段の白、最終段の黒 → D2。D3/D4 はコントローラ内部で電源 A1/A2 から供給されるものとして、内部導通で表した。' +
    'リセット: 自動は T31 → 接触器 b 接点 → T33、手動は T31 → リセットスイッチ・接触器 b 接点 → T32（G9SE と同じ考え方）。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg,
  terminals: [...row(TOP_OUT, Y_TOP_OUT, 'top'), ...row(TOP_IN, Y_TOP_IN, 'top'), ...row(BOT_IN, Y_BOT_IN, 'bottom'), ...row(BOT_OUT, Y_BOT_OUT, 'bottom')],
  links: [
    // ドアスイッチ用電源（内部電源回路は非絶縁）
    { from: 'A1', to: 'D3' },
    { from: 'A2', to: 'D4' },
  ],
  safetyChannels: [
    // D40A はコントローラーからの信号を次段へ渡す（直列接続の全台を 1 つのループとして監視する）
    { id: 'IN', label: 'ドアスイッチ入力（D1 → D40A → D2）', kind: 'input', channels: [{ source: 'D1', input: 'D2' }] },
    { id: 'OUT', label: '安全出力 S14・S24', kind: 'output', channels: [{ output: 'S14' }, { output: 'S24' }] },
  ],
  // D40Z と組み合わせて PL e / カテゴリ4、D40A と組み合わせて PL d / カテゴリ3
  safety: { pl: 'e', category: '4', standards: ['ISO 13849-1', 'ISO 14119'] },
  // 消費電力 3W / 24V（出力負荷は別途）
  loadCurrent: 0.13,
};

export default def;
