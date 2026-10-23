/**
 * SMC エアシリンダ（CJ2・CM2・MB・CQ2・MGP）の機器定義を作る。
 *
 * 横から見た姿で、左がヘッド側（ヘッドカバー）、右がロッド側（ロッドカバーとピストンロッド）。ストロークに応じて機器の長さが変わる
 * （長いストロークは 100mm を超えた分を縮めて描く）。
 * - ポートはヘッドカバー・ロッドカバーの上面にあり、付けたワンタッチ管継手から上へチューブを出す（端子 HEAD・ROD、上向き）
 * - オートスイッチ（D-M9 シリーズ）はパラメータで選ぶと、チューブの両端（SW1: ヘッド側＝後退端、SW2: ロッド側＝前進端）に付き、
 *   リード線が下へ出る（src/devices/smc/autoswitch.ts）
 * - 単動（S: スプリングリターン・押出し、T: スプリングエクステンド・引込み）はエアを入れる側のポートだけを端子にし、反対側は呼吸口として描く
 *
 * シリンダは中でエアが通り抜けないので airLinks は書かない。
 */
import type { DeviceDefinition, ParamDef, ParamValues, TerminalDef } from '../types';
import { text } from '../generic/parts';
import {
  hasMagnet,
  leadsMinWidth,
  pneumaticSwitches,
  spreadLeads,
  switchBody,
  switchCable,
  labelSideOf,
  switchDescription,
  switchLinks,
  switchOf,
  switchParams,
  switchSlots,
  switchSuffix,
  switchTerminals,
  type SwitchName,
} from './autoswitch';

/** チューブ内径ごとの寸法・仕様（寸法は mm） */
export interface BoreSpec {
  bore: number;
  /** ピストンロッド径 */
  rod: number;
  /** ポートのねじ */
  thread: string;
  /** カバー（ヘッド・ロッド）の外形（丸形は直径、角形は一辺） */
  cover: number;
  /** チューブの外径（角形・薄形は本体と同じ） */
  tube: number;
  /** ヘッドカバー・ロッドカバーの長さ */
  head: number;
  rodCover: number;
  /** ストローク 0 のときのチューブの長さ（ピストンの幅など） */
  tubeBase: number;
  /** 後退端でのロッドの突き出し（ロッド先端のねじを含む） */
  rodOut: number;
  /** 最低使用圧力[MPa]（複動） */
  minPressure: number;
  /** 最低使用圧力[MPa]（単動。minPressurePull があれば押出し形 S） */
  minPressureSingle?: number;
  /** 最低使用圧力[MPa]（単動引込み形 T） */
  minPressurePull?: number;
  /** 選べるストローク（省略時はシリーズの strokes） */
  strokes?: number[];
}

export type CylinderLook = 'round' | 'tierod' | 'compact' | 'guided';

/** 支持形式の描き方 */
export type MountShape =
  | 'basic'
  | 'through'
  | 'tapped'
  | 'foot'
  | 'flange-rod'
  | 'flange-head'
  | 'clevis1'
  | 'clevis2'
  | 'trunnion-center'
  | 'trunnion-head'
  | 'trunnion-rod';

export interface MountSpec {
  /** 型式の記号 */
  code: string;
  label: string;
  shape: MountShape;
}

export interface CylinderSeries {
  /** 機器の type（'smc.cm2' など） */
  type: string;
  /** シリーズ名（'CM2' など） */
  series: string;
  name: string;
  look: CylinderLook;
  /** 描く縮尺[px/mm] */
  scale: number;
  bores: BoreSpec[];
  defaultBore: number;
  strokes: number[];
  defaultStroke: number;
  mounts: MountSpec[];
  /** 最高使用圧力[MPa] */
  maxPressure: number;
  /** 単動（S・T）を選べる */
  single?: boolean;
  /** マグネットが標準で内蔵されている（MGP など） */
  magnetStandard?: boolean;
  /** 型式を組み立てる。sw はオートスイッチの末尾（'-M9BW' など） */
  model: (p: ParamValues, b: BoreSpec, sw: string) => string;
  /** 代表の型式（パレット・説明用） */
  representative: string;
  description: string;
  estimated?: string;
  /** シリーズ固有のパラメータ（MGP の軸受など） */
  extraParams?: ParamDef[];
  defaultFitting?: number;
}

