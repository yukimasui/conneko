import type { DeviceDefinition, ParamValues } from '../types';
import { SCREW_GRADIENT } from '../generic/parts';
import { screwTerminal } from '../generic/power-parts';

/**
 * 変流器（CT）貫通形、二次 5A（低圧の計器用。汎用品）。
 * 主回路の電線 1 本を穴に貫通させ、一次の電流に比例した二次の電流（定格 5A）を k・l から電流計・計測ユニットへ送る。
 * 一次の定格電流（変流比 □/5A）をパラメータで選ぶ。三相 3 線の盤では R 相と T 相の 2 台を使うことが多い。
 *
 * 図面では、貫通する電線を上（電源側・K 側）の端子と下（負荷側・L 側）の端子で表す（中で常時導通）。
 * 二次の k・l は電流の回路なので信号（role: 'signal'）にした（信号の端子は未接続を指摘しないので、二次の開放はチェックできない）。
 */

const W = 112;
const H = 132;
const CX = 48;
const CY = 64;
const PRI_TOP = 6;
const PRI_BOT = H - 6;
const SEC_X = 100;
const SEC_K = 48;
const SEC_L = 82;
const RATIOS = [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400];

const svg = (p: ParamValues) => `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="ctbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4b4f55"/>
      <stop offset="1" stop-color="#1f2124"/>
    </linearGradient>
  </defs>
  <!-- 本体（黒い樹脂モールド）と取付脚 -->
  <rect x="8" y="${CY - 44}" width="80" height="88" rx="14" fill="url(#ctbody-{{uid}})" stroke="#000" stroke-width="1"/>
  <rect x="2" y="${CY + 38}" width="92" height="9" rx="2" fill="#8d9298" stroke="#555" stroke-width="0.6"/>
  <!-- 貫通穴と貫通する電線 -->
  <circle cx="${CX}" cy="${CY}" r="20" fill="#d9dbde" stroke="#111" stroke-width="1"/>
  <circle cx="${CX}" cy="${CY}" r="15" fill="#2a2c2f"/>
  <rect x="${CX - 5}" y="${PRI_TOP - 2}" width="10" height="${PRI_BOT - PRI_TOP + 4}" rx="4" fill="#444" stroke="#111" stroke-width="0.6"/>
  <rect x="${CX - 3}" y="${PRI_TOP - 3}" width="6" height="6" rx="1" fill="#c0874f" stroke="#6e3a16" stroke-width="0.4"/>
  <rect x="${CX - 3}" y="${PRI_BOT - 3}" width="6" height="6" rx="1" fill="#c0874f" stroke="#6e3a16" stroke-width="0.4"/>
  <text x="22" y="${CY - 26}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#eee">K</text>
  <text x="22" y="${CY + 31}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#eee">L</text>
  <!-- 銘板 -->
  <text x="74" y="${CY - 30}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#eee">CT</text>
  <text x="74" y="${CY - 22}" text-anchor="middle" font-family="sans-serif" font-size="5.2" font-weight="bold" fill="#fff">${p.ratio}/5A</text>
  <text x="74" y="${CY + 26}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#ccc">5VA 1.0</text>
  <!-- 二次端子 k・l -->
  <rect x="88" y="${SEC_K - 12}" width="22" height="${SEC_L - SEC_K + 24}" rx="2" fill="#2f3236" stroke="#111" stroke-width="0.6"/>
  ${screwTerminal(SEC_X, SEC_K, 4.4, '#1b1d20')}
  ${screwTerminal(SEC_X, SEC_L, 4.4, '#1b1d20')}
  <text x="${SEC_X}" y="${SEC_K + 14}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#eee">k</text>
  <text x="${SEC_X}" y="${SEC_L - 9}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#eee">l</text>
`;

const def: DeviceDefinition = {
  type: 'generic.ct.window',
  name: '変流器',
  model: '変流器 貫通形 □/5A',
  modelOf: (p) => `変流器 貫通形 ${p.ratio}/5A`,
  category: 'control',
  description:
    '低圧の計器用の変流器（CT、貫通形、二次 5A、汎用品）。主回路の電線 1 本を K 側から L 側へ穴に通し、二次の k・l を電流計（または電流計切換スイッチ・計測ユニット）につなぐ。' +
    '一次の定格電流（変流比）は回路の電流に合わせてパラメータで選び、電流計の目盛りもそろえる。図面では貫通する電線を K 側（電源側）・L 側（負荷側）の端子で表す。二次は開放しない（使わないときは k-l を短絡する）。',
  labelPrefix: 'CT',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'P1', label: 'K側', hint: '一次 K 側', note: '貫通する電線の電源側（K 側）', x: CX, y: PRI_TOP, side: 'top', role: 'line' },
    { id: 'P2', label: 'L側', hint: '一次 L 側', note: '貫通する電線の負荷側（L 側）', x: CX, y: PRI_BOT, side: 'bottom', role: 'load' },
    { id: 'k', hint: '二次 k', note: '二次出力 k（電流計の k へ）', x: SEC_X, y: SEC_K, side: 'right', role: 'signal' },
    { id: 'l', hint: '二次 l', note: '二次出力 l（電流計の l へ。接地することが多い）', x: SEC_X, y: SEC_L, side: 'right', role: 'signal' },
  ],
  // 貫通する電線は CT の中で切れずに通る（常時導通）
  links: [{ from: 'P1', to: 'P2', directed: true }],
  params: [
    {
      key: 'ratio',
      label: '変流比（一次の定格電流）',
      unit: 'A',
      options: RATIOS.map((v) => ({ value: v, label: `${v}/5A` })),
      default: 100,
    },
  ],
};

export default def;
