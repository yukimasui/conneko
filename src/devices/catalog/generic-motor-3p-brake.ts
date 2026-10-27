import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * ブレーキ付き三相かご形誘導電動機（全閉外扇形・脚取付・横置き、無励磁作動形の電磁ブレーキ付き）。
 * コンベヤ・昇降装置など、止めた位置で保持したい用途に使う一般的なブレーキモーター。
 *
 * 外観は generic.motor.3p と同じ描き方で、固定子とファンカバーの間にブレーキ部、端子箱に U・V・W・B1・B2・接地の端子を描く。
 * ブレーキの電源は 2 種類から選ぶ:
 * - AC200V（端子箱の整流器で直流にしてブレーキコイルへ。B1・B2 に AC200V を入れる）
 * - DC24V（B1・B2 に DC24V を入れる。極性なし）
 * ブレーキは通電で解放、電源を切ると保持する。インバーターで運転するときは、ブレーキの電源をインバーターの出力（U・V・W）からではなく、
 * 一次側か別の電源から取り、インバーターの運転信号と合わせて入り切りする（低い周波数では出力電圧が下がり、ブレーキが解放されないため）。
 *
 * 定格電流は generic.motor.3p と同じ代表値（200V 50Hz 4 極）。ブレーキの電流は B1・B2 の端子ごとの消費電流（AC200V 0.1A、DC24V 0.5A の代表値）で表す。
 */

const W = 260;
const H = 160;

const BX1 = 44;
const BX2 = 160;
const BY1 = 64;
const BY2 = 134;
/** ブレーキ部の範囲 */
const BRK1 = 168;
const BRK2 = 194;

/** 端子箱と端子ネジの位置 */
const TB_X = 66;
const TB_W = 120;
const TB_Y = 14;
const TY = 36;
const TERMINALS = [
  { id: 'U', x: 80 },
  { id: 'V', x: 97 },
  { id: 'W', x: 114 },
  { id: 'B1', x: 138 },
  { id: 'B2', x: 155 },
];
const EX = 174;

/** 出力ごとの定格電流（200V 50Hz 4 極の代表値[A]） */
const RATINGS = [
  { kw: '0.2', amp: 1.2 },
  { kw: '0.4', amp: 2.1 },
  { kw: '0.75', amp: 3.6 },
  { kw: '1.5', amp: 6.6 },
  { kw: '2.2', amp: 9.6 },
  { kw: '3.7', amp: 15.4 },
];

const ac = (p: ParamValues) => String(p.brakePower) !== 'dc24';

const screw = (x: number, y: number) => `
  <circle cx="${x}" cy="${y}" r="5.5" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <path d="M${x - 3.2} ${y - 3.2} L${x + 3.2} ${y + 3.2} M${x + 3.2} ${y - 3.2} L${x - 3.2} ${y + 3.2}" stroke="#444" stroke-width="1.2"/>`;

const fins = (() => {
  let s = '';
  for (let y = BY1 + 6; y < BY2 - 2; y += 6) {
    s += `<line x1="${BX1 + 3}" y1="${y}" x2="${BX2 - 3}" y2="${y}" stroke="#3e5260" stroke-width="1.6" stroke-opacity="0.55"/>`;
    s += `<line x1="${BX1 + 3}" y1="${y + 1.6}" x2="${BX2 - 3}" y2="${y + 1.6}" stroke="#d7e2e8" stroke-width="0.8" stroke-opacity="0.5"/>`;
  }
  return s;
})();

const slots = (() => {
  let s = '';
  for (let i = 0; i < 6; i++) s += `<rect x="${222 + i * 4.2}" y="76" width="2" height="44" rx="1" fill="#1e2a32"/>`;
  return s;
})();

