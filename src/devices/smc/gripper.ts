/**
 * SMC エアチャック MHZ2 シリーズ（平行開閉形、標準形）の機器定義を作る。
 *
 * 正面から見た姿で、上が本体（上面に開ポート・閉ポートと継手）、下が 2 本のフィンガ。
 * オートスイッチ（D-M9 シリーズ）は本体の左右の溝に付き、SW1 が開側（フィンガが開いた位置）、SW2 が閉側（閉じた位置・ワークの把持）を検出する。
 * 単動は、S（常時開: 閉ポートへ給気して閉じ、ばねで開く）と C（常時閉: 開ポートへ給気して開き、ばねで閉じる）。
 * スピードコントローラ（エルボ形）はパラメータで選ぶと使うポートに直付けする（M5 のポートだけ。M3 に付くエルボ形は AS-F にない）。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { pneumaticSwitchList, leadsMinWidth, spreadLeads, switchBody, switchCable, labelSideOf, switchDescription, switchLinks, switchOf, switchParams, switchSlots, switchSuffix, switchTerminals, type SwitchName } from './autoswitch';
import {
  fittingSpecLabel,
  elbowMissing,
  elbowOnPort,
  portAirThread,
  portSpeedController,
  speedControllerAccessories,
  speedControllerHint,
  speedControllerNote,
  speedControllerParam,
} from './speed-controller';

export interface GripperSize {
  size: number;
  /** ポートのねじ */
  thread: string;
  /** 開閉ストローク（両側）[mm] */
  stroke: number;
  /** 最低使用圧力[MPa]（複動・単動） */
  minPressure: number;
  minPressureSingle: number;
  /** 本体の幅・高さ[mm]（描画用） */
  bodyW: number;
  bodyH: number;
}

export interface GripperSeries {
  type: string;
  sizes: GripperSize[];
  defaultSize: number;
  maxPressure: number;
  /** 型式（sw はオートスイッチの末尾） */
  model: (p: ParamValues, sw: string) => string;
  description: string;
  estimated?: string;
}

const NAMES: Record<1 | 2, SwitchName> = {
  1: { short: '開側', long: '開側（フィンガが開いた位置）' },
  2: { short: '閉側', long: '閉側（フィンガが閉じた位置・把持）' },
};

const f = (n: number) => +n.toFixed(2);
const K = 1.7;
const FIT = 22;

function sizeOf(s: GripperSeries, p: ParamValues) {
  return s.sizes.find((x) => x.size === Number(p.size)) ?? s.sizes.find((x) => x.size === s.defaultSize)!;
}

function layout(s: GripperSeries, p: ParamValues) {
  const z = sizeOf(s, p);
  const bw = f(z.bodyW * K);
  const bh = f(z.bodyH * K);
  const sw = switchOf(p);
  const W = Math.ceil(Math.max(bw + 16, sw && switchSlots(p).length === 2 ? leadsMinWidth(sw.wires) : 0, 70));
  const x0 = f((W - bw) / 2);
  const top = FIT + 3;
  const fingerH = f(Math.max(12, z.bodyH * 0.4 * K));
  const bottom = f(top + bh + fingerH);
  const yFan = f(bottom + 14);
  const yEnd = f(yFan + 26);
  const H = Math.ceil(sw ? yEnd + 3 : bottom + 6);
  const ports = { OPEN: f(x0 + bw * 0.3), CLOSE: f(x0 + bw * 0.7) };
  const swW = f(Math.max(8, Math.min(bh * 0.5, 20)));
  const bodies = switchSlots(p).map((slot) => ({ slot, x: slot === 1 ? f(x0 + 3) : f(x0 + bw - 3 - 5), y: f(top + bh * 0.35), w: swW }));
  const leads = sw ? spreadLeads(bodies.map((b) => ({ slot: b.slot, x: b.slot === 1 ? x0 : x0 + bw })), sw.wires, 2, W - 2) : [];
  return { z, bw, bh, W, H, x0, top, fingerH, bottom, yFan, yEnd, ports, bodies, leads };
}

const actionOf = (p: ParamValues): 'D' | 'S' | 'C' => (p.action === 'S' ? 'S' : p.action === 'C' ? 'C' : 'D');