const FIT = 22;
const SWITCH_NAMES: Record<1 | 2, SwitchName> = {
  1: { short: '後退端', long: 'ヘッド側（後退端）' },
  2: { short: '前進端', long: 'ロッド側（前進端）' },
};

/** ストロークを描く長さ[mm 相当]（100mm を超えた分は 0.4 倍に縮める） */
export const drawnStroke = (stroke: number) => (stroke <= 100 ? stroke : 100 + (stroke - 100) * 0.4);

const f = (n: number) => +n.toFixed(2);

/** 作動方式（'D' 複動、'S' 単動押出し、'T' 単動引込み） */
const actionOf = (p: ParamValues): 'D' | 'S' | 'T' => (p.action === 'S' ? 'S' : p.action === 'T' ? 'T' : 'D');

interface Layout {
  W: number;
  H: number;
  /** 本体の上端・下端 */
  top: number;
  bottom: number;
  cy: number;
  bodyH: number;
  tubeH: number;
  /** x 座標: クレビス等の左端、ヘッドカバー左端、チューブ左端・右端、ロッドカバー右端、ロッド先端 */
  xLeft: number;
  xHead: number;
  xTube0: number;
  xTube1: number;
  xRodCover: number;
  xRodEnd: number;
  rodH: number;
  /** 取付け金具の下端 */
  mountBottom: number;
  /** ポートの X（ヘッド側・ロッド側） */
  portHead: number;
  portRod: number;
  /** スイッチのリード線 */
  yFan: number;
  yEnd: number;
  leads: { slot: 1 | 2; x: number }[];
  /** スイッチ本体（x, 長さ） */
  sw: { slot: 1 | 2; x: number; w: number }[];
}

function boreOf(s: CylinderSeries, p: ParamValues): BoreSpec {
  return s.bores.find((b) => b.bore === Number(p.bore)) ?? s.bores.find((b) => b.bore === s.defaultBore)!;
}

/** 選んだ支持形式の描き方（支持形式がないシリーズは本体取付け） */
function shapeOf(s: CylinderSeries, p: ParamValues): MountShape | undefined {
  return s.mounts.find((m) => m.code === p.mount)?.shape;
}

function layout(s: CylinderSeries, p: ParamValues): Layout {
  const b = boreOf(s, p);
  const k = s.scale;
  const mount = shapeOf(s, p);
  const bodyH = f(b.cover * k);
  const tubeH = f(b.tube * k);
  const rodH = f(Math.max(b.rod * k, 3));
  // 左右の取付け金具の出っ張り
  const clevis = mount === 'clevis1' || mount === 'clevis2' ? Math.max(10, b.bore * 0.5) * k : 0;
  const headFlange = mount === 'flange-head' ? 4 : 0;
  const tubeLen = (b.tubeBase + drawnStroke(Number(p.stroke))) * k;
  const length = clevis + headFlange + (b.head + b.rodCover + b.rodOut) * k + tubeLen;
  const sw = switchOf(p);
  const slots = switchSlots(p);
  // スイッチ 2 個のリード線を並べる幅が本体より広いときは、本体を中央に寄せる
  const W = Math.ceil(Math.max(length + 10, sw && slots.length === 2 ? leadsMinWidth(sw.wires) : 0));
  const xLeft = f(4 + (W - length - 10) / 2);
  const xHead = f(xLeft + clevis + headFlange);
  const xTube0 = f(xHead + b.head * k);
  const xTube1 = f(xTube0 + tubeLen);
  const xRodCover = f(xTube1 + b.rodCover * k);
  const xRodEnd = f(xRodCover + b.rodOut * k);
  const top = FIT + 3;
  const cy = f(top + bodyH / 2);
  const bottom = f(top + bodyH);
  const foot = mount === 'foot' ? Math.max(6, b.cover * 0.25) * k : 0;
  const mountBottom = f(bottom + foot);
  const yFan = f(mountBottom + 16);
  const yEnd = f(yFan + 26);
  const H = Math.ceil(sw ? yEnd + 3 : mountBottom + 6);
  // スイッチ本体（D-M9 の長さ約 22mm。チューブの半分を超えない）
  const swW = f(Math.max(10, Math.min(22 * k, (xTube1 - xTube0) / 2 - 3, 34)));
  const swBodies = slots.map((slot) => ({ slot, x: slot === 1 ? f(xTube0 + 2) : f(xTube1 - 2 - swW), w: swW }));
  const want = swBodies.map((x) => ({ slot: x.slot, x: x.slot === 1 ? x.x : x.x + x.w }));
  const leads = sw ? spreadLeads(want, sw.wires, 2, W - 2) : [];
  const portInset = s.look === 'compact' || s.look === 'guided' ? 6 * k : 0;
  const portHead = f(s.look === 'compact' || s.look === 'guided' ? xTube0 + portInset : (xHead + xTube0) / 2);
  const portRod = f(s.look === 'compact' || s.look === 'guided' ? xTube1 - portInset : (xTube1 + xRodCover) / 2);
  return {
    W,
    H,
    top,
    bottom,
    cy,
    bodyH,
    tubeH,
    xLeft,
    xHead,
    xTube0,
    xTube1,
    xRodCover,
    xRodEnd,
    rodH,
    mountBottom,
    portHead,
    portRod,
    yFan,
    yEnd,
    leads,
    sw: swBodies,
  };
}

