import type { AcceptSpec, DeviceDefinition, InternalLink, TerminalDef, TerminalRole } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ DC 入力ユニット RX40C7（16点、18点ネジ端子台）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。本体はダークグレー、上部に黒い LED 表示部
 * （型式・RUN・入力表示 0〜F）、その下に 18点ネジ端子台（M3 ネジ、着脱式）が付く。
 *
 * 18点ネジ端子台の端子番号 1〜18 は、正面から見て右列（奥側の段）が奇数、左列（手前側の段）が偶数で、
 * 右列が半ピッチ上にずれた千鳥配置（マニュアルの「端子の接続」図と同じ並び）。
 * 端子台左の表示板に信号名（0〜F、COM、NC）、右の白い表示板に端子番号を描く。
 *
 * iQ-R の 18点ネジ端子台ユニット（RY10R2・RY40NT5P など）は端子台・外形が共通なので、
 * 定義の生成は buildR18PointModule にまとめている。
 */

/** 18点ネジ端子台の 1 端子分の定義 */
export interface R18Point {
  /** 端子番号（1〜18） */
  no: number;
  /** 端子ID（信号名。例: 'X00', 'COM'） */
  id: string;
  /** 端子台横の表示板の印字（'0'〜'F', 'COM', 'NC' など） */
  mark: string;
  /** 空き端子（何もつながらない。描画のみ） */
  vacant?: boolean;
  role?: TerminalRole;
  accepts?: AcceptSpec;
  optional?: boolean;
}

export interface R18ModuleOptions {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  /** 入力表示 LED・表示板の頭文字 */
  ioLetter: 'X' | 'Y';
  /** LED 表示部下端の定格表示 */
  rating: string;
  /** 信号名表示板の色（DC 入力/トランジスタ出力: グレー、リレー出力: 赤） */
  accent: 'gray' | 'red';
  /** 感電注意マーク（AC 回路を扱うリレー出力など） */
  warning?: boolean;
  points: R18Point[];
  links?: InternalLink[];
}

/** 外形（W27.8 × H106 mm） */
const W = 56;
const H = 212;

/** 端子ネジの X 座標（右列: 奇数番号、左列: 偶数番号） */
const COL_ODD = 36;
const COL_EVEN = 22;
/** 端子 1 の Y 座標と端子間の段差（1 端子ごとに 4.3mm 下がる千鳥配置） */
const TB_Y0 = 57;
const TB_STEP = 8.6;

const termX = (no: number) => (no % 2 === 1 ? COL_ODD : COL_EVEN);
const termY = (no: number) => +(TB_Y0 + (no - 1) * TB_STEP).toFixed(2);