const svg = (p: ParamValues) => {
  const amp = Number(p.ratedCurrent);
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
  <ellipse cx="${W / 2}" cy="154" rx="${W / 2 - 16}" ry="4" fill="#000" fill-opacity="0.12"/>
  <!-- 脚 -->
  <path d="M60 128 L56 150 H100 L96 128 Z" fill="#566d7b" stroke="#33434d" stroke-width="1"/>
  <path d="M132 128 L128 150 H172 L168 128 Z" fill="#566d7b" stroke="#33434d" stroke-width="1"/>
  <ellipse cx="66" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <ellipse cx="90" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <ellipse cx="138" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <ellipse cx="162" cy="148.5" rx="3.5" ry="1.6" fill="#1e2a32"/>
  <!-- 出力軸 -->
  <rect x="6" y="92" width="30" height="12" rx="1.5" fill="url(#shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <rect x="10" y="93.2" width="16" height="3" rx="1.4" fill="#5a5a5a"/>
  <!-- 負荷側ブラケット -->
  <path d="M44 70 L34 76 Q30 98 34 120 L44 128 Z" fill="url(#cover-{{uid}})" stroke="#33434d" stroke-width="1"/>
  <!-- 固定子フレーム -->
  <rect x="${BX1}" y="${BY1}" width="${BX2 - BX1}" height="${BY2 - BY1}" rx="6" fill="url(#frame-{{uid}})" stroke="#33434d" stroke-width="1.2"/>
  ${fins}
  <!-- 銘板 -->
  <rect x="54" y="86" width="56" height="38" rx="1.5" fill="#d9dcd6" stroke="#6a6d68" stroke-width="0.8"/>
  <text x="82" y="94.5" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#222">3~ BRAKE MOTOR</text>
  <line x1="57" y1="97" x2="107" y2="97" stroke="#8a8d88" stroke-width="0.5"/>
  <text x="82" y="105" text-anchor="middle" font-family="sans-serif" font-size="6.6" font-weight="bold" fill="#111">${kw ? `${kw}kW` : '---kW'} 4P</text>
  <text x="82" y="112.5" text-anchor="middle" font-family="sans-serif" font-size="5.6" fill="#222">200V ${Number.isFinite(amp) ? amp : '-'}A</text>
  <text x="82" y="119.5" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#555">BRAKE ${ac(p) ? 'AC200V' : 'DC24V'}</text>
  <!-- 反負荷側ブラケット -->
  <rect x="${BX2}" y="68" width="8" height="62" rx="2" fill="url(#cover-{{uid}})" stroke="#33434d" stroke-width="1"/>
  <!-- ブレーキ部 -->
  <rect x="${BRK1}" y="70" width="${BRK2 - BRK1}" height="56" rx="3" fill="#5d7482" stroke="#33434d" stroke-width="1.1"/>
  <line x1="${BRK1 + 3}" y1="76" x2="${BRK2 - 3}" y2="76" stroke="#33434d" stroke-width="0.6"/>
  <line x1="${BRK1 + 3}" y1="120" x2="${BRK2 - 3}" y2="120" stroke="#33434d" stroke-width="0.6"/>
  <text x="${(BRK1 + BRK2) / 2}" y="100" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#e9eef0" transform="rotate(-90 ${(BRK1 + BRK2) / 2} 98)">BRAKE</text>
  <!-- 手動解放レバー -->
  <path d="M${BRK2 - 6} 126 L${BRK2 + 2} 140" stroke="#c23" stroke-width="2.6" stroke-linecap="round"/><circle cx="${BRK2 + 2}" cy="140" r="2.2" fill="#c23"/>
  <!-- ファンカバー -->
  <path d="M194 70 H234 Q248 70 248 84 V112 Q248 126 234 126 H194 Z" fill="url(#cover-{{uid}})" stroke="#33434d" stroke-width="1.2"/>
  ${slots}
  <!-- 吊りボルト -->
  <rect x="47" y="56" width="6" height="9" fill="#7c8d96" stroke="#444" stroke-width="0.8"/>
  <circle cx="50" cy="50" r="7" fill="none" stroke="#6d7f88" stroke-width="3.2"/>
  <!-- 端子箱（ふたを外した状態） -->
  <rect x="${TB_X}" y="${TB_Y}" width="${TB_W}" height="${BY1 - TB_Y + 4}" rx="4" fill="url(#box-{{uid}})" stroke="#33434d" stroke-width="1.2"/>
  <rect x="${TB_X + 5}" y="${TB_Y + 5}" width="${TB_W - 10}" height="38" rx="2.5" fill="#26323a"/>
  <rect x="${TB_X + 8}" y="${TB_Y + 9}" width="${TB_W - 16}" height="30" rx="2" fill="#e9e3d2" stroke="#9a937f" stroke-width="0.8"/>
  <line x1="${(114 + 138) / 2}" y1="${TB_Y + 11}" x2="${(114 + 138) / 2}" y2="${TB_Y + 37}" stroke="#9a937f" stroke-width="0.8"/>
  ${TERMINALS.map(
    (t) => `${screw(t.x, TY)}
  <text x="${t.x}" y="${TY + 13}" text-anchor="middle" font-family="sans-serif" font-size="6.4" font-weight="bold" fill="#222">${t.id}</text>`,
  ).join('')}
  ${ac(p) ? `<rect x="134" y="${TY + 15.5}" width="25" height="5" rx="1" fill="#333"/><text x="146.5" y="${TY + 19.4}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#eee">RECT</text>` : ''}
  ${screw(EX, TY)}
  <path d="M${EX} ${TY + 7} V${TY + 10} M${EX - 4} ${TY + 10} H${EX + 4} M${EX - 2.6} ${TY + 12} H${EX + 2.6} M${EX - 1.2} ${TY + 14} H${EX + 1.2}" stroke="#2a8a2a" stroke-width="1"/>
`;
};

const terminals = (p: ParamValues): TerminalDef[] => [
  ...TERMINALS.slice(0, 3).map(
    (t): TerminalDef => ({
      id: t.id,
      hint: 'AC200V入力',
      x: t.x,
      y: TY,
      side: 'top',
      role: 'input',
      accepts: { system: 'AC', minVoltage: 200, maxVoltage: 220, conductors: ['R', 'S', 'T'] },
    }),
  ),
  ...TERMINALS.slice(3).map(
    (t): TerminalDef => ({
      id: t.id,
      hint: 'ブレーキ電源',
      note: ac(p)
        ? 'ブレーキ電源（AC200V。端子箱の整流器で直流にしてブレーキコイルへ）。通電で解放、切ると保持'
        : 'ブレーキ電源（DC24V、極性なし）。通電で解放、切ると保持',
      x: t.x,
      y: TY,
      side: 'top',
      role: 'input',
      accepts: ac(p) ? { system: 'AC', minVoltage: 180, maxVoltage: 220 } : { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+', '-'] },
      // ブレーキのコイルの電流（代表値。モーターの動力の電流とは別の回路）
      loadCurrent: ac(p) ? 0.1 : 0.5,
    }),
  ),
  { id: 'E', label: '⏚', hint: '接地', x: EX, y: TY, side: 'top', role: 'ground' },
];

const def: DeviceDefinition = {
  type: 'generic.motor.3p-brake',
  name: '三相誘導電動機（ブレーキ付き）',
  model: '3φ 200V 4P ブレーキ付き',
  modelOf: (p) => `3φ 200V 4P ブレーキ付き（ブレーキ ${ac(p) ? 'AC200V' : 'DC24V'}）`,
  category: 'load',
  description:
    'ブレーキ付き三相かご形誘導電動機（全閉外扇形・脚取付・4 極、無励磁作動形の電磁ブレーキ）。端子箱の U・V・W に三相 200V、B1・B2 にブレーキの電源をつなぐ。' +
    'ブレーキは通電で解放、電源を切ると保持する。ブレーキの電源は AC200V（整流器内蔵）か DC24V をパラメータで選ぶ。' +
    'インバーターで運転するときは、ブレーキの電源をインバーターの出力からではなく一次側か別の電源から取り、運転信号と合わせて入り切りする。出力（kW）は params で選ぶ。',
  labelPrefix: 'M',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'ratedCurrent',
      label: '出力',
      unit: 'A',
      options: RATINGS.map((r) => ({ value: r.amp, label: `${r.kw}kW (${r.amp}A)` })),
      default: 3.6,
    },
    {
      key: 'brakePower',
      label: 'ブレーキの電源',
      options: [
        { value: 'ac200', label: 'AC200V（整流器内蔵）' },
        { value: 'dc24', label: 'DC24V' },
      ],
      default: 'ac200',
    },
  ],
  loadCurrent: { param: 'ratedCurrent' },
  distinctGroups: [
    ['U', 'V', 'W'],
    ['B1', 'B2'],
  ],
  schematic: {
    elements: [
      { kind: 'motor', terminals: ['U', 'V', 'W'] },
      { kind: 'coil', terminals: ['B1', 'B2'] },
    ],
  },
  estimated: '定格電流・ブレーキの電流は代表値（推定）。メーカー・機種で違うため銘板で確かめる',
};

export default def;
