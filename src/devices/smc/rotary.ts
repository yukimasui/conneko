/**
 * SMC ロータリテーブル MSQ シリーズ（ラック＆ピニオン形、MSQB 基本形）の機器定義を作る。
 *
 * 正面から見た姿で、横長の本体（中にラックとピストン）の上に回転テーブルがあり、本体の両端に回転角度の調整ボルト（A）
 * またはショックアブソーバ（R）が付く。ポートは本体の左右の上面に A・B として描く（実物は本体の側面にある）。
 * オートスイッチ（D-M9 シリーズ）は本体の溝に付き、SW1 が A ポート側の回転端、SW2 が B ポート側の回転端を検出する。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { leadsMinWidth, spreadLeads, switchBody, switchCable, labelSideOf, switchDescription, switchLinks, switchOf, switchParams, switchSlots, switchSuffix, switchTerminals, type SwitchName } from './autoswitch';

export interface RotarySize {
  size: number;
  thread: string;
  /** 最低使用圧力[MPa] */
  minPressure: number;
  maxPressure: number;
  /** ショックアブソーバ内蔵（R）を選べる */
  absorber: boolean;
  /** 本体の長さ・高さ、テーブル径[mm]（描画用） */
  bodyL: number;
  bodyH: number;
  table: number;
}

export interface RotarySeries {
  type: string;
  sizes: RotarySize[];
  defaultSize: number;
  model: (p: ParamValues, sw: string) => string;
  description: string;
  estimated?: string;
}

const NAMES: Record<1 | 2, SwitchName> = {
  1: { short: 'A側端', long: 'A ポートへ給気して回り切った端' },
  2: { short: 'B側端', long: 'B ポートへ給気して回り切った端' },
};

const f = (n: number) => +n.toFixed(2);
const FIT = 22;

function sizeOf(s: RotarySeries, p: ParamValues) {
  return s.sizes.find((x) => x.size === Number(p.size)) ?? s.sizes.find((x) => x.size === s.defaultSize)!;
}

function layout(s: RotarySeries, p: ParamValues) {
  const z = sizeOf(s, p);
  const k = Math.min(1.8, 120 / z.bodyL);
  const bl = f(z.bodyL * k);
  const bh = f(z.bodyH * k);
  const tableD = f(z.table * k);
  const tableH = f(Math.max(6, z.bodyH * 0.28 * k));
  const boltL = 9;
  const sw = switchOf(p);
  const W = Math.ceil(Math.max(bl + 2 * boltL + 8, sw && switchSlots(p).length === 2 ? leadsMinWidth(sw.wires) : 0));
  const x0 = f((W - bl) / 2);
  const top = FIT + 3 + tableH;
  const bottom = f(top + bh);
  const yFan = f(bottom + 14);
  const yEnd = f(yFan + 26);
  const H = Math.ceil(sw ? yEnd + 3 : bottom + 6);
  const ports = { A: f(x0 + Math.max(7, bl * 0.12)), B: f(x0 + bl - Math.max(7, bl * 0.12)) };
  const swW = f(Math.min(bl * 0.3, 30));
  const bodies = switchSlots(p).map((slot) => ({ slot, x: slot === 1 ? f(x0 + 3) : f(x0 + bl - 3 - swW), w: swW }));
  const leads = sw ? spreadLeads(bodies.map((b) => ({ slot: b.slot, x: b.slot === 1 ? b.x : b.x + b.w })), sw.wires, 2, W - 2) : [];
  return { z, k, bl, bh, tableD, tableH, boltL, W, H, x0, top, bottom, yFan, yEnd, ports, bodies, leads };
}

