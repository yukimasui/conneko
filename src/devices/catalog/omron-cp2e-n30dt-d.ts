import { CP_BUS, CP_PITCH, cpBlock, cpBlockSvg, cpDefs, omronLogo, text, type CpSlot } from '../omron/cp-parts';
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, TerminalDef } from '../types';

/**
 * オムロン SYSMAC CP2E-N30DT-D（CP2E の N タイプ、DC24V 電源、DC 入力 18 点・トランジスタ出力（シンク）12 点）。
 * 外形 W130 × H90 × D80 mm（1mm ≒ 2px）。本体はライトグレー、上に入力の端子台、下に出力の端子台（M3、2 段千鳥）、
 * 中央に状態 LED・入出力表示 LED・Ethernet ポート（2 ポート）。
 *
 * 入出力番号（CIO、チャネル.ビット）: 入力 0.00〜0.11・1.00〜1.05、出力 100.00〜100.07・101.00〜101.03。
 * 右側に CP1W の増設 I/O ユニットを 3 台まで連結でき、入力は CIO 2・出力は CIO 102 から 1 台ごとに続く（バスの親。numbering の start）。
 *
 * 端子台の配列（推定。オムロンの資料で配列図を確かめられなかったため、CP1E の N30 の並びを参考にした）:
 *   入力 外側: + ⏚ 01 03 05 07 09 11 01 03 05 NC / 内側: − COM 00 02 04 06 08 10 00 02 04 NC（0 チャネル、1 チャネルの順）
 *   出力 内側: V+ 00 01 02 COM 04 06 COM 00 02 NC NC / 外側: V− COM 03 05 07 01 03 NC …（100 チャネル、101 チャネルの順）
 * 出力のコモン COM（V−）は内部で V− につながる（データシートの注記）。V+・V− は 100.00・100.01（パルス出力）用の外部電源。
 */

const W = 260;
const H = 180;
const X0 = 46;

const IN = (ch: number, bit: number): [string, string] => [`IN${ch}.${String(bit).padStart(2, '0')}`, String(bit).padStart(2, '0')];
const OUT = (ch: number, bit: number): [string, string] => [`OUT${ch}.${String(bit).padStart(2, '0')}`, String(bit).padStart(2, '0')];
const NC: [string, string] = ['', 'NC'];

const TOP = cpBlock({
  x0: X0,
  outerY: 11,
  innerY: 27,
  side: 'top',
  outer: [['+', '+'], ['FG', '⏚'], IN(0, 1), IN(0, 3), IN(0, 5), IN(0, 7), IN(0, 9), IN(0, 11), IN(1, 1), IN(1, 3), IN(1, 5), NC],
  inner: [['-', '−'], ['COM', 'COM'], IN(0, 0), IN(0, 2), IN(0, 4), IN(0, 6), IN(0, 8), IN(0, 10), IN(1, 0), IN(1, 2), IN(1, 4), NC],
});
const BOTTOM = cpBlock({
  x0: X0,
  outerY: 169,
  innerY: 153,
  side: 'bottom',
  outer: [['V-', 'V−'], ['COM0', 'COM'], OUT(100, 3), OUT(100, 5), OUT(100, 7), OUT(101, 1), OUT(101, 3), NC, NC, NC, NC, NC],
  inner: [['V+', 'V+'], OUT(100, 0), OUT(100, 1), OUT(100, 2), ['COM1', 'COM'], OUT(100, 4), OUT(100, 6), ['COM2', 'COM'], OUT(101, 0), OUT(101, 2), NC, NC],
});
const SLOTS: CpSlot[] = [...TOP, ...BOTTOM];

/** 出力のコモン（推定のグループ） */
const COMMONS: Record<string, string[]> = {
  COM0: ['OUT100.00', 'OUT100.01', 'OUT100.02', 'OUT100.03'],
  COM1: ['OUT100.04', 'OUT100.05', 'OUT100.06', 'OUT100.07'],
  COM2: ['OUT101.00', 'OUT101.01', 'OUT101.02', 'OUT101.03'],
};

const ETH1 = { x: 64, y: 98 };
const ETH2 = { x: 92, y: 98 };
const BW = 11 * CP_PITCH + CP_PITCH / 2 + 18;

