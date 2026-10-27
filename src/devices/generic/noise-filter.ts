/**
 * 電源用ノイズフィルタ（端子台形、金属ケース）の機器定義を作る（単相・三相）。
 * 国内でよく使う汎用品（TDK ラムダの RSHN / RTHN などと同じ形）: 金属ケースの両端に端子台があり、
 * 一方が電源側（LINE）、もう一方が負荷側（LOAD）。ケースの取付フランジに接地端子（E）がある。
 * 縦向き（上が LINE、下が LOAD）に描く。縮尺は 1mm ≒ 1.5px。
 *
 * LINE → LOAD は常に導通する向きのある経路（directed）。電圧はどちら向きにも伝わるが、上流の保護（ブレーカーの定格）は LINE → LOAD の向きにだけ伝わるので、
 * 逆につなぐと下流の機器に「上流に保護機器がない」の警告が出る（逆接続そのものを指摘する仕組みはない）。
 * 端子の定格電流（ratedCurrent）にフィルタの定格電流を書き、上流の保護電流がそれを超えると警告する。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { SCREW_GRADIENT } from './parts';
import { esc, fitSize, screwTerminal, spread } from './power-parts';

export interface NoiseFilterSpec {
  phases: 1 | 3;
  /** 線路の名前（左から） */
  lines: string[];
  /** 定格電圧[V]（表示用） */
  ratedVoltage: number;
  ratings: number[];
  defaultRating: number;
  width: number;
}

const H = 180;
const TY_LINE = 18;
const TY_LOAD = H - 18;
const FLANGE = 12; // 左右の取付フランジの幅

const ratingOf = (spec: NoiseFilterSpec, p: ParamValues) => Number(p.ratedCurrent) || spec.defaultRating;

function svg(spec: NoiseFilterSpec, p: ParamValues): string {
  const W = spec.width;
  const xs = spread(W - 2 * FLANGE, spec.lines.length, 4).map((x) => x + FLANGE);
  const caseW = W - 2 * FLANGE;
  const rating = `AC${spec.ratedVoltage}V ${esc(ratingOf(spec, p))}A`;
  // 銘板の回路記号（コモンモードチョークと Y コンデンサ）
  const sy = 98;
  const lines = spec.lines.length;
  const lx = spread(caseW - 20, lines, 0).map((x) => x + FLANGE + 10);
  const symbol = `
  ${lx.map((x) => `<path d="M${x} ${sy - 12} V${sy - 7}" stroke="#333" stroke-width="0.7"/>`).join('')}
  ${lx
    .map(
      (x) =>
        `<path d="M${x} ${sy - 7} a2.2 2.2 0 0 1 0 4.4 a2.2 2.2 0 0 1 0 4.4 a2.2 2.2 0 0 1 0 4.4 V${sy + 12}" stroke="#333" stroke-width="0.7" fill="none"/>`,
    )
    .join('')}
  <path d="M${lx[0] - 4} ${sy - 7} V${sy + 6.2}" stroke="#333" stroke-width="0.6" stroke-dasharray="1.2 1"/>
  ${lx.map((x) => `<path d="M${x} ${sy + 9} H${x + 6} M${x + 6} ${sy + 7} V${sy + 11}" stroke="#333" stroke-width="0.6"/>`).join('')}`;
  return `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9aa0a6"/>
      <stop offset="0.2" stop-color="#e3e6e9"/>
      <stop offset="0.55" stop-color="#c9cdd2"/>
      <stop offset="1" stop-color="#8f959b"/>
    </linearGradient>
    <linearGradient id="flange-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c4c8cc"/>
      <stop offset="1" stop-color="#9ca1a7"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#34373b"/>
      <stop offset="1" stop-color="#1d1f22"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>

  <!-- 取付フランジ（取付穴と接地端子） -->
  <rect x="1" y="${H / 2 - 50}" width="${W - 2}" height="100" rx="3" fill="url(#flange-{{uid}})" stroke="#70767c" stroke-width="0.8"/>
  <ellipse cx="${FLANGE / 2 + 1}" cy="${H / 2 - 38}" rx="3" ry="4.5" fill="#f4f6f8" stroke="#70767c" stroke-width="0.6"/>
  <ellipse cx="${W - FLANGE / 2 - 1}" cy="${H / 2 + 38}" rx="3" ry="4.5" fill="#f4f6f8" stroke="#70767c" stroke-width="0.6"/>

  <!-- ケース -->
  <rect x="${FLANGE}" y="4" width="${caseW}" height="${H - 8}" rx="3" fill="url(#case-{{uid}})" stroke="#6d7379" stroke-width="1"/>

  <!-- 端子台（LINE・LOAD） -->
  ${[TY_LINE, TY_LOAD]
    .map(
      (y) => `
  <rect x="${FLANGE + 2}" y="${y - 15}" width="${caseW - 4}" height="30" rx="2" fill="url(#tb-{{uid}})"/>
  ${xs.map((x) => screwTerminal(x, y, 5.6, '#141618')).join('')}`,
    )
    .join('')}
  <rect x="${FLANGE + 2}" y="${TY_LINE + 15}" width="${caseW - 4}" height="10" fill="#f2f3f4" stroke="#9ba0a5" stroke-width="0.4"/>
  <rect x="${FLANGE + 2}" y="${TY_LOAD - 25}" width="${caseW - 4}" height="10" fill="#f2f3f4" stroke="#9ba0a5" stroke-width="0.4"/>
  ${xs
    .map(
      (x, i) => `
  <text x="${x}" y="${TY_LINE + 22.8}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#222">${spec.lines[i]}</text>
  <text x="${x}" y="${TY_LOAD - 17.2}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#222">${spec.lines[i]}</text>`,
    )
    .join('')}

  <!-- 銘板 -->
  <rect x="${FLANGE + 5}" y="48" width="${caseW - 10}" height="84" rx="2" fill="#f7f8f9" stroke="#8d9298" stroke-width="0.6"/>
  <text x="${W / 2}" y="58" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#1d3f74">LINE ▲</text>
  <text x="${W / 2}" y="68" text-anchor="middle" font-family="sans-serif" font-size="${fitSize('NOISE FILTER', caseW - 14, 6.4)}" font-weight="bold" fill="#222">NOISE FILTER</text>
  <text x="${W / 2}" y="77" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(rating, caseW - 14, 6)}" font-weight="bold" fill="#333">${rating}</text>
  ${symbol}
  <text x="${W / 2}" y="127" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#1d3f74">LOAD ▼</text>

  <!-- 接地端子（左のフランジ） -->
  ${screwTerminal(FLANGE / 2 + 1, H / 2, 4.2, '#5d6268')}
  <text x="${FLANGE / 2 + 1}" y="${H / 2 + 13}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#1d7a35">E</text>
`;
}

