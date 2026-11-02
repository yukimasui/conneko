/**
 * SMC のエアスライドテーブル MXQ と、メカジョイント式ロッドレスシリンダ MY1B の機器定義を作る。
 * どちらも横から見た姿で、ポートは上へチューブを出し（端子は上向き）、オートスイッチ（D-M9 シリーズ）はパラメータで選ぶと
 * 本体の両端に付いてリード線が下へ出る（src/devices/smc/autoswitch.ts。SW1 = 後退端 / 左端、SW2 = 前進端 / 右端）。
 * 中でエアが通り抜けないので airLinks は書かない。空圧回路図は複動シリンダの記号で描く（head = 前進させるポート）。
 *
 * 出典:
 *   MXQ: SMC エアスライドテーブル MXQ シリーズ カタログ（CAT.ES20-132）・取扱説明書: 使用圧力 0.15〜0.7MPa、ポート M5×0.8（φ12・16）
 *     型式の例: MXQ16-20-M9NL（内径 16・ストローク 20・D-M9N・リード線 3m）
 *   MY1B: SMC メカジョイント式ロッドレスシリンダ MY1 シリーズ カタログ（MY1_EU.pdf）: ポート M5×0.8（φ16・20）
 *     最低使用圧力 0.1〜0.15MPa（内径による）、最高 0.8MPa。型式の例: MY1B25G-350LZ（G は集中配管、L はショックアブソーバ）
 * 推定: MXQ の φ20・25 のポート（Rc1/8）・内径ごとのストロークの範囲・外形寸法、MY1B の φ25 以上のポート（Rc1/8・φ40 は Rc1/4）・
 *   内径ごとの最低使用圧力・外形寸法
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { text } from '../generic/parts';
import {
  labelSideOf,
  leadsMinWidth,
  pneumaticSwitches,
  spreadLeads,
  switchBody,
  switchCable,
  switchDescription,
  switchLinks,
  switchOf,
  switchParams,
  switchSlots,
  switchSuffix,
  switchTerminals,
  type SwitchName,
} from './autoswitch';

const f = (n: number) => +n.toFixed(2);

const DEFS = `
  <defs>
    <linearGradient id="sl-alu-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ecef"/>
      <stop offset="0.35" stop-color="#cfd4d9"/>
      <stop offset="1" stop-color="#959ca3"/>
    </linearGradient>
    <linearGradient id="sl-table-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f7f8"/>
      <stop offset="0.5" stop-color="#dde1e5"/>
      <stop offset="1" stop-color="#aab1b8"/>
    </linearGradient>
    <linearGradient id="sl-fit-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9bec3"/>
      <stop offset="0.5" stop-color="#f4f5f6"/>
      <stop offset="1" stop-color="#a9afb4"/>
    </linearGradient>
  </defs>`;

/** ワンタッチ管継手（上向き）。x はポートの中心、y はポートの面。端子は y - 18 */
function fitting(x: number, y: number, od: number): string {
  const w = Math.max(7, od * 1.25);
  return `
  <rect x="${f(x - w / 2 - 1)}" y="${f(y - 4)}" width="${f(w + 2)}" height="4" rx="0.6" fill="#c9ced3" stroke="#5c6166" stroke-width="0.5"/>
  <rect x="${f(x - w / 2)}" y="${f(y - 14)}" width="${f(w)}" height="10" rx="1.2" fill="url(#sl-fit-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${f(x - w / 2 - 0.6)}" y="${f(y - 17.5)}" width="${f(w + 1.2)}" height="4" rx="1" fill="#e9ebed" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="${f(x - od / 2)}" y="${f(y - 19)}" width="${f(od)}" height="2" fill="#2f7fd8" opacity="0.35"/>`;
}

interface Bore {
  bore: number;
  thread: string;
  minPressure: number;
  /** 本体の高さ・幅の目安[mm] */
  height: number;
  strokes: number[];
}

