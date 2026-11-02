/**
 * オムロン ヒーター用ソリッドステート・コンタクタ G3PE（放熱器一体形、DIN レール取付け）の機器定義を作る。
 * 単相（G3PE-2□5B）と三相（G3PE-2□5B-3N、素子数 3）。定格負荷電流 15・25・35・45A（40℃）をパラメータで選ぶ。
 *
 * 出典: オムロン G3PE（三相）製品ページ・形式（G3PE-225B-3N DC12-24: 定格入力 DC12〜24V（使用 DC9.6〜30V）、入力電流 10mA 以下、
 * 定格負荷電圧 AC100〜240V、負荷電流 25A（40℃）、最小負荷電流 0.2A、ゼロクロス、素子数 3）。単相の形式の並び（215B・225B・235B・245B）。
 *
 * 推定: 外形（幅）と端子の並び・記号（主回路 1/L1→2/T1 など、入力 A1(+)・A2(−)）、単相品の入力電流（7mA）。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { SCREW_GRADIENT, text } from './parts';
import { screwTerminal } from './power-parts';

export interface G3peSpec {
  phases: 1 | 3;
  /** 定格負荷電流 → 外形の幅[mm]（推定） */
  widthMm: Record<number, number>;
}

const H = 200;
const TOP_Y = 15;
const BOT_Y = H - 15;
const CURRENTS = [15, 25, 35, 45];

const input = { system: 'DC' as const, minVoltage: 9.6, maxVoltage: 30 };

