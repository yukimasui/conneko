/**
 * オムロン NX シリーズの NX ユニット（NX1P2 CPU ユニットの右に連結する、幅 12mm のユニット）の機器定義の生成。
 *
 * - NX-ID5342: DC 入力ユニット 16 点（NPN 用、DC24V、スクリューレス・クランプ端子台 16 端子）
 * - NX-OD5121: トランジスタ出力ユニット 16 点（NPN、DC12〜24V 0.5A/点・4A/ユニット、16 端子）
 * - NX-PF0630: 増設 I/O 電源ユニット（DC5〜24V、I/O 電源の供給 4A まで、8 端子: IOV 4 個・IOG 4 個）
 *
 * 外形 W12 × H100 × D71 mm（1mm ≒ 2px）。上部に表示 LED、その下に着脱式の端子台（左列 A1〜A8・右列 B1〜B8）。
 *
 * NX バスの I/O 電源: NX-ID5342・NX-OD5121 には I/O 電源の端子がなく、入力回路のコモン・出力の 0V は NX バスの I/O 電源（IOV・IOG）から来る。
 * NX1P2 は NX ユニットへ I/O 電源を供給しないので、これらの前に NX-PF0630 を連結し、その IOV・IOG に DC24V を入れる。
 * 図面では、ユニットの I/O 電源を NX バスコネクタ（上端の BUS 端子。ケーブルはつながない）のピン BUS#1（IOV）・BUS#2（IOG）にし、
 * NX-PF0630 の IOV・IOG 端子と同じ busNet で結ぶ
 * （同じ CPU に連結したユニットどうしで導通。I/O 電源の区切り（連結の順）は扱わない）。
 *
 * 端子台の A・B 列と信号の対応（入出力は A1〜A8 = 0〜7、B1〜B8 = 8〜15、NX-PF0630 は A1・A2・B1・B2 = IOV、A3・A4・B3・B4 = IOG）は推定
 * （カタログの端子接続図を確認できなかった）。
 */
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';
import { NX_BUS, NX_IOG, NX_IOV, led, nxDefs, pushIn, r2, text } from './nx-parts';

const W = 24;
const H = 200;
const COL_A = 6.5;
const COL_B = 17.5;
const ROW0 = 64;
const PITCH = 16.5;
const rowY = (r: number) => r2(ROW0 + r * PITCH);

const IO_ACCEPT_PLUS: AcceptSpec = { system: 'DC', minVoltage: 15, maxVoltage: 28.8, conductors: ['+'] };
const IO_ACCEPT_MINUS: AcceptSpec = { system: 'DC', minVoltage: 15, maxVoltage: 28.8, conductors: ['-'] };

/** 本体と端子台・LED（rows は端子台の段数） */
function body(model: string, rows: number, leds: string): string {
  const tbH = rows * PITCH + 10;
  return `${nxDefs()}
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="1.6" fill="url(#nxbody-{{uid}})" stroke="#8e918d" stroke-width="0.8"/>
  <line x1="${W / 2}" y1="2" x2="${W / 2}" y2="9" stroke="#a7aaa6" stroke-width="0.6"/>
  ${leds}
  <!-- 端子台 -->
  <rect x="1.6" y="${ROW0 - 12}" width="${W - 3.2}" height="${tbH}" rx="1.2" fill="url(#nxtb-{{uid}})" stroke="#5f6367" stroke-width="0.6"/>
  ${Array.from({ length: rows }, (_, r) => pushIn(COL_A, rowY(r), 'up', 0.8) + pushIn(COL_B, rowY(r), 'up', 0.8)).join('')}
  ${Array.from({ length: rows }, (_, r) => text(W / 2, rowY(r) + 1, String(r + 1), 2.2, '#f2f3f4', 'middle', 'normal')).join('')}
  ${text(COL_A, ROW0 - 14, 'A', 2.4, '#55585b')}${text(COL_B, ROW0 - 14, 'B', 2.4, '#55585b')}
  <!-- 型式（ユニット下部の印字） -->
  ${text(W / 2, H - 9, model.replace(/^NX-/, ''), 3.4, '#3a3c3f')}
  ${text(W / 2, H - 4, 'NX', 2.6, '#6a6d70', 'middle', 'normal')}`;
}

