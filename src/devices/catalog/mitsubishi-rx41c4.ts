import { IQR_BUS, ioLabel } from '../mitsubishi/melsec';
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, ParamValues, PinDef, SignalSpec, TerminalRole } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ DC 入力ユニット RX41C4（32点、40ピンコネクタ）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。本体はダークグレー、上部に黒い LED 表示部
 * （型式・RUN・入力表示 X00〜X0F / X10〜X1F の 4 段）、その下に 40ピンコネクタ（富士通 FCN-360 系互換、
 * 2列×20、2.54mm ピッチ、上下に M2.6 の固定ネジ）が縦向きに付く。
 *
 * コネクタについて:
 * 三菱の 40ピンコネクタは MIL 規格（ボックスヘッダ）ではなく FCN 系コネクタ（相手側 A6CON1〜4）で、
 * MIL 変換端子台とは直接は嵌合しない。そのため kind は 'FCN40' とし、FCN40P−MIL40P 変換ケーブルで
 * MIL 40極の変換端子台へつなげるよう mates: ['MIL40'] を付ける（ピンは同じ番号どうしが導通する）。
 * ピンID は、FCN 40P と MIL 40P をフラットケーブルで結ぶ一般的な変換ケーブル（三菱 B20 ↔ MIL 1）と同じ
 * 物理位置の千鳥番号にそろえる: 三菱の B_k → CN1#(41−2k)、A_k → CN1#(42−2k)
 * （上端の B20 = 1、A20 = 2、…、下端の B01 = 39、A01 = 40。B 列が奇数、A 列が偶数）。
 * 三菱のピン番号（B20 など）は label に残し、ユニット内の信号名（X00 など）は note に書く。
 * ベースユニットに装着すると、入出力ピンの label が実際の入出力番号（X20 など）になる。
 *
 * iQ-R の 40ピンコネクタ 32点ユニット（RY41NT2P など）は外形・コネクタが共通なので、
 * 定義の生成は buildR40PinModule にまとめている。
 */

/** 40ピンコネクタの 1 ピン分の定義（三菱のピン番号で指定） */
export interface R40Pin {
  /** 列（A / B） */
  row: 'A' | 'B';
  /** 番号（1〜20） */
  n: number;
  /** 信号名（'X00', 'COM', '空き' など） */
  signal: string;
  /** 入出力点の場合、ユニット内の番号（0〜31）。label は先頭番号 + この値の入出力番号になる */
  io?: number;
  role?: Exclude<TerminalRole, 'connector'>;
  accepts?: AcceptSpec | AcceptSpec[];
  spec?: SignalSpec;
}

export interface R40ModuleOptions {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  ioLetter: 'X' | 'Y';
  rating: string;
  pins: R40Pin[];
  /** 三菱のピン番号どうしの内部導通（例: ['B01', 'B02']） */
  links?: [string, string][];
  /** 出力ユニットの場合、出力点（io を持つピン）とコモンの間の出力（switch: 'output'） */
  outputs?: { common: string; ratedCurrent: number; commonLimit: number };
  /** 内部消費電流 DC5V[A] */
  load5V: number;
}

/** 三菱のピン番号（A01〜A20 / B01〜B20）→ MIL 標準の千鳥番号に合わせたピン番号 */
export const fcnPinNo = (row: 'A' | 'B', n: number) => (row === 'B' ? 41 - 2 * n : 42 - 2 * n);
/** 三菱のピン番号の文字列（'B01' など）→ ピンID */
export const fcnPinId = (name: string) => `CN1#${fcnPinNo(name[0] as 'A' | 'B', Number(name.slice(1)))}`;

const W = 56;
const H = 212;

/** コネクタ（差込口の中心）。B 列が左、A 列が右、20 番が上 */
const CN = { x: 32, y: 136, w: 17 };
const PITCH = 5.08;
const COL_B = CN.x - 2.54;
const COL_A = CN.x + 2.54;
/** 20 番（最上段）の Y 座標 */
const ROW_TOP = CN.y - 9.5 * PITCH;

