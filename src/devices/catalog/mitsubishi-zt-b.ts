import type { DeviceDefinition, ParamValues } from '../types';
import { defs, logo, screw } from '../mitsubishi/ms-t';

/**
 * 三菱電機 零相変流器（ZCT）ZT-B シリーズ（ZT15B・ZT30B・ZT40B・ZT60B・ZT80B・ZT100B。穴径で選ぶ）。
 * 主回路の電線（三相 3 線）を中の穴に貫通させ、地絡（漏電）で生じる零相電流を二次の k・l に出す。漏電リレー（mitsubishi.nv-zba）の Z1・Z2 へつなぐ。
 *
 * 図面では、貫通する主回路を上（電源側）の 1・3・5 と下（負荷側）の 2・4・6 の端子で表す（中で常時導通。電源側を K 側の表示に合わせる）。
 * 端子 ID は遮断器とそろえ（1・2 → 1 相目、3・4 → 2 相目、5・6 → 3 相目）、「まとめてつなぐ」で遮断器・電磁接触器と相を合わせてつながる。
 *
 * 出典: 三菱電機 漏電リレーの製品特長・形式一覧（穴径 15mm は ZT15B、30mm は ZT30B。ZT15B〜ZT100B を漏電リレーと自由に組み合わせられる）。
 * 二次端子 k・l の極性（k を Z1、l を Z2）は一般的な ZCT の結線の説明による。外形・二次端子の位置は推定。
 */

const W = 124;
const H = 140;
const CX = 54;
const CY = 70;
const PRI_X = [40, 54, 68];
const PRI_TOP = 6;
const PRI_BOT = H - 6;
const SEC_X = 112;
const SEC_K = 52;
const SEC_L = 88;
const COLORS = ['#c62828', '#e9e9e9', '#1f5fbf'];

const MODELS = [
  { value: 'ZT15B', hole: 15 },
  { value: 'ZT30B', hole: 30 },
  { value: 'ZT40B', hole: 40 },
  { value: 'ZT60B', hole: 60 },
  { value: 'ZT80B', hole: 80 },
  { value: 'ZT100B', hole: 100 },
];

const svg = (p: ParamValues) => {
  const m = MODELS.find((x) => x.value === p.model) ?? MODELS[1];
  return `
  ${defs}
  <!-- 本体（樹脂ケース）と取付脚 -->
  <rect x="10" y="${CY - 50}" width="88" height="100" rx="10" fill="url(#body-{{uid}})" stroke="#8d897f" stroke-width="1.2"/>
  <rect x="4" y="${CY + 40}" width="100" height="10" rx="2" fill="#2c2c2c"/>
  <circle cx="10" cy="${CY + 45}" r="2.6" fill="#ddd" stroke="#555" stroke-width="0.5"/>
  <circle cx="98" cy="${CY + 45}" r="2.6" fill="#ddd" stroke="#555" stroke-width="0.5"/>
  <!-- 貫通穴 -->
  <circle cx="${CX}" cy="${CY}" r="30" fill="#d2cdc0" stroke="#9c978a" stroke-width="1"/>
  <circle cx="${CX}" cy="${CY}" r="24" fill="#3a3a3a" stroke="#222" stroke-width="1"/>
  <!-- 貫通する主回路の電線 -->
  ${PRI_X.map(
    (x, i) => `
  <rect x="${x - 4}" y="${PRI_TOP - 2}" width="8" height="${PRI_BOT - PRI_TOP + 4}" rx="3" fill="${COLORS[i]}" stroke="#333" stroke-width="0.6"/>
  <rect x="${x - 2.5}" y="${PRI_TOP - 3}" width="5" height="6" rx="1" fill="#c0874f" stroke="#6e3a16" stroke-width="0.4"/>
  <rect x="${x - 2.5}" y="${PRI_BOT - 3}" width="5" height="6" rx="1" fill="#c0874f" stroke="#6e3a16" stroke-width="0.4"/>`,
  ).join('')}
  <text x="22" y="${CY - 8}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#333">K</text>
  <path d="M22 ${CY - 4} V${CY + 8} M19 ${CY + 5} L22 ${CY + 9} L25 ${CY + 5}" stroke="#333" stroke-width="1" fill="none"/>
  <text x="22" y="${CY + 19}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#333">L</text>
  <!-- 銘板 -->
  ${logo(14, CY - 46, false)}
  <text x="14" y="${CY - 22}" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#222">ZCT</text>
  <text x="76" y="${CY - 40}" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#222">${m.value}</text>
  <text x="76" y="${CY - 33}" font-family="sans-serif" font-size="3.6" fill="#555">φ${m.hole}mm</text>
  <!-- 二次端子 k・l -->
  <rect x="98" y="${SEC_K - 12}" width="22" height="60" rx="2" fill="url(#pocket-{{uid}})" stroke="#9c978a" stroke-width="0.6"/>
  ${screw(SEC_X, SEC_K, 4.6)}
  ${screw(SEC_X, SEC_L, 4.6)}
  <text x="${SEC_X}" y="${SEC_K + 12}" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#222">k</text>
  <text x="${SEC_X}" y="${SEC_L - 8}" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#222">l</text>
`;
};

const phase = ['R', 'S', 'T'];
const def: DeviceDefinition = {
  type: 'mitsubishi.zt-b',
  name: '零相変流器',
  model: 'ZT30B',
  modelOf: (p) => String(p.model),
  maker: '三菱電機',
  category: 'breaker',
  description:
    '三菱電機の零相変流器（ZCT）ZT-B シリーズ。主回路の電線（三相 3 線をまとめて）を穴に貫通させ、地絡（漏電）で生じる零相電流を検出して二次の k・l から漏電リレーへ送る。' +
    '電線の太さ・本数が通る穴径（ZT15B〜ZT100B）を選ぶ。図面では貫通する主回路を電源側 1・3・5（K 側）と負荷側 2・4・6 の端子で表す。k は漏電リレーの Z1、l は Z2 へ。',
  estimated: '外形と二次端子 k・l の位置は推定。',
  labelPrefix: 'ZCT',
  width: W,
  height: H,
  svg,
  terminals: [
    ...PRI_X.map((x, i) => ({
      id: String(i * 2 + 1),
      hint: `貫通 ${phase[i]}`,
      note: `貫通する主回路 ${i + 1} 相目（電源側・K 側）`,
      x,
      y: PRI_TOP,
      side: 'top' as const,
      role: 'line' as const,
    })),
    ...PRI_X.map((x, i) => ({
      id: String(i * 2 + 2),
      hint: `貫通 ${phase[i]}`,
      note: `貫通する主回路 ${i + 1} 相目（負荷側・L 側）`,
      x,
      y: PRI_BOT,
      side: 'bottom' as const,
      role: 'load' as const,
    })),
    { id: 'k', hint: '二次 k', note: '二次出力 k（漏電リレーの Z1 へ）', x: SEC_X, y: SEC_K, side: 'right', role: 'signal' },
    { id: 'l', hint: '二次 l', note: '二次出力 l（漏電リレーの Z2 へ）', x: SEC_X, y: SEC_L, side: 'right', role: 'signal' },
  ],
  // 貫通する電線は ZCT の中で切れずに通る（常時導通）
  links: [0, 1, 2].map((i) => ({ from: String(i * 2 + 1), to: String(i * 2 + 2), directed: true })),
  params: [
    {
      key: 'model',
      label: '形式（穴径）',
      options: MODELS.map((m) => ({ value: m.value, label: `${m.value}（穴径 ${m.hole}mm）` })),
      default: 'ZT30B',
    },
  ],
};

export default def;
