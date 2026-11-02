/**
 * CKD 5 ポート電磁弁 4GA1 シリーズ（パイロット式、DC24V、E 形コネクタ・リード線 300mm、表示灯・サージキラー付き）の機器定義を作る。
 * - 単体（ボディ配管形）: src/devices/air/body-valve.ts の buildBodyValve()
 * - マニホールド M4GA1（個別配線）と、そこに装着するベース配管形の弁・マスキングプレート: 下の buildM4ga1 など。
 *   仕組みは SMC SS5Y□-41 と同じ（bus / mount。src/devices/smc/sy-manifold.ts）で、連の高さ・マニホールドベースの絵も共通にする
 *
 * 出典:
 *   CKD 4G unit valve カタログ（directindustry の CKD「4G unit valve」）: 使用圧力 最高 0.7MPa・最低 0.2MPa、耐圧 1.05MPa、
 *     消費電力 DC 0.6W（DC24V 0.025A）
 *   CKD 4GA/4GB マスターバルブ カタログ（ckdusa.com の 4GA-B-Master-Valve.pdf）: 最高使用圧力 0.7MPa、耐圧 1.05MPa、電圧記号 3 = DC24V
 *   MISUMI の 4GA1 単体（ボディ配管）の掲載: E 形コネクタ（リード線 300mm）、P・R ポート Rc1/8、A・B ワンタッチ継手 φ4、2 位置シングル 0.2〜0.7MPa
 * 推定: 型式の記号の並び（4GA1<切換え><配管>-<A・B の継手>-E2-3 の「9 = ボディ配管」「0 = ベース配管」「E2」）、
 *   ダブルソレノイドの最低使用圧力（0.1MPa）、リード線の色（赤 +・黒 −）、マニホールドの P・R のねじ（Rc1/4）と型式、マスキングプレートの型式
 */
