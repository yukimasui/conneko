/**
 * 富士電機 電磁接触器 SC シリーズ（新SC・NEO SC。SC-05・SC-4-0 など、補助接点 1a1b 付き）の機器定義を作る。
 *
 * 外形: SC-05 は 幅 53 × 高さ 81mm（販売店の仕様表・富士電機の新旧比較表）。
 * 端子の並びは、上段 左から A1・1/L1・3/L2・5/L3・13(NO)・21(NC)、下段 A2・2/T1・4/T2・6/T3・14(NO)・22(NC) とした（推定）。
 * 端子 ID は三菱電機 S-T12 / S-T20（1a1b）とそろえ、「電磁接触器」のファミリーで機種を変えても電線はつながったまま。
 * 操作コイル AC200V 品の定格は 200〜220V（50Hz）/ 200〜240V（60Hz）なので、受電の条件は AC200〜240V とした。
 */
import type { DeviceDefinition } from '../types';
import { FUJI_DEFS, fMark, fScrew, fText, fujiName } from './parts';

export interface FujiScSpec {
  type: string;
  /** 銘板の型式（例: 'SC-05'） */
  modelName: string;
  widthMm: number;
  heightMm: number;
  /** 主接点の定格使用電流（AC-3 200〜240V）[A] */
  ratedCurrent: number;
  /** モータ容量（AC-3 200〜240V）[kW] */
  motorKw: number;
  /** 操作コイルの保持の消費 [VA]（コイル電流 = VA ÷ 200V） */
  coilVA: number;
  description: string;
  estimated?: string;
}

const TOP_Y = 22;