/** 共通: スイッチの本体・リード線・端子 */
function switches(p: ParamValues, xs: { 1: number; 2: number }, swY: number, W: number, yFan: number, yEnd: number, names: Record<1 | 2, SwitchName>) {
  const sw = switchOf(p);
  const slots = switchSlots(p);
  const want = slots.map((slot) => ({ slot, x: xs[slot] }));
  const leads = sw ? spreadLeads(want, sw.wires, 2, W - 2) : [];
  let svg = '';
  if (sw) {
    for (const slot of slots) {
      const w = 20;
      const x = slot === 1 ? xs[1] - 2 : xs[2] - w + 2;
      svg += switchBody(x, swY, w, 5, sw, slot === 1 ? 'left' : 'right');
      const lead = leads.find((l) => l.slot === slot)!;
      svg += switchCable({ x: slot === 1 ? x + 1 : x + w - 1, y: swY + 4 }, lead.x, yFan, yEnd, sw, `SW${slot} ${names[slot].short}`, labelSideOf(slot, leads.length, lead.x, W));
    }
  }
  return { svg, terminals: switchTerminals(p, leads, yEnd, names) };
}

/* ------------------------------------------------------------------ */
/* エアスライドテーブル MXQ                                              */
/* ------------------------------------------------------------------ */

const MXQ: Bore[] = [
  { bore: 8, thread: 'M5', minPressure: 0.15, height: 16, strokes: [10, 20, 30, 40, 50] },
  { bore: 12, thread: 'M5', minPressure: 0.15, height: 20, strokes: [10, 20, 30, 40, 50, 75] },
  { bore: 16, thread: 'M5', minPressure: 0.15, height: 25, strokes: [10, 20, 30, 40, 50, 75, 100] },
  { bore: 20, thread: 'Rc1/8', minPressure: 0.15, height: 30, strokes: [10, 20, 30, 40, 50, 75, 100, 125] },
  { bore: 25, thread: 'Rc1/8', minPressure: 0.15, height: 36, strokes: [10, 20, 30, 40, 50, 75, 100, 125, 150] },
];
const MXQ_STROKES = [10, 20, 30, 40, 50, 75, 100, 125, 150];
const MXQ_NAMES: Record<1 | 2, SwitchName> = { 1: { short: '後退端', long: '後退端（テーブルが戻った位置）' }, 2: { short: '前進端', long: '前進端（テーブルが出た位置）' } };