function terminals(spec: NoiseFilterSpec, p: ParamValues): TerminalDef[] {
  const W = spec.width;
  const xs = spread(W - 2 * FLANGE, spec.lines.length, 4).map((x) => x + FLANGE);
  const rated = ratingOf(spec, p);
  return [
    ...spec.lines.map((l, i) => ({
      id: `IN-${l}`,
      label: l,
      hint: `LINE ${l}`,
      note: `電源側（LINE）${l}`,
      x: xs[i],
      y: TY_LINE,
      side: 'top' as const,
      role: 'line' as const,
      ratedCurrent: rated,
    })),
    ...spec.lines.map((l, i) => ({
      id: `OUT-${l}`,
      label: l,
      hint: `LOAD ${l}`,
      note: `負荷側（LOAD）${l}`,
      x: xs[i],
      y: TY_LOAD,
      side: 'bottom' as const,
      role: 'load' as const,
      ratedCurrent: rated,
    })),
    { id: 'E', label: 'E', hint: '接地', note: '接地端子（ケース）。必ず接地する', x: FLANGE / 2 + 1, y: H / 2, side: 'left', role: 'ground' },
  ];
}

export function buildNoiseFilter(spec: NoiseFilterSpec): DeviceDefinition {
  const ph = spec.phases === 1 ? '単相' : '三相';
  return {
    type: `generic.noise-filter.${spec.phases}p`,
    name: `ノイズフィルタ（${ph}）`,
    model: `${ph} AC${spec.ratedVoltage}V 端子台形`,
    modelOf: (p) => `${ph} AC${spec.ratedVoltage}V ${ratingOf(spec, p)}A 端子台形`,
    category: 'power-supply',
    description:
      `電源ラインのノイズを除く${ph}のノイズフィルタ（定格 AC${spec.ratedVoltage}V、金属ケース・端子台形）。` +
      '上の LINE 側に電源、下の LOAD 側に負荷（インバーター・スイッチング電源など）をつなぐ。ケースの E は必ず接地する（接地側へ漏れ電流が流れるため、漏電遮断器の感度に注意）。',
    labelPrefix: 'NF',
    width: spec.width,
    height: H,
    svg: (p) => svg(spec, p),
    terminals: (p) => terminals(spec, p),
    links: spec.lines.map((l) => ({ from: `IN-${l}`, to: `OUT-${l}`, directed: true })),
    params: [
      {
        key: 'ratedCurrent',
        label: '定格電流',
        unit: 'A',
        options: spec.ratings.map((v) => ({ value: v, label: `${v}A` })),
        default: spec.defaultRating,
      },
    ],
  };
}
