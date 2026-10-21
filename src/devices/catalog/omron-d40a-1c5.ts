import type { DeviceDefinition } from '../types';

/**
 * オムロン 小形非接触ドアスイッチ D40A-1C5（ケーブル 5m、5 芯）とアクチュエータ。
 * スイッチ本体は 約 48 × 25 × 13mm の黒い樹脂（PBT）で、上部に 2 色の表示灯（扉開: 赤、扉閉: 黄）。1mm ≒ 2px。
 * OSSD 出力ではなく、専用コントローラ G9SX-NS（または G9SP）の D1〜D4 端子に接続して使う。
 * ケーブル先端の 5 本の芯線（線色はデータシートによる）を端子として定義する。
 */

const W = 196;
const H = 150;

const SX = 96;
const SY = 132;
const TIP_X = 190;
const TIP_Y0 = 84;
const TIP_PITCH = 12.4;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  white: '#f4f4f2',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  yellow: '#f2d21b',
};

const WIRES: { id: string; base: string; text: string; label: string }[] = [
  { id: '+', base: 'brown', text: '茶 電源+ (D3)', label: '電源 +（茶。G9SX-NS の D3 へ）' },
  { id: '-', base: 'blue', text: '青 電源− (D4)', label: '電源 −（青。G9SX-NS の D4 へ）' },
  { id: 'IN', base: 'white', text: '白 入力 (D1)', label: 'ドアスイッチ入力（白。G9SX-NS の D1、または前段の黒から）' },
  { id: 'OUT', base: 'black', text: '黒 出力 (D2)', label: 'ドアスイッチ出力（黒。最終段は G9SX-NS の D2、それ以外は次段の白へ）' },
  { id: 'AUX', base: 'yellow', text: '黄 補助出力', label: '補助出力（黄。扉閉で ON、PNP 10mA・非安全）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.9;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 30} ${y0.toFixed(1)} ${TIP_X - 56} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'yellow'].includes(w.base) ? '#777' : '#000';
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="2.9" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="2" stroke-linecap="round"/>
  <rect x="${TIP_X - 11}" y="${ty - 2}" width="4" height="4" rx="0.8" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.2}" width="7" height="2.4" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 13, ty - 2.8, w.text, 3.8, '#222', 'end')}</g>`;
  }).join('');

const svg = `
  <defs>
    <linearGradient id="pbt-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141516"/>
      <stop offset="0.3" stop-color="#2f3135"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>

  <!-- スイッチ本体（縦置き、48 × 25mm） -->
  <rect x="10" y="8" width="50" height="96" rx="4" fill="url(#pbt-{{uid}})" stroke="#000" stroke-width="0.8"/>
  ${[18, 94].map((y) => `<circle cx="35" cy="${y}" r="4.2" fill="#070707" stroke="#55585c" stroke-width="0.6"/>`).join('')}
  <!-- 表示灯（扉閉: 黄） -->
  <rect x="44" y="12" width="10" height="6" rx="1.5" fill="#f2c500" stroke="#7a5a00" stroke-width="0.5"/>
  <!-- 検出面の目印（▲） -->
  <path d="M52 52 L58 56 L52 60 Z" fill="#d9dcdf"/>
  <text x="22" y="34" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#d9dcdf" transform="rotate(90 22 34)">OMRON  D40A-1C5</text>

  <!-- アクチュエータ（扉側） -->
  <rect x="68" y="24" width="28" height="64" rx="3" fill="url(#pbt-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <path d="M70 52 L76 56 L70 60 Z" fill="#d9dcdf"/>
  ${[32, 80].map((y) => `<circle cx="84" cy="${y}" r="3.4" fill="#070707" stroke="#55585c" stroke-width="0.6"/>`).join('')}
  ${text(82, 98, 'アクチュエータ', 4, '#555', 'middle', 'normal')}

  <!-- ケーブル（φ4） -->
  <path d="M35 104 V${SY - 10} Q35 ${SY} 45 ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="4"/>
  <rect x="${SX - 3}" y="${SY - 3.5}" width="5" height="7" rx="1" fill="#222"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'omron.d40a-1c5',
  name: '非接触ドアスイッチ',
  model: 'D40A-1C5（ケーブル 5m）',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン D40A 小形非接触ドアスイッチ（電源 DC24V +10%/−15%、0.6W、IP67）。アクチュエータが 5mm 以内に近づくと ON、15mm 以上離れると OFF。表示灯は扉開で赤、扉閉で黄。' +
    'OSSD 出力は持たず、専用コントローラ G9SX-NS（omron.g9sx-ns202-rt）と組み合わせて PL d / カテゴリ3。配線: 茶 → D3、青 → D4、白 → D1（または前段の黒）、黒 → D2（または次段の白）。最大 30 台を直列接続できる。黄は扉閉で ON する補助出力（PNP 10mA）。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '-') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    return { ...base, role: 'signal' as const, optional: true };
  }),
  // 0.6W / 24V
  loadCurrent: 0.025,
};

export default def;
