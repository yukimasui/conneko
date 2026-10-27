/**
 * オムロン NX1P2 CPU ユニット（マシンオートメーションコントローラ NX1P、内蔵 I/O 付き、DC24V 電源）の機器定義の生成。
 *
 * 外形 W154（40 点タイプ）/ W130（24 点タイプ）× H100 × D71 mm（エンドカバー込み）。図はエンドカバー（約 12mm）を除いた
 * 本体だけを描く（1mm ≒ 2px）。エンドカバーは連結した NX ユニットの右端に付く。
 *
 * 正面の配置（カタログ「各部の名称」）:
 *   左上に SD メモリカードのカバー、左下に内蔵 EtherNet/IP ポート（ポート 1）と内蔵 EtherCAT ポート（ポート 2）、
 *   右側の上に入力端子台（ユニット電源・機能接地・入力）と入力表示、下に出力端子台と出力表示、中央にオプションボードのスロット。
 *   右側面の NX バスコネクタで NX ユニットを最大 8 台連結する（増設 I/O 電源ユニットなどのシステムユニットを含む）。
 *
 * 端子配列（NX1P カタログ P116「入力端子台」「出力端子台」の配列図。上段・下段の 2 段、左から）:
 *   NX1P2-1□40DT / DT1 入力: 上段 + − COM 01 03 … 21 ⏚、下段 + − 00 02 … 22 23
 *   NX1P2-9024DT 入力:       上段 + − COM 01 03 … 13 ⏚、下段 + − 00 02 … 12 NC NC
 *   NX1P2-1□40DT 出力:   上段 NC NC 00 02 04 06 NC 08 10 12 14、下段 C0(0V) 01 03 05 07 C1(0V) 09 11 13 15 NC
 *   NX1P2-1□40DT1 出力:  上段 NC C0(+V) 00 02 04 06 C1(+V) 08 10 12 14、下段 0V0 01 03 05 07 0V1 09 11 13 15 NC
 *   NX1P2-9024DT 出力:   上段 NC NC 00 02 04 06 08 NC NC NC NC、下段 C0(0V) 01 03 05 07 09 NC NC NC NC NC
 * ⏚（機能接地）は配列図の文字に出ないため、上段の右端（下段より 1 つ少ない位置）と推定した。
 *
 * 出典: オムロン NX1P カタログ（Cat. No. P116-E1、Machine Automation Controller NX1P Compact package-type）
 *       の Ordering Information・Electrical and Mechanical Specifications・Input/Output Terminal Block・Part Names and Functions
 */
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, ParamDef, ParamValues, TerminalDef } from '../types';
import { NX_BUS, UNIT_POWER, blankHole, led, nxDefs, omronLogo, pushIn, r2, rj45, text } from './nx-parts';

export type Nx1p2Kind = '40DT' | '40DT1' | '9024DT';

const H = 200;
/** 端子のピッチ（6mm）と、端子台の右端の余白（NX バスコネクタ側） */
const P = 12;
const RIGHT = 18;
/** 入力端子台の上段・下段の差込口の Y 座標 */
const IN_Y = [14, 34];
/** 出力端子台の上段・下段 */
const OUT_Y = [166, 186];
/** Ethernet ポート（正面に差す RJ-45） */
const PORTS = [
  { id: 'PORT1', x: 25, title: 'PORT1', sub: 'EtherNet/IP', protocols: ['ethernet', 'ethernet-ip'] },
  { id: 'PORT2', x: 63, title: 'PORT2', sub: 'EtherCAT', protocols: ['ethercat'] },
];
const PORT_Y = 176;

const pad = (n: number) => String(n).padStart(2, '0');
const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const ins = (ns: number[]) => ns.map((n) => `IN${pad(n)}`);
const outs = (ns: number[]) => ns.map((n) => `OUT${pad(n)}`);

interface Layout {
  /** 入力端子台・出力端子台の上段・下段（'' は NC） */
  inTop: string[];
  inBottom: string[];
  outTop: string[];
  outBottom: string[];
  /** 出力のコモン → 出力点 */
  commons: Record<string, string[]>;
  inputs: number;
  outputs: number;
}

