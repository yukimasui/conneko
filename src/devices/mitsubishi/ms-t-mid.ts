/**
 * 三菱電機 MS-T シリーズの中容量の電磁接触器（S-T35・S-T50・S-T65・S-T80・S-T100、操作コイル AC200V、補助接点 2a2b 標準）。
 *
 * 定格使用電流（AC-3 220V）は形名の数字どおり 35・50・65・80・100A（三菱電機の形式一覧の区分）。
 * 外形（幅 × 高さ）は S-T35 75×89mm、S-T50 75×89mm、S-T65・S-T80 88×106mm（販売店の仕様表）。S-T100 は資料で確かめられず、S-T80 と同じとした（推定）。
 * 端子の並びは S-T21 と同じ考え方（上部のコイル端子 A2・A1、中央に主回路 1/L1・3/L2・5/L3 / 2/T1・4/T2・6/T3、
 * 左右の縁に補助接点 13・21 / 22・14 と 43・31 / 32・44）で描いた。補助接点の端子番号と位置は推定。
 * 端子 ID は S-T21 とそろえ、「電磁接触器」のファミリーの中で機種を変えても電線はつながったまま。
 */
import type { DeviceDefinition } from '../types';
import { auxTerminal, COIL_AC200V, coilBlock, defs, logo, mark, screw, slot } from './ms-t';

export interface MsTMidSpec {
  type: string;
  /** 銘板の型式（例: 'S-T35'） */
  modelName: string;
  /** AC-3（AC220V）の定格使用電流[A]（主接点の ratedCurrent） */
  ac3Current: number;
  /** 外形の幅・高さ[mm] */
  widthMm: number;
  heightMm: number;
  /** 操作コイルの保持の皮相電力[VA]（AC200V）。負荷電流 = VA ÷ 200V */
  holdVA: number;
  description: string;
  estimated: string;
}