export function buildG3pe(spec: G3peSpec): DeviceDefinition {
  const three = spec.phases === 3;
  const widthOf = (p: ParamValues) => (spec.widthMm[Number(p.current)] ?? spec.widthMm[25]) * 2;
  const W0 = spec.widthMm[25] * 2;
  /** 主回路の端子の x（左から）と入力端子の x（右端） */
  const layout = (w: number) => {
    const n = spec.phases;
    const inX = w - 11;
    const span = inX - 16;
    const xs = Array.from({ length: n }, (_, i) => +(10 + (n === 1 ? 0 : (span * i) / n)).toFixed(1));
    return { xs, inX };
  };
  const lineIds = three ? ['1/L1', '3/L2', '5/L3'] : ['1/L1'];
  const loadIds = three ? ['2/T1', '4/T2', '6/T3'] : ['2/T1'];

  const svg = (p: ParamValues) => {
    const w = widthOf(p);
    const { xs, inX } = layout(w);
    const model = `G3PE-2${String(p.current).charAt(0)}5B${three ? '-3N' : ''}`;
    const fins = Math.max(3, Math.floor((w - 8) / 7));
    return `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="fin-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9aa0a6"/>
      <stop offset="0.5" stop-color="#e3e6e9"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
  </defs>
  <!-- 放熱器（アルミのフィン） -->
  <rect x="1" y="1" width="${w - 2}" height="${H - 2}" rx="2" fill="#b9bec4" stroke="#6c7278" stroke-width="0.8"/>
  ${Array.from({ length: fins }, (_, i) => `<rect x="${4 + ((w - 8) * i) / fins + 0.8}" y="34" width="${(w - 8) / fins - 1.6}" height="${H - 68}" fill="url(#fin-{{uid}})"/>`).join('')}
  <!-- 端子カバー（上: 電源側、下: 負荷側） -->
  <rect x="2" y="2" width="${w - 4}" height="30" rx="1.5" fill="#2b2d30"/>
  <rect x="2" y="${H - 32}" width="${w - 4}" height="30" rx="1.5" fill="#2b2d30"/>
  ${xs.map((x) => screwTerminal(x, TOP_Y, 5.2, '#111')).join('')}
  ${xs.map((x) => screwTerminal(x, BOT_Y, 5.2, '#111')).join('')}
  ${screwTerminal(inX, TOP_Y, 3.8, '#111')}
  ${screwTerminal(inX, BOT_Y, 3.8, '#111')}
  ${xs.map((x, i) => text(x, TOP_Y + 13, lineIds[i].split('/')[1], 4.2, '#eee')).join('')}
  ${xs.map((x, i) => text(x, BOT_Y - 8.5, loadIds[i].split('/')[1], 4.2, '#eee')).join('')}
  ${text(inX, TOP_Y + 13, 'A1+', 3.6, '#f0a0a0')}
  ${text(inX, BOT_Y - 8.5, 'A2−', 3.6, '#a0c0f0')}
  <!-- 前面の銘板と動作表示（黄） -->
  <rect x="${w / 2 - Math.min(20, w / 2 - 4)}" y="${H / 2 - 30}" width="${Math.min(40, w - 8)}" height="60" rx="2" fill="#2f3236" stroke="#111" stroke-width="0.6"/>
  ${text(w / 2, H / 2 - 20, 'OMRON', Math.min(5.4, (w - 10) / 6), '#eee')}
  ${text(w / 2, H / 2 - 11, model, Math.min(4.2, (w - 10) / (model.length * 0.6)), '#ddd', 'normal')}
  ${text(w / 2, H / 2 - 3, `${p.current}A`, 6, '#fff')}
  ${text(w / 2, H / 2 + 6, 'AC100-240V', Math.min(3.6, (w - 10) / 6.5), '#ccc', 'normal')}
  ${text(w / 2, H / 2 + 13, 'DC12-24V', Math.min(3.6, (w - 10) / 5.5), '#ccc', 'normal')}
  <circle cx="${w / 2}" cy="${H / 2 + 22}" r="2.6" fill="#ffd21e" stroke="#8a6d00" stroke-width="0.5"/>
`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const { xs, inX } = layout(widthOf(p));
    const phase = three ? ['R', 'S', 'T'] : [''];
    return [
      ...xs.map((x, i): TerminalDef => ({ id: lineIds[i], hint: three ? `一次 ${phase[i]}` : '電源側', note: '主回路の電源側（AC100〜240V）', x, y: TOP_Y, side: 'top', role: 'line' })),
      ...xs.map((x, i): TerminalDef => ({ id: loadIds[i], hint: three ? `負荷 ${phase[i]}` : '負荷側', note: '主回路の負荷側（ヒーターへ）', x, y: BOT_Y, side: 'bottom', role: 'load' })),
      { id: 'A1', label: 'A1(+)', hint: '入力 +', note: '入力 +（DC12〜24V。温度調節器の電圧出力・PLC の出力から）', x: inX, y: TOP_Y, side: 'top', role: 'input', accepts: { ...input, conductors: ['+'] } },
      { id: 'A2', label: 'A2(−)', hint: '入力 −', note: '入力 −', x: inX, y: BOT_Y, side: 'bottom', role: 'input', accepts: { ...input, conductors: ['-'] } },
    ];
  };

  const model = three ? 'G3PE-2□5B-3N DC12-24' : 'G3PE-2□5B DC12-24';
  return {
    type: three ? 'omron.g3pe-3n' : 'omron.g3pe',
    name: three ? 'ソリッドステート・コンタクタ（ヒーター用・三相）' : 'ソリッドステート・コンタクタ（ヒーター用・単相）',
    model,
    modelOf: (p) => `G3PE-2${String(p.current).charAt(0)}5B${three ? '-3N' : ''} DC12-24`,
    maker: 'オムロン',
    category: 'contactor',
    description:
      `オムロンのヒーター用ソリッドステート・コンタクタ G3PE（${three ? '三相、素子数 3' : '単相'}、放熱器一体形、ゼロクロス）。入力 A1(+)・A2(−) に DC12〜24V（使用 DC9.6〜30V）を加えると、` +
      `主回路（${three ? '1/L1-2/T1・3/L2-4/T2・5/L3-6/T3' : '1/L1-2/T1'}）が導通する。定格負荷電圧 AC100〜240V、負荷電流（40℃）はパラメータで選ぶ。温度調節器の電圧出力・PLC の出力でヒーターを開閉する。直流の負荷には使えない。`,
    estimated: `外形（幅）と端子の並び・記号（主回路 1/L1→2/T1 など、入力 A1(+)・A2(−)）${three ? '' : '、入力電流（7mA）'}は推定。`,
    labelPrefix: 'SSR',
    width: W0,
    height: H,
    size: (p) => ({ width: widthOf(p), height: H }),
    svg,
    terminals,
    links: lineIds.map((l, i) => ({ from: l, to: loadIds[i], directed: true, switch: 'NO' as const, system: 'AC' as const, ratedCurrent: { param: 'current' } })),
    params: [
      {
        key: 'current',
        label: '定格負荷電流',
        unit: 'A',
        options: CURRENTS.map((v) => ({ value: v, label: `${v}A（G3PE-2${String(v).charAt(0)}5B${three ? '-3N' : ''}）` })),
        default: 25,
      },
    ],
    loadCurrent: three ? 0.01 : 0.007,
  };
}