const ioLeds = (title: string, y: number, chs: { ch: number; n: number }[]) => `
  ${text(164, y + 1.4, title, 3.2, '#f2f3f4', 'start')}
  ${chs
    .map((c, r) =>
      Array.from({ length: c.n }, (_, i) => {
        const x = 178 + i * 5.2;
        return `<circle cx="${x.toFixed(1)}" cy="${y + r * 9}" r="1.3" fill="#3b4a36"/>${text(x, y + r * 9 + 4.6, String(i).padStart(2, '0'), 2, '#d5d7da', 'middle', 'normal')}`;
      }).join(''),
    )
    .join('')}`;

const svg = `
  ${cpDefs()}
  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3" fill="url(#cpbody-{{uid}})" stroke="#7c8085" stroke-width="1"/>
  <rect x="${W - 14}" y="44" width="10" height="92" rx="2" fill="#c3c5c1" stroke="#9fa3a7" stroke-width="0.6"/>
  ${text(20, 50, 'CP2E', 6, '#3a3d42')}
  ${text(20, 57, 'N30DT-D', 3.4, '#3a3d42')}

  <!-- 上側端子台（電源・入力） -->
  ${cpBlockSvg(TOP, { x: X0 - 9, y: 1.5, w: BW, h: 34, strip: 36, outerY: 11, innerY: 27, printOuter: 40.4, printInner: 46 })}
  <!-- 下側端子台（出力） -->
  ${cpBlockSvg(BOTTOM, { x: X0 - 9, y: 144.5, w: BW, h: 34, strip: 132, outerY: 169, innerY: 153, printOuter: 142, printInner: 136.6 })}

  <!-- 中央パネル -->
  <rect x="40" y="50" width="${W - 58}" height="80" rx="2" fill="url(#cppanel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${omronLogo(46, 64, 9)}
  ${text(46, 72, 'SYSMAC CP2E', 3.6, '#d5d7da', 'start', 'normal')}
  ${[
    { t: 'POWER', c: 'g' },
    { t: 'RUN', c: 'g' },
    { t: 'ERR/ALM' },
    { t: 'BKUP' },
  ]
    .map((l, i) => `<rect x="${118}" y="${56 + i * 6}" width="4.4" height="2.6" rx="0.5" fill="${l.c ? 'url(#cpledg-{{uid}})' : '#3b3d40'}"/>${text(124, 58.6 + i * 6, l.t, 2.8, '#f2f3f4', 'start', 'normal')}`)
    .join('')}
  ${ioLeds('IN', 58, [
    { ch: 0, n: 12 },
    { ch: 1, n: 6 },
  ])}
  ${ioLeds('OUT', 98, [
    { ch: 100, n: 8 },
    { ch: 101, n: 4 },
  ])}
  ${[ETH1, ETH2]
    .map(
      (e, i) => `
  <rect x="${e.x - 12.5}" y="${e.y - 11.5}" width="25" height="23" rx="1" fill="#b9bdc2" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${e.x - 11}" y="${e.y - 10}" width="22" height="20" fill="#0b0c0d"/>
  <rect x="${e.x - 6}" y="${e.y + 6}" width="12" height="4" fill="#2a2c2f"/>
  <path d="M${e.x - 7} ${e.y - 5} H${e.x + 7}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>
  ${text(e.x, e.y + 18, `PORT${i + 1}`, 2.8, '#f2f3f4')}`,
    )
    .join('')}
  ${text(46, 84, 'Ethernet', 3, '#d5d7da', 'start', 'normal')}
`;

const POWER: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4 };
const IN_COM: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4, conductors: ['+', '-'] };