export function buildGripper(s: GripperSeries): DeviceDefinition {
  const params = [
    { key: 'size', label: 'サイズ（シリンダ内径）', options: s.sizes.map((z) => ({ value: z.size, label: `${z.size}（開閉ストローク ${z.stroke}mm・${z.thread}）` })), default: s.defaultSize },
    {
      key: 'action',
      label: '作動方式',
      options: [
        { value: 'D', label: '複動（D）' },
        { value: 'S', label: '単動・常時開（S）' },
        { value: 'C', label: '単動・常時閉（C）' },
      ],
      default: 'D',
    },
    { key: 'fitting', label: 'ポートの継手（チューブ外径）', specLabel: fittingSpecLabel, unit: 'mm', options: [4, 6].map((v) => ({ value: v, label: `φ${v}` })), default: 4 },
    speedControllerParam,
    ...switchParams({ names: { 1: '開側', 2: '閉側' }, magnet: false }),
  ];
  const defaults: ParamValues = Object.fromEntries(params.map((p) => [p.key, p.default]));
  const L0 = layout(s, defaults);

  const svg = (p: ParamValues) => {
    const L = layout(s, p);
    const { x0, top, bw, bh } = L;
    const act = actionOf(p);
    const od = Number(p.fitting);
    const sw = switchOf(p);
    const fy = top + bh;
    const fw = Math.max(6, bw * 0.22);
    const open = bw * 0.5;
    let out = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9ea5ac"/>
      <stop offset="0.25" stop-color="#eef0f2"/>
      <stop offset="0.8" stop-color="#c7ccd1"/>
      <stop offset="1" stop-color="#8d949b"/>
    </linearGradient>
    <linearGradient id="finger-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7d848b"/>
      <stop offset="0.5" stop-color="#d9dde1"/>
      <stop offset="1" stop-color="#6f767d"/>
    </linearGradient>
  </defs>
  <!-- 本体 -->
  <rect x="${x0}" y="${top}" width="${bw}" height="${bh}" rx="2" fill="url(#body-{{uid}})" stroke="#5f666d" stroke-width="0.7"/>
  <line x1="${f(x0 + 1)}" y1="${f(top + bh * 0.25)}" x2="${f(x0 + bw - 1)}" y2="${f(top + bh * 0.25)}" stroke="#8b9299" stroke-width="0.5"/>
  <!-- ガイド（フィンガの案内） -->
  <rect x="${f(x0 + 2)}" y="${f(fy - 4)}" width="${f(bw - 4)}" height="5" rx="0.8" fill="#5b6268" stroke="#33383c" stroke-width="0.5"/>
  <!-- フィンガ -->
  ${[-1, 1]
    .map((d) => {
      const cx = x0 + bw / 2 + d * open * 0.5;
      return `<rect x="${f(cx - fw / 2)}" y="${f(fy)}" width="${f(fw)}" height="${L.fingerH}" rx="1" fill="url(#finger-{{uid}})" stroke="#4f565c" stroke-width="0.6"/>
  <circle cx="${f(cx)}" cy="${f(fy + L.fingerH * 0.35)}" r="${f(Math.max(1, fw * 0.14))}" fill="#3a3c3f"/>`;
    })
    .join('')}
  ${text(f(x0 + bw / 2), f(top + bh * 0.62), 'SMC', Math.min(7, bw * 0.16), '#1f5fa8')}
  ${text(f(x0 + bw / 2), f(top + bh * 0.84), `MHZ2-${p.size}`, Math.min(4.6, bw * 0.11), '#333', 'normal')}`;
    // ポートと継手
    for (const id of ['OPEN', 'CLOSE'] as const) {
      const x = L.ports[id];
      const used = act === 'D' || (act === 'S' ? id === 'CLOSE' : id === 'OPEN');
      const w = Math.max(7, od * 1.25);
      const sc = portSpeedController(p, L.z.thread, od);
      // スピードコントローラのつまみは、隣のポートに重ならないよう外側へ向ける
      out += used && sc?.model
        ? elbowOnPort(x, top, od, id === 'OPEN' ? 'left' : 'right', sc)
        : used
        ? `<rect x="${f(x - w / 2 - 1)}" y="${f(top - 5)}" width="${f(w + 2)}" height="5" rx="0.6" fill="#c9ced3" stroke="#5c6166" stroke-width="0.5"/>
  <rect x="${f(x - w / 2)}" y="${f(top - 15)}" width="${f(w)}" height="10" rx="1.2" fill="#eef0f2" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${f(x - w / 2 - 0.6)}" y="${f(top - 18.5)}" width="${f(w + 1.2)}" height="4" rx="1" fill="#e9ebed" stroke="#7d8287" stroke-width="0.5"/>${sc ? elbowMissing(x, top) : ''}`
        : `<circle cx="${x}" cy="${f(top + 3)}" r="1.4" fill="#3a3c3f"/>${text(x, f(top - 1.5), '呼吸口', 3.2, '#555', 'normal')}`;
      out += text(x, f(top + 9), id === 'OPEN' ? '開' : '閉', 4.2, '#333');
    }
    if (sw) {
      for (const b of L.bodies) {
        out += switchBody(b.x, b.y, 5, b.w, sw, 'left');
        const lead = L.leads.find((x) => x.slot === b.slot)!;
        out += switchCable({ x: b.x + 2.5, y: b.y + b.w }, lead.x, L.yFan, L.yEnd, sw, `SW${b.slot} ${NAMES[b.slot].short}`, labelSideOf(b.slot, L.leads.length, lead.x, L.W));
      }
    }
    return out;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const L = layout(s, p);
    const act = actionOf(p);
    const range = { minPressure: act === 'D' ? L.z.minPressure : L.z.minPressureSingle, maxPressure: s.maxPressure };
    const sc = portSpeedController(p, L.z.thread, Number(p.fitting));
    const port = (id: 'OPEN' | 'CLOSE'): TerminalDef => ({
      id,
      label: id === 'OPEN' ? '開ポート' : '閉ポート',
      hint: id === 'OPEN' ? '開' : '閉',
      note: `${id === 'OPEN' ? '開ポート（給気でフィンガが開く' : '閉ポート（給気でフィンガが閉じる'}。${L.z.thread}${speedControllerNote(sc)}）`,
      x: L.ports[id],
      y: L.top - 20,
      side: 'top',
      role: 'air',
      air: { kind: 'work', tubeOD: { param: 'fitting' }, ...portAirThread(sc, L.z.thread), ...range },
    });
    const air: TerminalDef[] = [];
    if (act !== 'S') air.push(port('OPEN'));
    if (act !== 'C') air.push(port('CLOSE'));
    return [...air, ...switchTerminals(p, L.leads, L.yEnd, NAMES)];
  };

  return {
    type: s.type,
    name: 'エアチャック（平行開閉形）',
    model: 'MHZ2（6〜40）',
    modelOf: (p) => s.model(p, switchSuffix(p)),
    maker: 'SMC',
    category: 'actuator',
    description:
      `${s.description}サイズ・作動方式・ポートに付けるワンタッチ管継手のチューブ外径をパラメータで選ぶ。ポートは OPEN（開: 給気でフィンガが開く）と CLOSE（閉: 給気で閉じる）。` +
      'パラメータ speedController でエルボ形スピードコントローラをポートに直付けできる（M5 のポートのサイズ 16 以上。型式はチューブ外径で決まる）。' +
      `複動は 5 ポート電磁弁の A・B に 1 本ずつつなぐ。最高使用圧力 ${s.maxPressure}MPa。マグネットは標準で内蔵。` +
      switchDescription({ 1: '開側（フィンガが開いた位置）', 2: '閉側（閉じた位置・把持）' }),
    labelPrefix: 'HD',
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
    accessories: (p) => {
      const act = actionOf(p);
      const thread = sizeOf(s, p).thread;
      const ports: [string, string][] = [];
      if (act !== 'S') ports.push(['OPEN', thread]);
      if (act !== 'C') ports.push(['CLOSE', thread]);
      return speedControllerAccessories(p, ports, Number(p.fitting));
    },
    pneumatic: (p) => {
      const act = actionOf(p);
      const switches = pneumaticSwitchList(p, { 1: '開', 2: '閉' });
      const thread = sizeOf(s, p).thread;
      const ports: [string, string][] = [];
      if (act !== 'S') ports.push(['open', thread]);
      if (act !== 'C') ports.push(['close', thread]);
      return {
        symbol: 'gripper',
        ports: (act === 'D' ? { open: 'OPEN', close: 'CLOSE' } : act === 'S' ? { close: 'CLOSE' } : { open: 'OPEN' }) as Record<string, string>,
        ...(switches ? { switches } : {}),
        ...speedControllerHint(p, ports, Number(p.fitting)),
      };
    },
  };
}
