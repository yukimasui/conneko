import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * KEYENCE セーフティライトカーテン GL-R シリーズ 送光器（GL-R□F/H/L）＋ 5 芯ケーブル GL-RP□P。
 * 断面 幅38 × 奥行32mm のアルミ筐体（黄色）に黒い上下キャップと黒い前面レンズ部。
 * 盤外機器なので長さ方向は大きく縮小して描く（代表として GL-R24H 程度、全長約 480mm）。
 * 下端の専用プラグからケーブルが出て、先端の芯線（線色は KEYENCE 配線ナビによる）のうち電源・FE の 3 本を端子として定義する
 * （白・黒は 5 芯ケーブルの送光器側では未使用なので、絶縁キャップ付きで描く）。
 */

const W = 196;
const H = 258;

const BX = 12;
const BY = 6;
const BW = 24;
const BH = 196;

const SX = 96;
const SY = 236;
const TIP_X = 190;
const TIP_Y0 = 186;
const TIP_PITCH = 13;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  white: '#f4f4f2',
  gray: '#9a9a9a',
};

const WIRES: { id: string; base: string; text: string; label: string; unused?: boolean }[] = [
  { id: 'FE', base: 'gray', text: '灰 FE', label: 'FE（機能接地、灰）' },
  { id: '+24V', base: 'brown', text: '茶 +24V', label: '+24V（電源、茶）' },
  { id: '0V', base: 'blue', text: '青 0V', label: '0V（電源、青）' },
  { id: 'WHITE', base: 'white', text: '白 未使用', label: '', unused: true },
  { id: 'BLACK', base: 'black', text: '黒 未使用', label: '', unused: true },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 1.1;
    const ty = tipY(i);
    const end = w.unused ? TIP_X - 12 : TIP_X - 10;
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 30} ${y0.toFixed(1)} ${TIP_X - 56} ${ty} ${end} ${ty}`;
    const outline = ['white', 'gray'].includes(w.base) ? '#777' : '#000';
    const tip = w.unused
      ? `<rect x="${TIP_X - 13}" y="${ty - 2.8}" width="7" height="5.6" rx="2.6" fill="#2a2a2a" stroke="#000" stroke-width="0.4"/>`
      : `<rect x="${TIP_X - 11}" y="${ty - 2}" width="4" height="4" rx="0.8" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.2}" width="7" height="2.4" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>`;
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="2.9" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="2" stroke-linecap="round"/>
  ${tip}
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 15, ty - 2.8, w.text, 3.8, w.unused ? '#888' : '#222', 'end')}</g>`;
  }).join('');

const svg = `
  <defs>
    <linearGradient id="alu-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b98a00"/>
      <stop offset="0.18" stop-color="#f2be12"/>
      <stop offset="0.5" stop-color="#ffd23c"/>
      <stop offset="0.82" stop-color="#eab40c"/>
      <stop offset="1" stop-color="#a87c00"/>
    </linearGradient>
    <linearGradient id="lens-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0d0d0e"/>
      <stop offset="0.5" stop-color="#2b2c2f"/>
      <stop offset="1" stop-color="#0d0d0e"/>
    </linearGradient>
    <linearGradient id="ferrule-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>

  <!-- 黄色いアルミ筐体と黒い前面レンズ部 -->
  <rect x="${BX}" y="${BY + 12}" width="${BW}" height="${BH - 24}" rx="2" fill="url(#alu-{{uid}})" stroke="#7a5a00" stroke-width="0.7"/>
  <rect x="${BX + 7}" y="${BY + 14}" width="${BW - 14}" height="${BH - 28}" fill="url(#lens-{{uid}})"/>
  ${Array.from({ length: 24 }, (_, i) => `<circle cx="${BX + BW / 2}" cy="${BY + 20 + i * 6.8}" r="1.3" fill="#4a2a2a"/>`).join('')}
  <!-- 送光器は電源表示灯のみ（光同期のため他の表示灯は使わない） -->
  <rect x="${BX + 8.5}" y="${BY + 20}" width="${BW - 17}" height="6" rx="1.2" fill="#3ddc5a"/>
  <!-- 上下キャップ・ケーブル用プラグ -->
  <rect x="${BX - 1}" y="${BY}" width="${BW + 2}" height="16" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX - 1}" y="${BY + BH - 16}" width="${BW + 2}" height="16" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX + 5}" y="${BY + BH}" width="${BW - 10}" height="9" rx="1.5" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <text x="${BX + BW + 6}" y="${BY + 40}" font-family="sans-serif" font-size="5" font-weight="bold" fill="#222" transform="rotate(90 ${BX + BW + 6} ${BY + 40})">KEYENCE  GL-R  送光器</text>

  <!-- ケーブル（黒） -->
  <path d="M${BX + BW / 2} ${BY + BH + 9} V${SY - 12} Q${BX + BW / 2} ${SY} ${BX + BW / 2 + 12} ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="5"/>
  <rect x="${SX - 3}" y="${SY - 4}" width="5" height="8" rx="1" fill="#222"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };

const def: DeviceDefinition = {
  type: 'keyence.gl-r.emitter',
  name: 'セーフティライトカーテン 送光器',
  model: 'GL-R□H 送光器 + GL-RP□P（5芯）',
  maker: 'KEYENCE',
  category: 'safety',
  description:
    'KEYENCE GL-R シリーズ セーフティライトカーテンの送光器（タイプ4、PL e / カテゴリ4、SIL3）。電源は茶 +24V / 青 0V（DC24V ±20%）、灰は FE（機能接地）。5 芯ケーブルでは白・黒は送光器側で未使用（1 本ずつ絶縁する）。' +
    '受光器（keyence.gl-r.receiver）とセットで使い、光同期なら送光器と受光器の間の配線は不要。受光器と同じ電源（0V 共通）から給電する。',
  labelPrefix: 'LC',
  width: W,
  height: H,
  svg,
  terminals: WIRES.flatMap((w, i): TerminalDef[] => {
    if (w.unused) return [];
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+24V') return [{ ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } }];
    if (w.id === '0V') return [{ ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } }];
    return [{ ...base, role: 'ground' as const, optional: true }];
  }),
  // 送光器の消費電流（機種により 37〜95mA）
  loadCurrent: 0.095,
};

export default def;