/** ワンタッチ管継手（ポートのねじ込み部の六角・本体・解除リング）。x はポートの中心、y はポートの面 */
function fitting(x: number, y: number, od: number): string {
  const w = Math.max(7, od * 1.25);
  return `
  <rect x="${f(x - w / 2 - 1)}" y="${f(y - 5)}" width="${f(w + 2)}" height="5" rx="0.6" fill="url(#hex-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  <path d="M${f(x - w / 6)} ${f(y - 5)} V${y} M${f(x + w / 6)} ${f(y - 5)} V${y}" stroke="#7b8187" stroke-width="0.4"/>
  <rect x="${f(x - w / 2)}" y="${f(y - 15)}" width="${f(w)}" height="10" rx="1.2" fill="url(#fit-{{uid}})" stroke="#6b7177" stroke-width="0.5"/>
  <rect x="${f(x - w / 2 - 0.6)}" y="${f(y - 18.5)}" width="${f(w + 1.2)}" height="4" rx="1" fill="#e9ebed" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="${f(x - od / 2)}" y="${f(y - 20)}" width="${f(od)}" height="2" fill="#2f7fd8" opacity="0.35"/>`;
}

/** 呼吸口（単動シリンダのエアを入れない側） */
function breather(x: number, y: number): string {
  return `<circle cx="${x}" cy="${f(y + 3)}" r="1.6" fill="#3a3c3f"/>${text(x, f(y - 1.5), '呼吸口', 3.4, '#555', 'normal')}`;
}

function defs(): string {
  return `
  <defs>
    <linearGradient id="tube-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa1a8"/>
      <stop offset="0.3" stop-color="#f3f5f7"/>
      <stop offset="0.65" stop-color="#c3c9ce"/>
      <stop offset="1" stop-color="#7d848b"/>
    </linearGradient>
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d949b"/>
      <stop offset="0.35" stop-color="#e2e6e9"/>
      <stop offset="1" stop-color="#6f767d"/>
    </linearGradient>
    <linearGradient id="rod-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a9096"/>
      <stop offset="0.4" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#7a8086"/>
    </linearGradient>
    <linearGradient id="hex-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9ba1a7"/>
      <stop offset="0.5" stop-color="#e8ebee"/>
      <stop offset="1" stop-color="#8a9096"/>
    </linearGradient>
    <linearGradient id="fit-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9bec3"/>
      <stop offset="0.5" stop-color="#f4f5f6"/>
      <stop offset="1" stop-color="#a9afb4"/>
    </linearGradient>
    <linearGradient id="alu-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c7ccd1"/>
      <stop offset="0.3" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#9da4ab"/>
    </linearGradient>
  </defs>`;
}