const text = (x: number, y: number, t: string, size = 4, fill = '#e8e9eb', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const HEX = '0123456789ABCDEF';
const pad2 = (n: number) => String(n).padStart(2, '0');

/** FCN 40ピンコネクタ（台形シェル・上下の固定ネジ付き） */
const fcnConnector = () => {
  const top = ROW_TOP - 6;
  const bottom = ROW_TOP + 19 * PITCH + 6;
  const pins = Array.from({ length: 20 }, (_, i) => {
    const y = (ROW_TOP + i * PITCH).toFixed(2);
    return `<rect x="${COL_B - 0.8}" y="${(+y - 1.1).toFixed(2)}" width="1.6" height="2.2" rx="0.3" fill="url(#pin-{{uid}})"/>
    <rect x="${COL_A - 0.8}" y="${(+y - 1.1).toFixed(2)}" width="1.6" height="2.2" rx="0.3" fill="url(#pin-{{uid}})"/>`;
  }).join('');
  const fixScrew = (y: number) => `
    <circle cx="${CN.x}" cy="${y}" r="3.6" fill="url(#screw-{{uid}})" stroke="#4a4a4a" stroke-width="0.5"/>
    <path d="M${CN.x - 2.2} ${y} H${CN.x + 2.2}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;
  return `
  <!-- 取付け枠 -->
  <rect x="${CN.x - 11}" y="${top - 16}" width="22" height="${bottom - top + 32}" rx="1.5" fill="url(#frame-{{uid}})" stroke="#0c0c0d" stroke-width="0.7"/>
  ${fixScrew(top - 9)}
  ${fixScrew(bottom + 9)}
  <!-- シェル（台形の金属枠）と差込口 -->
  <path d="M${CN.x - 6.6} ${top} H${CN.x + 6.6} V${bottom} H${CN.x - 6.6} Z" fill="url(#shell-{{uid}})" stroke="#4a4d55" stroke-width="0.6"/>
  <path d="M${CN.x - 5} ${top + 2.5} H${CN.x + 4.2} L${CN.x + 5} ${top + 4} V${bottom - 4} L${CN.x + 4.2} ${bottom - 2.5} H${CN.x - 5} Z" fill="#060607" stroke="#3a3c42" stroke-width="0.5"/>
  ${pins}
  <!-- 列記号と番号 -->
  ${text(COL_B, top - 1.2, 'B', 2.6, '#c9ccd0')}
  ${text(COL_A, top - 1.2, 'A', 2.6, '#c9ccd0')}
  ${text(CN.x - 9, ROW_TOP + 1, '20', 2.4, '#c9ccd0', 'middle', 'normal')}
  ${text(CN.x - 9, ROW_TOP + 19 * PITCH + 1, '1', 2.4, '#c9ccd0', 'middle', 'normal')}`;
};

/** iQ-R 40ピンコネクタタイプ（32点）の I/O ユニットの機器定義を生成する */
export function buildR40PinModule(o: R40ModuleOptions): DeviceDefinition {
  /** 入出力表示 LED（下位 16点・上位 16点 × 0〜7 / 8〜F） */
  const leds = [0, 1, 2, 3]
    .map((row) =>
      Array.from({ length: 8 }, (_, i) => {
        const x = 7 + i * 6;
        return text(x, 21 + row * 8 + (row >= 2 ? 1.6 : 0), HEX[(row % 2) * 8 + i], 4.4, '#f2f3f4');
      }).join(''),
    )
    .join('');

  const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#262833"/>
      <stop offset="0.12" stop-color="#3d4150"/>
      <stop offset="0.88" stop-color="#383b49"/>
      <stop offset="1" stop-color="#23252f"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1b1e"/>
      <stop offset="1" stop-color="#0c0c0e"/>
    </linearGradient>
    <linearGradient id="frame-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2d303a"/>
      <stop offset="0.5" stop-color="#454958"/>
      <stop offset="1" stop-color="#2a2c36"/>
    </linearGradient>
    <linearGradient id="shell-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#121214"/>
      <stop offset="0.45" stop-color="#2e2f33"/>
      <stop offset="1" stop-color="#0e0e10"/>
    </linearGradient>
    <radialGradient id="pin-{{uid}}" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#b8902e"/>
    </radialGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
  </defs>

  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="1.5" fill="url(#body-{{uid}})" stroke="#111214" stroke-width="1"/>

  <!-- LED 表示部 -->
  <rect x="1.5" y="1.5" width="${W - 3}" height="56" rx="1" fill="url(#panel-{{uid}})"/>
  ${text(3.5, 8.6, o.model, o.model.length > 7 ? 5 : 5.6, '#ffffff', 'start')}
  ${text(7, 13.4, 'RUN', 3.6, '#f2f3f4', 'start')}
  <line x1="3.5" y1="15.6" x2="${W - 3.5}" y2="15.6" stroke="#a9acb1" stroke-width="0.5"/>
  <line x1="3.5" y1="32.2" x2="${W - 3.5}" y2="32.2" stroke="#a9acb1" stroke-width="0.5"/>
  ${leds}
  ${text(3.5, 54.6, o.rating, 2.6, '#d5d7da', 'start')}

  ${fcnConnector()}

  <!-- 下端の固定フック -->
  <rect x="12" y="${H - 5}" width="30" height="4" rx="1" fill="#2a2c2f" stroke="#111" stroke-width="0.5"/>
  ${text(9, CN.y + 1.2, 'CN1', 2.6, '#9a9da2', 'middle', 'normal')}
`;

  const dir = o.ioLetter === 'X' ? 'in' : 'out';
  const ioCount = o.pins.filter((p) => p.io !== undefined).length;

  const pins = (params: ParamValues): PinDef[] =>
    o.pins
      .map((p) => {
        const name = `${p.row}${pad2(p.n)}`;
        return {
          id: `CN1#${fcnPinNo(p.row, p.n)}`,
          label: `${p.io !== undefined ? ioLabel('hex', dir, params, p.io) : p.signal} (${name})`,
          ...(p.io !== undefined ? { note: `ユニット内 ${p.signal}` } : {}),
          role: p.role ?? 'signal',
          ...(p.accepts ? { accepts: p.accepts } : {}),
          ...(p.spec ? { signal: p.spec } : {}),
          optional: true,
        } satisfies PinDef;
      })
      .sort((a, b) => Number(a.id.split('#')[1]) - Number(b.id.split('#')[1]));

  const out = o.outputs;
  const links: InternalLink[] = [
    ...(o.links ?? []).map(([a, b]) => ({ from: fcnPinId(a), to: fcnPinId(b) })),
    ...(out
      ? o.pins
          .filter((p) => p.io !== undefined)
          .map((p) => ({ from: `CN1#${fcnPinNo(p.row, p.n)}`, to: fcnPinId(out.common), switch: 'output' as const, ratedCurrent: out.ratedCurrent }))
      : []),
  ];
  const commonLimits: CommonLimit[] = out ? [{ common: fcnPinId(out.common), current: out.commonLimit }] : [];

  return {
    type: o.type,
    name: o.name,
    model: o.model,
    maker: '三菱電機',
    category: 'plc',
    description: o.description,
    labelPrefix: o.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals: [
      {
        id: 'CN1',
        label: 'CN1 (40ピン FCN)',
        x: CN.x,
        y: CN.y,
        side: 'bottom',
        role: 'connector',
        // 正面に差すコネクタ（A6CON）。プラグはシェルの高さ（約 54mm）で描き、ケーブルは下へ出す
        connector: { kind: 'FCN40', pins: 40, width: CN.w, mates: ['MIL40'], facing: 'front', length: 108 },
        optional: true,
      },
    ],
    pins,
    ...(links.length ? { links } : {}),
    ...(commonLimits.length ? { commonLimits } : {}),
    bus: {
      kind: IQR_BUS,
      load: { '5V': o.load5V },
      io: { [dir === 'in' ? 'inputs' : 'outputs']: ioCount, format: 'hex' },
    },
  };
}

/**
 * 32点ユニットのピン配置（入力・出力共通）。
 * B20〜B05 = 下位 16点（00〜0F）、A20〜A05 = 上位 16点（10〜1F）。
 */
export function r32SignalPins(letter: 'X' | 'Y', spec?: SignalSpec): R40Pin[] {
  const out: R40Pin[] = [];
  for (let i = 0; i < 16; i++) {
    out.push({ row: 'B', n: 20 - i, signal: `${letter}0${HEX[i]}`, io: i, role: 'signal', ...(spec ? { spec } : {}) });
    out.push({ row: 'A', n: 20 - i, signal: `${letter}1${HEX[i]}`, io: 16 + i, role: 'signal', ...(spec ? { spec } : {}) });
  }
  return out;
}

/** 入力電圧 DC24V（許容範囲 20.4〜28.8V）。プラスコモン/マイナスコモン共用 */
const COM_ACCEPTS: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+', '-'] };

const def: DeviceDefinition = buildR40PinModule({
  type: 'mitsubishi.rx41c4',
  model: 'RX41C4',
  name: 'PLC 入力ユニット',
  labelPrefix: 'IN',
  ioLetter: 'X',
  rating: '24VDC 4.0mA',
  description:
    '三菱電機 MELSEC iQ-R シリーズの DC 入力ユニット（32点、40ピンコネクタ）。定格入力 DC24V（20.4〜28.8V）4.0mA、ON 電圧 19V 以上 / OFF 電圧 6V 以下。32点1コモン（COM = B01・B02、内部で共通）、プラスコモン/マイナスコモン共用。ピン配置（三菱のピン番号）: B20〜B05 = X00〜X0F、A20〜A05 = X10〜X1F、B02・B01 = COM、A01〜A04・B03・B04 = 空き。外部配線用コネクタ A6CON1〜A6CON4（FCN 系 40ピン、別売）。MIL 40極の変換端子台へは FCN40P−MIL40P 変換ケーブルでつなぐ（CN1 を MIL40 のコネクタへケーブルでつなげる）。ピンID は変換ケーブルで MIL 側と同じ番号になる千鳥番号（B_k → CN1#(41−2k)、A_k → CN1#(42−2k)）。信号名 X00〜X1F に先頭入出力番号を加えたものが実際の入力番号（ベースユニットに装着するとピンのラベルに反映される）。内部消費電流 DC5V 150mA。Q シリーズ QX41 系とピン配置互換。',
  load5V: 0.15,
  pins: [
    ...r32SignalPins('X', { dir: 'in', kind: 'dc', common: fcnPinId('B01') }),
    { row: 'B', n: 2, signal: 'COM', role: 'input', accepts: COM_ACCEPTS },
    { row: 'B', n: 1, signal: 'COM', role: 'input', accepts: COM_ACCEPTS },
    { row: 'B', n: 4, signal: '空き' },
    { row: 'B', n: 3, signal: '空き' },
    { row: 'A', n: 4, signal: '空き' },
    { row: 'A', n: 3, signal: '空き' },
    { row: 'A', n: 2, signal: '空き' },
    { row: 'A', n: 1, signal: '空き' },
  ],
  links: [['B01', 'B02']],
});

export default def;