export function buildRotary(s: RotarySeries): DeviceDefinition {
  const params = [
    { key: 'size', label: 'サイズ', options: s.sizes.map((z) => ({ value: z.size, label: `${z.size}（${z.thread}）` })), default: s.defaultSize },
    {
      key: 'adjust',
      label: '角度調整',
      options: [
        { value: 'A', label: '調整ボルト（A）' },
        { value: 'R', label: 'ショックアブソーバ内蔵（R。サイズ 10 以上・0.6MPa まで）' },
      ],
      default: 'A',
    },
    { key: 'fitting', label: 'ポートの継手（チューブ外径）', unit: 'mm', options: [4, 6, 8].map((v) => ({ value: v, label: `φ${v}` })), default: 4 },
    ...switchParams({ names: { 1: 'A 側の回転端', 2: 'B 側の回転端' }, magnet: false }),
  ];
  const defaults: ParamValues = Object.fromEntries(params.map((p) => [p.key, p.default]));
  const L0 = layout(s, defaults);

  const svg = (p: ParamValues) => {
    const L = layout(s, p);
    const { x0, top, bl, bh } = L;
    const od = Number(p.fitting);
    const sw = switchOf(p);
    const absorber = p.adjust === 'R' && L.z.absorber;
    const cx = x0 + bl / 2;
    let out = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ecef"/>
      <stop offset="0.5" stop-color="#cfd4d8"/>
      <stop offset="1" stop-color="#959ca3"/>
    </linearGradient>
    <linearGradient id="table-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d949b"/>
      <stop offset="0.4" stop-color="#f1f3f5"/>
      <stop offset="1" stop-color="#7d848b"/>
    </linearGradient>
  </defs>
  <!-- 回転テーブル -->
  <rect x="${f(cx - L.tableD / 2)}" y="${f(top - L.tableH)}" width="${L.tableD}" height="${f(L.tableH + 1)}" rx="1" fill="url(#table-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>
  <path d="M${f(cx - L.tableD * 0.3)} ${f(top - L.tableH * 0.5)} A${f(L.tableD * 0.3)} ${f(L.tableH * 0.35)} 0 0 0 ${f(cx + L.tableD * 0.3)} ${f(top - L.tableH * 0.5)}" fill="none" stroke="#1f5fa8" stroke-width="0.7"/>
  <!-- 本体 -->
  <rect x="${x0}" y="${top}" width="${bl}" height="${bh}" rx="2" fill="url(#body-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  <line x1="${f(x0 + 1)}" y1="${f(top + bh * 0.55)}" x2="${f(x0 + bl - 1)}" y2="${f(top + bh * 0.55)}" stroke="#8b9299" stroke-width="0.6"/>
  ${text(f(cx), f(top + bh * 0.42), 'SMC', Math.min(7, bh * 0.28), '#1f5fa8')}
  ${text(f(cx), f(top + bh * 0.8), `MSQB${p.size}${absorber ? 'R' : 'A'}`, Math.min(4.6, bh * 0.18), '#333', 'normal')}
  <!-- 角度調整（両端） -->
  ${[-1, 1]
    .map((d) => {
      const ex = d < 0 ? x0 : x0 + bl;
      const y = top + bh * 0.3;
      return absorber
        ? `<rect x="${f(d < 0 ? ex - L.boltL : ex)}" y="${f(y - 3)}" width="${L.boltL}" height="6" rx="1" fill="#2c2f33" stroke="#111" stroke-width="0.4"/>`
        : `<rect x="${f(d < 0 ? ex - L.boltL : ex)}" y="${f(y - 1.8)}" width="${L.boltL}" height="3.6" fill="#c9ced3" stroke="#555" stroke-width="0.4"/><rect x="${f(d < 0 ? ex - 4 : ex + 1)}" y="${f(y - 3)}" width="3" height="6" fill="#9aa0a6" stroke="#555" stroke-width="0.4"/>`;
    })
    .join('')}`;
    for (const id of ['A', 'B'] as const) {
      const x = L.ports[id];
      const w = Math.max(7, od * 1.25);
      out += `<rect x="${f(x - w / 2 - 1)}" y="${f(top - 5)}" width="${f(w + 2)}" height="5" rx="0.6" fill="#c9ced3" stroke="#5c6166" stroke-width="0.5"/>
  <rect x="${f(x - w / 2)}" y="${f(top - 15)}" width="${f(w)}" height="10" rx="1.2" fill="#eef0f2" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${f(x - w / 2 - 0.6)}" y="${f(top - 18.5)}" width="${f(w + 1.2)}" height="4" rx="1" fill="#e9ebed" stroke="#7d8287" stroke-width="0.5"/>`;
      out += text(x, f(top + 6.5), id, 4.2, '#333');
    }
    if (sw) {
      const y = top + bh * 0.62;
      for (const b of L.bodies) {
        out += switchBody(b.x, y, b.w, 5, sw, b.slot === 1 ? 'left' : 'right');
        const lead = L.leads.find((x) => x.slot === b.slot)!;
        out += switchCable({ x: b.slot === 1 ? b.x + 1 : b.x + b.w - 1, y: y + 4 }, lead.x, L.yFan, L.yEnd, sw, `SW${b.slot} ${NAMES[b.slot].short}`, labelSideOf(b.slot, L.leads.length, lead.x, L.W));
      }
    }
    return out;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const L = layout(s, p);
    const port = (id: 'A' | 'B'): TerminalDef => ({
      id,
      label: `${id} ポート`,
      hint: `${id} ポート`,
      note: `${id} ポート（${L.z.thread}。給気で${id === 'A' ? '一方' : 'もう一方'}の向きへ回る）`,
      x: L.ports[id],
      y: L.top - 20,
      side: 'top',
      role: 'air',
      // ショックアブソーバ内蔵（R）の最高使用圧力は 0.6MPa
      air: { kind: 'work', tubeOD: { param: 'fitting' }, thread: L.z.thread, minPressure: L.z.minPressure, maxPressure: p.adjust === 'R' && L.z.absorber ? Math.min(0.6, L.z.maxPressure) : L.z.maxPressure },
    });
    return [port('A'), port('B'), ...switchTerminals(p, L.leads, L.yEnd, NAMES)];
  };

  return {
    type: s.type,
    name: 'ロータリテーブル（ラック＆ピニオン形）',
    model: 'MSQB（1〜200）',
    modelOf: (p) => s.model(p, switchSuffix(p)),
    maker: 'SMC',
    category: 'actuator',
    description:
      `${s.description}サイズ・角度調整（調整ボルト A / ショックアブソーバ R）・ポートに付けるワンタッチ管継手のチューブ外径をパラメータで選ぶ。` +
      'ポート A・B を 5 ポート電磁弁の A・B に 1 本ずつつなぐ（給気した側の向きへ回る）。マグネットは標準で内蔵。' +
      switchDescription({ 1: 'A 側の回転端', 2: 'B 側の回転端' }),
    labelPrefix: 'RA',
    width: L0.W,
    height: L0.H,
    size: (p) => {
      const L = layout(s, p);
      return { width: L.W, height: L.H };
    },
    svg,
    terminals,
    links: switchLinks,
    params,
    ...(s.estimated ? { estimated: s.estimated } : {}),
    pneumatic: { symbol: 'rotary', ports: { a: 'A', b: 'B' } },
  };
}