/** 取付け金具（フート・フランジ・クレビス） */
function mountSvg(L: Layout, mount: MountShape | undefined, b: BoreSpec, k: number): string {
  const { top, bottom, cy, bodyH } = L;
  const plate = '#4b5157';
  if (mount === 'foot') {
    // 軸方向フート（両カバーの下）
    const fw = Math.max(6, b.head * k * 0.9);
    const foot = (x: number) => `
  <rect x="${f(x - fw / 2)}" y="${f(bottom - 2)}" width="${f(fw)}" height="${f(L.mountBottom - bottom + 2)}" fill="${plate}" stroke="#222" stroke-width="0.5"/>
  <rect x="${f(x - fw / 2 - 5)}" y="${f(L.mountBottom - 3)}" width="${f(fw + 10)}" height="3" fill="${plate}" stroke="#222" stroke-width="0.5"/>
  <circle cx="${f(x - fw / 2 - 2.5)}" cy="${f(L.mountBottom - 1.5)}" r="0.9" fill="#ccc"/><circle cx="${f(x + fw / 2 + 2.5)}" cy="${f(L.mountBottom - 1.5)}" r="0.9" fill="#ccc"/>`;
    return foot((L.xHead + L.xTube0) / 2) + foot((L.xTube1 + L.xRodCover) / 2);
  }
  if (mount === 'flange-rod' || mount === 'flange-head') {
    // フランジ（ロッド側 F・ヘッド側 G）
    const x = mount === 'flange-rod' ? L.xRodCover - 1 : L.xHead - 4;
    const h = bodyH * 1.45;
    return `<rect x="${f(x)}" y="${f(cy - h / 2)}" width="5" height="${f(h)}" rx="0.8" fill="${plate}" stroke="#222" stroke-width="0.5"/>
  <circle cx="${f(x + 2.5)}" cy="${f(cy - h / 2 + 3)}" r="1.1" fill="#ddd"/><circle cx="${f(x + 2.5)}" cy="${f(cy + h / 2 - 3)}" r="1.1" fill="#ddd"/>`;
  }
  if (mount === 'clevis1' || mount === 'clevis2') {
    // クレビス（ヘッド側。C は 1 山、D は 2 山とピン）
    const x1 = L.xHead;
    const x0 = L.xLeft;
    const h = Math.min(bodyH * 0.7, 26);
    const pinX = x0 + (x1 - x0) * 0.4;
    return `<path d="M${x1} ${f(cy - h / 2)} H${f(pinX)} A${f(h / 2)} ${f(h / 2)} 0 0 0 ${f(pinX)} ${f(cy + h / 2)} H${x1} Z" fill="${plate}" stroke="#222" stroke-width="0.5"/>
  ${mount === 'clevis2' ? `<rect x="${f(x0)}" y="${f(cy - 1.2)}" width="${f(x1 - x0)}" height="2.4" fill="#1d2023" opacity="0.6"/>` : ''}
  <circle cx="${f(pinX)}" cy="${cy}" r="${f(Math.max(2, h * 0.18))}" fill="#c9ced3" stroke="#555" stroke-width="0.5"/>`;
  }
  if (mount === 'trunnion-center' || mount === 'trunnion-head' || mount === 'trunnion-rod') {
    // トラニオン（中間・ヘッド側・ロッド側）
    const x = mount === 'trunnion-head' ? (L.xHead + L.xTube0) / 2 : mount === 'trunnion-rod' ? (L.xTube1 + L.xRodCover) / 2 : (L.xTube0 + L.xTube1) / 2;
    const w = Math.min(12, bodyH * 0.4);
    return `<rect x="${f(x - w / 2)}" y="${f(top + bodyH * 0.2)}" width="${f(w)}" height="${f(bodyH * 0.6)}" rx="1" fill="${plate}" stroke="#222" stroke-width="0.5" opacity="0.9"/><circle cx="${f(x)}" cy="${cy}" r="${f(w * 0.3)}" fill="#c9ced3" stroke="#555" stroke-width="0.5"/>`;
  }
  return '';
}

