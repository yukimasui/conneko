/**
 * SMC SY シリーズのベース配管形マニホールド（バーベース形・個別配線「タイプ 41」）と、そこに装着する電磁弁・ブランクプレートの機器定義を作る。
 *
 * マニホールドは、増設ユニットの装着の仕組み（bus / mount）で表す。
 * - 親（マニホールドベース）: 左端の D 側エンドブロック。SUP（1(P)）・EXH（5(EA)・3(EB)）のポートがあり、右に連を並べる。
 *   連の右端の U 側エンドプレートも親が描く（連数は装着した機器の数。bus.host.fromUnits で求める）
 * - 連（装着する機器）: ベース配管形の電磁弁（SY3□40 / SY5□40）またはブランクプレート。1 台が 1 連で、その連のマニホールドベースの
 *   A・B ポート（ワンタッチ管継手）も一緒に描く。連 1 は D 側（左）から数える
 * - 電磁弁の P・EA・EB は画面に出さないエアのポート（role: 'air' のピン）で、親の bus.host.airGallery でマニホールドの P・EA・EB につながる
 *
 * 絵は正面から見た姿: 上に L 形プラグとリード線、白い弁本体、下にアルミのマニホールドベースと A・B の継手。
 * ダブルソレノイド・3 位置の弁は実物では両端にパイロット弁があるが、正面からは A 側・B 側の L 形プラグを並べて描く。
 *
 * 出典: SMC SY シリーズ カタログ（static.smc.eu の SY_EU.pdf「CAT.EUS11-83」p.79〜81・109）
 *   マニホールド型式: SS5Y3-41-05-C6 = SY3000 用・タイプ 41（バーベース、個別配線）・連数 02〜20（ブランクプレートを含む）・A/B ポートの継手
 *   SUP・EXH は共通（P・EA・EB はエンドブロック）。10 連を超える場合は両側から給排気する
 *   SS5Y3-41: P・EA・EB は 1/8、A/B は M5 / C4 / C6、連のピッチ 10.5mm。SS5Y5-41: P・EA・EB は 1/4、A/B は 01 / C6 / C8、ピッチ 16mm
 *   ベース配管形の弁: SY3□40-5LZ / SY5□40-5LZ（□ は切換えの種類）。ブランクプレート: SY3000-26-9A / SY5000-26-20A
 */
import type { DeviceDefinition, ParamValues, PinDef, TerminalDef } from '../types';
import { text } from '../generic/parts';
import {
  coilAccepts,
  fittingDown,
  fittingLeft,
  leadTip,
  leadWire,
  lPlug,
  SY_COIL_CURRENT,
  SY_FUNCTIONS,
  syAirLinks,
  syDefs,
  syPneumatic,
  type SyFunction,
} from './sy-common';

export type SySize = 3 | 5;

/** シリーズごとの寸法・仕様 */
interface SizeSpec {
  /** 1 連の幅[px]（実物のピッチ 10.5mm / 16mm を見やすく拡大） */
  station: number;
  /** D 側エンドブロックの幅[px]（親の幅） */
  endBlock: number;
  /** U 側エンドプレートの幅[px] */
  endPlate: number;
  /** マニホールドの P・EA・EB のねじ */
  thread: string;
  /** P・EA・EB に付けるワンタッチ管継手のチューブ外径（推定の前提） */
  portOD: number;
  /** A・B ポートの継手の選択肢（チューブ外径） */
  abOptions: number[];
  blankModel: string;
  maxStations: number;
}

export const SY_SIZES: Record<SySize, SizeSpec> = {
  3: { station: 40, endBlock: 30, endPlate: 14, thread: 'Rc1/8', portOD: 8, abOptions: [4, 6], blankModel: 'SY3000-26-9A', maxStations: 20 },
  5: { station: 48, endBlock: 34, endPlate: 16, thread: 'Rc1/4', portOD: 10, abOptions: [6, 8], blankModel: 'SY5000-26-20A', maxStations: 20 },
};

