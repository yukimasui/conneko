import type { DeviceDefinition } from '../types';

/**
 * 三相かご形誘導電動機（全閉外扇形・脚取付・横置き）。
 * 左に出力軸、胴体に冷却フィン、右にファンカバー、上部に端子箱を持つ一般的な外観。
 * 盤外の大型機器のため実寸より縮小して描く（実物の 0.75kW 級で全長 300mm 前後）。
 * 端子箱はふたを外した状態で、U/V/W と接地端子のネジが見える。
 */

const W = 240;
const H = 160;

/** 胴体（固定子フレーム）の範囲 */
const BX1 = 44;
const BX2 = 168;
const BY1 = 64;
const BY2 = 134;

/** 端子箱の範囲と端子ネジ位置 */
const TB_X = 76;
const TB_W = 80;
const TB_Y = 18;
const TY = 38;
const TERMINALS = [
  { id: 'U', x: 90 },
  { id: 'V', x: 108 },
  { id: 'W', x: 126 },
];
const EX = 144;

/**
 * 出力ごとの定格電流（200V 50Hz 4極の代表値[A]、高効率形の銘板値程度）。
 * params の選択肢と銘板の表示に使う。
 */
const RATINGS = [
  { kw: '0.2', amp: 1.2 },
  { kw: '0.4', amp: 2.1 },
  { kw: '0.75', amp: 3.6 },
  { kw: '1.5', amp: 6.6 },
  { kw: '2.2', amp: 9.6 },
  { kw: '3.7', amp: 15.4 },
];

const screw = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="5.5" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <path d="M${x - 3.2} ${y - 3.2} L${x + 3.2} ${y + 3.2} M${x + 3.2} ${y - 3.2} L${x - 3.2} ${y + 3.2}" stroke="#444" stroke-width="1.2"/>`;

/** 冷却フィン（軸方向に走るリブ） */
const fins = (() => {
  let s = '';
  for (let y = BY1 + 6; y < BY2 - 2; y += 6) {
    s += `<line x1="${BX1 + 3}" y1="${y}" x2="${BX2 - 3}" y2="${y}" stroke="#3e5260" stroke-width="1.6" stroke-opacity="0.55"/>`;
    s += `<line x1="${BX1 + 3}" y1="${y + 1.6}" x2="${BX2 - 3}" y2="${y + 1.6}" stroke="#d7e2e8" stroke-width="0.8" stroke-opacity="0.5"/>`;
  }
  return s;
})();

/** ファンカバーの通風スリット */
const slots = (() => {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const x = 206 + i * 4.2;
    s += `<rect x="${x}" y="76" width="2" height="44" rx="1" fill="#1e2a32"/>`;
  }
  return s;
})();

const svg = (ratedCurrent: number | string) => {
  const amp = Number(ratedCurrent);
  const kw = RATINGS.find((r) => r.amp === amp)?.kw;
  return `
  <defs>
    <linearGradient id="frame-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4f6674"/>
      <stop offset="0.3" stop-color="#9bb2bf"/>
      <stop offset="0.5" stop-color="#a9bfcb"/>
      <stop offset="0.8" stop-color="#6c8494"/>
      <stop offset="1" stop-color="#3f525e"/>
    </linearGradient>
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a606d"/>
      <stop offset="0.35" stop-color="#93aab7"/>
      <stop offset="0.55" stop-color="#9fb5c1"/>
      <stop offset="1" stop-color="#3c4f5a"/>
    </linearGradient>
    <linearGradient id="shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
    <linearGradient id="box-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6f8796"/>
      <stop offset="0.5" stop-color="#a3b9c5"/>
      <stop offset="1" stop-color="#5e7684"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </radialGradient>
  </defs>

  <!-- 床の影 -->
  <ellipse cx="120" cy="154" rx="104" ry="4" fill="#000" fill-opacity="0.12"/>

  <!-- 脚（取付足） -->
  <path d="M60 128 L56 150 H100 L96 128 Z" fill="#566d7b" stroke="#33434d" stroke-width="1"/>
  <path d="M140 128 L136 150 H180 L176 128 Z" fill="#566d7b" stroke="#33434d" stroke-width="1"/>
  <rect x="54" y="146" width="48" height="5" rx="1" fill="#46596540" stroke="#33434d" stroke-width="0.8"/>
  <rect x="134" y="146" width="48" height="5" rx="1" fill="#46596540" stroke="#33434d" stroke-width="0.8"/>
  <ellipse cx="66" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <ellipse cx="90" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <ellipse cx="146" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <ellipse cx="170" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>

  <!-- 出力軸（キー溝付き） -->
  <rect x="6" y="92" width="30" height="12" rx="1.5" fill="url(#shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <rect x="10" y="93.2" width="16" height="3" rx="1.4" fill="#5a5a5a"/>

  <!-- 負荷側ブラケット -->
  <path d="M44 70 L34 76 Q30 98 34 120 L44 128 Z" fill="url(#cover-{{uid}})" stroke="#33434d" stroke-width="1"/>
  <rect x="30" y="88" width="6" height="20" rx="1.5" fill="#46596a" stroke="#33434d" stroke-width="0.8"/>

  <!-- 固定子フレーム（冷却フィン付き） -->
  <rect x="${BX1}" y="${BY1}" width="${BX2 - BX1}" height="${BY2 - BY1}" rx="6" fill="url(#frame-{{uid}})" stroke="#33434d" stroke-width="1.2"/>
  ${fins}

  <!-- 銘板 -->
  <rect x="56" y="86" width="50" height="36" rx="1.5" fill="#d9dcd6" stroke="#6a6d68" stroke-width="0.8"/>
  <text x="81" y="95" text-anchor="middle" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#222">3~ MOTOR</text>
  <line x1="59" y1="97.5" x2="103" y2="97.5" stroke="#8a8d88" stroke-width="0.5"/>
  <text x="81" y="106" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#111">${kw ? `${kw}kW` : '---kW'} 4P</text>
  <text x="81" y="113.5" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#222">200V ${Number.isFinite(amp) ? amp : '-'}A</text>
  <text x="81" y="119.5" text-anchor="middle" font-family="sans-serif" font-size="4.5" fill="#555">50Hz  S1</text>

  <!-- 反負荷側ブラケット -->
  <rect x="${BX2}" y="68" width="8" height="62" rx="2" fill="url(#cover-{{uid}})" stroke="#33434d" stroke-width="1"/>

  <!-- ファンカバー -->
  <path d="M176 70 H218 Q232 70 232 84 V112 Q232 126 218 126 H176 Z" fill="url(#cover-{{uid}})" stroke="#33434d" stroke-width="1.2"/>
  <line x1="182" y1="70" x2="182" y2="126" stroke="#33434d" stroke-width="0.8" stroke-opacity="0.6"/>
  ${slots}

  <!-- 吊りボルト -->
  <rect x="57" y="56" width="6" height="9" fill="#7c8d96" stroke="#444" stroke-width="0.8"/>
  <circle cx="60" cy="50" r="7" fill="none" stroke="#6d7f88" stroke-width="3.2"/>
  <circle cx="60" cy="50" r="7" fill="none" stroke="#3a4850" stroke-width="0.8"/>

  <!-- 端子箱（ふたを外した状態） -->
  <rect x="${TB_X}" y="${TB_Y}" width="${TB_W}" height="${BY1 - TB_Y + 4}" rx="4" fill="url(#box-{{uid}})" stroke="#33434d" stroke-width="1.2"/>
  <rect x="${TB_X + 5}" y="${TB_Y + 5}" width="${TB_W - 10}" height="34" rx="2.5" fill="#26323a"/>
  <!-- 端子板 -->
  <rect x="${TB_X + 8}" y="${TB_Y + 9}" width="${TB_W - 16}" height="26" rx="2" fill="#e9e3d2" stroke="#9a937f" stroke-width="0.8"/>
  ${TERMINALS.map(
    (t) => `
  ${screw(t.x, TY)}
  <text x="${t.x}" y="${TY + 13}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#222">${t.id}</text>`,
  ).join('')}
  ${screw(EX, TY)}
  <!-- 接地記号 -->
  <path d="M${EX} ${TY + 7} V${TY + 10} M${EX - 4} ${TY + 10} H${EX + 4} M${EX - 2.6} ${TY + 12} H${EX + 2.6} M${EX - 1.2} ${TY + 14} H${EX + 1.2}" stroke="#2a8a2a" stroke-width="1"/>
  <!-- 電線引込口 -->
  <rect x="${TB_X + TB_W - 2}" y="${TB_Y + 22}" width="6" height="14" rx="1.5" fill="#46596a" stroke="#33434d" stroke-width="0.8"/>
