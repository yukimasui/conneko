import type { DeviceDefinition } from '../types';
import { auxTerminal, COIL_AC200V, coilBlock, defs, logo, mark, screw, slot } from '../mitsubishi/ms-t';

/**
 * 三菱電機 電磁接触器 S-T21（MS-T シリーズ、操作コイル AC200V、補助接点 2a2b 標準）。
 * 外形は 幅63 × 高さ81 × 奥行81mm（1mm ≒ 2px）。端子位置はカタログ L(NA)02030ENG-K p.58 の外形図による。
 * 上部の一段高いブロックに操作コイル端子 A2・A1、中央に主回路端子（M4。上 1/L1・3/L2・5/L3、下 2/T1・4/T2・6/T3）、
 * 左右の縁に補助接点の端子（M3.5）が縦に並ぶ（左: 13・21 / 22・14、右: 43・31 / 32・44）。
 * 同じ外形の S-T25 も buildMsT21Frame で作る。
 */

const W = 126;
const H = 162;
const COIL_Y = 14;
const A2_X = 46;
const A1_X = 78.5;
const MAIN_XS = [38, 64, 89.5];
const MAIN_TOP = 44;
const MAIN_BOT = 142;
const AUX_L = 15;
const AUX_R = 111.5;
const AUX_YS = { a: 51, b: 66, c: 118, d: 135.5 };

export interface MsT21FrameSpec {
  type: string;
  /** 銘板の型式（例: 'S-T21'） */
  modelName: string;
  /** AC-3（AC220〜240V）の定格使用電流[A]（主接点の ratedCurrent） */
  ac3Current: number;
  description: string;
}