/** 入出力の LED（TS と 0〜15） */
function ioLeds(title: string): string {
  return (
    led(6, 13, true, 3, 1.8) +
    text(10, 14, 'TS', 2.4, '#2b2d30', 'start', 'normal') +
    text(W / 2, 21, title, 2.4, '#2b2d30', 'middle', 'normal') +
    Array.from({ length: 16 }, (_, k) => {
      const col = k < 8 ? 0 : 1;
      const y = 25 + (k % 8) * 3.2;
      return led(col ? 15 : 5, y, false, 2.4, 1.6) + text(col ? 20.5 : 9.5, y + 0.8, String(k), 1.8, '#55585b', 'middle', 'normal');
    }).join('')
  );
}

/** 端子台の位置（A1〜A8 は左列、B1〜B8 は右列） */
const at = (name: string) => {
  const col = name[0];
  const r = Number(name.slice(1)) - 1;
  return { x: col === 'A' ? COL_A : COL_B, y: rowY(r), side: (col === 'A' ? 'left' : 'right') as 'left' | 'right' };
};
/** 入出力 k（0〜15）の端子台の位置（0〜7 = A1〜A8、8〜15 = B1〜B8） */
const pos16 = (k: number) => (k < 8 ? `A${k + 1}` : `B${k - 7}`);

/**
 * NX バスコネクタ（側面）。I/O 電源（IOV・IOG）を連結したユニットへ渡す電路をピンで表すための端子で、
 * ケーブルはつながない（同じ分類の PLC ユニットどうしは候補に出ない）。ユニットの上端に置く
 */
const busConnector: TerminalDef = {
  id: 'BUS',
  label: 'NX バス（I/O 電源）',
  note: 'NX バスコネクタ。連結（mount）すると、前の増設 I/O 電源ユニットの I/O 電源（IOV・IOG）がこのユニットに来る。ケーブルはつながない',
  x: W / 2,
  y: 0,
  side: 'top',
  role: 'connector',
  connector: { kind: 'NX-BUS', pins: 2, width: 8 },
  optional: true,
};
/** 入力のコモン・出力の 0V になる NX バスの I/O 電源のピン */
const BUS_IOV = 'BUS#1';
const BUS_IOG = 'BUS#2';

/** NX バスの I/O 電源（NX バスコネクタのピン） */
const ioPowerPins = (consumer: 'input' | 'output'): PinDef[] => [
  {
    id: BUS_IOV,
    label: 'IOV（NX バスの I/O 電源 +V）',
    note: `NX バスの I/O 電源 +24V。前に連結した増設 I/O 電源ユニット NX-PF0630 の IOV から来る${consumer === 'input' ? '（入力回路のコモン。NPN 用）' : ''}`,
    role: 'input',
    accepts: IO_ACCEPT_PLUS,
    busNet: NX_IOV,
    optional: true,
  },
  {
    id: BUS_IOG,
    label: 'IOG（NX バスの I/O 電源 0V）',
    note: `NX バスの I/O 電源 0V。前に連結した増設 I/O 電源ユニット NX-PF0630 の IOG から来る${consumer === 'output' ? '（出力のコモン。NPN シンク）' : ''}`,
    role: 'input',
    accepts: IO_ACCEPT_MINUS,
    busNet: NX_IOG,
    optional: true,
  },
];

const SOURCE = 'オムロン NX シリーズ デジタル I/O ユニット データシート（NX-ID/IA/OD/OC/MD）・NX1P カタログ（Cat. No. P116-E1）の Ordering Information';

