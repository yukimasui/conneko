import type { DeviceDefinition } from '../types';
import { auxTerminal, type CoilKind, coilBlock, coilTerminals, coilText, defs, logo, mark, screw, slot } from '../mitsubishi/ms-t';

/**
 * 三菱電機 電磁接触器 S-T20（MS-T シリーズ、操作コイル AC200V、補助接点 1a1b 標準）。
 * 外形は S-T12 と同じ 幅44 × 高さ75 × 奥行78mm（1mm ≒ 2px。カタログ L(NA)02030ENG-K p.57）。
 * 上段に 13NO・1/L1・3/L2・5/L3・21NC、下段に 14NO・2/T1・4/T2・6/T3・22NC（ピッチ約 8.4mm、上段は上端から 23.7mm、上下間隔 41.6mm）。
 * 上部の一段高いブロックに操作コイル端子 A2・A1。
 * 補助 b 接点 21-22 は MS-T シリーズのミラー接点（IEC 60947-4-1 附属書 F）。
 * 直流操作形 SD-T20 も同じ正面の配置なので buildMsT20Frame で作る（奥行は 100mm）。
 */

const W = 88;
const H = 150;
/** 端子の横位置（左から 13NO, 1/L1, 3/L2, 5/L3, 21NC） */
const COLS = [10, 27, 43.5, 60.5, 77];
const TOP_Y = 47.5;
const BOT_Y = 130.5;
const COIL_Y = 13;
const A2_X = 37.5;
const A1_X = 68;

export interface MsT20FrameSpec {
  type: string;
  modelName: string;
  coil: CoilKind;
  /** AC-3（AC220〜240V）の定格使用電流[A] */
  ac3Current: number;
  /** コイルの保持電流[A] */
  coilCurrent: number;
  description: string;
}

/** T12/T20 フレーム（幅44mm、補助接点 1a1b）の電磁接触器 */
export function buildMsT20Frame(spec: MsT20FrameSpec): DeviceDefinition {
  const svg = `${defs}
  <!-- 背面の黒いベース -->
  <rect x="0" y="22" width="${W}" height="${H - 24}" rx="3" fill="#232323"/>
  ${coilBlock(25, 81, A2_X, A1_X, COIL_Y, coilText(spec.coil))}
  <!-- 本体 -->
  <rect x="2" y="24" width="${W - 4}" height="${H - 27}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>
  <!-- 上段端子 -->
  <rect x="3" y="36" width="${W - 6}" height="23" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${COLS.map((x) => screw(x, TOP_Y)).join('')}
  ${['13NO', '1/L1', '3/L2', '5/L3', '21NC'].map((t, i) => mark(COLS[i], 64, t, 15.6)).join('')}
  <!-- 中央: 形名・可動部・ロゴ -->
  <text x="5" y="83" font-family="sans-serif" font-size="${spec.modelName.length > 5 ? 7 : 8}" font-weight="bold" fill="#333">${spec.modelName}</text>
  <text x="5" y="90" font-family="sans-serif" font-size="3.6" fill="#555">${spec.coil}  1a1b</text>
  ${slot(W / 2, 72, 11, 34)}
  ${logo(56, 92)}
  <!-- 下段端子 -->
  ${['14NO', '2/T1', '4/T2', '6/T3', '22NC'].map((t, i) => mark(COLS[i], 114, t, 15.6)).join('')}
  <rect x="3" y="119" width="${W - 6}" height="23" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${COLS.map((x) => screw(x, BOT_Y)).join('')}
  <rect x="8" y="${H - 5}" width="${W - 16}" height="5" rx="1.5" fill="#1d1d1d"/>
`;
  return {
    type: spec.type,
    name: spec.coil === 'DC24V' ? '電磁接触器（直流操作）' : '電磁接触器',
    model: `${spec.modelName} ${spec.coil} 1a1b`,
    maker: '三菱電機',
    category: 'contactor',
    description: spec.description,
    labelPrefix: 'MC',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: '1/L1', hint: '一次側', x: COLS[1], y: TOP_Y, side: 'top', role: 'line' },
      { id: '3/L2', hint: '一次側', x: COLS[2], y: TOP_Y, side: 'top', role: 'line' },
      { id: '5/L3', hint: '一次側', x: COLS[3], y: TOP_Y, side: 'top', role: 'line' },
      { id: '2/T1', hint: '二次側', x: COLS[1], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '4/T2', hint: '二次側', x: COLS[2], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '6/T3', hint: '二次側', x: COLS[3], y: BOT_Y, side: 'bottom', role: 'load' },
      auxTerminal('13', COLS[0], TOP_Y, 'top', 'NO'),
      auxTerminal('14', COLS[0], BOT_Y, 'bottom', 'NO'),
      auxTerminal('21', COLS[4], TOP_Y, 'top', 'NC', true),
      auxTerminal('22', COLS[4], BOT_Y, 'bottom', 'NC', true),
      ...coilTerminals(spec.coil, A1_X, A2_X, COIL_Y),
    ],
    // 主接点の ratedCurrent は AC-3（AC220〜240V）の定格使用電流。補助 b 接点 21-22 はミラー接点
    links: [
      { from: '1/L1', to: '2/T1', directed: true, switch: 'NO', ratedCurrent: spec.ac3Current },
      { from: '3/L2', to: '4/T2', directed: true, switch: 'NO', ratedCurrent: spec.ac3Current },
      { from: '5/L3', to: '6/T3', directed: true, switch: 'NO', ratedCurrent: spec.ac3Current },
      { from: '13', to: '14', switch: 'NO' },
      { from: '21', to: '22', switch: 'NC', linked: 'mirror' },
    ],
    safety: { standards: ['IEC 60947-4-1 附属書 F（ミラー接点）'] },
    ...(spec.coil === 'AC200V' ? { distinctGroups: [['A1', 'A2']] } : {}),
    loadCurrent: spec.coilCurrent,
  };
}

export default buildMsT20Frame({
  type: 'mitsubishi.s-t20.ac200v',
  modelName: 'S-T20',
  coil: 'AC200V',
  ac3Current: 18,
  // コイル保持 7VA / 200V
  coilCurrent: 0.035,
  description:
    '三菱電機 MS-T シリーズの電磁接触器（AC-3 220〜240V 4.5kW / 18A、操作コイル AC200V: 200〜240V）。S-T12 と同じ外形で容量が大きい。' +
    'A1-A2 にコイル電圧を加えると主接点 3 極と補助 a 接点 13-14 が閉じ、補助 b 接点 21-22（ミラー接点）が開く。組み合わせるサーマルリレーは TH-T18。',
});
