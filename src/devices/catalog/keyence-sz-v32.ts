import type { DeviceDefinition } from '../types';

/**
 * KEYENCE セーフティレーザスキャナ SZ-V32（マルチバンクタイプ）＋ 電源ケーブル SZ-VP□（18 芯）。
 * 黄色い表示ユニット（カラー液晶・操作ボタン・表示灯）、黒い窓のスキャナヘッド、黄色いベースからなる。
 * 盤外機器なので縮小して描く（1mm ≒ 0.8px）。表示ユニット右側から出る電源ケーブル先端の 18 本の芯線
 * （線色は取扱説明書 96M13938 による）を端子として定義する。
 */

const W = 268;
const H = 236;

/** ケーブルのシース端と芯線の先端 */
const SX = 162;
const SY = 132;
const TIP_X = 262;
const TIP_Y0 = 42;
const TIP_PITCH = 10.4;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  white: '#f4f4f2',
  gray: '#9a9a9a',
  yellow: '#f2d21b',
  red: '#d8231f',
  lightblue: '#7cc7f0',
  orange: '#f28a1c',
  pink: '#f39bc0',
  green: '#2aa84a',
};

const WIRES: { id: string; base: string; stripe?: string; text: string; label: string }[] = [
  { id: '+24V', base: 'brown', text: '茶 +24V', label: '+24V（電源、茶）' },
  { id: '0V', base: 'blue', text: '青 0V', label: '0V（電源、青）' },
  { id: 'OSSD1', base: 'black', text: '黒 OSSD1', label: 'OSSD1（安全出力 500mA、黒）' },
  { id: 'OSSD2', base: 'white', text: '白 OSSD2', label: 'OSSD2（安全出力 500mA、白）' },
  { id: 'AUX1', base: 'gray', text: '灰 AUX1', label: 'AUX1（非安全出力、灰）' },
  { id: 'AUX2', base: 'gray', stripe: 'black', text: '灰黒 AUX2', label: 'AUX2（非安全出力、灰/黒）' },
  { id: 'IN1', base: 'yellow', text: '黄 リセット', label: '入力1: リセット入力 / レーザ停止入力（黄）' },
  { id: 'IN2', base: 'red', text: '赤 EDM', label: '入力2: EDM 入力（外部機器監視、赤）' },
  { id: 'IN3', base: 'lightblue', text: '水 バンクA', label: '入力3: バンク A（水色）' },
  { id: 'IN4', base: 'lightblue', stripe: 'black', text: '水黒 バンクa', label: '入力4: バンク a（水色/黒）' },
  { id: 'IN5', base: 'yellow', stripe: 'black', text: '黄黒 バンクD', label: '入力5: バンク D / エンコーダ 1A（黄/黒）' },
  { id: 'IN6', base: 'red', stripe: 'black', text: '赤黒 バンクd', label: '入力6: バンク d / エンコーダ 2A（赤/黒）' },
  { id: 'IN7', base: 'orange', text: '橙 バンクB', label: '入力7: バンク B（橙）' },
  { id: 'IN8', base: 'orange', stripe: 'black', text: '橙黒 バンクb', label: '入力8: バンク b（橙/黒）' },
  { id: 'IN9', base: 'pink', text: '桃 バンクC', label: '入力9: バンク C / エンコーダ 1B（ピンク）' },
  { id: 'IN10', base: 'pink', stripe: 'black', text: '桃黒 バンクc', label: '入力10: バンク c / エンコーダ 2B（ピンク/黒）' },
  { id: 'IN11', base: 'green', text: '緑 AUX3/バンクE', label: '入力11: バンク E / AUX3 出力（設定で切替。緑）' },
  { id: 'IN12', base: 'green', stripe: 'black', text: '緑黒 AUX4/バンクe', label: '入力12: バンク e / AUX4 出力（設定で切替。緑/黒）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.55;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 26} ${y0.toFixed(1)} ${TIP_X - 50} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'yellow', 'pink', 'gray', 'orange', 'lightblue'].includes(w.base) ? '#777' : '#000';
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="1.7" stroke-linecap="round"/>
  ${w.stripe ? `<path d="${d}" fill="none" stroke="${COLORS[w.stripe]}" stroke-width="0.9" stroke-dasharray="2.6 2.6"/>` : ''}
  <rect x="${TIP_X - 11}" y="${ty - 1.8}" width="4" height="3.6" rx="0.7" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.1}" width="7" height="2.2" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 13, ty - 2.2, w.text, 3.4, '#222', 'end')}</g>`;
  }).join('');