/** マニホールドのバスの種類（同じシリーズ・タイプの弁とブランクプレートだけ装着できる） */
export const manifoldBusKind = (size: SySize) => `smc-ss5y${size}-41`;

/** 連の高さ（通信タイプのマニホールド sy-serial.ts も同じ高さにそろえる） */
export const H = 150;
/** マニホールドベースの上端・下端 */
export const BASE_TOP = 100;
export const BASE_BOTTOM = 140;
/** エンドブロック・エンドプレートの上端・下端（ベースより少し大きい） */
export const END_TOP = 94;
export const END_BOTTOM = 145;

/** 1 連分のマニホールドベース（A・B の継手付き、または栓をした A・B） */
export function baseSegment(w: number, plugged: boolean): string {
  const ax = w * 0.3;
  const bx = w * 0.7;
  const ports = plugged
    ? [ax, bx].map((x) => `<circle cx="${x}" cy="${BASE_BOTTOM - 7}" r="3.6" fill="#55595e" stroke="#2a2c2f" stroke-width="0.5"/>`).join('')
    : [ax, bx].map((x) => fittingDown(x, BASE_BOTTOM - 1, 9, 10)).join('');
  return `
  <!-- マニホールドベース（この連の分） -->
  <rect x="0" y="${BASE_TOP}" width="${w}" height="${BASE_BOTTOM - BASE_TOP}" fill="url(#alu-{{uid}})" stroke="#6b7279" stroke-width="0.6"/>
  <path d="M0.4 ${BASE_TOP} V${BASE_BOTTOM} M${w - 0.4} ${BASE_TOP} V${BASE_BOTTOM}" stroke="#5c6166" stroke-width="0.6"/>
  ${text(ax, BASE_TOP + 25, '4', 4.6, '#333', 'normal')}${text(bx, BASE_TOP + 25, '2', 4.6, '#333', 'normal')}
  ${text(ax, BASE_TOP + 30.5, 'A', 4, '#555', 'normal')}${text(bx, BASE_TOP + 30.5, 'B', 4, '#555', 'normal')}
  ${ports}`;
}

export interface SyBaseSpec {
  type: string;
  model: string;
  fn: SyFunction;
  size: SySize;
}

