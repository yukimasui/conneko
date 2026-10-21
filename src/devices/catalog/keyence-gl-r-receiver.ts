import type { DeviceDefinition } from '../types';

/**
 * KEYENCE セーフティライトカーテン GL-R シリーズ 受光器（GL-R□F/H/L）＋ 11 芯ケーブル GL-RP□PM（PNP）。
 * 断面 幅38 × 奥行32mm のアルミ筐体（黄色）に黒い上下キャップと黒い前面レンズ部、緑のセンター表示灯が並ぶ。
 * 盤外機器なので長さ方向は大きく縮小して描く（代表として GL-R24H 程度、全長約 480mm）。
 * 下端の専用プラグからケーブルが出て、先端の 11 本の芯線（線色は KEYENCE 配線ナビによる）を端子として定義する。
 */

const W = 196;
const H = 258;

/** 本体（縦長のバー） */
const BX = 12;
const BY = 6;
const BW = 24;
const BH = 196;

/** ケーブルのシース端と芯線の先端 */
const SX = 96;
const SY = 236;
const TIP_X = 190;
const TIP_Y0 = 120;
const TIP_PITCH = 12.4;

const COLORS: Record<string, string> = {
  brown: '#7b4a26',
  blue: '#1f5fd1',
  black: '#1c1c1c',
  white: '#f4f4f2',
  gray: '#9a9a9a',
  orange: '#f28a1c',
  red: '#d8231f',
  pink: '#f39bc0',
  yellow: '#f2d21b',
};

const WIRES: { id: string; base: string; stripe?: string; text: string; label: string }[] = [
  { id: '+24V', base: 'brown', text: '茶 +24V', label: '+24V（電源、茶）' },
  { id: '0V', base: 'blue', text: '青 0V', label: '0V（電源、青）' },
  { id: 'OSSD1', base: 'black', text: '黒 OSSD1', label: 'OSSD1（安全出力 PNP 500mA、黒）' },
  { id: 'OSSD2', base: 'white', text: '白 OSSD2', label: 'OSSD2（安全出力 PNP 500mA、白）' },
  { id: 'FE', base: 'gray', text: '灰 FE', label: 'FE（機能接地、灰）' },
  { id: 'RESET', base: 'yellow', text: '黄 リセット', label: 'リセット入力（黄）' },
  { id: 'INTERLOCK', base: 'pink', text: 'ピンク I/L選択', label: 'インターロック選択入力（ピンク）' },
  { id: 'EDM', base: 'red', stripe: 'black', text: '赤黒 EDM', label: 'EDM 入力（外部機器監視、赤/黒）' },
  { id: 'AUX', base: 'red', text: '赤 AUX', label: 'AUX 出力（非安全 50mA、赤）' },
  { id: 'SYNC1', base: 'orange', text: '橙 同期1', label: '同期線 1（配線同期時のみ。橙）' },
  { id: 'SYNC2', base: 'orange', stripe: 'black', text: '橙黒 同期2', label: '同期線 2（配線同期時のみ。橙/黒）' },
];
const tipY = (i: number) => +(TIP_Y0 + i * TIP_PITCH).toFixed(1);