export function buildMxq(type: string): DeviceDefinition {
  const k = 1.4;
  const boreOf = (p: ParamValues) => MXQ.find((b) => b.bore === Number(p.bore)) ?? MXQ[2];
  const layout = (p: ParamValues) => {
    const b = boreOf(p);
    const stroke = Number(p.stroke);
    const bodyL = (b.height * 2.2 + Math.min(stroke, 100) * 0.9 + Math.max(0, stroke - 100) * 0.3) * k;
    const bodyH = b.height * k;
    const sw = switchOf(p);
    const W = Math.ceil(Math.max(bodyL + 36, sw && switchSlots(p).length === 2 ? leadsMinWidth(sw.wires) : 0));
    const x0 = f((W - bodyL - 20) / 2);
    const top = 26;
    const tableH = f(bodyH * 0.38);
    const baseY = f(top + tableH);
    const bottom = f(baseY + bodyH * 0.62);
    const yFan = f(bottom + 14);
    const yEnd = f(yFan + 26);
    const H = Math.ceil(sw ? yEnd + 3 : bottom + 6);
    return { b, W, H, x0, bodyL, top, tableH, baseY, bottom, yFan, yEnd };
  };
  const portX = (L: ReturnType<typeof layout>) => ({ head: f(L.x0 + 8), rod: f(L.x0 + 20) });
  const svg = (p: ParamValues) => {
    const L = layout(p);
    const { b, x0, bodyL, top, baseY, bottom } = L;
    const px = portX(L);
    const od = Number(p.fitting);
    const sw = switches(p, { 1: x0 + 6, 2: x0 + bodyL - 6 }, bottom - 7, L.W, L.yFan, L.yEnd, MXQ_NAMES);
    return `${DEFS}
  <!-- 本体（ボディ。下側、シリンダを内蔵） -->
  <rect x="${x0}" y="${baseY}" width="${f(bodyL)}" height="${f(bottom - baseY)}" rx="1.6" fill="url(#sl-alu-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  <line x1="${f(x0 + 1)}" y1="${f((baseY + bottom) / 2)}" x2="${f(x0 + bodyL - 1)}" y2="${f((baseY + bottom) / 2)}" stroke="#8b9299" stroke-width="0.6"/>
  <!-- テーブル（上側。クロスローラガイドで前後に動く）とエンドプレート -->
  <rect x="${f(x0 + 28)}" y="${top}" width="${f(bodyL - 12)}" height="${L.tableH}" rx="1.2" fill="url(#sl-table-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  ${[0.25, 0.5, 0.75].map((t) => `<circle cx="${f(x0 + 28 + (bodyL - 12) * t)}" cy="${f(top + L.tableH / 2)}" r="1.6" fill="#7d848b"/>`).join('')}
  <rect x="${f(x0 + bodyL + 16)}" y="${top}" width="5" height="${f(bottom - top)}" rx="1" fill="url(#sl-table-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  <path d="M${f(x0 + bodyL + 2)} ${f(top + L.tableH + 2)} h12" stroke="#2e8b3a" stroke-width="0.9"/>
  <path d="M${f(x0 + bodyL + 15)} ${f(top + L.tableH + 2)} l-3 -1.8 v3.6 Z" fill="#2e8b3a"/>
  ${text(f(x0 + bodyL * 0.55), f(baseY + (bottom - baseY) * 0.42), 'SMC', Math.min(6, (bottom - baseY) * 0.32), '#1f5fa8')}
  ${bodyL > 60 ? text(f(x0 + bodyL * 0.55), f(baseY + (bottom - baseY) * 0.82), `MXQ${b.bore}-${p.stroke}`, 4, '#333', 'normal') : ''}
  <!-- ポート（本体の後端の上面）。H: 給気でテーブルが前進、R: 給気で後退 -->
  ${fitting(px.head, baseY, od)}${fitting(px.rod, baseY, od)}
  ${text(px.head, f(baseY + 5.5), 'H', 3.8, '#333')}${text(px.rod, f(baseY + 5.5), 'R', 3.8, '#333')}
  ${sw.svg}`;
  };
  const terminals = (p: ParamValues): TerminalDef[] => {
    const L = layout(p);
    const b = L.b;
    const px = portX(L);
    const range = { minPressure: b.minPressure, maxPressure: 0.7 };
    const sw = switches(p, { 1: L.x0 + 6, 2: L.x0 + L.bodyL - 6 }, L.bottom - 7, L.W, L.yFan, L.yEnd, MXQ_NAMES);
    return [
      { id: 'HEAD', label: '前進', hint: '前進側', note: `前進側のポート（${b.thread}。給気でテーブルが前進する）`, x: px.head, y: f(L.baseY - 18), side: 'top', role: 'air', air: { kind: 'work', tubeOD: { param: 'fitting' }, thread: b.thread, ...range } },
      { id: 'ROD', label: '後退', hint: '後退側', note: `後退側のポート（${b.thread}。給気でテーブルが後退する）`, x: px.rod, y: f(L.baseY - 18), side: 'top', role: 'air', air: { kind: 'work', tubeOD: { param: 'fitting' }, thread: b.thread, ...range } },
      ...sw.terminals,
    ];
  };
  const params = [
    { key: 'bore', label: 'サイズ（シリンダ内径）', unit: 'mm', options: MXQ.map((b) => ({ value: b.bore, label: `MXQ${b.bore}（${b.thread}）` })), default: 16 },
    { key: 'stroke', label: 'ストローク', unit: 'mm', options: MXQ_STROKES.map((v) => ({ value: v, label: `${v}mm` })), optionsFor: (p: ParamValues) => boreOf(p).strokes.map((v) => ({ value: v, label: `${v}mm` })), default: 20 },
    { key: 'fitting', label: 'ポートの継手（チューブ外径）', unit: 'mm', options: [4, 6].map((v) => ({ value: v, label: `φ${v}` })), default: 4 },
    ...switchParams({ names: { 1: '後退端', 2: '前進端' }, magnet: false }),
  ];
  const defaults: ParamValues = Object.fromEntries(params.map((x) => [x.key, x.default]));
  const L0 = layout(defaults);
  return {
    type,
    name: 'エアスライドテーブル（ガイド付きシリンダ）',
    model: 'MXQ16-20',
    modelOf: (p) => `MXQ${boreOf(p).bore}-${p.stroke}${switchSuffix(p)}`,
    maker: 'SMC',
    category: 'actuator',
    description:
      'SMC のエアスライドテーブル MXQ シリーズ（クロスローラガイド・複動、マグネット内蔵）。ガイドとシリンダが一体で、テーブルにワーク・ハンドを直接載せて前後に送る。' +
      'ポートは本体の後端にあり、HEAD（前進）・ROD（後退）を 5 ポート電磁弁の A・B に 1 本ずつつなぐ。使用圧力 0.15〜0.7MPa。' +
      switchDescription({ 1: '後退端', 2: '前進端' }),
    estimated: 'φ20・25 のポートのねじ（Rc1/8）、サイズごとのストロークの範囲、外形寸法は推定',
    labelPrefix: 'CY',
    width: L0.W,
    height: L0.H,
    size: (p) => {
      const L = layout(p);
      return { width: L.W, height: L.H };
    },
    svg,
    terminals,
    links: switchLinks,
    params,
    pneumatic: (p) => {
      const switches = pneumaticSwitches(p);
      return { symbol: 'cylinder', ports: { head: 'HEAD', rod: 'ROD' }, cylinder: { acting: 'double', magnet: true, ...(switches ? { switches } : {}) } };
    },
  };
}