const terminals: TerminalDef[] = SLOTS.filter((s) => s.id).map((s): TerminalDef => {
  const base = { id: s.id, x: s.x, y: s.y, side: s.side };
  if (s.id === '+' || s.id === '-') return { ...base, label: s.id === '+' ? '+' : '−', note: `電源 DC24V ${s.id === '+' ? '+' : '0V'}（推定の位置）`, role: 'input', accepts: { ...POWER, conductors: [s.id as '+' | '-'] } };
  if (s.id === 'FG') return { ...base, label: '⏚', note: '機能接地（推定の位置）', role: 'ground', optional: true };
  if (s.id === 'COM') return { ...base, label: 'COM', note: '入力コモン（+/− 共用。推定の位置）', role: 'input', accepts: IN_COM, optional: true };
  if (s.id === 'V+') return { ...base, label: 'V+', note: '100.00・100.01（パルス出力）用の外部電源 DC24V +（推定の位置）', role: 'input', accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4, conductors: ['+'] }, optional: true };
  if (s.id === 'V-') return { ...base, label: 'V−', note: '出力の外部電源 0V（COM と内部で共通。推定の位置）', role: 'input', accepts: { system: 'DC', minVoltage: 4.5, maxVoltage: 30, conductors: ['-'] }, optional: true };
  if (s.id.startsWith('COM')) {
    return { ...base, label: 'COM', note: `出力コモン COM(V−)（${COMMONS[s.id].map((x) => x.slice(3)).join('・')}。推定のグループ）`, hint: `COM(V−)`, role: 'input', accepts: { system: 'DC', minVoltage: 4.5, maxVoltage: 30, conductors: ['-'] }, optional: true };
  }
  if (s.id.startsWith('IN')) {
    return { ...base, label: s.id.slice(2), note: `入力 CIO ${s.id.slice(2)}（推定の位置）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'COM' }, optional: true };
  }
  return { ...base, label: s.id.slice(3), note: `トランジスタ出力（シンク）CIO ${s.id.slice(3)}（推定の位置）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true };
});

const eth = (id: string, at: { x: number; y: number }): TerminalDef => ({
  id,
  label: `Ethernet ${id} (RJ45)`,
  x: at.x,
  y: at.y,
  side: 'left',
  role: 'connector',
  connector: { kind: 'RJ45', pins: 0, width: 20, length: 22, facing: 'front', protocols: ['ethernet', 'modbus-tcp'] },
  optional: true,
});

const links: InternalLink[] = [
  // COM（V−）は内部で V− につながる
  ...Object.keys(COMMONS).map((c) => ({ from: c, to: 'V-' })),
  ...Object.entries(COMMONS).flatMap(([com, outs]) => outs.map((o) => ({ from: o, to: com, switch: 'output' as const, ratedCurrent: 0.3 }))),
];
const commonLimits: CommonLimit[] = Object.entries(COMMONS).map(([com, outs]) => ({ outputs: outs, current: 0.9, label: `${com}（${outs[0].slice(3)}〜${outs[outs.length - 1].slice(3)}）` }));

const def: DeviceDefinition = {
  type: 'omron.cp2e-n30dt-d',
  name: 'PLC CPUユニット（トランジスタ出力 NPN）',
  model: 'CP2E-N30DT-D',
  maker: 'オムロン',
  category: 'plc',
  description:
    'オムロン SYSMAC CP2E の N タイプ CPU ユニット CP2E-N30DT-D（DC24V 電源、DC 入力 18 点・トランジスタ出力（シンク）12 点、ネジ端子台 M3、外形 W130 × H90 × D80mm）。電源 DC24V（20.4〜26.4V）。入力 0.00〜0.11・1.00〜1.05（DC24V、COM は +/− 共用）。出力 100.00〜100.07・101.00〜101.03: トランジスタ（シンク）0.3A/点、0.9A/コモン、COM(V−) は内部で V− に共通。100.00・100.01 はパルス出力に使え、V+・V− に外部電源を入れる。Ethernet ポート（Modbus/TCP・FINS など）。右側に CP1W の増設 I/O ユニットを 3 台まで連結でき、入力は CIO 2・出力は CIO 102 から続く。端子台の配列、出力のコモンの分け方（4 点ずつ）、Ethernet のポート数（2）、消費電流（約 0.55A）は推定。',
  estimated: '端子台の配列とコモンの分け方、Ethernet のポート数、消費電流',
  labelPrefix: 'PLC',
  width: W,
  height: H,
  svg,
  terminals: [...terminals, eth('PORT1', ETH1), eth('PORT2', ETH2)],
  links,
  commonLimits,
  bus: {
    kind: CP_BUS,
    // 入力は CIO 0・1、出力は CIO 100・101 を本体が使い、増設 I/O は入力 CIO 2・出力 CIO 102 から 1 台ごとに続く
    host: { slots: 3, numbering: { mode: 'separate', unit: 16, start: { input: 2 * 16, output: 102 * 16 } } },
    io: { inputs: 18, outputs: 12, format: 'omron' },
  },
  loadCurrent: 0.55,
};

export default def;
