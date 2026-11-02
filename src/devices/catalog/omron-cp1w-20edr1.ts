import { CP_BUS, CP_PITCH, cpBlock, cpBlockSvg, cpDefs, cpHead, cpIo, omronLogo, text, type CpSlot } from '../omron/cp-parts';
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';

/**
 * オムロン SYSMAC CP シリーズ 増設 I/O ユニット CP1W-20EDR1（DC 入力 12 点・リレー出力 8 点）。
 * 外形 W86 × H90 × D50 mm（1mm ≒ 2px）。本体はライトグレー、上に入力・下に出力のネジ端子台（M3、2 段千鳥）。
 * CP2E（N・S タイプ）・CP1E・CP1L の CPU ユニットの右に増設ケーブルで連結する。
 *
 * 入出力番号（CIO）: 入力 1 チャネル（ビット 00〜11）、出力 1 チャネル（ビット 00〜07）を占有する。
 * CP2E-N30 の 1 台目なら入力 2.00〜2.11・出力 102.00〜102.07、2 台目は 3 チャネル・103 チャネル。
 * 端子ID はユニット内の相対番号（IN00〜IN11・OUT00〜OUT07）のままで、装着で決まる先頭番号を加えた番号をラベルにする
 * （未装着なら 1 台目の位置 CIO 2 / 102 とみなす）。
 *
 * 端子台の配列とコモンの分け方（出力は 4 点 1 コモン × 2）は推定。
 */

const W = 172;
const H = 180;
const X0 = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const I = (b: number): [string, string] => [`IN${pad(b)}`, pad(b)];
const O = (b: number): [string, string] => [`OUT${pad(b)}`, pad(b)];
const NC: [string, string] = ['', 'NC'];

const TOP = cpBlock({
  x0: X0,
  outerY: 11,
  innerY: 27,
  side: 'top',
  outer: [['COM', 'COM'], I(1), I(3), I(5), I(7), I(9), I(11), NC],
  inner: [I(0), I(2), I(4), I(6), I(8), I(10), NC, NC],
});
const BOTTOM = cpBlock({
  x0: X0,
  outerY: 169,
  innerY: 153,
  side: 'bottom',
  outer: [['COM0', 'COM'], O(1), O(3), ['COM1', 'COM'], O(5), O(7), NC, NC],
  inner: [O(0), O(2), NC, O(4), O(6), NC, NC, NC],
});
const SLOTS: CpSlot[] = [...TOP, ...BOTTOM];

const COMMONS: Record<string, string[]> = {
  COM0: ['OUT00', 'OUT01', 'OUT02', 'OUT03'],
  COM1: ['OUT04', 'OUT05', 'OUT06', 'OUT07'],
};

const BW = 7 * CP_PITCH + CP_PITCH / 2 + 18;

const svg = `
  ${cpDefs()}
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3" fill="url(#cpbody-{{uid}})" stroke="#7c8085" stroke-width="1"/>
  ${cpBlockSvg(TOP, { x: X0 - 9, y: 1.5, w: BW, h: 34, strip: 36, outerY: 11, innerY: 27, printOuter: 40.4, printInner: 46 })}
  ${cpBlockSvg(BOTTOM, { x: X0 - 9, y: 144.5, w: BW, h: 34, strip: 132, outerY: 169, innerY: 153, printOuter: 142, printInner: 136.6 })}
  <rect x="${X0 - 9}" y="52" width="${BW}" height="76" rx="2" fill="url(#cppanel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${omronLogo(X0 - 4, 66, 8)}
  ${text(X0 - 4, 74, 'CP1W-20EDR1', 3.6, '#f2f3f4', 'start')}
  ${text(X0 + 80, 64, 'IN', 3, '#f2f3f4', 'start')}
  ${Array.from({ length: 12 }, (_, i) => `<circle cx="${X0 + 28 + i * 6.2}" cy="${84}" r="1.3" fill="#3b4a36"/>${text(X0 + 28 + i * 6.2, 89, pad(i), 2, '#d5d7da', 'middle', 'normal')}`).join('')}
  ${text(X0 + 80, 104, 'OUT', 3, '#f2f3f4', 'start')}
  ${Array.from({ length: 8 }, (_, i) => `<circle cx="${X0 + 28 + i * 6.2}" cy="${112}" r="1.3" fill="#3b4a36"/>${text(X0 + 28 + i * 6.2, 117, pad(i), 2, '#d5d7da', 'middle', 'normal')}`).join('')}
  ${text(X0 - 4, 84.6, 'CH m', 2.8, '#d5d7da', 'start', 'normal')}
  ${text(X0 - 4, 112.6, 'CH n', 2.8, '#d5d7da', 'start', 'normal')}
  <!-- 増設ケーブル（左側面）と次の増設コネクタ（右側面） -->
  <rect x="0" y="80" width="5" height="22" rx="1" fill="#a7abaf" stroke="#7c8085" stroke-width="0.5"/>
  <rect x="${W - 12}" y="60" width="8" height="60" rx="2" fill="#c3c5c1" stroke="#9fa3a7" stroke-width="0.6"/>
`;

