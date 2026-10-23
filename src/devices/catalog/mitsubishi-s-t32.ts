import type { DeviceDefinition } from '../types';
import { COIL_AC200V, coilBlock, defs, logo, mark, screw, slot } from '../mitsubishi/ms-t';

/**
 * 三菱電機 電磁接触器 S-T32（MS-T シリーズ、操作コイル AC200V、補助接点なし）。
 * 外形は 幅43 × 高さ81 × 奥行81mm（1mm ≒ 2px）。端子位置はカタログ L(NA)02030ENG-K p.59 の外形図による。
 * 上部の一段高いブロックに操作コイル端子 A2・A1、本体に主回路端子（M4）上 1/L1・3/L2・5/L3、下 2/T1・4/T2・6/T3。
 * 補助接点は標準で付かない（前面に UT-AX2 / UT-AX4 を取り付ける。この定義では表さない）。
 */

const W = 86;
const H = 162;
const MAIN_XS = [17, 43, 68];
const MAIN_TOP = 43;
const MAIN_BOT = 141;
const COIL_Y = 14;
const A2_X = 28;
const A1_X = 58.5;

const svg = `${defs}
  <!-- 背面の黒いベース -->
  <rect x="0" y="26" width="${W}" height="${H - 30}" rx="3" fill="#232323"/>
  ${coilBlock(16, 71, A2_X, A1_X, COIL_Y, ['50/60Hz', '200-', '240V'])}
  <!-- 本体 -->
  <rect x="2" y="28" width="${W - 4}" height="${H - 32}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>
  <rect x="4" y="31" width="${W - 8}" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  <rect x="4" y="${MAIN_BOT - 12}" width="${W - 8}" height="24" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${MAIN_XS.map((x) => screw(x, MAIN_TOP, 6.2) + screw(x, MAIN_BOT, 6.2)).join('')}
  ${['1/L1', '3/L2', '5/L3'].map((t, i) => mark(MAIN_XS[i], 61, t)).join('')}
  ${['2/T1', '4/T2', '6/T3'].map((t, i) => mark(MAIN_XS[i], 124, t)).join('')}
  <!-- 中央: 可動部・形名・ロゴ -->
  ${slot(W / 2, 70, 24, 40)}
  <text x="5" y="80" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">S-</text>
  <text x="5" y="87" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">T32</text>
  <text x="5" y="94" font-family="sans-serif" font-size="3" fill="#555">AC200V</text>
  ${logo(61, 96, false)}
  <text x="70" y="110" text-anchor="middle" font-family="sans-serif" font-size="2.3" font-weight="bold" fill="#333">MITSUBISHI</text>
  <rect x="14" y="${H - 4}" width="${W - 28}" height="4" rx="1.5" fill="#1d1d1d"/>
`;

const def: DeviceDefinition = {
  type: 'mitsubishi.s-t32.ac200v',
  name: '電磁接触器',
  model: 'S-T32 AC200V',
  maker: '三菱電機',
  category: 'contactor',
  description:
    '三菱電機 MS-T シリーズの電磁接触器（AC-3 220〜240V 7.5kW / 32A、操作コイル AC200V: 200〜240V）。幅43mm の小形の 32A 級で、補助接点は標準で付かない。' +
    'A1-A2 にコイル電圧を加えると主接点 3 極が閉じる。自己保持・インタロック用の補助接点は前面に補助接点ユニット（UT-AX2・UT-AX4）を付けて取る（この定義には含まない）。',
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
    { id: 'A1', hint: 'コイル', x: A1_X, y: COIL_Y, side: 'top', role: 'input', accepts: COIL_AC200V },
    { id: 'A2', hint: 'コイル', x: A2_X, y: COIL_Y, side: 'top', role: 'input', accepts: COIL_AC200V },
  ],
  // 主接点の ratedCurrent は AC-3（AC220〜240V）の定格使用電流 32A
  links: [
    { from: '1/L1', to: '2/T1', directed: true, switch: 'NO', ratedCurrent: 32 },
    { from: '3/L2', to: '4/T2', directed: true, switch: 'NO', ratedCurrent: 32 },
    { from: '5/L3', to: '6/T3', directed: true, switch: 'NO', ratedCurrent: 32 },
  ],
  distinctGroups: [['A1', 'A2']],
  // コイル保持 4.5VA / 200V
  loadCurrent: 0.023,
};

export default def;