const svg = `
  <defs>
    <linearGradient id="yel-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c99a00"/>
      <stop offset="0.15" stop-color="#f6c514"/>
      <stop offset="0.85" stop-color="#f0be0e"/>
      <stop offset="1" stop-color="#b58a00"/>
    </linearGradient>
    <linearGradient id="win-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0c0c0d"/>
      <stop offset="0.3" stop-color="#2c2e31"/>
      <stop offset="0.55" stop-color="#3b3e42"/>
      <stop offset="1" stop-color="#0c0c0d"/>
    </linearGradient>
    <linearGradient id="lcd-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3fd86a"/>
      <stop offset="1" stop-color="#1b9e43"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>

  <!-- 取付けブラケット（右側面、黒） -->
  <rect x="112" y="70" width="14" height="96" rx="2" fill="#1b1c1e" stroke="#000" stroke-width="0.6"/>
  ${[86, 112, 140].map((y) => `<circle cx="119" cy="${y}" r="3.2" fill="#555" stroke="#111" stroke-width="0.5"/>`).join('')}

  <!-- ベース（黄） -->
  <path d="M10 168 L18 148 H112 L118 168 Z" fill="url(#yel-{{uid}})" stroke="#7a5a00" stroke-width="0.7"/>
  <rect x="8" y="166" width="112" height="20" rx="2" fill="url(#yel-{{uid}})" stroke="#7a5a00" stroke-width="0.7"/>
  <text x="18" y="180" font-family="sans-serif" font-size="8" font-weight="bold" font-style="italic" fill="#111">KEYENCE</text>

  <!-- スキャナヘッド（黒い窓、検出面） -->
  <path d="M22 76 H106 L112 150 H16 Z" fill="url(#win-{{uid}})" stroke="#000" stroke-width="0.7"/>
  <path d="M19 112 H109" stroke="#55595e" stroke-width="0.8" opacity="0.8"/>
  <rect x="44" y="104" width="40" height="4" rx="1" fill="#e04a2c" opacity="0.55"/>
  <rect x="24" y="70" width="80" height="8" rx="1.5" fill="#26282b"/>
  <!-- スキャナヘッドの表示灯 -->
  <rect x="26" y="84" width="10" height="5" rx="1" fill="#3ddc5a"/>

  <!-- 表示ユニット（黄、カラー液晶と操作ボタン） -->
  <rect x="18" y="12" width="92" height="60" rx="4" fill="url(#yel-{{uid}})" stroke="#7a5a00" stroke-width="0.8"/>
  <rect x="38" y="18" width="42" height="30" rx="1.5" fill="#111"/>
  <rect x="40" y="20" width="38" height="26" fill="url(#lcd-{{uid}})"/>
  ${text(59, 30, 'OSSD', 5, '#fff')}
  ${text(59, 40, 'ON', 7, '#fff')}
  ${[0, 1, 2, 3].map((i) => `<rect x="${40 + i * 10}" y="53" width="8" height="5" rx="1" fill="#2b2c2e"/>`).join('')}
  ${[
    ['#3ddc5a', 22],
    ['#f2b705', 30],
    ['#f2b705', 38],
    ['#555', 46],
  ]
    .map(([c, y]) => `<rect x="24" y="${y}" width="6" height="4" rx="0.8" fill="${c}" stroke="#111" stroke-width="0.3"/>`)
    .join('')}
  <rect x="86" y="20" width="18" height="16" rx="1.5" fill="#2b2c2e"/>
  ${text(95, 30, 'USB', 3.4, '#ddd', 'middle', 'normal')}
  ${text(64, 66, 'SZ-V32', 5, '#111')}

  <!-- 電源ケーブル（表示ユニット右側から下へ） -->
  <rect x="108" y="22" width="10" height="12" rx="2" fill="#222"/>
  <path d="M118 28 H132 Q140 28 140 36 V${SY - 8} Q140 ${SY} 148 ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="6"/>
  <rect x="${SX - 3}" y="${SY - 4.5}" width="5" height="9" rx="1" fill="#222"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4 };

const def: DeviceDefinition = {
  type: 'keyence.sz-v32',
  name: 'セーフティレーザスキャナ',
  model: 'SZ-V32 + SZ-VP□（18芯）',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE SZ-V シリーズのセーフティレーザスキャナ（マルチバンクタイプ、検出角 190°、保護領域最大 8.4m、タイプ3 / PL d / カテゴリ3）。電源は茶 +24V / 青 0V（DC24V ±10%、無負荷 11.8W）。' +
    '安全出力は OSSD1（黒）・OSSD2（白）、各 500mA（PNP/NPN は設定で選択）。配線例: OSSD1→K1、OSSD2→K2 のコイル（または安全コントローラーの 2 チャンネル入力）。EDM（赤）は K1・K2 の b 接点（ミラー接点）を経由して +24V へ。リセット（黄）はリセットスイッチ（a 接点）経由で +24V へ。' +
    'バンク切替入力（水色・黄/黒・橙・桃・緑と、その黒ストライプ）は A/a のように相補のペアで使う。未使用線は 1 本ずつ絶縁する。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+24V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '0V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    return { ...base, role: 'signal' as const, optional: true };
  }),
  // 無負荷時 11.8W / 24V（OSSD・AUX の負荷電流は別途）
  loadCurrent: 0.5,
};

export default def;
