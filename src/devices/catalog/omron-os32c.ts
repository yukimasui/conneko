import type { DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * オムロン セーフティレーザスキャナ OS32C（タイプ 3 / PL d / カテゴリ 3）と電源ケーブル OS32C-CBL-□M（18 芯）。
 * 盤外機器なので縮小して描く（1mm ≒ 0.8px）。黒い本体の前面に半円の窓（検出角 270°）、上面に表示部。
 * 背面の I/O ブロックから出る電源ケーブルのうち、安全回路に使う芯線（電源・OSSD・EDM）を端子として定義する。
 *
 * 線色（OS32C クイックリファレンス 99863-0020）: 白 = +24V、茶 = 0V（一般のセンサーと逆）、赤 = OSSD A、黄 = OSSD B、茶/白 = EDM。
 *   ほかの芯線（スタート・スタンバイ・補助出力・警告出力・ゾーン切換入力など）は定義していない（線色を確かめられなかった）。
 * 安全出力 OSSD は PNP、2 出力で、駆動できる電流は 250mA とした（推定）。
 */

const W = 236;
const H = 168;

const SX = 134;
const SY = 118;
const TIP_X = 230;
const TIP_Y0 = 40;
const TIP_PITCH = 14;

const COLORS: Record<string, string> = {
  white: '#f4f4f2',
  brown: '#7b4a26',
  red: '#d8231f',
  yellow: '#f2d21b',
};

const WIRES: { id: string; base: string; stripe?: string; text: string; label: string }[] = [
  { id: '+24V', base: 'white', text: '白 +24V', label: '+24V（電源、白）' },
  { id: '0V', base: 'brown', text: '茶 0V', label: '0V（電源、茶）' },
  { id: 'OSSDA', base: 'red', text: '赤 OSSD A', label: 'OSSD A（安全出力 1、赤）' },
  { id: 'OSSDB', base: 'yellow', text: '黄 OSSD B', label: 'OSSD B（安全出力 2、黄）' },
  { id: 'EDM', base: 'brown', stripe: 'white', text: '茶白 EDM', label: 'EDM（外部機器監視、茶/白）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.9;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 26} ${y0.toFixed(1)} ${TIP_X - 50} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'yellow'].includes(w.base) ? '#777' : '#000';
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="2.9" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="2" stroke-linecap="round"/>
  ${w.stripe ? `<path d="${d}" fill="none" stroke="${COLORS[w.stripe]}" stroke-width="1" stroke-dasharray="2.6 2.6"/>` : ''}
  <rect x="${TIP_X - 11}" y="${ty - 2}" width="4" height="4" rx="0.8" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.2}" width="7" height="2.4" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 13, ty - 2.8, w.text, 3.8, '#222', 'end')}</g>`;
  }).join('');

const svg = `
  <defs>
    <linearGradient id="osbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141516"/>
      <stop offset="0.2" stop-color="#34373b"/>
      <stop offset="0.8" stop-color="#2c2f33"/>
      <stop offset="1" stop-color="#111213"/>
    </linearGradient>
    <linearGradient id="oswin-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0c0c0d"/>
      <stop offset="0.35" stop-color="#3a2a2a"/>
      <stop offset="0.6" stop-color="#4a2f2f"/>
      <stop offset="1" stop-color="#0c0c0d"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>

  <!-- 本体（幅 133mm × 高さ 104mm 前後） -->
  <rect x="10" y="62" width="108" height="86" rx="5" fill="url(#osbody-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <!-- 窓（光学カバー、前面に張り出す） -->
  <path d="M22 66 Q22 18 64 18 Q106 18 106 66 Z" fill="url(#oswin-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <path d="M30 60 Q30 28 64 28" fill="none" stroke="#7a5050" stroke-width="1" opacity="0.6"/>
  <!-- 表示部（7 セグメント・表示灯） -->
  <rect x="38" y="76" width="52" height="22" rx="2" fill="#111" stroke="#444" stroke-width="0.5"/>
  ${text(64, 91, '88', 11, '#ff4a3a')}
  ${[
    ['#ff3b30', 42],
    ['#3ddc5a', 50],
    ['#f2b705', 78],
    ['#f2b705', 86],
  ]
    .map(([c, x]) => `<rect x="${x}" y="102" width="5" height="3.4" rx="0.8" fill="${c}"/>`)
    .join('')}
  ${text(64, 122, 'OMRON', 7, '#e8e8e8')}
  ${text(64, 132, 'OS32C', 5, '#c9cdd1', 'middle', 'normal')}
  <!-- I/O ブロック（背面）から電源ケーブル -->
  <rect x="112" y="${SY - 8}" width="10" height="16" rx="2" fill="#222"/>
  <path d="M122 ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="6"/>
  <rect x="${SX - 3}" y="${SY - 4.5}" width="5" height="9" rx="1" fill="#222"/>
  ${fan()}
  ${text(W / 2, 9, 'OS32C セーフティレーザスキャナ（主な芯線）', 4.4, '#333', 'middle', 'normal')}
`;

const power = { system: 'DC' as const, minVoltage: 16.8, maxVoltage: 30 };
/** 安全出力（PNP。駆動できる電流 250mA は推定） */
const OSSD: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 0.25 };

const SPEC: Record<string, Partial<TerminalDef>> = {
  OSSDA: { role: 'supply', supply: OSSD, function: 'ossd', channel: 1, hint: 'OSSD A' },
  OSSDB: { role: 'supply', supply: OSSD, function: 'ossd', channel: 2, hint: 'OSSD B' },
  EDM: { role: 'signal', function: 'edm', hint: 'EDM' },
};

const def: DeviceDefinition = {
  type: 'omron.os32c',
  name: 'セーフティレーザスキャナ',
  model: 'OS32C + OS32C-CBL-□M（電源ケーブル 18 芯）',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロンのセーフティレーザスキャナ OS32C（検出角 270°、タイプ 3 / PL d / カテゴリ 3 / SIL 2）。電源は 白 = +24V、茶 = 0V（一般のセンサーと逆の色なので注意）、DC24V（+25% / −30%）。' +
    '安全出力は 赤 = OSSD A、黄 = OSSD B の 2 出力（PNP）で、保護領域に人が入ると両方が OFF になる。配線例: OSSD A → K1、OSSD B → K2 のコイル（または安全コントローラー・セーフティリレーの OSSD 入力）。' +
    'EDM（茶/白）には K1・K2 の b 接点（ミラー接点・強制ガイド接点）を直列に入れて戻す（EDM の戻し先の電位は取扱説明書で確認する）。' +
    '18 芯のうち、ここではスタート・スタンバイ・補助出力・警告出力・ゾーン切換入力などの芯線を定義していない（未使用の芯線は 1 本ずつ絶縁する）。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+24V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '0V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    return { ...base, role: 'signal' as const, optional: true, ...SPEC[w.id] };
  }),
  safetyChannels: [{ id: 'OSSD', label: '安全出力 OSSD A/B', kind: 'output', channels: [{ output: 'OSSDA' }, { output: 'OSSDB' }] }],
  safety: { esType: 3, pl: 'd', category: '3', sil: 2, standards: ['IEC 61496-1', 'IEC 61496-3', 'ISO 13849-1', 'IEC 61508'] },
  loadCurrent: 0.25,
  estimated: 'OSSD の駆動電流（250mA とした）、消費電流（250mA とした）、本体・表示部の見た目（資料不足）。EDM の戻し先の電位は未確認',
};

export default def;
