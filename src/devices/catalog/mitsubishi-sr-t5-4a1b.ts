import type { DeviceDefinition, InternalLink, TerminalDef } from '../types';
import { auxTerminal, type CoilKind, coilBlock, coilTerminals, coilText, defs, logo, mark, screw, slot } from '../mitsubishi/ms-t';

/**
 * 三菱電機 電磁継電器（コンタクタリレー）SR-T5（MS-T シリーズ、操作コイル AC200V、5 極）。
 * 外形は S-T12 と同じフレームの 幅44 × 高さ75 × 奥行78mm（1mm ≒ 2px。カタログ L(NA)02030ENG-K p.69）。
 * 上段・下段に接点の端子（M3.5）が 5 本ずつ（ピッチ約 8.4mm、上段は上端から 23.7mm、上下間隔 41.6mm）、
 * 上部の一段高いブロックに操作コイル端子 A2・A1。
 * 接点の配列と端子番号は同カタログ p.35 の接点配置図による（左の極から順に並ぶ）。
 *   5a:   13 23 33 43 53 / 14 24 34 44 54
 *   4a1b: 13 23 33 43 51 / 14 24 34 44 52
 *   3a2b: 11 23 33 43 51 / 12 24 34 44 52
 * 3 つの接点配列は端子 ID が違うので、別の type（buildSrT5）にする。
 * 直流操作形 SRD-T5（DC24V、コイルは極性あり A1(+)・A2(−)）も正面の配置は同じ（同カタログ p.69。奥行 100mm）。
 */

const W = 88;
const H = 150;
const COLS = [10, 27, 43.5, 60.5, 77];
const TOP_Y = 47.5;
const BOT_Y = 130.5;
const COIL_Y = 13;
const A2_X = 37.5;
const A1_X = 68;

/** 接点配列: 各極の上段端子番号（下段は +1）と a/b の別 */
export type SrT5Arrangement = '5a' | '4a1b' | '3a2b';

const POLES: Record<SrT5Arrangement, { top: string; bot: string; kind: 'NO' | 'NC' }[]> = {
  '5a': ['13', '23', '33', '43', '53'].map((t) => ({ top: t, bot: String(Number(t) + 1), kind: 'NO' as const })),
  '4a1b': [
    ...['13', '23', '33', '43'].map((t) => ({ top: t, bot: String(Number(t) + 1), kind: 'NO' as const })),
    { top: '51', bot: '52', kind: 'NC' as const },
  ],
  '3a2b': [
    { top: '11', bot: '12', kind: 'NC' as const },
    ...['23', '33', '43'].map((t) => ({ top: t, bot: String(Number(t) + 1), kind: 'NO' as const })),
    { top: '51', bot: '52', kind: 'NC' as const },
  ],
};

export function buildSrT5(arr: SrT5Arrangement, coil: CoilKind = 'AC200V'): DeviceDefinition {
  const dc = coil === 'DC24V';
  const modelName = dc ? 'SRD-T5' : 'SR-T5';
  const poles = POLES[arr];
  const svg = `${defs}
  <!-- 背面の黒いベース -->
  <rect x="0" y="22" width="${W}" height="${H - 24}" rx="3" fill="#232323"/>
  ${coilBlock(25, 81, A2_X, A1_X, COIL_Y, coilText(coil))}
  <!-- 本体 -->
  <rect x="2" y="24" width="${W - 4}" height="${H - 27}" rx="3" fill="url(#body-{{uid}})" stroke="#9c978a" stroke-width="0.9"/>
  <rect x="3" y="36" width="${W - 6}" height="23" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${COLS.map((x) => screw(x, TOP_Y)).join('')}
  ${poles.map((p, i) => mark(COLS[i], 64, p.top, 12)).join('')}
  <!-- 中央: 形名・可動部・ロゴ -->
  <text x="5" y="83" font-family="sans-serif" font-size="${dc ? 6.6 : 7.5}" font-weight="bold" fill="#333">${modelName}</text>
  <text x="5" y="90" font-family="sans-serif" font-size="3.6" fill="#555">${coil}  ${arr}</text>
  ${slot(W / 2 + 4, 72, 11, 34)}
  ${logo(57, 92)}
  ${poles.map((p, i) => mark(COLS[i], 114, p.bot, 12)).join('')}
  <rect x="3" y="119" width="${W - 6}" height="23" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${COLS.map((x) => screw(x, BOT_Y)).join('')}
  <rect x="8" y="${H - 5}" width="${W - 16}" height="5" rx="1.5" fill="#1d1d1d"/>
`;
  // 同じ種類（a 接点・b 接点）が複数あるときだけ、左から数えた番号を付ける
  const kindNo = (i: number): number | undefined => {
    const same = poles.filter((p) => p.kind === poles[i].kind);
    return same.length > 1 ? same.indexOf(poles[i]) + 1 : undefined;
  };
  const terminals: TerminalDef[] = [
    ...poles.flatMap((p, i) => [auxTerminal(p.top, COLS[i], TOP_Y, 'top', p.kind, false, kindNo(i)), auxTerminal(p.bot, COLS[i], BOT_Y, 'bottom', p.kind, false, kindNo(i))]),
    ...coilTerminals(coil, A1_X, A2_X, COIL_Y),
  ];
  // 印字は番号だけ。注記は「補助」ではなく継電器の接点
  for (const t of terminals) {
    if (t.role !== 'signal') continue;
    t.label = t.id;
    t.note = t.note?.replace('補助 ', '');
  }
  const links: InternalLink[] = poles.map((p) => ({ from: p.top, to: p.bot, switch: p.kind }));
  const na = poles.filter((p) => p.kind === 'NO').length;
  return {
    type: `mitsubishi.${modelName.toLowerCase()}.${arr}.${coil.toLowerCase()}`,
    name: '電磁継電器（コンタクタリレー）',
    model: `${modelName} ${coil} ${arr}`,
    maker: '三菱電機',
    category: 'contactor',
    description:
      `三菱電機 MS-T シリーズの電磁継電器（コンタクタリレー）5 極・${arr}（a 接点 ${na}・b 接点 ${5 - na}、${dc ? '操作コイル DC24V 2.2W、極性あり' : '操作コイル AC200V: 200〜240V'}）。` +
      `${dc ? 'A1(+)-A2(−) に DC24V を加えると' : 'A1-A2 にコイル電圧を加えると'} a 接点が閉じ、b 接点が開く。` +
      '接点定格は AC-15 AC240V 3A・DC-13 DC24V 3A（Ith 10A）。' +
      '電磁接触器と同じ外形・操作感の制御用リレーで、シーケンス回路の自己保持・インタロック・信号の分配に使う。前面に補助接点ユニット UT-AX を付けて最大 9 極にできる（この定義には含まない）。',
    labelPrefix: 'CR',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    ...(dc ? {} : { distinctGroups: [['A1', 'A2']] }),
    // コイル保持 7VA / 200V、直流操作形は 2.2W / 24V
    loadCurrent: dc ? 0.092 : 0.035,
  };
}

export default buildSrT5('4a1b');