const text = (x: number, y: number, t: string, size: number, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const fan = () =>
  WIRES.map((w, i) => {
    const y0 = SY + (i - (WIRES.length - 1) / 2) * 0.9;
    const ty = tipY(i);
    const d = `M${SX} ${y0.toFixed(1)} C${SX + 30} ${y0.toFixed(1)} ${TIP_X - 56} ${ty} ${TIP_X - 10} ${ty}`;
    const outline = ['white', 'yellow', 'pink', 'gray', 'orange'].includes(w.base) ? '#777' : '#000';
    return `
  <path d="${d}" fill="none" stroke="${outline}" stroke-width="2.9" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${COLORS[w.base]}" stroke-width="2" stroke-linecap="round"/>
  ${w.stripe ? `<path d="${d}" fill="none" stroke="${COLORS[w.stripe]}" stroke-width="1" stroke-dasharray="3 3"/>` : ''}
  <rect x="${TIP_X - 11}" y="${ty - 2}" width="4" height="4" rx="0.8" fill="${COLORS[w.base]}" stroke="${outline}" stroke-width="0.5"/>
  <rect x="${TIP_X - 7}" y="${ty - 1.2}" width="7" height="2.4" fill="url(#ferrule-{{uid}})" stroke="#777" stroke-width="0.3"/>
  <g stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" stroke-opacity="0.85">${text(TIP_X - 13, ty - 2.8, w.text, 3.8, '#222', 'end')}</g>`;
  }).join('');

/** 7 セグメント風の数字表示（"--" を表示） */
const sevenSeg = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="14" height="9" rx="1" fill="#1a0d0d"/>` +
  `<rect x="${x + 2}" y="${y + 4}" width="4" height="1.2" fill="#ff4a3a"/><rect x="${x + 8}" y="${y + 4}" width="4" height="1.2" fill="#ff4a3a"/>`;

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
  <!-- 光軸（レンズ）とセンター表示灯（緑） -->
  ${Array.from({ length: 24 }, (_, i) => `<circle cx="${BX + BW / 2}" cy="${BY + 20 + i * 6.8}" r="1.3" fill="#3a3b3e"/>`).join('')}
  ${[0.2, 0.5, 0.8].map((f) => `<rect x="${BX + 8.5}" y="${(BY + 12 + (BH - 24) * f - 5).toFixed(1)}" width="${BW - 17}" height="10" rx="1.2" fill="#3ddc5a" opacity="0.95"/>`).join('')}
  <!-- 上キャップ（7 セグ表示）・下キャップ（ケーブル用プラグ） -->
  <rect x="${BX - 1}" y="${BY}" width="${BW + 2}" height="16" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  ${sevenSeg(BX + 5, BY + 3.5)}
  <rect x="${BX - 1}" y="${BY + BH - 16}" width="${BW + 2}" height="16" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.6"/>
  <rect x="${BX + 5}" y="${BY + BH}" width="${BW - 10}" height="9" rx="1.5" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <text x="${BX + BW + 6}" y="${BY + 40}" font-family="sans-serif" font-size="5" font-weight="bold" fill="#222" transform="rotate(90 ${BX + BW + 6} ${BY + 40})">KEYENCE  GL-R  受光器</text>

  <!-- ケーブル（黒） -->
  <path d="M${BX + BW / 2} ${BY + BH + 9} V${SY - 12} Q${BX + BW / 2} ${SY} ${BX + BW / 2 + 12} ${SY} H${SX}" fill="none" stroke="#151515" stroke-width="6"/>
  <rect x="${SX - 3}" y="${SY - 4}" width="5" height="8" rx="1" fill="#222"/>
  ${fan()}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8 };

const def: DeviceDefinition = {
  type: 'keyence.gl-r.receiver',
  name: 'セーフティライトカーテン 受光器',
  model: 'GL-R□H 受光器 + GL-RP□PM（11芯 PNP）',
  maker: 'KEYENCE',
  category: 'safety',
  description:
    'KEYENCE GL-R シリーズ セーフティライトカーテンの受光器（タイプ4、PL e / カテゴリ4、SIL3）。電源は茶 +24V / 青 0V（DC24V ±20%）。安全出力は OSSD1（黒）・OSSD2（白）の PNP 2 出力（各 500mA）。' +
    '配線例: OSSD1/OSSD2 を安全コントローラー・安全リレーの 2 チャンネル入力（例: GC-1000 の Si0/Si1）へ。安全機器と 0V は共通にする。' +
    '単体で接触器を駆動する場合: OSSD1→K1、OSSD2→K2 のコイル。EDM 使用時は赤/黒 → K1 の b 接点 → K2 の b 接点（ミラー接点）→ +24V。自動復帰は黄を +24V、手動復帰は黄 → リセットスイッチ（a 接点）→ +24V とし、ピンクを +24V。' +
    '同期線（橙・橙/黒）は配線同期のときだけ送光器と接続する。未使用線は 1 本ずつ絶縁する。送光器（keyence.gl-r.emitter）とセットで使う。',
  labelPrefix: 'LC',
  width: W,
  height: H,
  svg,
  terminals: WIRES.map((w, i) => {
    const base = { id: w.id, label: w.label, x: TIP_X, y: tipY(i), side: 'right' as const };
    if (w.id === '+24V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['+' as const] } };
    if (w.id === '0V') return { ...base, role: 'input' as const, accepts: { ...power, conductors: ['-' as const] } };
    if (w.id === 'FE') return { ...base, role: 'ground' as const, optional: true };
    return { ...base, role: 'signal' as const, optional: true };
  }),
  // 受光器の消費電流（機種により 66〜111mA。OSSD の負荷電流は別途）
  loadCurrent: 0.111,
};

export default def;
