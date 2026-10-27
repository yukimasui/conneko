import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { SCREW_GRADIENT } from '../generic/parts';
import { esc, fitSize, screwTerminal, vShade } from '../generic/power-parts';

/**
 * 制御用トランス（単相複巻＝絶縁トランス、一次 0-200-220V / 二次 0-100-110V、混触防止板 E 付き）。
 * 盤の AC200V から操作回路・盤内照明・コンセント用の AC100V を作る。容量（VA）は params で選ぶ。
 * 国内の汎用品（相原電機・豊澄電源機器など）の代表的な形: 取付脚付きの開放形で、上面の端子台に
 * 一次 0・200・220、混触防止板 E、二次 0・100・110 が並ぶ。
 * 実物は 500VA で幅 120mm 前後あるため、見やすさを優先して縮小して描く（1mm ≒ 1.6px 相当）。
 */

const W = 220;
const H = 190;
const TY = 22; // 端子ネジの中心
const PITCH = 28;
const X0 = 26;

/** 端子（左から一次 0・200・220、E、二次 0・100・110） */
const TERMS = [
  { id: 'IN0', label: '0', group: 'in' },
  { id: 'IN200', label: '200', group: 'in' },
  { id: 'IN220', label: '220', group: 'in' },
  { id: 'E', label: 'E', group: 'e' },
  { id: 'OUT0', label: '0', group: 'out' },
  { id: 'OUT100', label: '100', group: 'out' },
  { id: 'OUT110', label: '110', group: 'out' },
].map((t, i) => ({ ...t, x: X0 + i * PITCH }));
const tx = (id: string) => TERMS.find((t) => t.id === id)!.x;

/** 容量[VA] */
const CAPACITIES = [100, 200, 300, 500, 750, 1000, 1500, 2000];
const DEFAULT_VA = 500;
const vaOf = (p: ParamValues) => Number(p.capacity) || DEFAULT_VA;
const vaLabel = (va: number) => (va >= 1000 ? `${va / 1000}kVA` : `${va}VA`);

const svg = (p: ParamValues) => {
  const va = vaLabel(vaOf(p));
  return `
  <defs>
    ${vShade('core', '#5b6168', '#33373c')}
    <linearGradient id="coil-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b7862c"/>
      <stop offset="0.18" stop-color="#e8c25e"/>
      <stop offset="0.5" stop-color="#f3d77f"/>
      <stop offset="0.82" stop-color="#e2b955"/>
      <stop offset="1" stop-color="#a8781f"/>
    </linearGradient>
    ${vShade('foot', '#c9ccd0', '#8e9399')}
    ${vShade('tb', '#3d4045', '#24272b')}
    ${SCREW_GRADIENT}
  </defs>

  <!-- 取付脚（鋼板のアングル） -->
  <rect x="4" y="${H - 18}" width="${W - 8}" height="14" rx="2" fill="url(#foot-{{uid}})" stroke="#6d7278" stroke-width="0.8"/>
  <ellipse cx="18" cy="${H - 11}" rx="7" ry="3.2" fill="#3a3d41"/>
  <ellipse cx="${W - 18}" cy="${H - 11}" rx="7" ry="3.2" fill="#3a3d41"/>

  <!-- 鉄心（積層） -->
  <rect x="16" y="66" width="${W - 32}" height="${H - 86}" rx="2" fill="url(#core-{{uid}})" stroke="#24272b" stroke-width="1"/>
  ${Array.from({ length: 13 }, (_, i) => `<path d="M17 ${72 + i * 7} H${W - 17}" stroke="#6c737a" stroke-width="0.5" opacity="0.6"/>`).join('')}
  <!-- 鉄心を締める金具 -->
  <rect x="10" y="62" width="${W - 20}" height="9" rx="1.5" fill="url(#foot-{{uid}})" stroke="#6d7278" stroke-width="0.6"/>
  <circle cx="20" cy="66.5" r="2.6" fill="#7b8087" stroke="#4c5056" stroke-width="0.5"/>
  <circle cx="${W - 20}" cy="66.5" r="2.6" fill="#7b8087" stroke="#4c5056" stroke-width="0.5"/>

  <!-- コイル（絶縁テープ巻き） -->
  <rect x="48" y="58" width="${W - 96}" height="${H - 72}" rx="10" fill="url(#coil-{{uid}})" stroke="#8a611a" stroke-width="1"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M50 ${68 + i * 11} Q${W / 2} ${71 + i * 11} ${W - 50} ${68 + i * 11}" stroke="#c9a04a" stroke-width="0.7" fill="none" opacity="0.7"/>`).join('')}

  <!-- 銘板 -->
  <rect x="62" y="84" width="${W - 124}" height="66" rx="2" fill="#f7f7f2" stroke="#8a8a80" stroke-width="0.8"/>
  <text x="${W / 2}" y="95" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#333">制御用トランス</text>
  <text x="${W / 2}" y="111" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(va, W - 136, 13)}" font-weight="bold" fill="#1d3f74">${esc(va)}</text>
  <text x="${W / 2}" y="123" text-anchor="middle" font-family="sans-serif" font-size="5.6" fill="#333">1φ 50/60Hz</text>
  <text x="${W / 2}" y="133" text-anchor="middle" font-family="sans-serif" font-size="5.6" fill="#333">1次 200/220V</text>
  <text x="${W / 2}" y="143" text-anchor="middle" font-family="sans-serif" font-size="5.6" fill="#333">2次 100/110V</text>

  <!-- 上面の端子台 -->
  <rect x="8" y="6" width="${W - 16}" height="32" rx="2.5" fill="url(#tb-{{uid}})"/>
  ${TERMS.map((t) => screwTerminal(t.x, TY, 6, '#16181b')).join('')}
  <!-- 一次・E・二次の仕切り -->
  <rect x="${tx('IN220') + PITCH / 2 - 1}" y="4" width="2" height="36" fill="#55595e"/>
  <rect x="${tx('E') + PITCH / 2 - 1}" y="4" width="2" height="36" fill="#55595e"/>
  <!-- 端子記号の帯 -->
  <rect x="8" y="38" width="${W - 16}" height="11" fill="#f1f1ee" stroke="#a1a19a" stroke-width="0.5"/>
  ${TERMS.map((t) => `<text x="${t.x}" y="46.5" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="${t.group === 'in' ? '#b3261e' : t.group === 'out' ? '#1d4fa0' : '#1d7a35'}">${t.label}</text>`).join('')}
  <rect x="8" y="49" width="${(tx('IN220') + PITCH / 2) - 8}" height="9" fill="#f8e3e1"/>
  <text x="${(8 + tx('IN220') + PITCH / 2) / 2}" y="56" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#b3261e">1次（入力）</text>
  <rect x="${tx('E') + PITCH / 2}" y="49" width="${W - 8 - (tx('E') + PITCH / 2)}" height="9" fill="#e1e9f6"/>
  <text x="${(tx('E') + PITCH / 2 + W - 8) / 2}" y="56" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#1d4fa0">2次（出力）</text>
