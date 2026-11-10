import type { AcceptSpec, DeviceDefinition, ParamValues, SignalKind, TerminalDef } from '../types';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

/**
 * エム・システム技研（エムジー） 絶縁 2 出力小形信号変換器 みにまる W2 シリーズ 直流入力変換器 W2VS。
 * 直流の電圧・電流の信号を受けて、絶縁した 2 つの直流信号に変換する（4-20mA ↔ 0-10V の変換、信号の分配・絶縁に使う）。
 * 形式 W2VS-□□□-電源: 入力・第 1 出力・第 2 出力の記号（A = 4〜20mA、4 = 0〜10V、6 = 1〜5V）と供給電源（M2 = AC100〜240V、R = DC24V）。
 *
 * 出典: エムジー W2VS 仕様書 NS-5518 と販売店の仕様表（コンパクト形プラグイン構造、M3 ねじ端子接続、入力・第 1 出力・第 2 出力・電源の間を絶縁、
 *   W2VS-4AA-M2: 入力 0〜10V DC（入力抵抗 1MΩ 以上）・出力 4〜20mA DC（負荷抵抗 750Ω 以下）・電源 AC100〜240V、W2VS-AAA-M2: 入力 4〜20mA DC（受信抵抗 250Ω））。
 * 推定: 端子番号の割付け（みにまるシリーズの並びにならい、1・2 = 第 1 出力 +・−、3・4 = 第 2 出力 +・−、5・6 = 入力 +・−、7・8 = 電源 U(+)・V(−) とした）、
 *   記号 6（1〜5V）、外形（幅 30 × 高さ 85mm）、消費電流（AC 約 4VA・DC 約 1.6W）。
 */

const W = 60;
const H = 170;
const TOP_Y = 15;
const BOT_Y = H - 15;
const COLS = [15, 45];
const ROW2 = 36;

type Code = 'A' | '4' | '6';
const CODES: Record<Code, { label: string; kind: SignalKind; range: string }> = {
  A: { label: '4〜20mA DC', kind: 'analog-i', range: '4-20mA' },
  '4': { label: '0〜10V DC', kind: 'analog-v', range: '0-10V' },
  '6': { label: '1〜5V DC', kind: 'analog-v', range: '1-5V' },
};
const codeOptions = (Object.keys(CODES) as Code[]).map((c) => ({ value: c, label: `${c}: ${CODES[c].label}` }));
const code = (v: unknown): Code => (String(v) in CODES ? (String(v) as Code) : 'A');

const POWER: Record<string, { label: string; accepts: (pol: '+' | '-') => AcceptSpec; current: number }> = {
  M2: { label: 'AC100〜240V', accepts: () => ({ system: 'AC', minVoltage: 85, maxVoltage: 264 }), current: 0.04 },
  R: { label: 'DC24V', accepts: (pol) => ({ system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: [pol] }), current: 0.067 },
};