/** T21/T25 フレーム（幅63mm、補助接点 2a2b が左右の縁）の交流操作形電磁接触器 */
export function buildMsT21Frame(spec: MsT21FrameSpec): DeviceDefinition {
  const auxLabel = (t: string, x: number, y: number) =>
    `<text x="${x}" y="${y + 10.5}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#222">${t}</text>`;
  // 形名は 2 行に分けて書く（例: 'S-' と 'T21'）
  const cut = spec.modelName.indexOf('-') + 1;
  const modelHead = spec.modelName.slice(0, cut);
  const modelTail = spec.modelName.slice(cut);
  const svg = `${defs}
  <!-- 背面の黒いベース -->
  <rect x="2" y="26" width="${W - 4}" height="${H - 30}" rx="3" fill="#232323"/>
  ${coilBlock(34, 91, A2_X, A1_X, COIL_Y, ['50/60Hz', '200-', '240V'])}
  <!-- 本体（中央の主回路部と左右の補助接点部） -->
  <rect x="26" y="28" width="74" height="${H - 32}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>
  <rect x="3" y="38" width="25" height="${H - 50}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  <rect x="${W - 28}" y="38" width="25" height="${H - 50}" rx="2.5" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.8"/>
  <!-- 主回路端子 -->
  <rect x="28" y="32" width="70" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  <rect x="28" y="${MAIN_BOT - 12}" width="70" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${MAIN_XS.map((x) => screw(x, MAIN_TOP, 6) + screw(x, MAIN_BOT, 6)).join('')}
  ${['1/L1', '3/L2', '5/L3'].map((t, i) => mark(MAIN_XS[i], 61, t)).join('')}
  ${['2/T1', '4/T2', '6/T3'].map((t, i) => mark(MAIN_XS[i], 125, t)).join('')}
  <!-- 補助接点（左: 13 21 / 22 14、右: 43 31 / 32 44） -->
  ${[AUX_L, AUX_R].map((x) => Object.values(AUX_YS).map((y) => screw(x, y, 4.8)).join('')).join('')}
  ${auxLabel('13', AUX_L, AUX_YS.a)}${auxLabel('21', AUX_L, AUX_YS.b)}${auxLabel('22', AUX_L, AUX_YS.c - 20)}${auxLabel('14', AUX_L, AUX_YS.d - 20)}
  ${auxLabel('43', AUX_R, AUX_YS.a)}${auxLabel('31', AUX_R, AUX_YS.b)}${auxLabel('32', AUX_R, AUX_YS.c - 20)}${auxLabel('44', AUX_R, AUX_YS.d - 20)}
  <!-- 補助接点部の窓（接点の開閉表示） -->
  <rect x="10.5" y="84" width="9" height="12" rx="1" fill="#2a2a2a"/>
  <rect x="${W - 19.5}" y="84" width="9" height="12" rx="1" fill="#2a2a2a"/>
  <!-- 中央: 可動部・形名・ロゴ -->
  ${slot(64, 70, 24, 36)}
  <text x="30" y="80" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#333">${modelHead}</text>
  <text x="30" y="87" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#333">${modelTail}</text>
  <text x="30" y="94" font-family="sans-serif" font-size="3.2" fill="#555">AC200V</text>
  <text x="30" y="99" font-family="sans-serif" font-size="3.2" fill="#555">2a2b</text>
  ${logo(80, 86, false)}
  <text x="83" y="101" text-anchor="middle" font-family="sans-serif" font-size="2.4" font-weight="bold" fill="#333">MITSUBISHI</text>
  <rect x="30" y="${H - 4}" width="${W - 60}" height="4" rx="1.5" fill="#1d1d1d"/>
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
      { id: '1/L1', x: MAIN_XS[0], y: MAIN_TOP, side: 'top', role: 'line' },
      { id: '3/L2', x: MAIN_XS[1], y: MAIN_TOP, side: 'top', role: 'line' },
      { id: '5/L3', x: MAIN_XS[2], y: MAIN_TOP, side: 'top', role: 'line' },
      { id: '2/T1', x: MAIN_XS[0], y: MAIN_BOT, side: 'bottom', role: 'load' },
      { id: '4/T2', x: MAIN_XS[1], y: MAIN_BOT, side: 'bottom', role: 'load' },
      { id: '6/T3', x: MAIN_XS[2], y: MAIN_BOT, side: 'bottom', role: 'load' },
      auxTerminal('13', AUX_L, AUX_YS.a, 'left', 'NO'),
      auxTerminal('21', AUX_L, AUX_YS.b, 'left', 'NC', true),
      auxTerminal('22', AUX_L, AUX_YS.c, 'left', 'NC', true),
      auxTerminal('14', AUX_L, AUX_YS.d, 'left', 'NO'),
      auxTerminal('43', AUX_R, AUX_YS.a, 'right', 'NO'),
      auxTerminal('31', AUX_R, AUX_YS.b, 'right', 'NC', true),
      auxTerminal('32', AUX_R, AUX_YS.c, 'right', 'NC', true),
      auxTerminal('44', AUX_R, AUX_YS.d, 'right', 'NO'),
      { id: 'A1', x: A1_X, y: COIL_Y, side: 'top', role: 'input', accepts: COIL_AC200V },
      { id: 'A2', x: A2_X, y: COIL_Y, side: 'top', role: 'input', accepts: COIL_AC200V },
    ],
    // 主接点の ratedCurrent は AC-3（AC220〜240V）の定格使用電流。補助 b 接点 21-22・31-32 はミラー接点
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
    // コイル保持 7VA / 200V
    loadCurrent: 0.035,
  };
}

export default buildMsT21Frame({
  type: 'mitsubishi.s-t21.ac200v',
  modelName: 'S-T21',
  ac3Current: 25,
  description:
    '三菱電機 MS-T シリーズの電磁接触器（AC-3 220〜240V 5.5kW / 25A、操作コイル AC200V: 200〜240V）。A1-A2 にコイル電圧を加えると主接点 3 極と補助 a 接点 13-14・43-44 が閉じ、補助 b 接点 21-22・31-32 が開く。' +
    '21-22・31-32 はミラー接点（IEC 60947-4-1 附属書 F）。組み合わせるサーマルリレーは TH-T25。',
});