/** NX-ID5342（DC 入力 16 点、NPN 用） */
export function buildNxId5342(): DeviceDefinition {
  const terminals: TerminalDef[] = Array.from({ length: 16 }, (_, k) => ({
    id: `IN${k}`,
    label: `IN${k}`,
    note: `入力 ${k}（端子台 ${pos16(k)}。NPN 出力のセンサーをつなぐ）`,
    ...at(pos16(k)),
    role: 'signal' as const,
    signal: { dir: 'in' as const, kind: 'dc' as const, common: BUS_IOV },
    optional: true,
  }));
  return {
    type: 'omron.nx-id5342',
    name: 'PLC 入力ユニット（NX）',
    model: 'NX-ID5342',
    maker: 'オムロン',
    category: 'plc',
    description:
      'オムロン NX シリーズの DC 入力ユニット NX-ID5342（16 点、NPN 用、DC24V、スクリューレス・クランプ端子台 16 端子、幅 12mm）。NX1P2 CPU ユニットの右に連結する（図面では mount に CPU を指定）。' +
      '入力回路のコモンは NX バスの I/O 電源の +V（IOV）で、端子台には入力 IN0〜IN15 だけが並ぶ（I/O 電源の端子はない）。NPN 出力のセンサー・接点の他端を入力につなぎ、センサーの電源は I/O 電源接続ユニットなどから取る。' +
      'NX1P2 は I/O 電源を供給しないので、前に増設 I/O 電源ユニット NX-PF0630 を連結して I/O 電源（DC24V）を入れる。I/O リフレッシュは同期 / フリーラン、ON/OFF 応答 20µs/400µs 以下。' +
      `出典: ${SOURCE}。`,
    estimated: '端子台の A・B 列と入力番号の対応（A1〜A8 = IN0〜IN7、B1〜B8 = IN8〜IN15）は推定',
    labelPrefix: 'PLC',
    width: W,
    height: H,
    svg: body('NX-ID5342', 8, ioLeds('IN')),
    terminals: [...terminals, busConnector],
    pins: ioPowerPins('input'),
    bus: { kind: NX_BUS },
  };
}

/** NX-OD5121（トランジスタ出力 16 点、NPN シンク） */
export function buildNxOd5121(): DeviceDefinition {
  const terminals: TerminalDef[] = Array.from({ length: 16 }, (_, k) => ({
    id: `OUT${k}`,
    label: `OUT${k}`,
    note: `出力 ${k}（端子台 ${pos16(k)}。NPN シンク 0.5A。負荷は +V と出力の間に入れる）`,
    ...at(pos16(k)),
    role: 'signal' as const,
    signal: { dir: 'out' as const, kind: 'npn' as const },
    optional: true,
  }));
  const outs = terminals.map((t) => t.id);
  const links: InternalLink[] = outs.map((o) => ({ from: o, to: BUS_IOG, switch: 'output', ratedCurrent: 0.5 }));
  const commonLimits: CommonLimit[] = [{ outputs: outs, current: 4, label: '出力 OUT0〜OUT15（ユニット合計）' }];
  return {
    type: 'omron.nx-od5121',
    name: 'PLC 出力ユニット（NX）',
    model: 'NX-OD5121',
    maker: 'オムロン',
    category: 'plc',
    description:
      'オムロン NX シリーズのトランジスタ出力ユニット NX-OD5121（16 点、NPN シンク、DC12〜24V（10.2〜28.8V）0.5A/点・4A/ユニット、スクリューレス・クランプ端子台 16 端子、幅 12mm）。NX1P2 CPU ユニットの右に連結する。' +
      '出力の 0V は NX バスの I/O 電源の 0V（IOG）で、端子台には出力 OUT0〜OUT15 だけが並ぶ。負荷の +V 側は I/O 電源接続ユニットなどから取る。' +
      'NX1P2 は I/O 電源を供給しないので、前に増設 I/O 電源ユニット NX-PF0630 を連結して I/O 電源を入れる。ON/OFF 応答 0.1ms/0.8ms 以下。' +
      `出典: ${SOURCE}。`,
    estimated: '端子台の A・B 列と出力番号の対応（A1〜A8 = OUT0〜OUT7、B1〜B8 = OUT8〜OUT15）は推定',
    labelPrefix: 'PLC',
    width: W,
    height: H,
    svg: body('NX-OD5121', 8, ioLeds('OUT')),
    terminals: [...terminals, busConnector],
    pins: ioPowerPins('output'),
    links,
    commonLimits,
    bus: { kind: NX_BUS },
  };
}

