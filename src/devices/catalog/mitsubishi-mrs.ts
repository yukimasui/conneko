import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * 三菱電機 インバーター用ブレーキ抵抗器 MRS 形（MRS120W200 / MRS120W100 / MRS120W60 / MRS120W40、許容使用率 3%ED）。
 *
 * 出典: 三菱汎用インバータ オプションカタログ（MRS 形: 抵抗値 200Ω・100Ω・60Ω・40Ω、適用インバータ容量 0.4kW・0.75kW・1.5〜2.2kW・2.2〜3.7kW、
 *       許容使用率 3%ED）、販売店の掲載（MRS120W100-0.75K などの品名）。
 * - インバーターの P/+ と PR の間につなぐ（抵抗器に極性はない）。FR-A820 は内蔵のブレーキ抵抗器を使う PR-PX 間の短絡片を外す。
 *   FR-E820 の 0.1K・0.2K はブレーキトランジスタがないため使えない。
 * - 抵抗器は高温になるので、ほかの機器・電線から離して取り付ける。抵抗器の過熱保護（サーマルリレー）は MRS 形にはなく、パラメータ（回生ブレーキ使用率）で守る。
 *
 * 描き方: アルミの細長い本体と、片側から出る 2 本のリード線（先端は丸形圧着端子）。寸法は推定（1mm ≒ 1px）。
 */

interface MrsSpec {
  ohm: number;
  /** 適用インバータ容量の説明 */
  inverter: string;
}

const MRS: MrsSpec[] = [
  { ohm: 200, inverter: '0.4kW' },
  { ohm: 100, inverter: '0.75kW' },
  { ohm: 60, inverter: '1.5kW・2.2kW' },
  { ohm: 40, inverter: '2.2kW・3.7kW' },
];
const specOf = (p: ParamValues) => MRS.find((m) => String(m.ohm) === String(p.ohm)) ?? MRS[1];

const W = 200;
const H = 70;
const LEAD_X = W - 6;
const P_Y = 22;
const PR_Y = 48;

const svg = (p: ParamValues) => {
  const s = specOf(p);
  return `
  <defs>
    <linearGradient id="mrs-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8e9399"/>
      <stop offset="0.3" stop-color="#eef0f2"/>
      <stop offset="0.6" stop-color="#c6cacf"/>
      <stop offset="1" stop-color="#80858b"/>
    </linearGradient>
    <linearGradient id="mrs-tab-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9bdc2"/>
      <stop offset="1" stop-color="#7d8288"/>
    </linearGradient>
  </defs>
  <ellipse cx="80" cy="${H - 6}" rx="70" ry="3" fill="#000" opacity="0.12"/>
  <!-- 取付け金具（両端に取付穴） -->
  <rect x="4" y="27" width="152" height="16" rx="2" fill="url(#mrs-tab-{{uid}})" stroke="#5d6268" stroke-width="0.7"/>
  <circle cx="11" cy="35" r="3" fill="#2a2c2f"/><circle cx="149" cy="35" r="3" fill="#2a2c2f"/>
  <!-- 抵抗器の本体（アルミのケース） -->
  <rect x="20" y="17" width="120" height="36" rx="4" fill="url(#mrs-body-{{uid}})" stroke="#5d6268" stroke-width="0.9"/>
  <g stroke="#7d8288" stroke-width="0.6" opacity="0.7">${[24, 30, 40, 46].map((y) => `<path d="M24 ${y} H136"/>`).join('')}</g>
  <!-- 銘板 -->
  <rect x="44" y="24" width="72" height="22" rx="1" fill="#f3f2ec" stroke="#8a8a84" stroke-width="0.5"/>
  <text x="80" y="31" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#333">BRAKE RESISTOR</text>
  <text x="80" y="38.5" text-anchor="middle" font-family="sans-serif" font-size="6.4" font-weight="bold" fill="#111">MRS120W${s.ohm}</text>
  <text x="80" y="44" text-anchor="middle" font-family="sans-serif" font-size="3.8" fill="#333">${s.ohm}Ω  MITSUBISHI</text>
  <!-- 高温注意 -->
  <path d="M26 46 L30 39 L34 46 Z" fill="#ffd400" stroke="#111" stroke-width="0.6" stroke-linejoin="round"/>
  <!-- リード線（2 本） -->
  ${[P_Y, PR_Y]
    .map(
      (y, i) => `<path d="M140 ${30 + i * 10} C164 ${30 + i * 10} 162 ${y} ${LEAD_X - 12} ${y}" fill="none" stroke="#1d1e20" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M140 ${30 + i * 10} C164 ${30 + i * 10} 162 ${y} ${LEAD_X - 12} ${y}" fill="none" stroke="#55585d" stroke-width="1.2" stroke-linecap="round"/>
  <rect x="${LEAD_X - 14}" y="${y - 2.2}" width="6" height="4.4" rx="0.6" fill="#d9a04a" stroke="#7a5a20" stroke-width="0.4"/>
  <circle cx="${LEAD_X}" cy="${y}" r="5" fill="#d9a04a" stroke="#7a5a20" stroke-width="0.6"/><circle cx="${LEAD_X}" cy="${y}" r="2" fill="#fff" stroke="#7a5a20" stroke-width="0.4"/>`,
    )
    .join('')}
  <text x="${LEAD_X - 9}" y="${P_Y - 7}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">P/+</text>
  <text x="${LEAD_X - 9}" y="${PR_Y + 11}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">PR</text>`;
};

const terminals: TerminalDef[] = [
  { id: 'P', label: 'P/+ へ', hint: 'P/+ へ', note: 'リード線。インバーターの P/+ へつなぐ（極性なし）', x: LEAD_X, y: P_Y, side: 'right', role: 'signal' },
  { id: 'PR', label: 'PR へ', hint: 'PR へ', note: 'リード線。インバーターの PR へつなぐ（極性なし）', x: LEAD_X, y: PR_Y, side: 'right', role: 'signal' },
];

const def: DeviceDefinition = {
  type: 'mitsubishi.mrs',
  name: 'ブレーキ抵抗器',
  model: 'MRS120W100',
  modelOf: (p) => `MRS120W${specOf(p).ohm}`,
  maker: '三菱電機',
  category: 'load',
  labelPrefix: 'R',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'ohm',
      label: '抵抗値',
      options: MRS.map((m) => ({ value: String(m.ohm), label: `MRS120W${m.ohm}（${m.ohm}Ω、インバーター ${m.inverter} 用）` })),
      default: '100',
    },
  ],
  description:
    '三菱電機のインバーター用ブレーキ抵抗器 MRS 形（許容使用率 3%ED）。モーターを急に減速・停止させるときにモーターから戻る電力（回生電力）を熱にして消費し、' +
    'インバーターの過電圧の停止を防ぐ。インバーターの P/+ と PR の間にリード線でつなぐ（極性なし）。FR-A820 は内蔵のブレーキ抵抗器の PR-PX 間の短絡片を外してからつなぐ。' +
    '抵抗値はインバーターの容量で選ぶ（200Ω: 0.4kW、100Ω: 0.75kW、60Ω: 1.5kW・2.2kW、40Ω: 2.2kW・3.7kW）。' +
    'つないだら回生ブレーキの使用率のパラメータ（FR-A800 は Pr.30・Pr.70）を設定する。抵抗器は高温になるので、可燃物・電線から離して取り付ける。',
  estimated: '外形の寸法・リード線の長さと色は推定',
};

export default def;