/** 本体（チューブ・カバー・ロッド） */
function bodySvg(s: CylinderSeries, L: Layout, b: BoreSpec, p: ParamValues): string {
  const { top, cy, bodyH, tubeH } = L;
  const k = s.scale;
  const rodY = cy - L.rodH / 2;
  let out = '';
  // ピストンロッドとロッド先端
  if (s.look === 'guided') {
    // ガイド付き: 2 本のガイドロッドとプレート
    const plateW = Math.max(6, b.bore * 0.4) * k;
    const gy = [cy - bodyH * 0.32, cy + bodyH * 0.32];
    out += gy.map((y) => `<rect x="${L.xRodCover}" y="${f(y - L.rodH * 0.45)}" width="${f(L.xRodEnd - L.xRodCover - plateW)}" height="${f(L.rodH * 0.9)}" fill="url(#rod-{{uid}})" stroke="#6b7177" stroke-width="0.4"/>`).join('');
    out += `<rect x="${L.xRodCover}" y="${f(rodY)}" width="${f(L.xRodEnd - L.xRodCover - plateW)}" height="${L.rodH}" fill="url(#rod-{{uid}})" stroke="#6b7177" stroke-width="0.4"/>`;
    out += `<rect x="${f(L.xRodEnd - plateW)}" y="${f(top - 2)}" width="${f(plateW)}" height="${f(bodyH + 4)}" rx="1" fill="url(#alu-{{uid}})" stroke="#6d747b" stroke-width="0.6"/>`;
    out += [0.2, 0.8].map((t) => `<circle cx="${f(L.xRodEnd - plateW / 2)}" cy="${f(top + bodyH * t)}" r="1.3" fill="#555"/>`).join('');
  } else {
    const threadL = s.look === 'compact' ? 0 : Math.min(b.rodOut * 0.45, 14) * k;
    out += `<rect x="${f(L.xRodCover - 1)}" y="${f(rodY)}" width="${f(L.xRodEnd - L.xRodCover + 1)}" height="${L.rodH}" fill="url(#rod-{{uid}})" stroke="#6b7177" stroke-width="0.4"/>`;
    if (threadL > 2) {
      const n = Math.floor(threadL / 1.6);
      out += Array.from({ length: n }, (_, i) => `<line x1="${f(L.xRodEnd - threadL + i * 1.6 + 0.8)}" y1="${f(rodY + 0.3)}" x2="${f(L.xRodEnd - threadL + i * 1.6)}" y2="${f(rodY + L.rodH - 0.3)}" stroke="#7d848b" stroke-width="0.4"/>`).join('');
      // ロッド先端ナット
      const nh = L.rodH * 1.6;
      out += `<rect x="${f(L.xRodEnd - threadL - 3.5)}" y="${f(cy - nh / 2)}" width="3.5" height="${f(nh)}" rx="0.4" fill="url(#hex-{{uid}})" stroke="#5c6166" stroke-width="0.4"/>`;
    } else {
      out += `<rect x="${f(L.xRodEnd - 1)}" y="${f(cy - L.rodH * 0.3)}" width="1" height="${f(L.rodH * 0.6)}" fill="#555"/>`;
    }
  }
  if (s.look === 'round') {
    // 丸形: チューブとかしめたカバー、ロッドカバーの取付けねじとナット
    out += `<rect x="${f(L.xTube0 - 1)}" y="${f(cy - tubeH / 2)}" width="${f(L.xTube1 - L.xTube0 + 2)}" height="${tubeH}" fill="url(#tube-{{uid}})" stroke="#6d747b" stroke-width="0.6"/>`;
    out += `<rect x="${L.xHead}" y="${f(top)}" width="${f(L.xTube0 - L.xHead)}" height="${bodyH}" rx="${f(bodyH * 0.12)}" fill="url(#cover-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>`;
    out += `<rect x="${L.xTube1}" y="${f(top)}" width="${f(L.xRodCover - L.xTube1)}" height="${bodyH}" rx="${f(bodyH * 0.12)}" fill="url(#cover-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>`;
    // かしめの溝
    out += [L.xTube0 + 1.5, L.xTube1 - 1.5].map((x) => `<line x1="${f(x)}" y1="${f(cy - tubeH / 2 + 0.6)}" x2="${f(x)}" y2="${f(cy + tubeH / 2 - 0.6)}" stroke="#7d848b" stroke-width="0.8"/>`).join('');
    if (shapeOf(s, p) === 'basic') {
      // 基本形: ロッドカバーの取付けねじに取付けナット
      const nx = L.xRodCover - (L.xRodCover - L.xTube1) * 0.45;
      out += `<rect x="${f(nx)}" y="${f(top - bodyH * 0.12)}" width="${f(Math.max(3, b.rodCover * k * 0.25))}" height="${f(bodyH * 1.24)}" rx="0.6" fill="url(#hex-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>`;
    }
  } else if (s.look === 'tierod') {
    // タイロッド形: 角形のカバーとタイロッド・ナット
    out += `<rect x="${f(L.xTube0 - 1)}" y="${f(cy - tubeH / 2)}" width="${f(L.xTube1 - L.xTube0 + 2)}" height="${tubeH}" fill="url(#tube-{{uid}})" stroke="#6d747b" stroke-width="0.6"/>`;
    for (const y of [top + bodyH * 0.1, top + bodyH * 0.9]) {
      out += `<rect x="${f(L.xHead - 2.5)}" y="${f(y - 1.4)}" width="${f(L.xRodCover - L.xHead + 5)}" height="2.8" fill="url(#rod-{{uid}})" stroke="#6b7177" stroke-width="0.3"/>`;
    }
    out += `<rect x="${L.xHead}" y="${f(top)}" width="${f(L.xTube0 - L.xHead)}" height="${bodyH}" rx="1.2" fill="url(#alu-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>`;
    out += `<rect x="${L.xTube1}" y="${f(top)}" width="${f(L.xRodCover - L.xTube1)}" height="${bodyH}" rx="1.2" fill="url(#alu-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>`;
    for (const y of [top + bodyH * 0.1, top + bodyH * 0.9]) {
      out += [L.xHead - 2.5, L.xRodCover].map((x) => `<rect x="${f(x)}" y="${f(y - 2.6)}" width="2.5" height="5.2" fill="url(#hex-{{uid}})" stroke="#5c6166" stroke-width="0.3"/>`).join('');
    }
    // クッションニードル
    out += [L.xHead + (L.xTube0 - L.xHead) * 0.5, L.xTube1 + (L.xRodCover - L.xTube1) * 0.5].map((x) => `<circle cx="${f(x)}" cy="${f(cy + bodyH * 0.22)}" r="1.4" fill="#d6b24a" stroke="#7a5f17" stroke-width="0.4"/>`).join('');
  } else {
    // 薄形・ガイド付き: アルミの角形本体（溝付き）
    out += `<rect x="${L.xHead}" y="${f(top)}" width="${f(L.xRodCover - L.xHead)}" height="${bodyH}" rx="1.6" fill="url(#alu-{{uid}})" stroke="#5f666d" stroke-width="0.6"/>`;
    out += `<line x1="${f(L.xHead + 1)}" y1="${f(cy + bodyH * 0.18)}" x2="${f(L.xRodCover - 1)}" y2="${f(cy + bodyH * 0.18)}" stroke="#8b9299" stroke-width="0.7"/>`;
    out += `<line x1="${f(L.xHead + 1)}" y1="${f(cy - bodyH * 0.3)}" x2="${f(L.xRodCover - 1)}" y2="${f(cy - bodyH * 0.3)}" stroke="#8b9299" stroke-width="0.5"/>`;
    if (s.look === 'compact' && (shapeOf(s, p) === 'through' || shapeOf(s, p) === 'tapped')) {
      // 通し穴（B）・両端タップ（A）
      out += [top + bodyH * 0.18, top + bodyH * 0.82].map((y) => `<line x1="${f(L.xHead)}" y1="${f(y)}" x2="${f(L.xRodCover)}" y2="${f(y)}" stroke="#6d747b" stroke-width="0.5" stroke-dasharray="2 1.5"/>`).join('');
    }
  }
  if (b.strokes && !b.strokes.includes(Number(p.stroke))) {
    out += text(f((L.xHead + L.xRodEnd) / 2), f(top - 2), `φ${b.bore} の標準ストローク外`, 4.2, '#c62828');
  }
  // 銘板の文字
  const tx = (L.xTube0 + L.xTube1) / 2;
  const tl = L.xTube1 - L.xTube0;
  if (tl > 26) out += text(f(tx), f(cy - Math.min(tubeH, bodyH) * 0.12), 'SMC', Math.min(7, bodyH * 0.22), '#1f5fa8');
  if (tl > 34) out += text(f(tx), f(cy + Math.min(tubeH, bodyH) * 0.12 + 2), `φ${b.bore}×${p.stroke}`, Math.min(5.5, bodyH * 0.16), '#333', 'normal');
  return out;
}