const LAYOUTS: Record<Nx1p2Kind, Layout> = {
  '40DT': {
    inTop: ['+', '-', 'COM', ...ins(range(1, 21, 2)), 'FG'],
    inBottom: ['+2', '-2', ...ins(range(0, 22, 2)), 'IN23'],
    outTop: ['', '', ...outs([0, 2, 4, 6]), '', ...outs([8, 10, 12, 14])],
    outBottom: ['C0', ...outs([1, 3, 5, 7]), 'C1', ...outs([9, 11, 13, 15]), ''],
    commons: { C0: outs(range(0, 7)), C1: outs(range(8, 15)) },
    inputs: 24,
    outputs: 16,
  },
  '40DT1': {
    inTop: ['+', '-', 'COM', ...ins(range(1, 21, 2)), 'FG'],
    inBottom: ['+2', '-2', ...ins(range(0, 22, 2)), 'IN23'],
    outTop: ['', 'C0', ...outs([0, 2, 4, 6]), 'C1', ...outs([8, 10, 12, 14])],
    outBottom: ['0V0', ...outs([1, 3, 5, 7]), '0V1', ...outs([9, 11, 13, 15]), ''],
    commons: { C0: outs(range(0, 7)), C1: outs(range(8, 15)) },
    inputs: 24,
    outputs: 16,
  },
  '9024DT': {
    inTop: ['+', '-', 'COM', ...ins(range(1, 13, 2)), 'FG'],
    inBottom: ['+2', '-2', ...ins(range(0, 12, 2)), '', ''],
    outTop: ['', '', ...outs([0, 2, 4, 6, 8]), '', '', '', ''],
    outBottom: ['C0', ...outs([1, 3, 5, 7, 9]), '', '', '', '', ''],
    commons: { C0: outs(range(0, 9)) },
    inputs: 14,
    outputs: 10,
  },
};

/** 端子台の印字 */
function printOf(id: string, kind: Nx1p2Kind): string {
  if (id === '') return 'NC';
  if (id === '+' || id === '+2') return '+';
  if (id === '-' || id === '-2') return '−';
  if (id === 'FG') return '⏚';
  if (/^(IN|OUT)\d+$/.test(id)) return id.replace(/^(IN|OUT)/, '');
  if (/^C\d$/.test(id)) return `${id}${kind === '40DT1' ? '(+V)' : '(0V)'}`;
  return id;
}