export function buildFujiSc(spec: FujiScSpec): DeviceDefinition {
  const W = spec.widthMm * 2;
  const H = spec.heightMm * 2;
  const BOT_Y = H - 22;
  // 6 列（コイル・主回路 3 極・補助接点 2 組）を等間隔に並べる
  const margin = 10;
  const cols = Array.from({ length: 6 }, (_, i) => +(margin + ((W - 2 * margin) * i) / 5).toFixed(1));
  const pitch = cols[1] - cols[0];
  const r = Math.min(5.6, pitch / 2 - 2.4);
  const top = ['A1', '1/L1', '3/L2', '5/L3', '13NO', '21NC'];
  const bot = ['A2', '2/T1', '4/T2', '6/T3', '14NO', '22NC'];
  const markW = Math.min(15, pitch - 1.5);
  const cx = W / 2;

  const barriers = (y: number) =>
    cols
      .slice(1)
      .map((x, i) => `<rect x="${(x + cols[i]) / 2 - 1}" y="${y}" width="2" height="26" rx="0.8" fill="#9fa3a8"/>`)
      .join('');

  const svg = `
  <defs>${FUJI_DEFS}</defs>
  <!-- 背面の取付ベース -->
  <rect x="0" y="12" width="${W}" height="${H - 24}" rx="3" fill="#2a2c2f"/>
  <!-- 本体 -->
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="3.5" fill="url(#fbody-{{uid}})" stroke="#8d9196" stroke-width="0.9"/>
  <!-- 上段（一次側・コイル A1・補助接点） -->
  <rect x="4" y="8" width="${W - 8}" height="28" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${barriers(9)}
  ${cols.map((x) => fScrew(x, TOP_Y, r)).join('')}
  ${cols.map((x, i) => fMark(x, 44, top[i], markW)).join('')}
  <!-- 前面: 型式・接点の開閉が見える可動部・定格 -->
  <rect x="7" y="51" width="${W - 14}" height="${H - 102}" rx="2.5" fill="#d5d8db" stroke="#9a9ea3" stroke-width="0.6"/>
  ${fujiName(11, 59, 4.4)}
  ${fText(11, 72, spec.modelName, Math.min(10, (W / 2 - 18) / (spec.modelName.length * 0.6)), '#1b1d20', 'bold', 'start')}
  <rect x="${cx + 4}" y="55" width="${W / 2 - 15}" height="${H - 112}" rx="1.5" fill="url(#fdark-{{uid}})" stroke="#222" stroke-width="0.5"/>
  <rect x="${cx + 8}" y="${H / 2 - 10}" width="${W / 2 - 23}" height="20" rx="1" fill="#16181a" stroke="#555" stroke-width="0.6"/>
  ${fText(cx + 4 + (W / 2 - 15) / 2, H / 2 + 3, '|', 7, '#e8e8e8')}
  ${fText(11, 84, 'AC200V', 4.4, '#333', 'bold', 'start')}
  ${fText(11, 91, '50/60Hz', 3.6, '#555', 'normal', 'start')}
  ${fText(11, 100, `AC-3 ${spec.ratedCurrent}A`, 4, '#333', 'bold', 'start')}
  ${fText(11, 106, `${spec.motorKw}kW 200V`, 3.6, '#555', 'normal', 'start')}
  ${fText(cx + 4 + (W / 2 - 15) / 2, H - 61, '1a1b', 4.2, '#eee')}
  <!-- 下段（二次側・コイル A2・補助接点） -->
  ${cols.map((x, i) => fMark(x, H - 44, bot[i], markW)).join('')}
  <rect x="4" y="${H - 36}" width="${W - 8}" height="28" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${barriers(H - 35)}
  ${cols.map((x) => fScrew(x, BOT_Y, r)).join('')}
`;

  const coil = { system: 'AC' as const, minVoltage: 200, maxVoltage: 240 };
  return {
    type: spec.type,
    name: '電磁接触器',
    model: `${spec.modelName} AC200V 1a1b`,
    maker: '富士電機',
    category: 'contactor',
    description: spec.description,
    labelPrefix: 'MC',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'A1', hint: 'コイル', x: cols[0], y: TOP_Y, side: 'top', role: 'input', accepts: coil },
      { id: 'A2', hint: 'コイル', x: cols[0], y: BOT_Y, side: 'bottom', role: 'input', accepts: coil },
      { id: '1/L1', hint: '一次 R', x: cols[1], y: TOP_Y, side: 'top', role: 'line' },
      { id: '3/L2', hint: '一次 S', x: cols[2], y: TOP_Y, side: 'top', role: 'line' },
      { id: '5/L3', hint: '一次 T', x: cols[3], y: TOP_Y, side: 'top', role: 'line' },
      { id: '2/T1', hint: '二次 U', x: cols[1], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '4/T2', hint: '二次 V', x: cols[2], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '6/T3', hint: '二次 W', x: cols[3], y: BOT_Y, side: 'bottom', role: 'load' },
      { id: '13', label: '13NO', hint: 'a 接点', note: '補助 a 接点', x: cols[4], y: TOP_Y, side: 'top', role: 'signal', optional: true },
      { id: '14', label: '14NO', hint: 'a 接点', note: '補助 a 接点', x: cols[4], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
      { id: '21', label: '21NC', hint: 'b 接点', note: '補助 b 接点', x: cols[5], y: TOP_Y, side: 'top', role: 'signal', optional: true },
      { id: '22', label: '22NC', hint: 'b 接点', note: '補助 b 接点', x: cols[5], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    ],
    // 主接点 3 極と補助 a 接点はコイルの通電で閉じ、補助 b 接点は開く。主接点の定格は AC-3 200〜240V の定格使用電流
    links: [
      { from: '1/L1', to: '2/T1', directed: true, switch: 'NO', ratedCurrent: spec.ratedCurrent },
      { from: '3/L2', to: '4/T2', directed: true, switch: 'NO', ratedCurrent: spec.ratedCurrent },
      { from: '5/L3', to: '6/T3', directed: true, switch: 'NO', ratedCurrent: spec.ratedCurrent },
      { from: '13', to: '14', switch: 'NO' },
      { from: '21', to: '22', switch: 'NC' },
    ],
    distinctGroups: [['A1', 'A2']],
    loadCurrent: +(spec.coilVA / 200).toFixed(3),
    ...(spec.estimated ? { estimated: spec.estimated } : {}),
  };
}
