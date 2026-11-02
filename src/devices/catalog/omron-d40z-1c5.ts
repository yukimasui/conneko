import type { DeviceDefinition } from '../types';

/**
 * オムロン 非接触ドアスイッチ D40Z-1C5（ケーブル 5m、6 芯）とアクチュエータ。
 * D40A と同じ大きさの黒い樹脂（PBT）の本体（1mm ≒ 2px）で、専用コントローラ G9SX-NS（または G9SP）の D1〜D4 端子に接続して使う。
 * D40A（PL d）と違い、G9SX-NS と組み合わせて PL e / カテゴリ 4。補助出力はフォトカプラ出力で黄・灰の 2 本（PNP / NPN のどちらの入力にも使える）。
 *
 * 出典: オムロン D40Z データシート（C145、Scribd の写し）、RS・販売店の型式表
 *   電源 DC24V、出力 P チャネル MOS FET、動作距離 OFF→ON 5mm・ON→OFF 15mm、補助出力 フォトカプラ 負荷電流 10mA、PL e / カテゴリ 4
 *   電源の確認は茶と青の間（データシートの異常診断の表）
 * 茶・青・白・黒の役割（電源 +・電源 −・入力・出力）は D40A と同じとした（推定）。
 * ケーブル先端の 6 本の芯線を端子として定義する。
 */

const W = 196;
const H = 150;

const SX = 96;
const SY = 132;
const TIP_X = 190;
const TIP_Y0 = 76;
const TIP_PITCH = 11;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  white: '#f4f4f2',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  yellow: '#f2d21b',
  gray: '#9a9a9a',
};

const WIRES: { id: string; base: string; text: string; label: string }[] = [
  { id: '+', base: 'brown', text: '茶 電源+ (D3)', label: '電源 +（茶。G9SX-NS の D3 へ）' },
  { id: '-', base: 'blue', text: '青 電源− (D4)', label: '電源 −（青。G9SX-NS の D4 へ）' },
  { id: 'IN', base: 'white', text: '白 入力 (D1)', label: 'ドアスイッチ入力（白。G9SX-NS の D1、または前段の黒から）' },
  { id: 'OUT', base: 'black', text: '黒 出力 (D2)', label: 'ドアスイッチ出力（黒。最終段は G9SX-NS の D2、それ以外は次段の白へ）' },
  { id: 'AUX1', base: 'yellow', text: '黄 補助出力', label: '補助出力 +側（黄。フォトカプラ 10mA・非安全。扉閉で灰と導通）' },
  { id: 'AUX2', base: 'gray', text: '灰 補助出力', label: '補助出力 −側（灰。フォトカプラ 10mA・非安全）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.9;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 30} ${y0.toFixed(1)} ${TIP_X - 56} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'yellow', 'gray'].includes(w.base) ? '#777' : '#000';
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
  <text x="22" y="34" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#d9dcdf" transform="rotate(90 22 34)">OMRON  D40Z-1C5</text>

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
  type: 'omron.d40z-1c5',
  name: '非接触ドアスイッチ',
  model: 'D40Z-1C5（ケーブル 5m）',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン D40Z 非接触ドアスイッチ（電源 DC24V、IP67、ケーブル 5m）。アクチュエータが 5mm 以内に近づくと ON、15mm 以上離れると OFF。' +
    'OSSD 出力は持たず、専用コントローラ G9SX-NS（omron.g9sx-ns202-rt）または G9SP と組み合わせて PL e / カテゴリ 4（D40A は PL d / カテゴリ 3）。' +
    '配線は D40A と同じ: 茶 → D3、青 → D4、白 → D1（または前段の黒）、黒 → D2（または次段の白）。複数台を直列につなげる。' +
    '黄・灰は扉閉で導通するフォトカプラの補助出力（10mA、非安全）。黄を +側にする: プラスコモンの PLC 入力なら 入力点 → 黄、灰 → 0V、マイナスコモンなら +24V → 黄、灰 → 入力点。' +
    '茶・青・白・黒の役割は D40A と同じとした（推定）。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '-') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    if (w.id === 'AUX1' || w.id === 'AUX2') return { ...base, role: 'signal' as const, optional: true, function: 'aux-output' as const };
    return { ...base, role: 'signal' as const, optional: true };
  }),
  // 扉閉（アクチュエータ検出）で、白（入力）に来た G9SX-NS の信号を黒（出力）から次段へ渡す（D40A と同じ半導体の出力）。
  // 補助出力は黄 → 灰へ流れるフォトカプラ（扉閉で導通）
  links: [
    { from: 'OUT', to: 'IN', switch: 'output' },
    { from: 'AUX1', to: 'AUX2', switch: 'output', ratedCurrent: 0.01 },
  ],
  // G9SX-NS と組み合わせたときの性能
  safety: { pl: 'e', category: '4', standards: ['ISO 13849-1', 'ISO 14119'] },
  // D40A と同じ 0.6W / 24V とした（推定）
  loadCurrent: 0.025,
  estimated: '茶・青・白・黒の役割（D40A と同じとした）、補助出力の黄・灰の極性（黄を +側とした）、消費電流（D40A と同じ 0.6W とした）',
};

export default def;