const text = (x: number, y: number, t: string, size = 4, fill = '#e8e9eb', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 端子ネジ（角座金付き M3） */
const screw = (x: number, y: number) => `
  <rect x="${x - 5.4}" y="${(y - 5.4).toFixed(2)}" width="10.8" height="10.8" rx="0.8" fill="#0d0d0e" stroke="#2e3033" stroke-width="0.5"/>
  <rect x="${x - 4.6}" y="${(y - 4.6).toFixed(2)}" width="9.2" height="9.2" rx="0.6" fill="url(#washer-{{uid}})"/>
  <circle cx="${x}" cy="${y}" r="3.7" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - 2.3} ${y} H${x + 2.3} M${x} ${(y - 2.3).toFixed(2)} V${(y + 2.3).toFixed(2)}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

const HEX = '0123456789ABCDEF';

/** iQ-R 18点ネジ端子台タイプの I/O ユニットの機器定義を生成する */
export function buildR18PointModule(o: R18ModuleOptions): DeviceDefinition {
  const accentFill = o.accent === 'red' ? 'url(#accent-red-{{uid}})' : 'url(#accent-gray-{{uid}})';

  /** 入出力表示 LED（0〜7 / 8〜F の 2 段） */
  const leds = [0, 1]
    .map((row) =>
      Array.from({ length: 8 }, (_, i) => {
        const x = 7 + i * 6 + (i >= 4 ? 1.2 : 0);
        const ledY = 18 + row * 9;
        return `<rect x="${x - 1.7}" y="${ledY}" width="3.4" height="2.2" rx="0.4" fill="#3b4a36"/>
        ${text(x, ledY + 6.6, HEX[row * 8 + i], 3.8, '#f2f3f4')}`;
      }).join(''),
    )
    .join('');

  /** 信号名表示板の印字（奇数番号は右寄り、偶数番号は左寄り） */
  const marks = o.points
    .map((p) => {
      const x = p.no % 2 === 1 ? 10.6 : 5.6;
      const size = p.mark.length >= 3 ? 2.5 : p.mark.length === 2 ? 3 : 3.8;
      return text(x, termY(p.no) + size * 0.36, p.mark, size, '#ffffff');
    })
    .join('');

  /** 端子台のバリア（同じ列の端子どうしの仕切り） */
  const barriers = Array.from({ length: 17 }, (_, i) => {
    const no = i + 1;
    const x = termX(no);
    const y = (termY(no) + TB_STEP).toFixed(2);
    return `<line x1="${x - 6.2}" y1="${y}" x2="${x + 6.2}" y2="${y}" stroke="#2c2e31" stroke-width="0.8"/>`;
  }).join('');

  const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2f3135"/>
      <stop offset="0.12" stop-color="#4a4d52"/>
      <stop offset="0.88" stop-color="#43464b"/>
      <stop offset="1" stop-color="#2b2d30"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2b2f"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1b1d"/>
      <stop offset="0.5" stop-color="#232427"/>
      <stop offset="1" stop-color="#141516"/>
    </linearGradient>
    <linearGradient id="accent-gray-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d8186"/>
      <stop offset="1" stop-color="#969a9f"/>
    </linearGradient>
    <linearGradient id="accent-red-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a3202c"/>
      <stop offset="1" stop-color="#c22a37"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d9dadc"/>
      <stop offset="1" stop-color="#8c8e91"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="run-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>

  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="1.5" fill="url(#body-{{uid}})" stroke="#111214" stroke-width="1"/>

  <!-- LED 表示部 -->
  <rect x="1.5" y="1.5" width="${W - 3}" height="43" rx="1" fill="url(#panel-{{uid}})"/>
  ${text(3.5, 8.6, o.model, o.model.length > 7 ? 5 : 5.6, '#ffffff', 'start')}
  <rect x="${W - 13}" y="3.6" width="9.5" height="2.6" rx="0.5" fill="${o.accent === 'red' ? '#c8303c' : '#e6e7e9'}"/>
  ${text(6, 14.2, 'RUN', 3.4, '#f2f3f4', 'start')}
  <rect x="14" y="11.4" width="4" height="2.4" rx="0.5" fill="url(#run-{{uid}})"/>
  <line x1="3.5" y1="16.6" x2="${W - 3.5}" y2="16.6" stroke="#8d9095" stroke-width="0.4"/>
  <line x1="${7 + 3.5 * 6 + 0.6}" y1="17" x2="${7 + 3.5 * 6 + 0.6}" y2="34" stroke="#8d9095" stroke-width="0.4"/>
  ${leds}
  ${o.warning ? `<path d="M4 41.5 L6.6 36.8 L9.2 41.5 Z" fill="none" stroke="#f2f3f4" stroke-width="0.6"/>${text(6.6, 41, '!', 3, '#f2f3f4')}` : ''}
  ${text(o.warning ? 10.5 : 3.5, 40.8, o.rating, 2.7, '#d5d7da', 'start')}

  <!-- 18点ネジ端子台 -->
  <rect x="2" y="46.5" width="${W - 4}" height="${H - 52}" rx="1" fill="#1b1c1e" stroke="#0b0b0c" stroke-width="0.6"/>
  <!-- 信号名の表示板 -->
  <rect x="2.6" y="47.2" width="11" height="${H - 53.5}" rx="0.8" fill="${accentFill}"/>
  ${text(10.6, 51.6, o.ioLetter, 3.4, '#ffffff')}
  ${marks}
  <!-- 端子台本体 -->
  <rect x="15.2" y="47.2" width="27.6" height="${H - 53.5}" rx="0.8" fill="url(#tb-{{uid}})"/>
  ${barriers}
  ${o.points.map((p) => screw(termX(p.no), termY(p.no))).join('')}
  <!-- 端子番号の表示板 -->
  <rect x="44" y="47.2" width="9.4" height="${H - 53.5}" rx="0.8" fill="#eceded" stroke="#b9bbbe" stroke-width="0.4"/>
  ${o.points.map((p) => text(48.7, termY(p.no) + 1.2, String(p.no), 3.2, '#2a2c2f', 'middle', 'normal')).join('')}

  <!-- 下端の固定フック -->
  <rect x="16" y="${H - 5}" width="24" height="4" rx="1" fill="#2a2c2f" stroke="#111" stroke-width="0.5"/>
`;

  const terminals: TerminalDef[] = o.points
    .filter((p) => !p.vacant)
    .map((p) => ({
      id: p.id,
      label: `${p.id} (TB${p.no})`,
      x: termX(p.no),
      y: termY(p.no),
      side: p.no % 2 === 1 ? 'right' : 'left',
      role: p.role ?? 'signal',
      ...(p.accepts ? { accepts: p.accepts } : {}),
      ...(p.optional ? { optional: true } : {}),
    }));

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
    terminals,
    ...(o.links ? { links: o.links } : {}),
  };
}

/** 入力電圧 DC24V（許容範囲 20.4〜28.8V）。プラスコモン/マイナスコモン共用なので +/− どちらも可 */
const COM_ACCEPTS: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+', '-'] };

const def: DeviceDefinition = buildR18PointModule({
  type: 'mitsubishi.rx40c7',
  model: 'RX40C7',
  name: 'PLC 入力ユニット',
  labelPrefix: 'IN',
  ioLetter: 'X',
  rating: '24VDC 7.0mA',
  accent: 'gray',
  description:
    '三菱電機 MELSEC iQ-R シリーズの DC 入力ユニット（16点、18点ネジ端子台 M3）。定格入力 DC24V（20.4〜28.8V）7.0mA、ON 電圧 15V 以上 / OFF 電圧 8V 以下。16点1コモン（COM = 端子17）、プラスコモン/マイナスコモン共用（COM に DC24V の + でも − でもよい）。端子18 は空き。内部消費電流 DC5V 120mA（ベースユニット経由で電源ユニットから供給）。端子ID の X00〜X0F は信号名で、実際の入力番号はユニットの先頭入出力番号を加えたもの（例: 先頭 X10 なら X00→X10）。Q シリーズ QX40 系と端子台互換。',
  points: [
    ...Array.from({ length: 16 }, (_, i) => ({ no: i + 1, id: `X0${HEX[i]}`, mark: HEX[i], optional: true })),
    { no: 17, id: 'COM', mark: 'COM', role: 'input' as const, accepts: COM_ACCEPTS },
    { no: 18, id: 'NC', mark: 'NC', vacant: true },
  ],
});

export default def;