/** NX-PF0630（増設 I/O 電源ユニット） */
export function buildNxPf0630(): DeviceDefinition {
  const accepts = (c: '+' | '-'): AcceptSpec => ({ system: 'DC', minVoltage: 4.5, maxVoltage: 28.8, conductors: [c] });
  const iov = ['A1', 'B1', 'A2', 'B2'];
  const iog = ['A3', 'B3', 'A4', 'B4'];
  const terminals: TerminalDef[] = [
    ...iov.map(
      (name, i): TerminalDef => ({
        id: `IOV${i + 1}`,
        label: 'IOV',
        hint: 'I/O電源+',
        note: `I/O 電源 +V（端子台 ${name}）。外部の DC5〜24V を入れ、後ろに連結したユニットの NX バスへ供給する。余った IOV はセンサーなどの電源の取り出し・渡りに使える`,
        ...at(name),
        role: 'input',
        accepts: accepts('+'),
        busNet: NX_IOV,
        ...(i === 0 ? {} : { optional: true }),
      }),
    ),
    ...iog.map(
      (name, i): TerminalDef => ({
        id: `IOG${i + 1}`,
        label: 'IOG',
        hint: 'I/O電源0V',
        note: `I/O 電源 0V（端子台 ${name}）。余った IOG はセンサーなどの 0V の取り出し・渡りに使える`,
        ...at(name),
        role: 'input',
        accepts: accepts('-'),
        busNet: NX_IOG,
        ...(i === 0 ? {} : { optional: true }),
      }),
    ),
  ];
  const links: InternalLink[] = [
    ...[2, 3, 4].map((i) => ({ from: 'IOV1', to: `IOV${i}` })),
    ...[2, 3, 4].map((i) => ({ from: 'IOG1', to: `IOG${i}` })),
  ];
  const leds = `${led(6, 13, true, 3, 1.8)}${text(10, 14, 'UV', 2.4, '#2b2d30', 'start', 'normal')}${led(6, 20, true, 3, 1.8)}${text(10, 21, 'IOV', 2.4, '#2b2d30', 'start', 'normal')}
  ${text(W / 2, 34, 'I/O', 2.6, '#2b2d30', 'middle', 'normal')}${text(W / 2, 38, 'POWER', 2.2, '#2b2d30', 'middle', 'normal')}`;
  return {
    type: 'omron.nx-pf0630',
    name: 'PLC 電源ユニット（NX 増設 I/O 電源）',
    model: 'NX-PF0630',
    maker: 'オムロン',
    category: 'plc',
    description:
      'オムロン NX シリーズの増設 I/O 電源ユニット NX-PF0630（I/O 電源 DC5〜24V（4.5〜28.8V）、I/O 電源の供給 4A まで、スクリューレス・クランプ端子台 8 端子: IOV 4 個・IOG 4 個、幅 12mm）。' +
      'NX1P2 CPU ユニットは NX ユニットへ I/O 電源を供給しないので、NX バスから I/O 電源を受ける入出力ユニット（NX-ID5342・NX-OD5121 など）の前に連結し、IOV・IOG に DC24V を入れる。' +
      '連結したユニットの I/O 電源（入力のコモン・出力の 0V）は IOV・IOG と同じ電位になる（図面では busNet で表す）。IOV どうし・IOG どうしは内部でつながり、余った端子は渡り・センサー電源の取り出しに使える（端子 1 個 4A まで）。' +
      `出典: ${SOURCE}・NX シリーズ システムユニット データシート（NX-PD/PF/PC/TBX）。`,
    estimated: '端子台の配列（A1・B1・A2・B2 = IOV、A3・B3・A4・B4 = IOG）は推定',
    labelPrefix: 'PLC',
    width: W,
    height: H,
    svg: body('NX-PF0630', 4, leds),
    terminals,
    links,
    bus: { kind: NX_BUS },
  };
}