import type { DeviceDefinition, ParamValues, PinDef, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { buildBodyValve, type BodyValveLook } from '../air/body-valve';
import { coilAccepts, fittingLeft, leadTip, leadWire, lPlug, syAirLinks, syDefs, syPneumatic } from '../smc/sy-common';
import { baseSegment, blankSvg, BASE_TOP, END_BOTTOM, END_TOP, H } from '../smc/sy-manifold';
import { CKD_LOGO } from './cylinder';

export type Ckd4gaFunction = 'single' | 'double';

/** 4GA1 の弁本体（アルミのボディに黒いソレノイド） */
export const CKD_VALVE_LOOK: BodyValveLook = {
  body: ['#f1f3f5', '#cdd2d7', '#9da4ab'],
  edge: '#5f666c',
  ink: '#222',
  pilot: ['#4a4d52', '#2c2e31', '#151617'],
  plug: '#34363a',
  logo: CKD_LOGO,
};

const FN: Record<Ckd4gaFunction, { digit: number; minPressure: number }> = {
  single: { digit: 1, minPressure: 0.2 },
  double: { digit: 2, minPressure: 0.1 },
};

/** ソレノイドの消費電力[W]（DC24V、0.025A） */
const COIL_W = 0.6;
const COIL_CURRENT = 0.025;

const ESTIMATED_BODY =
  '型式の記号の並び（4GA1<切換え>9 の「9 = ボディ配管」・E2）、リード線の色（赤 +・黒 −）、ダブルソレノイドの最低使用圧力（0.1MPa）は推定';

/** 4GA1 単体（ボディ配管形） */
export function build4ga1Body(type: string, fn: Ckd4gaFunction): DeviceDefinition {
  const f = FN[fn];
  return buildBodyValve({
    type,
    model: `4GA1${f.digit}9-C6-E2-3`,
    modelOf: (p) => `4GA1${f.digit}9-C${p.portAB}-E2-3`,
    maker: 'CKD',
    series: `4GA1${f.digit}9`,
    fn,
    bodyW: 74,
    look: CKD_VALVE_LOOK,
    labels: { A: '4(A)', B: '2(B)', P: '1(P)', EA: '5(R1)', EB: '3(R2)' },
    thread: 'Rc1/8',
    lowerOD: 6,
    abOptions: [4, 6, 8],
    abDefault: 6,
    abCode: (od) => `C${od}`,
    minPressure: f.minPressure,
    maxPressure: 0.7,
    coilW: COIL_W,
    leads: { plus: 'red', minus: 'black' },
    description:
      `CKD の 5 ポート電磁弁 4GA1 シリーズ ボディ配管形（パイロット式、${fn === 'single' ? '2 位置シングル' : '2 位置ダブル'}、DC24V、E 形コネクタ・リード線 300mm、表示灯・サージキラー付き）。` +
      'A・B はワンタッチ管継手（C4・C6・C8）、P・R1・R2 は Rc1/8。',
    estimated: ESTIMATED_BODY,
  });
}

/* ---------------- マニホールド M4GA1（個別配線） ---------------- */

/** マニホールドのバスの種類（4GA1 のベース配管形の弁とマスキングプレートだけ装着できる） */
export const M4GA1_BUS = 'ckd-m4ga1';
/** 1 連の幅[px] */
const STATION = 40;
/** エンドブロック（親）の幅、右端のエンドプレートの幅 */
const END_BLOCK = 30;
const END_PLATE = 14;
const MANIFOLD_THREAD = 'Rc1/4';
const MANIFOLD_OD = 8;

/** ベース配管形の弁（1 連） */
export function build4ga1Base(type: string, fn: Ckd4gaFunction): DeviceDefinition {
  const f = FN[fn];
  const double = fn === 'double';
  const W = STATION;
  const model = `4GA1${f.digit}0-E2-3`;
  const tips = double ? [0.125, 0.375, 0.625, 0.875].map((r) => W * r) : [W * 0.35, W * 0.65];
  const plugs: [number, number, 'A' | 'B' | ''][] = double
    ? [
        [1.5, W / 2 - 2.5, 'A'],
        [W / 2 + 1, W / 2 - 2.5, 'B'],
      ]
    : [[W * 0.2, W * 0.6, '']];
  const leads = plugs.flatMap(([x, w], i) => [leadWire(x + w * 0.35, 31, tips[i * 2], 12, 'red'), leadWire(x + w * 0.65, 31, tips[i * 2 + 1], 12, 'black')]);
  const svg = `
  <defs>${syDefs}
    <linearGradient id="ckd-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${CKD_VALVE_LOOK.body[0]}"/>
      <stop offset="0.5" stop-color="${CKD_VALVE_LOOK.body[1]}"/>
      <stop offset="1" stop-color="${CKD_VALVE_LOOK.body[2]}"/>
    </linearGradient>
  </defs>
  ${baseSegment(W, false)}
  <!-- 弁本体（アルミ） -->
  <rect x="1.5" y="60" width="${W - 3}" height="${BASE_TOP - 60}" rx="1.5" fill="url(#ckd-body-{{uid}})" stroke="#5f666c" stroke-width="0.7"/>
  ${text(W / 2, 72, 'CKD', 5.6, CKD_LOGO.color)}
  ${text(W / 2, 80, `4GA1${f.digit}0`, 4, '#333', 'normal')}
  ${text(W / 2, 86, 'E2-3', 3.4, '#555', 'normal')}
  <!-- パイロット弁（黒）と手動ボタン（黄） -->
  <rect x="1" y="43" width="${W - 2}" height="18" rx="1.5" fill="url(#pilot-{{uid}})" stroke="#1a1b1d" stroke-width="0.6"/>
  ${(double ? [W * 0.27, W * 0.73] : [W / 2]).map((cx) => `<rect x="${cx - 3.5}" y="50" width="7" height="6" rx="1.2" fill="#f2b705" stroke="#7a5c00" stroke-width="0.5"/>`).join('')}
  <!-- E 形コネクタ（表示灯付き）とリード線 -->
  ${leads.join('')}
  ${plugs.map(([x, w, side]) => lPlug(x, 30, w, 14, side)).join('')}
  ${tips.map((x) => leadTip(x, 2, 'up')).join('')}
`;
  const terminals: TerminalDef[] = plugs.flatMap(([, , side], i) => {
    const s = side || 'A';
    const what = `ソレノイド ${s} 側`;
    return [
      { id: `${s}+`, label: `${s}+`, note: `${what}（赤 +）`, x: tips[i * 2], y: 2, side: 'top' as const, role: 'input' as const, accepts: coilAccepts('+') },
      { id: `${s}-`, label: `${s}−`, note: `${what}（黒 −）`, x: tips[i * 2 + 1], y: 2, side: 'top' as const, role: 'input' as const, accepts: coilAccepts('-') },
    ];
  });
  const aOn = double ? 'A 側に通電した位置' : '通電した位置';
  const bOn = double ? 'B 側に通電した位置' : '通電していない位置';
  const air: TerminalDef[] = [
    { id: 'A', label: '4(A)', hint: '出力 A', note: `出力ポート 4(A)（マニホールドベースのこの連の継手。${aOn}で P とつながる）`, x: W * 0.3, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
    { id: 'B', label: '2(B)', hint: '出力 B', note: `出力ポート 2(B)（マニホールドベースのこの連の継手。${bOn}で P とつながる）`, x: W * 0.7, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
  ];
  const pins: PinDef[] = [
    { id: 'P', label: '1(P)', note: '供給（マニホールドの P の通路につながる。チューブはつながない）', role: 'air', air: { kind: 'in', minPressure: f.minPressure, maxPressure: 0.7 } },
    { id: 'EA', label: '5(R1)', note: '排気（マニホールドの R の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
    { id: 'EB', label: '3(R2)', note: '排気（マニホールドの R の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
  ];
  return {
    type,
    name: `電磁弁（${double ? 'ダブルソレノイド' : 'シングルソレノイド'}）・マニホールド用`,
    model,
    maker: 'CKD',
    category: 'valve',
    description:
      `CKD の 5 ポート電磁弁 4GA1 シリーズ ベース配管形（${double ? '2 位置ダブル' : '2 位置シングル'}、DC24V、E 形コネクタ・リード線 300mm、表示灯・サージキラー付き）。` +
      'マニホールド M4GA1 に 1 連として装着する（mount で指定）。P・R1・R2 はマニホールドの中で共通の P・R につながり、A・B はマニホールドベースのこの連の継手から出す。' +
      `使用圧力範囲 ${f.minPressure}〜0.7MPa。消費電力 DC 0.6W（約 25mA）。極性あり: 赤（+）を PLC の出力・リレー接点の側、黒（−）を 0V につなぐ。` +
      (double
        ? 'A 側に通電すると P→A・B→R2、B 側に通電すると P→B・A→R1 に切り換わり、通電をやめてもその位置を保つ（A と B を同時に通電しない）。'
        : '通電中だけ切り換わり（P→A・B→R2）、通電をやめるとばねで元の位置（P→B・A→R1）に戻る。'),
    estimated: '型式の記号の並び（4GA1<切換え>0 の「0 = ベース配管」・E2）、リード線の色（赤 +・黒 −）、ダブルソレノイドの最低使用圧力（0.1MPa）は推定',
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
        options: [4, 6, 8].map((v) => ({ value: v, label: `C${v}（φ${v} ワンタッチ管継手）` })),
        default: 6,
      },
    ],
    pneumatic: syPneumatic(fn, double ? { a: 'A+', b: 'B+' } : { a: 'A+' }),
    bus: { kind: M4GA1_BUS },
    loadCurrent: COIL_CURRENT,
    schematic: { elements: plugs.map(([, , side]) => ({ kind: 'coil' as const, terminals: [`${side || 'A'}+`, `${side || 'A'}-`] })) },
  };
}

/** マスキングプレート（弁を付けない連をふさぐ板） */
export function build4ga1Blank(type: string): DeviceDefinition {
  return {
    type,
    name: 'ブランクプレート（マニホールド用）',
    model: '4GA1-MP',
    maker: 'CKD',
    category: 'valve',
    description: 'CKD M4GA1 マニホールドの、電磁弁を付けない連をふさぐマスキングプレート。連数に数える（増設の予備などに使う）。この連の A・B ポートには栓をする。',
    estimated: 'マスキングプレートの型式（4GA1-MP）は推定',
    labelPrefix: 'BP',
    width: STATION,
    height: H,
    svg: blankSvg(STATION),
    terminals: [],
    bus: { kind: M4GA1_BUS },
  };
}

/** 装着した連から、マニホールドの連数・切換えの記号（1 シングルだけ、2 ダブルだけ、8 混在）・A/B の継手を求める */
function m4ga1Params(units: { def: DeviceDefinition; params: ParamValues }[]): ParamValues {
  // ブランクプレート（BP）は数えない
  const kinds = new Set(units.filter((u) => u.def.labelPrefix === 'SOL').map((u) => (/ダブル/.test(u.def.name) ? 2 : 1)));
  const ports = [...new Set(units.map((u) => u.params.portAB).filter((v) => v !== undefined).map((v) => `C${v}`))];
  return {
    stations: units.length,
    fnCode: kinds.size > 1 ? 8 : (kinds.values().next().value ?? 1),
    portCode: ports.length > 1 ? 'CX' : (ports[0] ?? 'C6'),
  };
}

/** マニホールドの型式（M4GA110-C6-E2-4-3 など。連数は装着した数） */
export function m4ga1Model(p: ParamValues): string {
  return `M4GA1${p.fnCode ?? 1}0-${p.portCode ?? 'C6'}-E2-${Number(p.stations ?? 0) || 0}-3`;
}

/** マニホールドベース（左のエンドブロックが親。右のエンドプレートも描く） */
export function buildM4ga1(type: string): DeviceDefinition {
  const W = END_BLOCK;
  const ports = [
    { id: 'EA', label: 'R1', y: 106 },
    { id: 'P', label: 'P', y: 120 },
    { id: 'EB', label: 'R2', y: 134 },
  ];
  const svg = (p: ParamValues) => {
    const n = Number(p.stations ?? 0) || 0;
    const ux = W + n * STATION;
    return `
  <defs>${syDefs}
  </defs>
  <!-- 左のエンドブロック（P・R のポート） -->
  <rect x="2" y="${END_TOP}" width="${W - 2}" height="${END_BOTTOM - END_TOP}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
  ${ports.map((q) => `${fittingLeft(6, q.y, 8, 8)}${text(W / 2 + 4, q.y + 1.8, q.label, 4.4, '#222', 'normal')}`).join('')}
  ${text(W / 2 + 1, 86, 'CKD', 6, CKD_LOGO.color)}
  ${text(W / 2 + 1, 92, 'M4GA1', 3.6, '#333', 'normal')}
  <!-- 右のエンドプレート（ポートは栓をしたものとする） -->
  <g transform="translate(${ux} 0)">
    <rect x="0" y="${END_TOP}" width="${END_PLATE}" height="${END_BOTTOM - END_TOP}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
    ${ports.map((q) => `<circle cx="${END_PLATE / 2}" cy="${q.y}" r="2.6" fill="#55595e" stroke="#2a2c2f" stroke-width="0.4"/>`).join('')}
  </g>`;
  };
  const terminals: TerminalDef[] = ports.map((q) => ({
    id: q.id,
    label: q.id === 'P' ? '1(P)' : q.id === 'EA' ? '5(R1)' : '3(R2)',
    hint: q.id === 'P' ? '供給 P' : `排気 ${q.label}`,
    note:
      q.id === 'P'
        ? `供給 P（${MANIFOLD_THREAD}。φ${MANIFOLD_OD} のワンタッチ管継手を付けたものとする。装着した電磁弁すべての P につながる）`
        : `排気 ${q.label}（${MANIFOLD_THREAD}。装着した電磁弁すべての ${q.label} につながる。サイレンサを付けるか集合排気する）`,
    x: 0,
    y: q.y,
    side: 'left' as const,
    role: 'air' as const,
    air: q.id === 'P' ? { kind: 'in' as const, tubeOD: MANIFOLD_OD, thread: MANIFOLD_THREAD, maxPressure: 0.7 } : { kind: 'exhaust' as const, tubeOD: MANIFOLD_OD, thread: MANIFOLD_THREAD },
  }));
  return {
    type,
    name: 'マニホールド（電磁弁用）',
    model: 'M4GA1',
    modelOf: m4ga1Model,
    maker: 'CKD',
    category: 'valve',
    description:
      'CKD 4GA1 シリーズのマニホールド M4GA1（個別配線）。ベース配管形の電磁弁 4GA110（シングル）・4GA120（ダブル）とマスキングプレートを連として装着する（連 1 は左から。最大 20 連）。' +
      '型式は M4GA1<切換え>0-<A/B の継手>-E2-<連数>-3（切換えはシングルだけなら 1、ダブルだけなら 2、混在は 8 とし、混在・継手の違いはマニホールド仕様書で指示する）。' +
      `P・R1・R2 は共通で ${MANIFOLD_THREAD}（図では左のエンドブロックのポートだけを描き、右は栓をしたものとする）。各弁のソレノイドは、それぞれのリード線で個別に配線する。連の構成・つなぎ先はバルブエディタで編集できる。`,
    estimated: `P・R のねじ（${MANIFOLD_THREAD}）と継手の外径（φ${MANIFOLD_OD}）、型式の記号の並び（切換えの 8・継手の CX・E2）、最大連数（20）は推定`,
    labelPrefix: 'MF',
    width: W,
    height: H,
    svg,
    terminals,
    bus: {
      kind: M4GA1_BUS,
      host: {
        slots: 20,
        origin: { x: W, y: 0 },
        airGallery: { P: 'P', EA: 'EA', EB: 'EB' },
        fromUnits: m4ga1Params,
      },
    },
    pneumatic: { symbol: 'manifold', ports: { sup: 'P', exh: 'EA' } },
  };
}
