/**
 * SMC 5 ポート電磁弁 VQC1000 シリーズのプラグイン形マニホールド（ベース配管・プラグインユニット VV5QC11）と、
 * そこに装着するプラグイン形の電磁弁・ブランクプレートの機器定義を作る。
 *
 * 一括配線のコネクタ（D サブ 25 ピンの F キット、フラットケーブル 26 ピンの P キット）が D 側エンドプレートにあり、
 * 弁のソレノイドはマニホールドの中の配線でコネクタのピンにつながる（弁にはリード線・端子がない）。
 * - 親: D 側エンドプレート（コネクタ・SUP 1(P)・EXH 3/5(R)）。右に連を並べ、連の右端の U 側エンドプレートも親が描く
 * - 連: プラグイン形の電磁弁（VQC1□0□-51）またはブランクプレート。エアのポート P・EA・EB は画面に出さないピンで、
 *   親の bus.host.airGallery でマニホールドの P・R につながる
 * - コネクタのピンとソレノイドの割付けは、連の順に自動で決まる（bus.host.plugIn。src/model/bus.ts）。
 *   ソレノイドのコイルは親のコネクタのピン（受電端子）として書くので、PLC の出力 → ケーブル → ピン → コイル → COM の
 *   極性・電圧・出力の定格・電源の容量のチェックがそのまま効く
 *
 * 出典（検索結果の要約で確かめた範囲。この環境からはメーカーの PDF を直接読めなかった）:
 *   SMC VQC1000/2000 シリーズ カタログ（CAT.ES11-80・「5 Port Solenoid Valve VQC1000/2000 Series」）
 *     マニホールド型式: VV5QC11-<連数><A/B ポートの継手>F D0（F = D サブコネクタ 25P・ケーブルなし。FD1 / FD2 / FD3 はケーブル 1.5 / 3 / 5m 付き）
 *       例: VV5QC11-08C6FD0、VV5QC11-12N3FD0-DNS。最大 24 連。D サブコネクタ（25P）とフラットケーブルコネクタ（26P）は MIL 規格に準拠、IP40
 *     電気配線: 12 連以下は標準でどの連もダブル配線（SOL.A・SOL.B）。シングル・ダブルの混在（配線指定）はオプション（-K。マニホールド仕様書で指示）
 *     D サブ: 連 1 の SOL.A が端子 1。フラットケーブル 26P: 連 1 の SOL.A が端子 1、SOL.B が端子 2、最大の番号から 2 本（25・26）が COM
 *     弁: VQC1100-51（2 位置シングル・メタルシール）、VQC1101（ラバーシール）、VQC1200（ダブル）… 5 = DC24V、N = マイナスコモン
 *     消費電力 0.4W（17mA）。許容電圧変動 ±10%。最低使用圧力 メタルシール 0.1MPa、ラバーシール 0.15MPa・0.2MPa、最高使用圧力 0.7MPa
 *     マイナスコモンの仕様では、マイナスコモン用の弁を使う
 *
 * 絵は正面から見た姿: 左端の D 側エンドプレート（縦に付いたコネクタ、下に P・R の継手）、連（濃い灰色の弁本体と黒いパイロット部・
 * アルミのベースと A・B の継手）、右端の U 側エンドプレート。寸法は SY シリーズの絵にそろえた近似。
 */