/* ------------------------------------------------------------------ */
/* メカジョイント式ロッドレスシリンダ MY1B                                */
/* ------------------------------------------------------------------ */

const MY1B: Bore[] = [
  { bore: 16, thread: 'M5', minPressure: 0.15, height: 30, strokes: [] },
  { bore: 20, thread: 'M5', minPressure: 0.1, height: 37, strokes: [] },
  { bore: 25, thread: 'Rc1/8', minPressure: 0.1, height: 45, strokes: [] },
  { bore: 32, thread: 'Rc1/8', minPressure: 0.1, height: 55, strokes: [] },
  { bore: 40, thread: 'Rc1/4', minPressure: 0.1, height: 65, strokes: [] },
];
const MY1B_STROKES = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
const MY1B_NAMES: Record<1 | 2, SwitchName> = { 1: { short: '左端', long: '左端（スライダが左に来た位置）' }, 2: { short: '右端', long: '右端（スライダが右に来た位置）' } };

export function buildMy1b(type: string): DeviceDefinition {
  const k = 0.8;
  const boreOf = (p: ParamValues) => MY1B.find((b) => b.bore === Number(p.bore)) ?? MY1B[2];
  const layout = (p: ParamValues) => {
    const b = boreOf(p);
    const stroke = Number(p.stroke);
    // 長いストロークは 300mm を超えた分を縮めて描く
    const drawn = stroke <= 300 ? stroke : 300 + (stroke - 300) * 0.25;
    const cap = b.height * 0.7 * k;
    const slider = b.height * 2.4 * k;
    const tubeL = (drawn + b.height * 2.4) * k * 0.6;
    const bodyH = b.height * 0.7 * k;
    const total = cap * 2 + tubeL;
    const sw = switchOf(p);
    const W = Math.ceil(Math.max(total + 12, sw && switchSlots(p).length === 2 ? leadsMinWidth(sw.wires) : 0));
    const x0 = f((W - total) / 2);
    const top = 34;
    const sliderTop = f(top - bodyH * 0.25);
    const bottom = f(top + bodyH);
    const yFan = f(bottom + 14);
    const yEnd = f(yFan + 26);
    const H = Math.ceil(sw ? yEnd + 3 : bottom + 6);
    return { b, W, H, x0, cap: f(cap), tubeL: f(tubeL), total: f(total), slider: f(slider), top, sliderTop, bottom, bodyH: f(bodyH), yFan, yEnd };
  };
  const portX = (L: ReturnType<typeof layout>) => ({ l: f(L.x0 + L.cap / 2), r: f(L.x0 + L.total - L.cap / 2) });
  const svg = (p: ParamValues) => {
    const L = layout(p);
    const { b, x0, cap, total, top, bottom, bodyH } = L;
    const px = portX(L);
    const od = Number(p.fitting);
    const sx = f(x0 + cap + (L.tubeL - L.slider) / 2);
    const sw = switches(p, { 1: x0 + cap + 3, 2: x0 + total - cap - 3 }, bottom - 6.5, L.W, L.yFan, L.yEnd, MY1B_NAMES);
    return `${DEFS}
  <!-- シリンダチューブ（スリット付き、上面をシールベルトがふさぐ） -->
  <rect x="${f(x0 + cap - 1)}" y="${top}" width="${f(L.tubeL + 2)}" height="${bodyH}" fill="url(#sl-alu-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>
  <line x1="${f(x0 + cap)}" y1="${f(top + 2)}" x2="${f(x0 + cap + L.tubeL)}" y2="${f(top + 2)}" stroke="#2b2d31" stroke-width="1.2"/>
  <line x1="${f(x0 + cap)}" y1="${f(top + bodyH * 0.6)}" x2="${f(x0 + cap + L.tubeL)}" y2="${f(top + bodyH * 0.6)}" stroke="#8b9299" stroke-width="0.5"/>
  <!-- エンドカバー（左右。ポート付き） -->
  <rect x="${x0}" y="${f(top - 2)}" width="${cap}" height="${f(bodyH + 4)}" rx="1.4" fill="url(#sl-table-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  <rect x="${f(x0 + total - cap)}" y="${f(top - 2)}" width="${cap}" height="${f(bodyH + 4)}" rx="1.4" fill="url(#sl-table-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  <!-- スライダ（ピストンとメカジョイントでつながり、ワークを載せる） -->
  <rect x="${sx}" y="${L.sliderTop}" width="${L.slider}" height="${f(bottom - L.sliderTop - bodyH * 0.35)}" rx="1.4" fill="url(#sl-table-{{uid}})" stroke="#4f565d" stroke-width="0.8"/>
  ${[0.2, 0.8].map((t) => `<circle cx="${f(sx + L.slider * t)}" cy="${f(L.sliderTop + 3)}" r="1.3" fill="#6b7279"/>`).join('')}
  ${text(f(sx + L.slider / 2), f(L.sliderTop + (bottom - L.sliderTop - bodyH * 0.35) * 0.62), 'SMC', Math.min(6, bodyH * 0.45), '#1f5fa8')}
  ${L.tubeL > 90 ? text(f(x0 + cap + L.tubeL * 0.18), f(bottom - 2), `MY1B${b.bore}-${p.stroke}`, 3.8, '#333', 'normal') : ''}
  <path d="M${f(sx - 14)} ${f(L.sliderTop - 3)} h-8 M${f(sx + L.slider + 14)} ${f(L.sliderTop - 3)} h8" stroke="#2e8b3a" stroke-width="0.9"/>
  <path d="M${f(sx - 23)} ${f(L.sliderTop - 3)} l3 -1.8 v3.6 Z M${f(sx + L.slider + 23)} ${f(L.sliderTop - 3)} l-3 -1.8 v3.6 Z" fill="#2e8b3a"/>
  ${fitting(px.l, f(top - 2), od)}${fitting(px.r, f(top - 2), od)}
  ${text(px.l, f(top + bodyH / 2 + 2), 'L', 4, '#333')}${text(px.r, f(top + bodyH / 2 + 2), 'R', 4, '#333')}
  ${sw.svg}`;
  };
  const terminals = (p: ParamValues): TerminalDef[] => {
    const L = layout(p);
    const b = L.b;
    const px = portX(L);
    const range = { minPressure: b.minPressure, maxPressure: 0.8 };
    const sw = switches(p, { 1: L.x0 + L.cap + 3, 2: L.x0 + L.total - L.cap - 3 }, L.bottom - 6.5, L.W, L.yFan, L.yEnd, MY1B_NAMES);
    const y = f(L.top - 2 - 18);
    return [
      { id: 'L', label: '左ポート', hint: '左ポート', note: `左のエンドカバーのポート（${b.thread}。給気でスライダが右へ動く）`, x: px.l, y, side: 'top', role: 'air', air: { kind: 'work', tubeOD: { param: 'fitting' }, thread: b.thread, ...range } },
      { id: 'R', label: '右ポート', hint: '右ポート', note: `右のエンドカバーのポート（${b.thread}。給気でスライダが左へ動く）`, x: px.r, y, side: 'top', role: 'air', air: { kind: 'work', tubeOD: { param: 'fitting' }, thread: b.thread, ...range } },
      ...sw.terminals,
    ];
  };
  const params = [
    { key: 'bore', label: 'チューブ内径', unit: 'mm', options: MY1B.map((b) => ({ value: b.bore, label: `φ${b.bore}（${b.thread}）` })), default: 25 },
    { key: 'stroke', label: 'ストローク', unit: 'mm', options: MY1B_STROKES.map((v) => ({ value: v, label: `${v}mm` })), default: 300 },
    { key: 'fitting', label: 'ポートの継手（チューブ外径）', unit: 'mm', options: [4, 6, 8].map((v) => ({ value: v, label: `φ${v}` })), default: 6 },
    ...switchParams({ names: { 1: '左端', 2: '右端' }, magnet: false }),
  ];
  const defaults: ParamValues = Object.fromEntries(params.map((x) => [x.key, x.default]));
  const L0 = layout(defaults);
  return {
    type,
    name: 'ロッドレスシリンダ（メカジョイント式）',
    model: 'MY1B25-300Z',
    modelOf: (p) => `MY1B${boreOf(p).bore}-${p.stroke}Z${switchSuffix(p)}`,
    maker: 'SMC',
    category: 'actuator',
    description:
      'SMC のメカジョイント式ロッドレスシリンダ MY1B シリーズ（基本形・複動、マグネット内蔵）。ロッドがなく、チューブのスリットを通したスライダが端から端まで動くので、長いストロークでも全長が短い。' +
      'ポートは左右のエンドカバーにあり、L（給気でスライダが右へ）・R（給気でスライダが左へ）を 5 ポート電磁弁の A・B に 1 本ずつつなぐ。' +
      `使用圧力 0.1（φ16 は 0.15）〜0.8MPa。空圧回路図では複動シリンダの記号で描く（head = L、rod = R）。` +
      switchDescription({ 1: '左端', 2: '右端' }),
    estimated: 'φ25 以上のポートのねじ（Rc1/8・φ40 は Rc1/4）、内径ごとの最低使用圧力、外形寸法は推定',
    labelPrefix: 'CY',
    width: L0.W,
    height: L0.H,
    size: (p) => {
      const L = layout(p);
      return { width: L.W, height: L.H };
    },
    svg,
    terminals,
    links: switchLinks,
    params,
    pneumatic: (p) => {
      const sws = pneumaticSwitches(p);
      return { symbol: 'cylinder', ports: { head: 'L', rod: 'R' }, cylinder: { acting: 'double', magnet: true, ...(sws ? { switches: sws } : {}) } };
    },
  };
}