/** パラメータの組み立て（内径・ストローク・取付け・作動・継手・スイッチ） */
function seriesParams(s: CylinderSeries): ParamDef[] {
  const out: ParamDef[] = [
    { key: 'bore', label: 'チューブ内径', unit: 'mm', options: s.bores.map((b) => ({ value: b.bore, label: `φ${b.bore}（ロッド径 ${b.rod}・${b.thread}）` })), default: s.defaultBore },
    { key: 'stroke', label: 'ストローク', unit: 'mm', options: s.strokes.map((v) => ({ value: v, label: `${v}mm` })), default: s.defaultStroke },
  ];
  if (s.mounts.length) out.push({ key: 'mount', label: '支持形式', options: s.mounts.map((m) => ({ value: m.code, label: `${m.label}（${m.code}）` })), default: s.mounts[0].code });
  if (s.single) {
    out.push({
      key: 'action',
      label: '作動方式',
      options: [
        { value: 'D', label: '複動' },
        { value: 'S', label: '単動・押出し（スプリングリターン）' },
        { value: 'T', label: '単動・引込み（スプリングエクステンド）' },
      ],
      default: 'D',
    });
  }
  out.push(...(s.extraParams ?? []));
  out.push({
    key: 'fitting',
    label: 'ポートの継手（チューブ外径）',
    unit: 'mm',
    options: [4, 6, 8, 10, 12].map((v) => ({ value: v, label: `φ${v}` })),
    default: s.defaultFitting ?? 6,
  });
  out.push(...switchParams({ names: { 1: 'ヘッド側・後退端', 2: 'ロッド側・前進端' }, magnet: !s.magnetStandard }));
  return out;
}