const IN_COM: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4, conductors: ['+', '-'] };
/** リレー出力のコモン（AC250V / DC24V 以下。最小開閉負荷は DC5V） */
const RELAY_COM: AcceptSpec[] = [
  { system: 'AC', minVoltage: 5, maxVoltage: 250 },
  { system: 'DC', minVoltage: 5, maxVoltage: 24 },
];

const terminals = (p: ParamValues): TerminalDef[] =>
  SLOTS.filter((s) => s.id).map((s): TerminalDef => {
    const base = { id: s.id, x: s.x, y: s.y, side: s.side, optional: true };
    if (s.id === 'COM') return { ...base, label: 'COM', note: '入力コモン（+/− 共用。推定の位置）', role: 'input', accepts: IN_COM };
    if (s.id.startsWith('COM')) return { ...base, label: 'COM', note: `出力コモン（${COMMONS[s.id].map((x) => `ユニット内 ${x.slice(3)}`).join('・')}。推定のグループ）`, hint: s.id, role: 'input', accepts: RELAY_COM };
    if (s.id.startsWith('IN')) {
      const bit = Number(s.id.slice(2));
      return { ...base, label: cpIo('in', cpHead(p, 'in'), bit), note: `ユニット内 ${s.id}（推定の位置）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'COM' } };
    }
    const bit = Number(s.id.slice(3));
    return { ...base, label: cpIo('out', cpHead(p, 'out'), bit), note: `ユニット内 ${s.id}（リレー接点。推定の位置）`, role: 'signal', signal: { dir: 'out', kind: 'contact' } };
  });

const links: InternalLink[] = Object.entries(COMMONS).flatMap(([com, outs]) => outs.map((o) => ({ from: o, to: com, switch: 'output' as const, ratedCurrent: 2 })));
const commonLimits: CommonLimit[] = Object.keys(COMMONS).map((common) => ({ common, current: 4 }));

const def: DeviceDefinition = {
  type: 'omron.cp1w-20edr1',
  name: 'PLC 増設入出力ユニット（リレー出力）',
  model: 'CP1W-20EDR1',
  maker: 'オムロン',
  category: 'plc',
  description:
    'オムロン SYSMAC CP シリーズの増設 I/O ユニット CP1W-20EDR1（DC 入力 12 点・リレー出力 8 点、ネジ端子台 M3、外形 W86 × H90mm）。CP2E（N・S タイプ）・CP1E・CP1L の CPU ユニットの右に増設ケーブルで連結する（電源は CPU ユニットから供給）。入力 DC24V（COM は +/− 共用）、出力はリレー 2A/点（AC250V / DC24V 以下）。入力 1 チャネル・出力 1 チャネルを占有し、CP2E-N30 の 1 台目なら入力 2.00〜2.11・出力 102.00〜102.07。端子台の配列、出力のコモンの分け方（4 点 1 コモン × 2、4A/コモン）は推定。',
  estimated: '端子台の配列、出力のコモンの分け方とコモンあたりの電流',
  labelPrefix: 'EXP',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  commonLimits,
  bus: { kind: CP_BUS, io: { inputs: 12, outputs: 8, format: 'omron' } },
};

export default def;