import type { DeviceDefinition, ParamValues, PinDef, PlugInWiringSpec, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { parsePlugInMap } from '../plugin-map';
import { coilAccepts, fittingDown, syAirLinks, syDefs, syPneumatic, SY_FUNCTIONS, type SyFunction } from './sy-common';
import { BASE_TOP, baseSegment, blankSvg, END_BOTTOM, END_TOP, H, manifoldParams } from './sy-manifold';

/** マニホールドのバスの種類（VQC1000 のプラグイン形の弁とブランクプレートだけ装着できる） */
export const VQC_BUS = 'smc-vv5qc11';

/** 1 連の幅[px]（実物のピッチ 10.5mm を見やすく拡大。SY3000 の絵より少し細い） */
export const VQC_STATION = 36;
/** D 側エンドプレート（親）の幅[px] */
const END_W = 50;
/** U 側エンドプレートの幅[px] */
const U_W = 14;
/** 最大連数 */
const MAX_STATIONS = 24;
/** ソレノイド 1 つの電流（0.4W / 24V） */
export const VQC_COIL_CURRENT = 0.017;
/** P・R ポートのワンタッチ管継手のチューブ外径（推定） */
const PR_OD = 8;

/** 一括配線のコネクタ（キット） */
export type VqcKit = 'F' | 'P';

interface KitSpec {
  name: string;
  /** connector.kind */
  kind: string;
  poles: number;
  /** コネクタの幅[px]（side に直交する方向） */
  width: number;
  /** ソレノイドに割り付けるピンの順・コモン */
  plugIn: Omit<PlugInWiringSpec, 'wiring' | 'connector' | 'name'>;
  /** ケーブルの説明 */
  cable: string;
}

export const VQC_KITS: Record<VqcKit, KitSpec> = {
  // D サブ 25 ピン: SOL.A は 1〜12、SOL.B は 14〜25、COM は 13（B 側とコモンの番号は推定）
  F: {
    name: 'D サブ 25 ピン',
    kind: 'DSUB25',
    poles: 25,
    width: 56,
    plugIn: { pins: Array.from({ length: 12 }, (_, i) => [i + 1, i + 14]).flat(), common: [13] },
    cable: 'D サブコネクタケーブル AXT100-DS25-□□□（片側バラ線。smc.axt100-ds25）',
  },
  // フラットケーブル 26 ピン（MIL 規格）: 連 1 の SOL.A が 1、SOL.B が 2 … 、COM は 25・26
  P: {
    name: 'フラットケーブル 26 ピン（MIL）',
    kind: 'MIL26',
    poles: 26,
    width: 50,
    plugIn: { pins: Array.from({ length: 24 }, (_, i) => i + 1), common: [25, 26] },
    cable: 'MIL 26 極のフラットケーブルと MIL 変換端子台（generic.mil-terminal-block.26p など）',
  },
};

/* ---------------- 電磁弁（1 連） ---------------- */

/** VQC1000 の弁の使用圧力範囲。seal は '0' = メタルシール、'1' = ラバーシール */
function vqcPressure(fn: SyFunction, seal: string): { min: number; max: number } {
  const three = !!SY_FUNCTIONS[fn].center;
  if (seal === '1') return { min: three ? 0.2 : fn === 'double' ? 0.1 : 0.15, max: 0.7 };
  return { min: 0.1, max: 0.7 };
}

export interface VqcValveSpec {
  type: string;
  fn: SyFunction;
}

/** 弁の型式（VQC1100-51、VQC1201N-51 など） */
export const vqcValveModel = (fn: SyFunction, p: ParamValues) => `VQC1${SY_FUNCTIONS[fn].digit}0${p.seal === '1' ? '1' : '0'}${p.common === 'N' ? 'N' : ''}-51`;

/** プラグイン形の電磁弁（1 連）。ソレノイドの電気端子はなく、つながるコネクタのピン番号（params の solA / solB）を札に書く */
export function buildVqcValve(s: VqcValveSpec): DeviceDefinition {
  const f = SY_FUNCTIONS[s.fn];
  const W = VQC_STATION;
  const double = f.solenoids === 2;
  const svg = (p: ParamValues) => {
    const pins = [p.solA, ...(double ? [p.solB] : [])].filter((v) => v !== undefined && v !== '');
    const model = vqcValveModel(s.fn, p);
    const neg = p.common === 'N';
    return `
  <defs>${syDefs}
    <linearGradient id="vqc-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3e4247"/>
      <stop offset="0.5" stop-color="#5b6066"/>
      <stop offset="1" stop-color="#36393d"/>
    </linearGradient>
  </defs>
  ${baseSegment(W, false)}
  <!-- 弁本体（濃い灰色の樹脂） -->
  <rect x="2" y="54" width="${W - 4}" height="${BASE_TOP - 54}" rx="1.5" fill="url(#vqc-body-{{uid}})" stroke="#202225" stroke-width="0.7"/>
  ${text(W / 2, 64, 'SMC', 5.2, '#7fb2ec')}
  ${text(W / 2, 71.5, model.replace(/-.*/, ''), 3.4, '#eceef0', 'normal')}
  ${text(W / 2, 77, `-51${neg ? '（−COM）' : ''}`, 2.8, '#c9ccd0', 'normal')}
  ${f.center ? `<rect x="${W / 2 - 7}" y="81" width="14" height="6" rx="1" fill="#e8eef6" stroke="#9fb3cc" stroke-width="0.4"/>${text(W / 2, 85.6, '3位置', 3.4, '#1f4f8a', 'normal')}` : ''}
  <!-- パイロット部（表示灯・手動操作。コネクタはベースの中） -->
  <rect x="1.5" y="34" width="${W - 3}" height="21" rx="1.5" fill="url(#pilot-{{uid}})" stroke="#111" stroke-width="0.6"/>
  ${(double ? [W * 0.28, W * 0.72] : [W / 2])
    .map((cx) => `<rect x="${cx - 3}" y="36.5" width="6" height="3" rx="0.8" fill="#ff8a3d" opacity="0.9"/><circle cx="${cx}" cy="47" r="2.7" fill="#d9dcdf" stroke="#555" stroke-width="0.5"/><path d="M${cx - 1.6} 47 H${cx + 1.6}" stroke="#555" stroke-width="0.7"/>`)
    .join('')}
  ${double ? `${text(W * 0.28, 54, 'A', 3, '#f2f2f2')}${text(W * 0.72, 54, 'B', 3, '#f2f2f2')}` : ''}
  ${
    pins.length
      ? `<!-- つながるコネクタのピン番号の札 -->
  <rect x="2.5" y="18" width="${W - 5}" height="14" rx="1.5" fill="#ffffff" stroke="#7d8287" stroke-width="0.5"/>
  ${text(W / 2, 23, 'ピン', 3, '#555', 'normal')}
  ${text(W / 2, 29.6, pins.join('・'), pins.length > 1 ? 4.2 : 4.8, '#1f4f8a')}`
      : ''
  }
`;
  };
  const aOn = double ? 'A 側に通電した位置' : '通電した位置';
  const bOn = double ? 'B 側に通電した位置' : '通電していない位置';
  const air: TerminalDef[] = [
    { id: 'A', label: '4(A)', hint: '出力 A', note: `出力ポート 4(A)（マニホールドベースのこの連の継手。${aOn}で P とつながる）`, x: W * 0.3, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
    { id: 'B', label: '2(B)', hint: '出力 B', note: `出力ポート 2(B)（マニホールドベースのこの連の継手。${bOn}で P とつながる）`, x: W * 0.7, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
  ];
  const pins = (p: ParamValues): PinDef[] => {
    const pr = vqcPressure(s.fn, String(p.seal));
    return [
      { id: 'P', label: '1(P)', note: '供給（マニホールドの SUP の通路につながる。チューブはつながない）', role: 'air', air: { kind: 'in', minPressure: pr.min, maxPressure: pr.max } },
      { id: 'EA', label: '5(EA)', note: '排気（マニホールドの EXH の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
      { id: 'EB', label: '3(EB)', note: '排気（マニホールドの EXH の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
    ];
  };
  const metal = vqcPressure(s.fn, '0');
  const rubber = vqcPressure(s.fn, '1');
  return {
    type: s.type,
    name: `${f.name}・プラグイン形`,
    model: vqcValveModel(s.fn, {}),
    modelOf: (p) => vqcValveModel(s.fn, p),
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC の 5 ポート電磁弁 VQC1000 シリーズ プラグイン形（${f.short}、DC24V、表示灯・サージ電圧保護回路付き）。` +
      'プラグイン形マニホールド VV5QC11 に 1 連として装着する（mount で指定）。ソレノイドはマニホールドの中でコネクタ（D サブ・フラットケーブル）のピンにつながるので、弁に電線はつながない' +
      '（ピン番号は連の順に自動で決まり、弁の上の札・インスペクタ・バルブエディタに出る）。P・EA・EB はマニホールドの中で SUP・EXH につながり、A・B はマニホールドベースのこの連の継手から出す。' +
      `使用圧力範囲 メタルシール（型式の 5 桁目 0）${metal.min}〜${metal.max}MPa、ラバーシール（1）${rubber.min}〜${rubber.max}MPa。消費電力 0.4W（17mA）。` +
      '標準はプラスコモン（COM を +24V、ピンを NPN 出力へ）。マイナスコモン（N）の弁は COM を 0V、ピンを PNP 出力へつなぐ（マニホールドの弁はどちらかにそろえる）。' +
      f.behavior,
    estimated:
      '型式の末尾 -51 の 1 の意味（表示灯・サージ電圧保護回路付きとした）、3 位置のメタルシールの最低使用圧力（0.1MPa）、ダブルのラバーシールの最低使用圧力（0.1MPa）は推定。外観は近似。',
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals: air,
    pins,
    airLinks: syAirLinks(),
    params: [
      {
        key: 'portAB',
        label: 'A・B ポートの継手（この連）',
        unit: 'mm',
        options: [4, 6].map((v) => ({ value: v, label: `C${v}（φ${v} ワンタッチ管継手）` })),
        default: 6,
      },
      {
        key: 'seal',
        label: 'シール',
        options: [
          { value: '0', label: '0: メタルシール' },
          { value: '1', label: '1: ラバーシール' },
        ],
        default: '0',
      },
      {
        key: 'common',
        label: 'コモン',
        options: [
          { value: '+', label: 'プラスコモン（標準）' },
          { value: 'N', label: 'N: マイナスコモン' },
        ],
        default: '+',
      },
    ],
    pneumatic: syPneumatic(s.fn),
    bus: { kind: VQC_BUS },
  };
}

/** ブランクプレート（弁を付けない連をふさぐ板） */
export function buildVqcBlank(type: string): DeviceDefinition {
  return {
    type,
    name: 'ブランクプレート（プラグイン形マニホールド用）',
    model: 'VVQ1000-10A-1',
    maker: 'SMC',
    category: 'valve',
    description:
      'SMC VV5QC11（VQC1000 のプラグイン形マニホールド）の、電磁弁を付けない連をふさぐブランクプレート。連数に数える（増設の予備などに使う）。' +
      'この連の A・B ポートには栓をする。ダブル配線のマニホールドでは、この連もコネクタのピンを 2 本使う（空き）。',
    estimated: 'ブランクプレートの型式（VVQ1000-10A-1）は推定',
    labelPrefix: 'BP',
    width: VQC_STATION,
    height: H,
    svg: blankSvg(VQC_STATION),
    terminals: [],
    bus: { kind: VQC_BUS },
  };
}

/* ---------------- マニホールド（親） ---------------- */

/**
 * 装着した連から求めるマニホールドのパラメータ: 連数・A/B の継手の記号（SY と同じ）と、連ごとのコモン（'+' / '-'、ブランクプレートは空）。
 * コネクタのピンの割付け（plugInMap）は src/model/bus.ts が入れる
 */
export function vqcManifoldParams(units: { def: DeviceDefinition; params: ParamValues }[]): ParamValues {
  const commons = units.map((u) => (u.def.pneumatic ? (u.params.common === 'N' ? '-' : '+') : ''));
  return { ...manifoldParams(units), stationCommons: commons.join(',') };
}

/** マニホールドのコモン（弁の多いほう。弁がなければプラスコモン）。弁のコモンがそろっていなければ mixed */
function commonOf(p: ParamValues): { common: '+' | '-'; mixed: boolean } {
  const cs = String(p.stationCommons ?? '')
    .split(',')
    .filter(Boolean);
  const neg = cs.filter((c) => c === '-').length;
  return { common: neg > cs.length - neg ? '-' : '+', mixed: neg > 0 && neg < cs.length };
}

/** マニホールドの型式（VV5QC11-08C6FD0。A/B の継手が連ごとに違えば M、マイナスコモンは -N） */
export function vqcManifoldModel(kit: VqcKit, p: ParamValues): string {
  const n = Number(p.stations ?? 0) || 0;
  const code = String(p.portCode ?? '');
  return `VV5QC11-${String(n).padStart(2, '0')}${code}${kit}D0${commonOf(p).common === '-' ? '-N' : ''}`;
}

/** D サブ 25 ピンのコネクタ（縦向き）を正面から見た絵。cx, cy は中心 */
function dsubFace(cx: number, cy: number): string {
  const h = 56;
  const top = cy - h / 2;
  const pins = Array.from({ length: 13 }, (_, i) => `<circle cx="${cx - 2.4}" cy="${(top + 5 + i * 3.8).toFixed(2)}" r="0.75" fill="#d9b85a"/>`).join('') +
    Array.from({ length: 12 }, (_, i) => `<circle cx="${cx + 2.4}" cy="${(top + 6.9 + i * 3.8).toFixed(2)}" r="0.75" fill="#d9b85a"/>`).join('');
  return `
  <rect x="${cx - 10}" y="${top - 9}" width="20" height="${h + 18}" rx="2" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${top - 4.5}" r="2.4" fill="#8d9297" stroke="#55595e" stroke-width="0.4"/>
  <circle cx="${cx}" cy="${top + h + 4.5}" r="2.4" fill="#8d9297" stroke="#55595e" stroke-width="0.4"/>
  <path d="M${cx - 6} ${top} H${cx + 6} L${cx + 5} ${top + h} H${cx - 5} Z" fill="#2a2c30" stroke="#0b0b0c" stroke-width="0.6"/>
  ${pins}`;
}

/** フラットケーブル用 26 ピンのボックスヘッダ（縦向き）。cx, cy は中心 */
function flatHeader(cx: number, cy: number): string {
  const h = 46;
  const top = cy - h / 2;
  const pins = Array.from({ length: 13 }, (_, i) => [cx - 2.2, cx + 2.2].map((x) => `<rect x="${x - 0.7}" y="${(top + 4.2 + i * 3.1).toFixed(2)}" width="1.4" height="1.4" fill="#d9b85a"/>`).join('')).join('');
  return `
  <rect x="${cx - 7}" y="${top - 3}" width="14" height="${h + 6}" rx="1" fill="#26282b" stroke="#0b0b0c" stroke-width="0.6"/>
  <rect x="${cx - 4.6}" y="${top}" width="9.2" height="${h}" fill="#3c3f44"/>
  <rect x="${cx - 8.2}" y="${cy - 4}" width="2" height="8" fill="#26282b"/>
  <path d="M${cx + 7.6} ${top + 1} l-2.4 -1.6 v3.2 z" fill="#e8e9eb"/>
  ${pins}`;
}

/** プラグイン形マニホールド VV5QC11（D 側エンドプレートが親。U 側エンドプレートも描く） */
export function buildVv5qc11(kit: VqcKit, type: string): DeviceDefinition {
  const k = VQC_KITS[kit];
  const W = END_W;
  const CN = { x: 3, y: 66 };
  const ports = [
    { id: 'P', label: '1(P)', x: 16 },
    { id: 'R', label: '3/5(R)', x: 36 },
  ];
  const svg = (p: ParamValues) => {
    const n = Number(p.stations ?? 0) || 0;
    const ux = W + n * VQC_STATION;
    return `
  <defs>${syDefs}
  </defs>
  <!-- D 側エンドプレート（コネクタ・SUP・EXH） -->
  ${ports.map((q) => fittingDown(q.x, END_BOTTOM - 1, 10, 10)).join('')}
  <rect x="2" y="24" width="${W - 2}" height="${END_BOTTOM - 24}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
  ${kit === 'F' ? dsubFace(20, CN.y) : flatHeader(18, CN.y)}
  ${text(kit === 'F' ? 38 : 36, CN.y - 14, kit === 'F' ? 'D-sub' : 'FLAT', 3.2, '#333', 'bold')}
  ${text(kit === 'F' ? 38 : 36, CN.y - 9, `${k.poles}P`, 3.6, '#333', 'bold')}
  ${text(kit === 'F' ? 38 : 36, CN.y + 6, 'COM', 2.8, '#555', 'normal')}
  ${text(kit === 'F' ? 38 : 36, CN.y + 10, kit === 'F' ? '13' : '25・26', 2.8, '#555', 'normal')}
  ${text(W / 2 + 1, 108, 'SMC', 6, '#1f5fa8')}
  ${text(W / 2 + 1, 114, 'VV5QC11', 3.6, '#333', 'normal')}
  ${text(W / 2 + 1, 120, 'D', 4.4, '#444')}
  ${ports.map((q) => text(q.x, 134, q.label, 3.2, '#222', 'normal')).join('')}
  <!-- U 側エンドプレート -->
  <g transform="translate(${ux} 0)">
    <rect x="0" y="${END_TOP}" width="${U_W}" height="${END_BOTTOM - END_TOP}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
    ${text(U_W / 2, END_TOP + 7, 'U', 5, '#444')}
  </g>`;
  };

  const terminals: TerminalDef[] = [
    {
      id: 'CN',
      label: `${k.name}`,
      hint: kit === 'F' ? 'D サブ' : 'フラット',
      note: `一括配線のコネクタ（${k.name}）。${k.cable}で PLC の出力・電源へつなぐ。ピンは連の順にソレノイドへ割り付ける`,
      x: CN.x,
      y: CN.y,
      side: 'left',
      role: 'connector',
      // つながないと弁が動かないので、つなぎ忘れを警告する
      connector: { kind: k.kind, pins: k.poles, width: k.width, required: true },
    },
    ...ports.map(
      (q): TerminalDef => ({
        id: q.id,
        label: q.label,
        hint: q.id === 'P' ? 'SUP' : 'EXH',
        note:
          q.id === 'P'
            ? `供給 SUP（φ${PR_OD} のワンタッチ管継手。装着した電磁弁すべての P につながる）`
            : `排気 EXH ${q.label}（φ${PR_OD} のワンタッチ管継手。装着した電磁弁すべての EA・EB につながる。サイレンサを付けるか集合排気する）`,
        x: q.x,
        y: H,
        side: 'bottom',
        role: 'air',
        air: q.id === 'P' ? { kind: 'in', tubeOD: PR_OD, maxPressure: 0.7 } : { kind: 'exhaust', tubeOD: PR_OD },
      }),
    ),
  ];

  /** コネクタのピン。ソレノイドを割り付けたピンはコイル（受電）、COM は弁の数だけの電流を受ける */
  const pins = (p: ParamValues): PinDef[] => {
    const map = parsePlugInMap(p.plugInMap);
    const commons = String(p.stationCommons ?? '').split(',');
    const { common } = commonOf(p);
    const total = Math.round(map.size * VQC_COIL_CURRENT * 1000) / 1000;
    return Array.from({ length: k.poles }, (_, i): PinDef => {
      const n = i + 1;
      const id = `CN#${n}`;
      if (k.plugIn.common.includes(n)) {
        return map.size
          ? {
              id,
              label: `${n} COM`,
              hint: 'COM',
              note: `ソレノイドのコモン（${common === '+' ? 'プラスコモン: +24V' : 'マイナスコモン: 0V'}へつなぐ。弁 ${map.size} 点の電流 ${total}A）`,
              role: 'input',
              accepts: coilAccepts(common),
              loadCurrent: total,
            }
          : { id, label: `${n} COM`, note: 'ソレノイドのコモン（弁がない）', role: 'signal', optional: true };
      }
      const m = map.get(n);
      if (!m) return { id, label: `${n}（空き）`, note: 'ソレノイドを割り付けていないピン', role: 'signal', optional: true };
      const c = commons[m.station - 1] === '-' ? '-' : '+';
      return {
        id,
        label: `${n} 連${m.station} SOL.${m.side}`,
        hint: `連${m.station} ${m.side}`,
        note: `連 ${m.station} の弁のソレノイド ${m.side} 側（DC24V・0.4W。${c === '+' ? 'プラスコモン: NPN 出力・0V 側へ' : 'マイナスコモン: PNP 出力・+24V 側へ'}）`,
        role: 'input',
        accepts: coilAccepts(c === '+' ? '-' : '+'),
        loadCurrent: VQC_COIL_CURRENT,
      };
    });
  };

  return {
    type,
    name: 'マニホールド（電磁弁用・プラグイン形）',
    model: `VV5QC11-${kit}D0`,
    modelOf: (p) => vqcManifoldModel(kit, p),
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC VQC1000 シリーズ プラグイン形マニホールド VV5QC11（ベース配管・プラグインユニット、${kit} キット: ${k.name}のコネクタ）。` +
      `プラグイン形の電磁弁 VQC1□0□-51 とブランクプレートを連として装着する（連 1 は D 側から。最大 ${MAX_STATIONS} 連）。` +
      `型式は VV5QC11-<連数><A/B ポートの継手>${kit}D0（D0 = ケーブルなし）。各弁のソレノイドはマニホールドの中でコネクタのピンにつながり、` +
      (kit === 'F'
        ? '標準のダブル配線では連 n の SOL.A がピン n（1〜12）、SOL.B がピン n + 13（14〜25）、COM がピン 13。'
        : '標準のダブル配線では連 n の SOL.A がピン 2n − 1、SOL.B がピン 2n、COM がピン 25・26。') +
      `ダブル配線（標準）はどの連も 2 本を使い、12 連まで。配線指定（-K）はシングルの連を 1 本にして、ソレノイド 24 点までの連にできる。` +
      `${k.cable}でつなぎ、ソレノイドを PLC の出力へ、COM を電源へつなぐ（プラスコモンは +24V、マイナスコモン -N は 0V）。` +
      `SUP 1(P)・EXH 3/5(R) は φ${PR_OD} のワンタッチ管継手。連の構成とソレノイドの出力はバルブエディタで編集できる。`,
    estimated:
      (kit === 'F' ? 'D サブの SOL.B（14〜25）とコモン（13）のピン番号、' : '') +
      `配線指定のピンの割付けの順、P・R のチューブ外径（φ${PR_OD}）、型式の A/B の継手が混在する記号（M）・マイナスコモンの記号（-N）${kit === 'P' ? '・フラットケーブルの記号（PD0）' : ''}は推定。外観は近似。`,
    labelPrefix: 'MF',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    params: [
      {
        key: 'wiring',
        label: '配線',
        options: [
          { value: 'double', label: 'ダブル配線（標準。どの連も 2 本）' },
          { value: 'specified', label: '配線指定 -K（シングルの連は 1 本）' },
        ],
        default: 'double',
      },
    ],
    bus: {
      kind: VQC_BUS,
      host: {
        slots: MAX_STATIONS,
        origin: { x: W, y: 0 },
        airGallery: { P: 'P', EA: 'R', EB: 'R' },
        fromUnits: vqcManifoldParams,
        plugIn: { connector: 'CN', wiring: { param: 'wiring' }, name: k.name, ...k.plugIn },
      },
    },
    pneumatic: { symbol: 'manifold', ports: { sup: 'P', exh: 'R' } },
  };
}