export function buildCylinder(s: CylinderSeries): DeviceDefinition {
  const params = seriesParams(s);
  const defaults: ParamValues = Object.fromEntries(params.map((p) => [p.key, p.default]));
  const L0 = layout(s, defaults);

  const svg = (p: ParamValues) => {
    const b = boreOf(s, p);
    const L = layout(s, p);
    const act = actionOf(p);
    const od = Number(p.fitting);
    const sw = switchOf(p);
    let out = defs();
    // トラニオンは本体の手前に描く（ほかの取付け金具は本体の後ろ）
    const shape = shapeOf(s, p);
    const front = shape === 'trunnion-center' || shape === 'trunnion-head' || shape === 'trunnion-rod';
    if (!front) out += mountSvg(L, shape, b, s.scale);
    out += bodySvg(s, L, b, p);
    if (front) out += mountSvg(L, shape, b, s.scale);
    // ポート
    const ports: [number, 'HEAD' | 'ROD'][] = [
      [L.portHead, 'HEAD'],
      [L.portRod, 'ROD'],
    ];
    for (const [x, id] of ports) {
      const used = act === 'D' || (act === 'S' ? id === 'HEAD' : id === 'ROD');
      out += used ? fitting(x, L.top, od) : breather(x, L.top);
    }
    out += text(f(L.portHead), f(L.top + 6.5), 'H', 4.2, '#333');
    out += text(f(L.portRod), f(L.top + 6.5), 'R', 4.2, '#333');
    // オートスイッチ（取付けバンド・本体・リード線）
    if (sw) {
      const swY = L.cy + L.tubeH * 0.5 - 6.5;
      for (const body of L.sw) {
        if (s.look === 'round') out += `<rect x="${f(body.x + body.w / 2 - 2)}" y="${f(L.cy - L.tubeH / 2 - 0.6)}" width="4" height="${f(L.tubeH + 1.2)}" fill="#c9ced3" stroke="#6d747b" stroke-width="0.4"/>`;
        out += switchBody(body.x, swY, body.w, 5, sw, body.slot === 1 ? 'left' : 'right');
        const lead = L.leads.find((x) => x.slot === body.slot)!;
        const exitX = body.slot === 1 ? body.x + 1 : body.x + body.w - 1;
        out += switchCable({ x: exitX, y: swY + 4 }, lead.x, L.yFan, L.yEnd, sw, `SW${body.slot} ${SWITCH_NAMES[body.slot].short}`, labelSideOf(body.slot, L.leads.length, lead.x, L.W));
      }
    }
    return out;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const b = boreOf(s, p);
    const L = layout(s, p);
    const act = actionOf(p);
    const single = act === 'T' ? (b.minPressurePull ?? b.minPressureSingle) : b.minPressureSingle;
    const range = { minPressure: act === 'D' ? b.minPressure : (single ?? b.minPressure), maxPressure: s.maxPressure };
    const port = (id: 'HEAD' | 'ROD', x: number): TerminalDef => ({
      id,
      label: id === 'HEAD' ? 'ヘッド側' : 'ロッド側',
      hint: id === 'HEAD' ? 'ヘッド側' : 'ロッド側',
      note:
        id === 'HEAD'
          ? `ヘッド側ポート（${b.thread}。給気でロッドが前進する）`
          : `ロッド側ポート（${b.thread}。給気でロッドが後退する）`,
      x,
      y: L.top - 20,
      side: 'top',
      role: 'air',
      air: { kind: 'work', tubeOD: { param: 'fitting' }, thread: b.thread, ...range },
    });
    const air: TerminalDef[] = [];
    if (act !== 'T') air.push(port('HEAD', L.portHead));
    if (act !== 'S') air.push(port('ROD', L.portRod));
    return [...air, ...switchTerminals(p, L.leads, L.yEnd, SWITCH_NAMES)];
  };

  const extraDesc = (s.single ? '作動方式は複動（D）・単動押出し（S）・単動引込み（T）から選ぶ（単動はエアを入れる側のポートだけが端子になる）。' : '');

  return {
    type: s.type,
    name: s.name,
    model: s.representative,
    modelOf: (p) => s.model(p, boreOf(s, p), switchSuffix(p)),
    maker: 'SMC',
    category: 'actuator',
    description:
      `${s.description}` +
      `チューブ内径・ストローク・支持形式・ポートに付けるワンタッチ管継手のチューブ外径をパラメータで選ぶ。ポートは HEAD（ヘッド側: 給気で前進）と ROD（ロッド側: 給気で後退）。` +
      `5 ポート電磁弁の A・B に 1 本ずつつなぐ。最高使用圧力 ${s.maxPressure}MPa。` +
      extraDesc +
      switchDescription({ 1: 'ヘッド側（後退端）', 2: 'ロッド側（前進端）' }),
    labelPrefix: 'CY',
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
    pneumatic: (p) => {
      const act = actionOf(p);
      const switches = pneumaticSwitches(p);
      return {
        symbol: 'cylinder',
        ports: (act === 'D' ? { head: 'HEAD', rod: 'ROD' } : act === 'S' ? { head: 'HEAD' } : { rod: 'ROD' }) as Record<string, string>,
        cylinder: {
          acting: act === 'D' ? 'double' : act === 'S' ? 'single-push' : 'single-pull',
          ...(s.look === 'tierod' ? { cushion: true } : {}),
          magnet: !!s.magnetStandard || hasMagnet(p),
          ...(switches ? { switches } : {}),
        },
      };
    },
  };
}