export function buildMsTMid(spec: MsTMidSpec): DeviceDefinition {
  const W = Math.round(spec.widthMm * 2);
  // 本体の高さに、上部のコイル端子のブロック（約 13mm）を加える
  const BODY_TOP = 26;
  const H = Math.round(spec.heightMm * 2) + BODY_TOP - 4;
  const COIL_Y = 14;
  const A2_X = Math.round(W * 0.38);
  const A1_X = Math.round(W * 0.62);
  const r = W >= 170 ? 7.4 : 6.8; // 主回路端子ネジ（M5〜M6）
  const MAIN_XS = [0.31, 0.5, 0.69].map((f) => Math.round(W * f * 2) / 2);
  const MAIN_TOP = BODY_TOP + 20;
  const MAIN_BOT = H - 22;
  const AUX_L = 14;
  const AUX_R = W - 14;
  const AUX_YS = { a: MAIN_TOP + 8, b: MAIN_TOP + 24, c: MAIN_BOT - 26, d: MAIN_BOT - 8 };
  const sideW = 24;
  const auxLabel = (t: string, x: number, y: number) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222">${t}</text>`;
  const cut = spec.modelName.indexOf('-') + 1;
  const midY = (MAIN_TOP + MAIN_BOT) / 2;

  const svg = `${defs}
  <!-- 背面の黒いベース -->
  <rect x="2" y="${BODY_TOP - 2}" width="${W - 4}" height="${H - BODY_TOP - 2}" rx="3" fill="#232323"/>
  ${coilBlock(A2_X - 14, A1_X + 14, A2_X, A1_X, COIL_Y, ['50/60Hz', '200-', '240V'])}
  <!-- 本体（中央の主回路部と左右の補助接点部） -->
  <rect x="${sideW + 2}" y="${BODY_TOP}" width="${W - 2 * sideW - 4}" height="${H - BODY_TOP - 4}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>
  <rect x="3" y="${BODY_TOP + 10}" width="${sideW}" height="${H - BODY_TOP - 22}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  <rect x="${W - sideW - 3}" y="${BODY_TOP + 10}" width="${sideW}" height="${H - BODY_TOP - 22}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  <!-- 主回路端子 -->
  <rect x="${sideW + 4}" y="${MAIN_TOP - 14}" width="${W - 2 * sideW - 8}" height="28" rx="1.5" fill="url(#pocket-{{uid}})"/>
  <rect x="${sideW + 4}" y="${MAIN_BOT - 14}" width="${W - 2 * sideW - 8}" height="28" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${MAIN_XS.map((x) => screw(x, MAIN_TOP, r) + screw(x, MAIN_BOT, r)).join('')}
  ${['1/L1', '3/L2', '5/L3'].map((t, i) => mark(MAIN_XS[i], MAIN_TOP + 19, t)).join('')}
  ${['2/T1', '4/T2', '6/T3'].map((t, i) => mark(MAIN_XS[i], MAIN_BOT - 18, t)).join('')}
  <!-- 補助接点（左: 13 21 / 22 14、右: 43 31 / 32 44） -->
  ${[AUX_L, AUX_R].map((x) => Object.values(AUX_YS).map((y) => screw(x, y, 4.8)).join('')).join('')}
  ${auxLabel('13', AUX_L, AUX_YS.a - 7.5)}${auxLabel('21', AUX_L, AUX_YS.b + 10.5)}${auxLabel('22', AUX_L, AUX_YS.c - 7.5)}${auxLabel('14', AUX_L, AUX_YS.d + 10.5)}
  ${auxLabel('43', AUX_R, AUX_YS.a - 7.5)}${auxLabel('31', AUX_R, AUX_YS.b + 10.5)}${auxLabel('32', AUX_R, AUX_YS.c - 7.5)}${auxLabel('44', AUX_R, AUX_YS.d + 10.5)}
  <rect x="${AUX_L - 4.5}" y="${midY - 6}" width="9" height="12" rx="1" fill="#2a2a2a"/>
  <rect x="${AUX_R - 4.5}" y="${midY - 6}" width="9" height="12" rx="1" fill="#2a2a2a"/>
  <!-- 中央: 可動部・形名・ロゴ -->
  ${slot(W / 2, midY - 22, 30, 44)}
  <text x="${sideW + 6}" y="${midY - 4}" font-family="sans-serif" font-size="6.2" font-weight="bold" fill="#333">${spec.modelName.slice(0, cut)}</text>
  <text x="${sideW + 6}" y="${midY + 4}" font-family="sans-serif" font-size="6.2" font-weight="bold" fill="#333">${spec.modelName.slice(cut)}</text>
  <text x="${sideW + 6}" y="${midY + 11}" font-family="sans-serif" font-size="3.4" fill="#555">AC200V</text>
  <text x="${sideW + 6}" y="${midY + 16.5}" font-family="sans-serif" font-size="3.4" fill="#555">2a2b</text>
  ${logo(W - sideW - 22, midY - 2, false)}
  <text x="${W - sideW - 19}" y="${midY + 13}" text-anchor="middle" font-family="sans-serif" font-size="2.6" font-weight="bold" fill="#333">MITSUBISHI</text>
  <rect x="${sideW + 6}" y="${H - 4}" width="${W - 2 * sideW - 12}" height="4" rx="1.5" fill="#1d1d1d"/>
`;
  return {
    type: spec.type,
    name: '電磁接触器',
    model: `${spec.modelName} AC200V 2a2b`,
    maker: '三菱電機',
    category: 'contactor',
    description: spec.description,
    labelPrefix: 'MC',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: '1/L1', hint: '一次側', x: MAIN_XS[0], y: MAIN_TOP, side: 'top', role: 'line' },
      { id: '3/L2', hint: '一次側', x: MAIN_XS[1], y: MAIN_TOP, side: 'top', role: 'line' },
      { id: '5/L3', hint: '一次側', x: MAIN_XS[2], y: MAIN_TOP, side: 'top', role: 'line' },
      { id: '2/T1', hint: '二次側', x: MAIN_XS[0], y: MAIN_BOT, side: 'bottom', role: 'load' },
      { id: '4/T2', hint: '二次側', x: MAIN_XS[1], y: MAIN_BOT, side: 'bottom', role: 'load' },
      { id: '6/T3', hint: '二次側', x: MAIN_XS[2], y: MAIN_BOT, side: 'bottom', role: 'load' },
      auxTerminal('13', AUX_L, AUX_YS.a, 'left', 'NO', false, 1),
      auxTerminal('21', AUX_L, AUX_YS.b, 'left', 'NC', true, 1),
      auxTerminal('22', AUX_L, AUX_YS.c, 'left', 'NC', true, 1),
      auxTerminal('14', AUX_L, AUX_YS.d, 'left', 'NO', false, 1),
      auxTerminal('43', AUX_R, AUX_YS.a, 'right', 'NO', false, 2),
      auxTerminal('31', AUX_R, AUX_YS.b, 'right', 'NC', true, 2),
      auxTerminal('32', AUX_R, AUX_YS.c, 'right', 'NC', true, 2),
      auxTerminal('44', AUX_R, AUX_YS.d, 'right', 'NO', false, 2),
      { id: 'A1', hint: 'コイル', x: A1_X, y: COIL_Y, side: 'top', role: 'input', accepts: COIL_AC200V },
      { id: 'A2', hint: 'コイル', x: A2_X, y: COIL_Y, side: 'top', role: 'input', accepts: COIL_AC200V },
    ],
    links: [
      { from: '1/L1', to: '2/T1', directed: true, switch: 'NO', ratedCurrent: spec.ac3Current },
      { from: '3/L2', to: '4/T2', directed: true, switch: 'NO', ratedCurrent: spec.ac3Current },
      { from: '5/L3', to: '6/T3', directed: true, switch: 'NO', ratedCurrent: spec.ac3Current },
      { from: '13', to: '14', switch: 'NO' },
      { from: '43', to: '44', switch: 'NO' },
      { from: '21', to: '22', switch: 'NC', linked: 'mirror' },
      { from: '31', to: '32', switch: 'NC', linked: 'mirror' },
    ],
    safety: { standards: ['IEC 60947-4-1 附属書 F（ミラー接点）'] },
    distinctGroups: [['A1', 'A2']],
    loadCurrent: Math.round((spec.holdVA / 200) * 1000) / 1000,
    estimated: spec.estimated,
  };
}
