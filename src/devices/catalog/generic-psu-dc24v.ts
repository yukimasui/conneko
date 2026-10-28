import type { DeviceDefinition } from '../types';

/**
 * DC24V スイッチング電源（DINレール取付の汎用品）。
 * 外形は 60W クラスでおよそ 幅40 × 高さ90mm（1mm ≒ 2px）。
 * 上段に入力 L・N・⏚、下段に出力 +V・+V・-V・-V のネジ端子が並び、正面に DC ON 表示灯と出力電圧調整（V.ADJ）がある。
 * 容量（30W〜240W）は params の outputCurrent で選ぶ（実機は容量が大きいほど幅が広いが、見た目は共通とする）。
 */

const W = 80;
const H = 180;

const IN_Y = 17;
const OUT_Y = 163;
const IN = [
  { id: 'L', x: 16 },
  { id: 'N', x: 40 },
  { id: 'PE', x: 64 },
];
const OUT = [
  { id: '+V1', label: '+V', x: 13 },
  { id: '+V2', label: '+V', x: 30 },
  { id: '-V1', label: '-V', x: 50 },
  { id: '-V2', label: '-V', x: 67 },
];

const screw = (x: number, y: number, r = 5.5) => `
  <rect x="${x - r - 2}" y="${y - r - 2}" width="${2 * r + 4}" height="${2 * r + 4}" rx="1.5" fill="#2b2d30"/>
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#6b6b6b" stroke-width="0.6"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#4a4a4a" stroke-width="1.3" stroke-linecap="round"/>`;

