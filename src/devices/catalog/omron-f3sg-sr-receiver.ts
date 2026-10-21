import type { DeviceDefinition } from '../types';

/**
 * オムロン セーフティライトカーテン F3SG-SR シリーズ 受光器（F3SG-4SRA□-14 など）＋ ルートケーブル F39-JG□C-D（黒、8 芯）。
 * 断面 約 32 × 38mm のアルミ筐体に黒い上下キャップ。前面に表示灯（OSSD・ERR・エリアビーム表示灯 ABI など）。
 * 盤外機器なので長さ方向は大きく縮小して描く。筐体色はデータシートの写真（グレースケール）からの推定。
 * ケーブル先端の 8 本の芯線（M12 8 ピン、線色はデータシート F117 による）を端子として定義する。PNP で使う場合の接続。
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
const TIP_Y0 = 140;
const TIP_PITCH = 12.4;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  white: '#f4f4f2',
  gray: '#9a9a9a',
  red: '#d8231f',
  pink: '#f39bc0',
  yellow: '#f2d21b',
};

const WIRES: { id: string; base: string; text: string; label: string }[] = [
  { id: '+24V', base: 'brown', text: '茶 +24V', label: '+24V（電源。PNP 使用時。茶、ピン2）' },
  { id: '0V', base: 'blue', text: '青 0V', label: '0V（電源。PNP 使用時。青、ピン7）' },
  { id: 'OSSD1', base: 'black', text: '黒 OSSD1', label: 'OSSD1（安全出力 300mA、黒、ピン5）' },
  { id: 'OSSD2', base: 'white', text: '白 OSSD2', label: 'OSSD2（安全出力 300mA、白、ピン6）' },
  { id: 'RESET', base: 'yellow', text: '黄 RESET/EDM', label: 'RESET/EDM 入力（黄、ピン1）' },
  { id: 'MUTE_A', base: 'gray', text: '灰 MUTE A', label: 'MUTE A / PRE-RESET / PSDI / COM(+)（灰、ピン3）' },
  { id: 'MUTE_B', base: 'pink', text: '桃 MUTE B', label: 'MUTE B / COM(−)（ピンク、ピン4）' },
  { id: 'AUX', base: 'red', text: '赤 AUX', label: 'AUX 出力（非安全 100mA、赤、ピン8）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.9;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 30} ${y0.toFixed(1)} ${TIP_X - 56} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'yellow', 'pink', 'gray'].includes(w.base) ? '#777' : '#000';
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

  <!-- アルミ筐体・前面窓 -->
  <rect x="${BX}" y="${BY + 10}" width="${BW}" height="${BH - 20}" rx="2" fill="url(#alu-{{uid}})" stroke="#5d6369" stroke-width="0.7"/>
  <rect x="${BX + 6}" y="${BY + 22}" width="${BW - 12}" height="${BH - 44}" fill="url(#lens-{{uid}})"/>
  ${Array.from({ length: 22 }, (_, i) => `<circle cx="${BX + BW / 2}" cy="${BY + 28 + i * 7}" r="1.2" fill="#46484c"/>`).join('')}
  <!-- エリアビーム表示灯（ABI、緑）と上部の表示灯（OSSD・ERR など） -->
  ${[0.25, 0.5, 0.75].map((f) => `<rect x="${BX + 7.5}" y="${(BY + 22 + (BH - 44) * f - 4).toFixed(1)}" width="${BW - 15}" height="8" rx="1" fill="#3ddc5a"/>`).join('')}
  ${[0, 1, 2, 3].map((i) => `<rect x="${BX + 4}" y="${BY + 12 + i * 2.6}" width="3" height="2" fill="${i === 0 ? '#3ddc5a' : '#555'}"/>`).join('')}
  <!-- 上下キャップ・ケーブル用コネクタ -->
  <rect x="${BX - 1}" y="${BY}" width="${BW + 2}" height="12" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX - 1}" y="${BY + BH - 12}" width="${BW + 2}" height="12" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX + 5}" y="${BY + BH}" width="${BW - 10}" height="9" rx="1.5" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <text x="${BX + BW + 6}" y="${BY + 30}" font-family="sans-serif" font-size="5" font-weight="bold" fill="#222" transform="rotate(90 ${BX + BW + 6} ${BY + 30})">OMRON  F3SG-SR  受光器</text>

  <!-- ルートケーブル（黒） -->
  <path d="M${BX + BW / 2} ${BY + BH + 9} V${SY - 12} Q${BX + BW / 2} ${SY} ${BX + BW / 2 + 12} ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="5.5"/>
  <rect x="${SX - 3}" y="${SY - 4}" width="5" height="8" rx="1" fill="#222"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };

const def: DeviceDefinition = {
  type: 'omron.f3sg-sr.receiver',
  name: 'セーフティライトカーテン 受光器',
  model: 'F3SG-4SRA□-14 受光器 + F39-JG□C-D',
  maker: 'オムロン',
  category: 'safety',
  description:
    'オムロン F3SG-SR シリーズ セーフティライトカーテンの受光器（タイプ4、PL e / カテゴリ4）。電源は茶 +24V / 青 0V（DC24V ±20%）で、茶と青を入れ替えると NPN 出力になる（図は PNP）。安全出力 OSSD1（黒）・OSSD2（白）各 300mA。' +
    '配線例: OSSD1/OSSD2 を安全コントローラー・安全リレー（G9SP、G9SE、G9SA など）の 2 チャンネル入力へ。工場出荷時は自動リセット・EDM なし。' +
    '手動リセット＋EDM を使う場合は黄（RESET/EDM）→ リセットスイッチ → KM1・KM2 の b 接点（ミラー接点）→ +24V とし、Intelligent Tap または SD Manager 3 で設定する。送光器（omron.f3sg-sr.emitter）とセットで使う。',
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
  // 受光器の消費電流（例: F3SG-4SRA0160-14 で 106mA。OSSD の負荷電流は別途）
  loadCurrent: 0.11,
};

export default def;