/** NX1P2 の機器定義を作る */
export function buildNx1p2(kind: Nx1p2Kind): DeviceDefinition {
  const L = LAYOUTS[kind];
  const forty = kind !== '9024DT';
  const pnp = kind === '40DT1';
  /** 本体の幅（エンドカバーを除く。40 点タイプ 142mm、24 点タイプ 118mm） */
  const W = forty ? 284 : 236;
  const nIn = L.inTop.length;
  const nOut = L.outTop.length;
  const colX = (n: number, i: number) => W - RIGHT - (n - 1 - i) * P;
  const inX = (i: number) => colX(nIn, i);
  // 出力端子台は入力端子台と左端をそろえる
  const outX = (i: number) => inX(0) + i * P;

  const engineParam: ParamDef = {
    key: 'engine',
    label: '型式（制御軸数）',
    options: [
      { value: '11', label: pnp ? 'NX1P2-1140DT1（モーション制御 4 軸）' : 'NX1P2-1140DT（モーション制御 4 軸）' },
      { value: '10', label: pnp ? 'NX1P2-1040DT1（モーション制御 2 軸）' : 'NX1P2-1040DT（モーション制御 2 軸）' },
    ],
    default: '11',
  };
  const modelOf = (e: string) => (forty ? `NX1P2-${e}40${pnp ? 'DT1' : 'DT'}` : 'NX1P2-9024DT');

  /* ------------------------------ 描画 ------------------------------ */

  const block = (n: number, xAt: (i: number) => number, y0: number, h: number) =>
    `<rect x="${xAt(0) - 8}" y="${y0}" width="${(n - 1) * P + 16}" height="${h}" rx="1.6" fill="url(#nxtb-{{uid}})" stroke="#5f6367" stroke-width="0.7"/>`;
  const holes = (ids: string[], xAt: (i: number) => number, y: number, slot: 'up' | 'down') =>
    ids.map((id, i) => (id ? pushIn(xAt(i), y, slot) : blankHole(xAt(i), y))).join('');
  const prints = (ids: string[], xAt: (i: number) => number, y: number) =>
    ids
      .map((id, i) => {
        const t = printOf(id, kind);
        const small = t.length > 3;
        return small
          ? text(xAt(i), y - 1.6, t.slice(0, 2), 2.6, '#2b2d30') + text(xAt(i), y + 1.4, t.slice(2), 2.2, '#2b2d30')
          : text(xAt(i), y, t, t === '⏚' ? 4.2 : 3.2, '#2b2d30');
      })
      .join('');
  const strip = (n: number, xAt: (i: number) => number, y0: number) =>
    `<rect x="${xAt(0) - 8}" y="${y0}" width="${(n - 1) * P + 16}" height="13" rx="1" fill="#f4f5f3" stroke="#b9bcb8" stroke-width="0.4"/>`;
  const ioLeds = (title: string, count: number, y: number) => {
    const per = Math.ceil(count / 2);
    const x0 = inX(0) + 4;
    const pitch = Math.min(11, (inX(nIn - 1) - x0 - 2) / Math.max(1, per - 1));
    return (
      text(inX(0) - 6, y + 3.4, title, 3, '#2b2d30', 'start') +
      Array.from({ length: count }, (_, k) => {
        const row = Math.floor(k / per);
        const x = r2(x0 + 8 + (k % per) * pitch);
        return led(x, y + row * 7) + text(x, y + row * 7 + 4.6, pad(k), 2.1, '#55595d', 'middle', 'normal');
      }).join('')
    );
  };

  const optionSlots = forty ? 2 : 1;
  const optW = forty ? 84 : 92;
  const svgBase = `${nxDefs()}
  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2.5" fill="url(#nxbody-{{uid}})" stroke="#8e918d" stroke-width="1"/>
  <!-- 右側面の NX バスコネクタ・ユニット連結ガイド -->
  <rect x="${W - 6}" y="60" width="4" height="80" rx="1" fill="#c3c5c2" stroke="#9a9d99" stroke-width="0.5"/>
  <rect x="${W - 5}" y="8" width="3" height="14" rx="1" fill="#b8bab7"/>
  <rect x="${W - 5}" y="${H - 22}" width="3" height="14" rx="1" fill="#b8bab7"/>

  <!-- SD メモリカードのカバー（DIP スイッチ・SD 電源スイッチ） -->
  <rect x="6" y="6" width="76" height="46" rx="2" fill="url(#nxcover-{{uid}})" stroke="#9a9d99" stroke-width="0.7"/>
  <rect x="38" y="8" width="12" height="2.4" rx="1" fill="#a7aaa6"/>
  ${text(10, 18, 'NX1P2', 6.2, '#3a3c3f', 'start')}
  ${text(10, 25, 'CPU UNIT', 3.2, '#55585b', 'start', 'normal')}
  ${text(78, 48, 'SD', 3.4, '#55585b', 'end')}
  ${omronLogo(44, 64, 9)}

  <!-- CPU ユニットの動作表示 -->
  ${[
    ['POWER', true],
    ['RUN', true],
    ['ERROR', false],
    ['BUSY', false],
    ['SHTDWN', false],
    ['SD PWR', false],
    ['SD BUSY', false],
  ]
    .map(([t, on], i) => {
      const x = i < 4 ? 10 : 48;
      const y = 74 + (i % 4) * 7;
      return led(x + 2, y, on as boolean, 3.4, 2) + text(x + 6, y + 1.2, String(t), 3, '#2b2d30', 'start', 'normal');
    })
    .join('')}

  <!-- バッテリスロットのカバー -->
  <rect x="6" y="104" width="76" height="34" rx="2" fill="url(#nxcover-{{uid}})" stroke="#9a9d99" stroke-width="0.6"/>
  ${text(44, 123, 'BATTERY', 3, '#6a6d70', 'middle', 'normal')}

  <!-- 内蔵 EtherNet/IP・EtherCAT ポート -->
  ${PORTS.map((p) => `${text(p.x, 151, p.title, 3.2, '#2b2d30')}${text(p.x, 156, p.sub, 2.6, '#2b2d30', 'middle', 'normal')}${rj45(p.x, PORT_Y)}`).join('')}

  <!-- 入力端子台（ユニット電源・機能接地・入力） -->
  ${block(nIn, inX, 2, 46)}
  ${holes(L.inTop, inX, IN_Y[0], 'up')}
  ${holes(L.inBottom, inX, IN_Y[1], 'down')}
  ${strip(nIn, inX, 50)}
  ${prints(L.inTop, inX, 55.6)}
  ${prints(L.inBottom, inX, 61.4)}
  ${ioLeds('IN', L.inputs, 70)}

  <!-- オプションボードのスロット -->
  ${Array.from({ length: optionSlots }, (_, i) => {
    const x = inX(0) - 6 + i * (optW + 6);
    return `<rect x="${x}" y="88" width="${optW}" height="30" rx="2" fill="url(#nxcover-{{uid}})" stroke="#9a9d99" stroke-width="0.6"/>${text(x + optW / 2, 105, `OPTION ${i + 1}`, 3, '#6a6d70', 'middle', 'normal')}`;
  }).join('')}

  <!-- 出力表示・出力端子台 -->
  ${ioLeds('OUT', L.outputs, 124)}
  ${strip(nOut, outX, 138)}
  ${prints(L.outTop, outX, 143.6)}
  ${prints(L.outBottom, outX, 149.4)}
  ${block(nOut, outX, 153, 45)}
  ${holes(L.outTop, outX, OUT_Y[0], 'up')}
  ${holes(L.outBottom, outX, OUT_Y[1], 'down')}
`;
  /** 型式の印字（右下）。40 点タイプは制御軸数のパラメータで変わる */
  const svg = (p: ParamValues) => `${svgBase}${text(W - 8, H - 3, modelOf(String(p.engine ?? '11')), 3.2, '#55585b', 'end', 'normal')}`;

  /* ------------------------------ 端子 ------------------------------ */

  const inCom: AcceptSpec = { system: 'DC', minVoltage: 15, maxVoltage: 28.8, conductors: ['+', '-'] };
  const outCom: AcceptSpec = pnp
    ? { system: 'DC', minVoltage: 15, maxVoltage: 28.8, conductors: ['+'] }
    : { system: 'DC', minVoltage: 10.2, maxVoltage: 28.8, conductors: ['-'] };
  const commonOf = new Map(Object.entries(L.commons).flatMap(([c, os]) => os.map((o) => [o, c] as const)));
  const zeroV: Record<string, string> = { C0: '0V0', C1: '0V1' };

  const terminal = (id: string, x: number, y: number, side: 'top' | 'bottom'): TerminalDef => {
    const base = { id, x, y, side };
    if (id === '+' || id === '+2') {
      return {
        ...base,
        label: '+',
        hint: 'ユニット電源+',
        note: `ユニット電源 +24V（DC20.4〜28.8V）${id === '+2' ? '。上段の + と内部で接続（渡り配線用、端子の許容電流 4A）' : ''}`,
        role: 'input',
        accepts: UNIT_POWER('+'),
        ...(id === '+2' ? { optional: true } : {}),
      };
    }
    if (id === '-' || id === '-2') {
      return {
        ...base,
        label: '−',
        hint: 'ユニット電源−',
        note: `ユニット電源 0V${id === '-2' ? '。上段の − と内部で接続（渡り配線用）' : ''}`,
        role: 'input',
        accepts: UNIT_POWER('-'),
        ...(id === '-2' ? { optional: true } : {}),
      };
    }
    if (id === 'FG') return { ...base, label: '⏚', hint: '機能接地', note: '機能接地（DIN レールの接触板と内部で接続。100Ω 以下で接地）', role: 'ground' };
    if (id === 'COM') {
      return { ...base, note: '入力コモン（全入力共通。+24V につなぐと NPN 用、0V につなぐと PNP 用）', role: 'input', accepts: inCom, optional: true };
    }
    if (id.startsWith('IN')) {
      const n = Number(id.slice(2));
      const a = n <= 15;
      return {
        ...base,
        label: id,
        note: `入力 ${pad(n)}（汎用入力 ${a ? 'A、5.8mA、応答 2.5µs' : 'B、5.3mA、応答 1ms'}。端子台の印字 ${pad(n)}）`,
        role: 'signal',
        signal: { dir: 'in', kind: 'dc', common: 'COM', onVoltage: 15, offCurrent: 1 },
        optional: true,
      };
    }
    if (id.startsWith('OUT')) {
      const n = Number(id.slice(3));
      return {
        ...base,
        label: id,
        note: `出力 ${pad(n)}（${pnp ? 'PNP ソース、負荷短絡保護付き' : 'NPN シンク'}、0.3A。コモン ${commonOf.get(id)}。端子台の印字 ${pad(n)}）`,
        role: 'signal',
        signal: { dir: 'out', kind: pnp ? 'pnp' : 'npn' },
        optional: true,
      };
    }
    if (/^C\d$/.test(id)) {
      const os = L.commons[id];
      const span = `${os[0].slice(3)}〜${os[os.length - 1].slice(3)}`;
      return pnp
        ? { ...base, label: `${id}(+V)`, hint: `${id} +V`, note: `出力コモン（出力 ${span}）・I/O 電源の +24V（DC15〜28.8V）`, role: 'input', accepts: outCom, optional: true }
        : { ...base, label: `${id}(0V)`, hint: `${id} 0V`, note: `出力コモン（出力 ${span}）・I/O 電源の 0V`, role: 'input', accepts: outCom, optional: true };
    }
    // 0V0 / 0V1（PNP 出力の駆動回路用の 0V）
    const c = Object.keys(zeroV).find((k) => zeroV[k] === id)!;
    return {
      ...base,
      label: id,
      hint: `${id}`,
      note: `出力の駆動回路の 0V（${c}(+V) の出力用、40mA/コモン）・I/O 電源の 0V`,
      role: 'input',
      accepts: { system: 'DC', minVoltage: 15, maxVoltage: 28.8, conductors: ['-'] },
      optional: true,
    };
  };

  const terminals: TerminalDef[] = [
    ...L.inTop.flatMap((id, i) => (id ? [terminal(id, inX(i), IN_Y[0], 'top')] : [])),
    ...L.inBottom.flatMap((id, i) => (id ? [terminal(id, inX(i), IN_Y[1], 'top')] : [])),
    ...L.outTop.flatMap((id, i) => (id ? [terminal(id, outX(i), OUT_Y[0], 'bottom')] : [])),
    ...L.outBottom.flatMap((id, i) => (id ? [terminal(id, outX(i), OUT_Y[1], 'bottom')] : [])),
    ...PORTS.map(
      (p): TerminalDef => ({
        id: p.id,
        label: `${p.title} ${p.sub} (RJ45)`,
        note: p.id === 'PORT1' ? '内蔵 EtherNet/IP ポート（100BASE-TX）' : '内蔵 EtherCAT ポート（マスタ、スレーブ 16 台まで）',
        x: p.x,
        y: PORT_Y,
        side: 'bottom',
        role: 'connector',
        connector: { kind: 'RJ45', pins: 0, width: 22, length: 19, facing: 'front', protocols: p.protocols },
        optional: true,
      }),
    ),
  ];

  // 出力: 出力点からコモンへ（NPN はコモンが 0V、PNP はコモンが +V）。1 点 0.3A
  const links: InternalLink[] = [
    { from: '+', to: '+2' },
    { from: '-', to: '-2' },
    ...Object.entries(L.commons).flatMap(([com, os]) => os.map((o) => ({ from: o, to: com, switch: 'output' as const, ratedCurrent: 0.3 }))),
  ];
  const perCommon = forty ? 1.8 : 2.4;
  const commonLimits: CommonLimit[] = Object.keys(L.commons).map((common) => ({ common, current: perCommon }));

  const outText = pnp
    ? `出力 00〜15: PNP（ソース）トランジスタ DC24V（15〜28.8V）0.3A/点、負荷短絡保護付き。8 点 1 コモン 1.8A/コモン（ユニット 3.6A）。C0(+V)・C1(+V) に I/O 電源の +24V、0V0・0V1 に 0V（駆動回路用 40mA/コモン）をつなぐ（C0 = 00〜07、C1 = 08〜15。コモンどうしは内部で独立）。`
    : forty
      ? `出力 00〜15: NPN（シンク）トランジスタ DC12〜24V（10.2〜28.8V）0.3A/点、8 点 1 コモン 1.8A/コモン（ユニット 3.6A）。C0(0V)・C1(0V) に負荷電源の 0V をつなぎ、負荷は +V と出力の間に入れる（C0 = 00〜07、C1 = 08〜15。コモンどうしは内部で独立）。`
      : `出力 00〜09: NPN（シンク）トランジスタ DC12〜24V（10.2〜28.8V）0.3A/点、10 点 1 コモン 2.4A/コモン。C0(0V) に負荷電源の 0V をつなぎ、負荷は +V と出力の間に入れる。`;
  const inText = forty
    ? '入力 00〜23: DC24V（15〜28.8V）、NPN/PNP 共用（COM を +24V につなぐと NPN 用、0V につなぐと PNP 用）、2 線式・3 線式センサー可。00〜15 は汎用入力 A（5.8mA、応答 2.5µs）、16〜23 は汎用入力 B（5.3mA、応答 1ms）。ON 電圧 15V 以上、OFF 5V・1mA 以下。'
    : '入力 00〜13: DC24V（15〜28.8V）、NPN/PNP 共用（COM を +24V につなぐと NPN 用、0V につなぐと PNP 用）、2 線式・3 線式センサー可。汎用入力 A（5.8mA、応答 2.5µs）。ON 電圧 15V 以上、OFF 5V・1mA 以下。';
  const power = kind === '40DT' ? 7.05 : kind === '40DT1' ? 6.85 : 6.7;

  return {
    type: forty ? `omron.nx1p2-1140${pnp ? 'dt1' : 'dt'}` : 'omron.nx1p2-9024dt',
    name: `PLC CPUユニット（${pnp ? 'トランジスタ出力 PNP' : 'トランジスタ出力 NPN'}）`,
    model: modelOf('11'),
    ...(forty ? { modelOf: (p) => modelOf(String(p.engine)) } : {}),
    maker: 'オムロン',
    category: 'plc',
    description:
      `オムロン マシンオートメーションコントローラ NX1P2 の CPU ユニット（内蔵 I/O ${L.inputs + L.outputs} 点: 入力 ${L.inputs} 点・出力 ${L.outputs} 点、DC24V 電源）。` +
      (forty
        ? 'NX1P2-1140 はモーション制御軸 4 軸（最大制御軸数 12）、NX1P2-1040 は 2 軸（同 10）。型式はパラメータで選ぶ。'
        : 'モーション制御軸なし（単軸位置制御軸 4 軸）。') +
      `ユニット電源 DC24V（20.4〜28.8V）、消費電力 ${power}W（NX ユニットへの供給分を除く）、突入電流 10A 以下/0.1ms・2.5A 以下/150ms。` +
      '入力端子台の + と − は上段・下段で 2 個ずつあり内部で接続（渡り配線に使える。端子の許容電流 4A）。⏚ は機能接地。' +
      inText +
      outText +
      `端子台はスクリューレス・クランプ（プッシュイン、着脱式）。内蔵 EtherNet/IP ポート（PORT1）・内蔵 EtherCAT ポート（PORT2、スレーブ 16 台まで）、オプションボードのスロット ${optionSlots} 個。` +
      '右側に NX ユニット（入出力ユニットなど）を最大 8 台連結できる（増設 I/O 電源ユニットなどのシステムユニットを含む）。NX ユニットの電源（NX バス電源 10W 以下）は CPU から供給するが、' +
      'NX ユニットの I/O 電源は供給しないので、NX バスから I/O 電源を受けるユニット（NX-ID5342・NX-OD5121 など）の前に増設 I/O 電源ユニット NX-PF0630 を連結して I/O 電源を入れる。' +
      `外形 W${forty ? 154 : 130}×H100×D71mm（エンドカバー込み。図はエンドカバーを除く本体）。` +
      '出典: オムロン NX1P カタログ（Cat. No. P116-E1）。',
    estimated: '入力端子台の ⏚（機能接地）の位置（上段の右端）は推定（カタログの配列図の文字に出ないため）',
    labelPrefix: 'PLC',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    commonLimits,
    ...(forty ? { params: [engineParam] } : {}),
    // CPU 単体の消費電流（消費電力 / 24V）。NX ユニットへの NX バス電源の供給分は含まない
    loadCurrent: r2(power / 24),
    bus: {
      kind: NX_BUS,
      host: { slots: 8 },
    },
  };
}