/** ベース配管形の電磁弁（1 連） */
export function buildSyBase(s: SyBaseSpec): DeviceDefinition {
  const f = SY_FUNCTIONS[s.fn];
  const z = SY_SIZES[s.size];
  const W = z.station;
  const double = f.solenoids === 2;
  /** リード線の先（端子）の x */
  const tips = double ? [0.125, 0.375, 0.625, 0.875].map((r) => W * r) : [W * 0.35, W * 0.65];
  /** L 形プラグ: [左端, 幅, 側] */
  const plugs: [number, number, 'A' | 'B' | ''][] = double
    ? [
        [1.5, W / 2 - 2.5, 'A'],
        [W / 2 + 1, W / 2 - 2.5, 'B'],
      ]
    : [[W * 0.2, W * 0.6, '']];
  const leads = plugs.flatMap(([x, w], i) => {
    const [red, black] = [tips[i * 2], tips[i * 2 + 1]];
    return [leadWire(x + w * 0.35, 31, red, 12, 'red'), leadWire(x + w * 0.65, 31, black, 12, 'black')];
  });
  const svg = `
  <defs>${syDefs}
  </defs>
  ${baseSegment(W, false)}
  <!-- 弁本体（白い樹脂） -->
  <rect x="1.5" y="60" width="${W - 3}" height="${BASE_TOP - 60}" rx="1.5" fill="url(#valve-{{uid}})" stroke="#8a9096" stroke-width="0.7"/>
  ${text(W / 2, 72, 'SMC', W > 44 ? 6.5 : 5.6, '#1f5fa8')}
  ${text(W / 2, 80, s.model.replace(/-.*/, ''), W > 44 ? 4.4 : 3.8, '#333', 'normal')}
  ${text(W / 2, 86, s.model.replace(/^[^-]*-/, ''), 3.4, '#555', 'normal')}
  ${f.center ? `<rect x="${W / 2 - 7}" y="89" width="14" height="6" rx="1" fill="#e8eef6" stroke="#9fb3cc" stroke-width="0.4"/>${text(W / 2, 93.6, '3位置', 3.6, '#1f4f8a', 'normal')}` : ''}
  <!-- パイロット弁 -->
  <rect x="1" y="43" width="${W - 2}" height="18" rx="1.5" fill="url(#pilot-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${(double ? [W * 0.27, W * 0.73] : [W / 2]).map((cx) => `<circle cx="${cx}" cy="53" r="3" fill="#d9dcdf" stroke="#555" stroke-width="0.5"/><path d="M${cx - 1.8} 53 H${cx + 1.8}" stroke="#555" stroke-width="0.8"/>`).join('')}
  <!-- L 形プラグ（表示灯付き）とリード線 -->
  ${leads.join('')}
  ${plugs.map(([x, w, side]) => lPlug(x, 30, w, 14, side)).join('')}
  ${tips.map((x) => leadTip(x, 2, 'up')).join('')}
`;

  const terminals: TerminalDef[] = plugs.flatMap(([, , side], i) => {
    const sideName = side || 'A';
    const what = `ソレノイド ${sideName} 側`;
    return [
      { id: `${sideName}+`, label: `${sideName}+`, note: `${what}（赤 +）`, x: tips[i * 2], y: 2, side: 'top' as const, role: 'input' as const, accepts: coilAccepts('+') },
      { id: `${sideName}-`, label: `${sideName}−`, note: `${what}（黒 −）`, x: tips[i * 2 + 1], y: 2, side: 'top' as const, role: 'input' as const, accepts: coilAccepts('-') },
    ];
  });
  const aOn = double ? 'A 側に通電した位置' : '通電した位置';
  const bOn = double ? 'B 側に通電した位置' : '通電していない位置';
  const air: TerminalDef[] = [
    { id: 'A', label: '4(A)', hint: '出力 A', note: `出力ポート 4(A)（マニホールドベースのこの連の継手。${aOn}で P とつながる）`, x: W * 0.3, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
    { id: 'B', label: '2(B)', hint: '出力 B', note: `出力ポート 2(B)（マニホールドベースのこの連の継手。${bOn}で P とつながる）`, x: W * 0.7, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
  ];
  const pins: PinDef[] = [
    { id: 'P', label: '1(P)', note: '供給（マニホールドの SUP の通路につながる。チューブはつながない）', role: 'air', air: { kind: 'in', minPressure: f.minPressure, maxPressure: f.maxPressure } },
    { id: 'EA', label: '5(EA)', note: '排気（マニホールドの EXH の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
    { id: 'EB', label: '3(EB)', note: '排気（マニホールドの EXH の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
  ];
  return {
    type: s.type,
    name: `${f.name}・マニホールド用`,
    model: s.model,
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC の 5 ポート電磁弁 SY${s.size}000 シリーズ ベース配管形（${f.short}、DC24V、L 形プラグコネクタ・リード線 300mm、表示灯・サージ電圧保護回路付き）。` +
      `マニホールド SS5Y${s.size}-41 に 1 連として装着する（mount で指定）。P・EA・EB はマニホールドの中で SUP・EXH につながり、A・B はマニホールドベースのこの連の継手から出す。` +
      `使用圧力範囲 ${f.minPressure}〜${f.maxPressure}MPa。消費電力 0.4W（約 17mA）。極性あり: 赤（+）を PLC の出力・リレー接点の側、黒（−）を 0V につなぐ（NPN 出力の PLC なら赤を +24V、黒を出力へ）。${f.behavior}`,
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals: [...terminals, ...air],
    pins,
    airLinks: syAirLinks(),
    params: [
      {
        key: 'portAB',
        label: 'A・B ポートの継手（この連）',
        unit: 'mm',
        options: z.abOptions.map((v) => ({ value: v, label: `C${v}（φ${v} ワンタッチ管継手）` })),
        default: 6,
      },
    ],
    pneumatic: syPneumatic(s.fn, double ? { a: 'A+', b: 'B+' } : { a: 'A+' }),
    bus: { kind: manifoldBusKind(s.size) },
    loadCurrent: SY_COIL_CURRENT,
    schematic: { elements: plugs.map(([, , side]) => ({ kind: 'coil' as const, terminals: [`${side || 'A'}+`, `${side || 'A'}-`] })) },
  };
}

/** ブランクプレートの連の絵（幅 W。栓をした A・B のマニホールドベース付き） */
export function blankSvg(W: number): string {
  return `
  <defs>${syDefs}
  </defs>
  ${baseSegment(W, true)}
  <!-- ブランクプレート -->
  <rect x="2" y="70" width="${W - 4}" height="${BASE_TOP - 70}" rx="1.5" fill="#b8bec4" stroke="#6b7279" stroke-width="0.6"/>
  <rect x="4" y="72" width="${W - 8}" height="4" rx="1" fill="#d8dde1" opacity="0.8"/>
  ${[W * 0.3, W * 0.7].map((x) => `<circle cx="${x}" cy="88" r="2.2" fill="#8c939a" stroke="#4b5056" stroke-width="0.4"/><path d="M${x - 1.4} 88 H${x + 1.4}" stroke="#4b5056" stroke-width="0.5"/>`).join('')}
  ${text(W / 2, 82, 'BLANK', 3.4, '#4b5056', 'normal')}
`;
}

/** ブランクプレート（弁を付けない連をふさぐ板） */
export function buildSyBlank(size: SySize, type: string): DeviceDefinition {
  const z = SY_SIZES[size];
  const W = z.station;
  const svg = blankSvg(W);
  return {
    type,
    name: 'ブランクプレート（マニホールド用）',
    model: z.blankModel,
    maker: 'SMC',
    category: 'valve',
    description: `SMC SS5Y${size}-41 マニホールドの、電磁弁を付けない連をふさぐブランクプレート。連数に数える（増設の予備などに使う）。この連の A・B ポートには栓をする。`,
    labelPrefix: 'BP',
    width: W,
    height: H,
    svg,
    terminals: [],
    bus: { kind: manifoldBusKind(size) },
  };
}

/** 装着した連から、マニホールドの連数と A/B ポートの継手の表記を求める */
export function manifoldParams(units: { params: ParamValues }[]): ParamValues {
  const ports = [...new Set(units.map((u) => u.params.portAB).filter((v) => v !== undefined).map((v) => `C${v}`))];
  return { stations: units.length, portCode: ports.length > 1 ? 'M' : (ports[0] ?? '') };
}

/** マニホールドの型式（SS5Y3-41-05-C6。A/B の継手が連ごとに違えば M） */
export function manifoldModel(size: SySize, p: ParamValues): string {
  const n = Number(p.stations ?? 0) || 0;
  const code = String(p.portCode ?? '');
  return `SS5Y${size}-41-${String(n).padStart(2, '0')}${code ? `-${code}` : ''}`;
}

/** マニホールドベース（D 側エンドブロックが親。U 側エンドプレートも描く） */
export function buildSs5y41(size: SySize, type: string): DeviceDefinition {
  const z = SY_SIZES[size];
  const W = z.endBlock;
  const ports = [
    { id: 'EA', label: '5(EA)', y: 106 },
    { id: 'P', label: '1(P)', y: 120 },
    { id: 'EB', label: '3(EB)', y: 134 },
  ];
  const svg = (p: ParamValues) => {
    const n = Number(p.stations ?? 0) || 0;
    // U 側エンドプレート（連の右端。親の枠の外に描く）
    const ux = W + n * z.station;
    return `
  <defs>${syDefs}
  </defs>
  <!-- D 側エンドブロック（SUP・EXH のポート） -->
  <rect x="2" y="${END_TOP}" width="${W - 2}" height="${END_BOTTOM - END_TOP}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
  ${ports.map((q) => `${fittingLeft(6, q.y, 8, 8)}${text(W / 2 + 3, q.y + 1.8, q.label, 4, '#222', 'normal')}`).join('')}
  ${text(W / 2 + 1, END_TOP + 7, 'D', 5, '#444')}
  ${text(W / 2 + 1, 86, 'SMC', 6, '#1f5fa8')}
  ${text(W / 2 + 1, 92, `SS5Y${size}`, 3.6, '#333', 'normal')}
  <!-- U 側エンドプレート（ポートは栓をしたものとする） -->
  <g transform="translate(${ux} 0)">
    <rect x="0" y="${END_TOP}" width="${z.endPlate}" height="${END_BOTTOM - END_TOP}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
    ${ports.map((q) => `<circle cx="${z.endPlate / 2}" cy="${q.y}" r="2.6" fill="#55595e" stroke="#2a2c2f" stroke-width="0.4"/>`).join('')}
    ${text(z.endPlate / 2, END_TOP + 7, 'U', 5, '#444')}
  </g>`;
  };
  const terminals: TerminalDef[] = ports.map((q) => ({
    id: q.id,
    label: q.label,
    hint: q.id === 'P' ? 'SUP' : 'EXH',
    note:
      q.id === 'P'
        ? `供給 SUP（${z.thread}。φ${z.portOD} のワンタッチ管継手を付けたものとする。装着した電磁弁すべての P につながる）`
        : `排気 EXH ${q.label}（${z.thread}。装着した電磁弁すべての ${q.id} につながる。サイレンサを付けるか集合排気する）`,
    x: 0,
    y: q.y,
    side: 'left' as const,
    role: 'air' as const,
    air: q.id === 'P' ? { kind: 'in' as const, tubeOD: z.portOD, thread: z.thread, maxPressure: 0.7 } : { kind: 'exhaust' as const, tubeOD: z.portOD, thread: z.thread },
  }));
  return {
    type,
    name: 'マニホールド（電磁弁用）',
    model: `SS5Y${size}-41`,
    modelOf: (p) => manifoldModel(size, p),
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC SY${size}000 シリーズ ベース配管形のバーベースマニホールド（タイプ 41、個別配線）。ベース配管形の電磁弁 SY${size}□40 とブランクプレート ${z.blankModel} を連として装着する（連 1 は D 側＝左から。最大 ${z.maxStations} 連）。` +
      `型式は SS5Y${size}-41-<連数>-<A/B ポートの継手>（連ごとに継手が違う場合は M とし、マニホールド仕様書で指示する）。` +
      `SUP 1(P)・EXH 5(EA)・3(EB) は共通で、${z.thread}。10 連を超える場合は両側から給排気する（図では D 側のポートだけを描き、U 側は栓をしたものとする）。` +
      `各弁のソレノイドは、それぞれのリード線で個別に配線する。連の構成・つなぎ先はバルブエディタで編集できる。`,
    estimated: `P・EA・EB に付ける継手のチューブ外径（φ${z.portOD}）は、ねじ ${z.thread} に合う一般的な継手を想定した値。A/B ポートの継手が連ごとに違う場合の型式の表記（M）は推定。`,
    labelPrefix: 'MF',
    width: W,
    height: H,
    svg,
    terminals,
    bus: {
      kind: manifoldBusKind(size),
      host: {
        slots: z.maxStations,
        origin: { x: W, y: 0 },
        airGallery: { P: 'P', EA: 'EA', EB: 'EB' },
        fromUnits: manifoldParams,
      },
    },
    pneumatic: { symbol: 'manifold', ports: { sup: 'P', exh: 'EA' } },
  };
}