const svg = (p: ParamValues) => {
  const i = CODES[code(p.input)];
  const o1 = CODES[code(p.out1)];
  const o2 = CODES[code(p.out2)];
  const pw = POWER[String(p.power)] ?? POWER.M2;
  const model = `W2VS-${code(p.input)}${code(p.out1)}${code(p.out2)}-${String(p.power)}`;
  const t = (n: number, x: number, y: number) => `${screw(x, y, 4.6, '#26282b')}${text(x + (x < W / 2 ? 9 : -9), y + 1.6, String(n), 4.4, '#ddd', 'bold', x < W / 2 ? 'start' : 'end')}`;
  return `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="wbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b6b9bd"/>
      <stop offset="0.15" stop-color="#e4e6e8"/>
      <stop offset="0.85" stop-color="#e0e2e4"/>
      <stop offset="1" stop-color="#aeb1b5"/>
    </linearGradient>
  </defs>
  <!-- ソケット（上下の端子台） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2.5" fill="#3a3d41" stroke="#1d1f22" stroke-width="0.8"/>
  ${t(5, COLS[0], TOP_Y)}${t(6, COLS[1], TOP_Y)}${t(7, COLS[0], ROW2)}${t(8, COLS[1], ROW2)}
  ${t(1, COLS[0], BOT_Y - ROW2 + TOP_Y)}${t(2, COLS[1], BOT_Y - ROW2 + TOP_Y)}${t(3, COLS[0], BOT_Y)}${t(4, COLS[1], BOT_Y)}
  <!-- 本体（プラグイン） -->
  <rect x="4" y="50" width="${W - 8}" height="${H - 100}" rx="2" fill="url(#wbody-{{uid}})" stroke="#7d8186" stroke-width="0.8"/>
  ${text(W / 2, 60, 'M-SYSTEM', 4.4, '#1a3d7a')}
  ${text(W / 2, 69, 'W2VS', 7, '#1b1d20')}
  ${text(W / 2, 76, model, Math.min(3.6, 50 / (model.length * 0.6)), '#444', 'normal')}
  <circle cx="12" cy="86" r="2" fill="#2fbf4f" stroke="#145a24" stroke-width="0.4"/>
  ${text(17, 87.3, pw.label, 3.4, '#333', 'normal', 'start')}
  <rect x="9" y="96" width="${W - 18}" height="22" rx="1" fill="#fbfbfa" stroke="#999" stroke-width="0.5"/>
  ${text(12, 102, `IN  ${i.range}`, 3.4, '#222', 'normal', 'start')}
  ${text(12, 108, `OUT1 ${o1.range}`, 3.4, '#222', 'normal', 'start')}
  ${text(12, 114, `OUT2 ${o2.range}`, 3.4, '#222', 'normal', 'start')}
`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const i = CODES[code(p.input)];
  const o1 = CODES[code(p.out1)];
  const o2 = CODES[code(p.out2)];
  const pw = POWER[String(p.power)] ?? POWER.M2;
  const loY = BOT_Y - ROW2 + TOP_Y;
  return [
    { id: '5', label: '5', hint: '入力 +', note: `入力 +（${i.label}${i.kind === 'analog-i' ? '、受信抵抗 250Ω' : '、入力抵抗 1MΩ 以上'}）`, x: COLS[0], y: TOP_Y, side: 'top', role: 'signal', signal: { dir: 'in', kind: i.kind, ref: '6' } },
    { id: '6', label: '6', hint: '入力 −', note: '入力 −（入力信号の基準）', x: COLS[1], y: TOP_Y, side: 'top', role: 'signal' },
    { id: '7', label: '7', hint: '電源 U(+)', note: `供給電源 U(+)（${pw.label}）`, x: COLS[0], y: ROW2, side: 'left', role: 'input', accepts: pw.accepts('+') },
    { id: '8', label: '8', hint: '電源 V(−)', note: `供給電源 V(−)（${pw.label}）`, x: COLS[1], y: ROW2, side: 'right', role: 'input', accepts: pw.accepts('-') },
    { id: '1', label: '1', hint: '出力1 +', note: `第 1 出力 +（${o1.label}${o1.kind === 'analog-i' ? '、負荷抵抗 750Ω 以下' : ''}）`, x: COLS[0], y: loY, side: 'left', role: 'signal', optional: true, signal: { dir: 'out', kind: o1.kind, ref: '2' } },
    { id: '2', label: '2', hint: '出力1 −', note: '第 1 出力 −（出力信号の基準）', x: COLS[1], y: loY, side: 'right', role: 'signal', optional: true },
    { id: '3', label: '3', hint: '出力2 +', note: `第 2 出力 +（${o2.label}）`, x: COLS[0], y: BOT_Y, side: 'bottom', role: 'signal', optional: true, signal: { dir: 'out', kind: o2.kind, ref: '4' } },
    { id: '4', label: '4', hint: '出力2 −', note: '第 2 出力 −（出力信号の基準）', x: COLS[1], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
  ];
};

const def: DeviceDefinition = {
  type: 'msystem.w2vs',
  name: '信号変換器',
  model: 'W2VS',
  modelOf: (p) => `W2VS-${code(p.input)}${code(p.out1)}${code(p.out2)}-${String(p.power)}`,
  maker: 'エム・システム技研',
  category: 'control',
  description:
    'エム・システム技研（エムジー）の直流入力変換器 W2VS（みにまる W2 シリーズ、絶縁 2 出力、プラグイン形）。直流の電圧・電流の入力（5(+)・6(−)）を、' +
    '入力・出力・電源の間を絶縁した 2 つの直流出力（1(+)・2(−)、3(+)・4(−)）に変換する。4〜20mA と 0〜10V の変換、1 つの信号を 2 か所へ分ける用途に使う。供給電源は 7・8。',
  estimated:
    '端子番号の割付け（1・2 = 第 1 出力、3・4 = 第 2 出力、5・6 = 入力、7・8 = 電源。みにまるシリーズの並びにならった）、記号 6（1〜5V）、外形（幅 30 × 高さ 85mm）、消費電流（AC 約 4VA・DC 約 1.6W）は推定。',
  labelPrefix: 'SC',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    { key: 'input', label: '入力', options: codeOptions, default: '4' },
    { key: 'out1', label: '第 1 出力', options: codeOptions, default: 'A' },
    { key: 'out2', label: '第 2 出力', options: codeOptions, default: 'A' },
    {
      key: 'power',
      label: '供給電源',
      options: [
        { value: 'M2', label: 'M2: AC100〜240V' },
        { value: 'R', label: 'R: DC24V' },
      ],
      default: 'R',
    },
  ],
  loadCurrent: (p) => (POWER[String(p.power)] ?? POWER.M2).current,
  distinctGroups: [['7', '8']],
};

export default def;