`;
};

const inputAccepts = (min: number, max: number) => ({ system: 'AC' as const, minVoltage: min, maxVoltage: max, conductors: ['R', 'S', 'T', 'L', 'N'] as ('R' | 'S' | 'T' | 'L' | 'N')[] });

const terminals = (p: ParamValues): TerminalDef[] => {
  const outA = Math.round((vaOf(p) / 100) * 100) / 100;
  return [
    { id: 'IN0', label: '0', hint: '1次 0', note: '一次 0V 側', x: tx('IN0'), y: TY, side: 'top', role: 'input', accepts: inputAccepts(180, 240) },
    { id: 'IN200', label: '200', hint: '1次 200V', note: '一次 200V タップ（AC200V 受電）', x: tx('IN200'), y: TY, side: 'top', role: 'input', accepts: inputAccepts(180, 220) },
    {
      id: 'IN220',
      label: '220',
      hint: '1次 220V',
      note: '一次 220V タップ（電源電圧が高いとき。200V タップとどちらか一方を使う）',
      x: tx('IN220'),
      y: TY,
      side: 'top',
      role: 'input',
      accepts: inputAccepts(200, 240),
      optional: true,
    },
    { id: 'E', label: 'E', hint: '混触防止板', note: '混触防止板（一次・二次間のシールド）の接地端子', x: tx('E'), y: TY, side: 'top', role: 'ground' },
    {
      id: 'OUT0',
      label: '0',
      hint: '2次 0',
      note: `二次 0V 側（接地側。定格二次電流 ${outA}A）`,
      x: tx('OUT0'),
      y: TY,
      side: 'top',
      role: 'supply',
      supply: { system: 'AC', voltage: 100, conductor: 'N' },
    },
    {
      id: 'OUT100',
      label: '100',
      hint: '2次 100V',
      note: `二次 100V（定格二次電流 ${outA}A）`,
      x: tx('OUT100'),
      y: TY,
      side: 'top',
      role: 'supply',
      supply: { system: 'AC', voltage: 100, conductor: 'L' },
    },
    {
      id: 'OUT110',
      label: '110',
      hint: '2次 110V',
      note: '二次 110V タップ（電圧降下を補うとき）',
      x: tx('OUT110'),
      y: TY,
      side: 'top',
      role: 'supply',
      supply: { system: 'AC', voltage: 110, conductor: 'L' },
    },
  ];
};

const def: DeviceDefinition = {
  type: 'generic.control-transformer.1p200-100v',
  name: '制御用トランス',
  model: '単相複巻 200/220V→100/110V',
  modelOf: (p) => `単相複巻 ${vaLabel(vaOf(p))} 200/220V→100/110V`,
  category: 'power-supply',
  description:
    '盤の AC200V から操作回路・照明・コンセント用の AC100V を作る単相の絶縁トランス（複巻、混触防止板 E 付き）。一次は 0-200（電源電圧が高いときは 0-220）、二次は 0-100（0-110）を使う。二次側の負荷はサーキットプロテクタなどで保護する（トランス自身は過電流を制限しない）。',
  labelPrefix: 'TR',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'capacity',
      label: '容量',
      unit: 'VA',
      options: CAPACITIES.map((v) => ({ value: v, label: vaLabel(v) })),
      default: DEFAULT_VA,
    },
  ],
  // 一次の定格電流（容量 ÷ 200V）を上流の保護と比べる
  loadCurrent: (p) => Math.round((vaOf(p) / 200) * 100) / 100,
  distinctGroups: [
    ['IN0', 'IN200'],
    ['IN0', 'IN220'],
  ],
};

export default def;