const text = (x: number, y: number, t: string, size = 5, fill = '#222', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 接地記号 */
const groundMark = (x: number, y: number) => `
  <path d="M${x} ${y - 4} V${y} M${x - 3.5} ${y} H${x + 3.5} M${x - 2.3} ${y + 1.4} H${x + 2.3} M${x - 1.1} ${y + 2.8} H${x + 1.1}" stroke="#222" stroke-width="0.8" fill="none"/>`;

/** 容量の選択肢 [定格出力電流 A, 出力容量 W] */
const CAPACITIES: [number, number][] = [
  [1.3, 30],
  [2.5, 60],
  [5, 120],
  [10, 240],
];
const DEFAULT_CURRENT = 2.5;
const wattOf = (a: number) => CAPACITIES.find(([c]) => c === a)?.[1] ?? Math.round(a * 24);

const svg = (amps: number) => `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9bcc1"/>
      <stop offset="0.1" stop-color="#dfe1e4"/>
      <stop offset="0.9" stop-color="#dcdee1"/>
      <stop offset="1" stop-color="#aeb1b6"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a5e64"/>
      <stop offset="1" stop-color="#43474c"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
    <radialGradient id="led-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#d9ffd9"/>
      <stop offset="0.5" stop-color="#3ddc5a"/>
      <stop offset="1" stop-color="#16872c"/>
    </radialGradient>
  </defs>

  <!-- 筐体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#case-{{uid}})" stroke="#80848a" stroke-width="1"/>

  <!-- 入力端子台（上段） -->
  <rect x="3" y="3" width="${W - 6}" height="29" rx="2" fill="url(#tb-{{uid}})"/>
  ${IN.map((t) => screw(t.x, IN_Y)).join('')}
  <rect x="3" y="32" width="${W - 6}" height="9" fill="#eceef0" stroke="#a5a9ae" stroke-width="0.4"/>
  ${text(IN[0].x, 39, 'L')}
  ${text(IN[1].x, 39, 'N')}
  ${groundMark(IN[2].x, 36.5)}

  <!-- 正面中央の一段高い部分 -->
  <rect x="4" y="42" width="${W - 8}" height="96" rx="2" fill="#e6e8eb" stroke="#9a9ea4" stroke-width="0.6"/>
  <rect x="4" y="136" width="${W - 8}" height="2.5" fill="#a3a7ad" opacity="0.6"/>

  <!-- 放熱スリット -->
  ${Array.from({ length: 7 }, (_, i) => `<rect x="${10 + i * 9}" y="45" width="5" height="16" rx="2" fill="#8d9197" stroke="#777b81" stroke-width="0.4"/>`).join('')}

  <!-- 銘板 -->
  <rect x="7" y="66" width="${W - 14}" height="46" rx="2" fill="#f7f8f9" stroke="#a5a9ae" stroke-width="0.6"/>
  <text x="10" y="75.5" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#2b3a4a">POWER SUPPLY</text>
  <rect x="50" y="69.5" width="20" height="8" rx="1.5" fill="#f2b705" stroke="#a87e00" stroke-width="0.5"/>
  ${text(60, 75.6, `${wattOf(amps)}W`, 5, '#1d1d1d')}
  <rect x="14" y="79.5" width="${W - 28}" height="13" rx="1.5" fill="#2b3a4a"/>
  ${text(W / 2, 89.5, 'DC 24V', 9, '#fff')}
  ${text(W / 2, 99.5, 'INPUT  AC100-240V  50/60Hz', 3.4, '#333', 'normal')}
  ${text(W / 2, 106.5, `OUTPUT  DC24V  ${amps}A`, 4.4, '#111')}

  <!-- DC ON 表示灯・出力電圧調整 -->
  <circle cx="22" cy="125" r="3.6" fill="#1a1a1a"/>
  <circle cx="22" cy="125" r="2.8" fill="url(#led-{{uid}})"/>
  ${text(22, 136, 'DC ON', 4, '#222')}
  <circle cx="57" cy="125" r="5" fill="#1f62c4" stroke="#123c7a" stroke-width="0.6"/>
  <path d="M54 125 H60" stroke="#e8eef8" stroke-width="1.4" stroke-linecap="round"/>
  ${text(57, 136, 'V.ADJ', 4, '#222')}

  <!-- 出力端子台（下段） -->
  <rect x="3" y="139" width="${W - 6}" height="9" fill="#eceef0" stroke="#a5a9ae" stroke-width="0.4"/>
  ${OUT.map((t) => text(t.x, 146, t.label, 5, t.label === '+V' ? '#c21d1d' : '#1d3fae')).join('')}
  <rect x="3" y="148" width="${W - 6}" height="29" rx="2" fill="url(#tb-{{uid}})"/>
  ${OUT.map((t) => screw(t.x, OUT_Y)).join('')}
`;

const inputAccepts = {
  system: 'AC' as const,
  minVoltage: 100,
  maxVoltage: 240,
  conductors: ['R', 'S', 'T', 'L', 'N'] as ('R' | 'S' | 'T' | 'L' | 'N')[],
};

const def: DeviceDefinition = {
  type: 'generic.psu.dc24v',
  name: 'スイッチング電源',
  model: 'DC24V DINレール取付',
  category: 'power-supply',
  description:
    'AC100〜240V を入力し DC24V を出力する DINレール取付のスイッチング電源。PLC・センサー・表示灯などの制御電源に使う。出力 +V / -V はそれぞれ2端子あり内部でつながっている。' +
    '入力電流は AC100V・定格出力時の概算（出力電力 ÷ 効率 0.85 ÷ 力率 0.7 ÷ 100V）として、上流の保護・遮断器の電流の合計に数える。',
  labelPrefix: 'PSU',
  width: W,
  height: H,
  svg: (p) => svg(Number(p.outputCurrent) || DEFAULT_CURRENT),
  terminals: [
    { id: 'L', hint: 'AC入力', x: IN[0].x, y: IN_Y, side: 'top', role: 'input', accepts: inputAccepts },
    { id: 'N', hint: 'AC入力', x: IN[1].x, y: IN_Y, side: 'top', role: 'input', accepts: inputAccepts },
    { id: 'PE', label: '⏚', hint: '接地', x: IN[2].x, y: IN_Y, side: 'top', role: 'ground' },
    // 出力（+V / -V が2組。2組目は渡り配線用なので未接続でも警告しない）
    {
      id: '+V1',
      label: '+V',
      hint: '出力 +24V',
      x: OUT[0].x,
      y: OUT_Y,
      side: 'bottom',
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: { param: 'outputCurrent' }, isolated: true },
    },
    {
      id: '+V2',
      label: '+V',
      hint: '出力 +24V',
      x: OUT[1].x,
      y: OUT_Y,
      side: 'bottom',
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: { param: 'outputCurrent' }, isolated: true },
      optional: true,
    },
    {
      id: '-V1',
      label: '-V',
      hint: '出力 0V',
      x: OUT[2].x,
      y: OUT_Y,
      side: 'bottom',
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: { param: 'outputCurrent' }, isolated: true },
    },
    {
      id: '-V2',
      label: '-V',
      hint: '出力 0V',
      x: OUT[3].x,
      y: OUT_Y,
      side: 'bottom',
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: { param: 'outputCurrent' }, isolated: true },
      optional: true,
    },
  ],
  links: [
    // 同極の出力端子は内部でつながっている
    { from: '+V1', to: '+V2' },
    { from: '-V1', to: '-V2' },
  ],
  params: [
    {
      key: 'outputCurrent',
      label: '容量（定格出力電流）',
      unit: 'A',
      options: CAPACITIES.map(([value, watt]) => ({ value, label: `${watt}W（${value}A）` })),
      default: DEFAULT_CURRENT,
    },
  ],
  distinctGroups: [['L', 'N']],
  // 入力電流の概算（AC100V 入力・定格出力時）。出力 24V × 出力電流 ÷（効率 0.85 × 力率 0.7 × 100V）。AC200V ではおよそ半分
  loadCurrent: (p) => Math.round(((24 * (Number(p.outputCurrent) || DEFAULT_CURRENT)) / (0.85 * 0.7 * 100)) * 100) / 100,
};

export default def;
