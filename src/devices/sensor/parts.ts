/**
 * KEYENCE 以外のメーカーのセンサー（オムロン・パナソニック・SMC・汎用品）の共通部品。
 *
 * 芯線・コネクタの描画と端子の電気的な項目は KEYENCE のセンサーと同じ部品（src/devices/keyence/sensor-parts.ts）を使う。
 * ここには、それにない芯線の色（ロータリエンコーダのラインドライバ出力の「黒/赤」のような縞の芯線）と、
 * KEYENCE 用の組み立て（buildPhoto）で作った機器のメーカーを差し替える小さな関数を置く。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { WIRE_HEX, leadProps, type Lead, type WireColor } from '../keyence/sensor-parts';

/** 芯線の色（WIRE_HEX にない色は fill / edge / name を直接書く。stripe は縞の色） */
export interface WireLook {
  fill: string;
  edge: string;
  name: string;
  stripe?: string;
}

/** 縞の芯線（ラインドライバの反転出力など）。ベースの色に赤の縞 */
export const striped = (base: WireColor, stripe = '#d6302c', stripeName = '赤'): WireLook => ({
  ...WIRE_HEX[base],
  name: `${WIRE_HEX[base].name}/${stripeName}`,
  stripe,
});

export interface ColorLead extends Omit<Lead, 'color'> {
  /** 端子ID（必須。縞の芯線は 'BKRD' のように色略号をつなげる） */
  id: string;
  look: WireLook;
}

export interface ColorCableOpts {
  cx: number;
  y0: number;
  yFan: number;
  yEnd: number;
  pitch: number;
  centerX?: number;
  leads: ColorLead[];
  vmin: number;
  vmax: number;
}

/**
 * ケーブル（黒いシース）と先端で広がる芯線を描き、端子定義を返す（sensorCable と同じ姿で、芯線の色を自由に書ける版）。
 */
export function colorCable(o: ColorCableOpts): { svg: string; terminals: (p: ParamValues) => TerminalDef[] } {
  const n = o.leads.length;
  const cx = o.centerX ?? o.cx;
  const xs = o.leads.map((_, i) => +(cx + (i - (n - 1) / 2) * o.pitch).toFixed(2));
  const sheathW = Math.min(6 + n * 0.6, 10);
  const my = (o.y0 + o.yFan) / 2;
  let s = `
  <path d="M${o.cx} ${o.y0} C${o.cx} ${my} ${cx} ${my} ${cx} ${o.yFan}" fill="none" stroke="#0e0e0f" stroke-width="${sheathW + 1.4}" stroke-linecap="round"/>
  <path d="M${o.cx} ${o.y0} C${o.cx} ${my} ${cx} ${my} ${cx} ${o.yFan}" fill="none" stroke="#2b2c2e" stroke-width="${sheathW}" stroke-linecap="round"/>`;
  const yLead = o.yEnd - 7;
  o.leads.forEach((l, i) => {
    const c = l.look;
    const x = xs[i];
    const off = +((i - (n - 1) / 2) * Math.min(1.6, sheathW / n)).toFixed(2);
    const d = `M${+(cx + off).toFixed(2)} ${o.yFan - 1} C${+(cx + off).toFixed(2)} ${o.yFan + 10} ${x} ${yLead - 14} ${x} ${yLead}`;
    s += `<path d="${d}" fill="none" stroke="${c.edge}" stroke-width="3.2" stroke-linecap="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${c.fill}" stroke-width="2.2" stroke-linecap="round"/>`;
    if (c.stripe) s += `<path d="${d}" fill="none" stroke="${c.stripe}" stroke-width="1" stroke-dasharray="2 2.5"/>`;
    s += `<rect x="${x - 1.6}" y="${yLead - 1}" width="3.2" height="${o.yEnd - yLead + 1}" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`;
    s += `<text x="${x}" y="${yLead - 3}" text-anchor="middle" font-family="sans-serif" font-size="${c.name.length > 2 ? 2.8 : 3.4}" font-weight="bold" fill="#333">${c.name}</text>`;
  });
  s += `<rect x="${cx - sheathW / 2 - 0.6}" y="${o.yFan - 3}" width="${sheathW + 1.2}" height="3" rx="0.8" fill="#1a1b1c"/>`;
  const terminals = (p: ParamValues): TerminalDef[] =>
    o.leads.map((l, i) => ({
      id: l.id,
      label: `${l.look.name} ${l.label}`,
      x: xs[i],
      y: o.yEnd,
      side: 'bottom' as const,
      ...leadProps({ ...l, color: 'BK' }, p, o.vmin, o.vmax),
    }));
  return { svg: s, terminals };
}

/**
 * KEYENCE 用の組み立て（buildPhoto など。メーカーが 'KEYENCE' に決まっている）で作った機器定義の、メーカーなどを差し替える。
 */
export function withMaker(def: DeviceDefinition, maker: string, extra: Partial<DeviceDefinition> = {}): DeviceDefinition {
  return { ...def, maker, ...extra };
}
