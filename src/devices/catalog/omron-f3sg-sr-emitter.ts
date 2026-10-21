import type { DeviceDefinition } from '../types';

/**
 * オムロン セーフティライトカーテン F3SG-SR シリーズ 送光器（F3SG-4SRA□-14 など）＋ ルートケーブル F39-JG□C-L（灰、5 芯）。
 * 断面 約 32 × 38mm のアルミ筐体に黒い上下キャップ。盤外機器なので長さ方向は大きく縮小して描く。
 * ケーブル先端の 5 本の芯線（M12 5 ピン、線色はデータシート F117 による）を端子として定義する。PNP で使う場合の接続。
 */

const W = 196;
const H = 248;

const BX = 12;
const BY = 6;
const BW = 22;
const BH = 196;

const SX = 96;
const SY = 228;
const TIP_X = 190;
const TIP_Y0 = 176;
const TIP_PITCH = 13;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  white: '#f4f4f2',
  yellow: '#f2d21b',
};

const WIRES: { id: string; base: string; text: string; label: string }[] = [
  { id: '+24V', base: 'brown', text: '茶 +24V', label: '+24V（電源。PNP 使用時。茶、ピン1）' },
  { id: '0V', base: 'blue', text: '青 0V', label: '0V（電源。PNP 使用時。青、ピン3）' },
  { id: 'TEST', base: 'black', text: '黒 TEST', label: 'TEST 入力（黒、ピン2。通常は 0V に接続）' },
  { id: 'COM+', base: 'white', text: '白 COM(+)', label: 'COM(+)（配線同期のときだけ受光器と接続。白、ピン4）' },
  { id: 'RANGE', base: 'yellow', text: '黄 距離切替/COM(−)', label: '検出距離切替入力 / COM(−)（黄、ピン5。開放または +24V で Long）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 1.1;
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
    <linearGradient id="alu-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d939a"/>
      <stop offset="0.2" stop-color="#d9dde1"/>
      <stop offset="0.55" stop-color="#eef0f2"/>
      <stop offset="0.85" stop-color="#c3c8cd"/>
      <stop offset="1" stop-color="#7f858c"/>
    </linearGradient>
    <linearGradient id="lens-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141416"/>
      <stop offset="0.5" stop-color="#34363a"/>
      <stop offset="1" stop-color="#141416"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>

  <rect x="${BX}" y="${BY + 10}" width="${BW}" height="${BH - 20}" rx="2" fill="url(#alu-{{uid}})" stroke="#5d6369" stroke-width="0.7"/>
  <rect x="${BX + 6}" y="${BY + 22}" width="${BW - 12}" height="${BH - 44}" fill="url(#lens-{{uid}})"/>
  ${Array.from({ length: 22 }, (_, i) => `<circle cx="${BX + BW / 2}" cy="${BY + 28 + i * 7}" r="1.2" fill="#4a2a2a"/>`).join('')}
  <!-- 上部の表示灯（CODE 緑・ERR・LONG・TEST） -->
  ${[0, 1, 2, 3].map((i) => `<rect x="${BX + 4}" y="${BY + 12 + i * 2.6}" width="3" height="2" fill="${i === 0 || i === 2 ? '#3ddc5a' : '#555'}"/>`).join('')}
  <rect x="${BX - 1}" y="${BY}" width="${BW + 2}" height="12" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX - 1}" y="${BY + BH - 12}" width="${BW + 2}" height="12" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX + 5}" y="${BY + BH}" width="${BW - 10}" height="9" rx="1.5" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <text x="${BX + BW + 6}" y="${BY + 30}" font-family="sans-serif" font-size="5" font-weight="bold" fill="#222" transform="rotate(90 ${BX + BW + 6} ${BY + 30})">OMRON  F3SG-SR  送光器</text>

  <!-- ルートケーブル（灰） -->
  <path d="M${BX + BW / 2} ${BY + BH + 9} V${SY - 12} Q${BX + BW / 2} ${SY} ${BX + BW / 2 + 12} ${SY} H${SX}" fill="none" stroke="#6f7378" stroke-width="5"/>
  <rect x="${SX - 3}" y="${SY - 4}" width="5" height="8" rx="1" fill="#55585c"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };

const def: DeviceDefinition = {
  type: 'omron.f3sg-sr.emitter',
  name: 'セーフティライトカーテン 送光器',
  model: 'F3SG-4SRA□-14 送光器 + F39-JG□C-L',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン F3SG-SR シリーズ セーフティライトカーテンの送光器（タイプ4、PL e / カテゴリ4）。電源は茶 +24V / 青 0V（DC24V ±20%。図は PNP の場合）。' +
    'TEST 入力（黒）は通常 0V に接続する。検出距離切替（黄）は開放または +24V で Long。光同期の場合、COM 線（白・黄）は受光器と接続しない。受光器（omron.f3sg-sr.receiver）と同じ電源から給電する。',
  labelPrefix: 'LC',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+24V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '0V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    return { ...base, role: 'signal' as const, optional: true };
  }),
  safety: { esType: 4, pl: 'e', category: '4', sil: 3, standards: ['IEC 61496-1', 'IEC 61496-2', 'ISO 13849-1', 'IEC 61508'] },
  // 送光器の消費電流（例: F3SG-4SRA0160-14 で 68mA）
  loadCurrent: 0.07,
};

export default def;