`;
};

const def: DeviceDefinition = {
  type: 'generic.motor.3p',
  name: '三相誘導電動機',
  model: '3φ 200V 4P 全閉外扇形',
  category: 'load',
  // 三相かご形誘導電動機の直入れ始動は定格の 5〜8 倍。代表値 6 倍・1 秒
  inrush: { ratio: 6, seconds: 1 },
  description:
    '三相かご形誘導電動機（全閉外扇形・脚取付・4極）。端子箱の U/V/W に三相200Vを接続し、接地端子を接地する。出力（kW）は params で選択する。',
  labelPrefix: 'M',
  width: W,
  height: H,
  svg: (p) => svg(p.ratedCurrent),
  terminals: [
    ...TERMINALS.map((t) => ({
      id: t.id,
      hint: 'AC200V入力',
      x: t.x,
      y: TY,
      side: 'top' as const,
      role: 'input' as const,
      accepts: { system: 'AC' as const, minVoltage: 200, maxVoltage: 220, conductors: ['R', 'S', 'T'] as ('R' | 'S' | 'T')[] },
    })),
    { id: 'E', label: '⏚', hint: '接地', x: EX, y: TY, side: 'top', role: 'ground' },
  ],
  params: [
    {
      key: 'ratedCurrent',
      label: '出力',
      unit: 'A',
      options: RATINGS.map((r) => ({ value: r.amp, label: `${r.kw}kW (${r.amp}A)` })),
      default: 3.6,
    },
  ],
  loadCurrent: { param: 'ratedCurrent' },
  distinctGroups: [['U', 'V', 'W']],
  schematic: { elements: [{ kind: 'motor', terminals: ['U', 'V', 'W'] }] },
};

export default def;
