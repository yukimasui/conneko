/**
 * 汎用の温度センサ（シース熱電対・シース測温抵抗体、リード線引出し）の機器定義を作る。
 *
 * 左に金属のシース（保護管）、中ほどにスリーブ、右に色分けされたリード線を描き、リード線の先端を端子にする。
 * 盤の外の機器なので縮小して描く。温度調節器のセンサ入力（オムロン E5CC なら 熱電対 5(−)・6(+)、測温抵抗体 4(A)・5(B)・6(B)）へつなぐ。
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { text } from './parts';

export interface Lead {
  id: string;
  label: string;
  /** 線の色 */
  color: string;
  /** 線の色の名前 */
  colorName: string;
  note: string;
  hint: string;
}

export interface TempSensorSpec {
  type: string;
  name: string;
  model: string;
  description: string;
  /** シースに書く文字 */
  caption: string;
  leads: Lead[];
  estimated?: string;
}

const W = 170;
const PITCH = 14;

export function buildTempSensor(s: TempSensorSpec): DeviceDefinition {
  const H = Math.max(56, s.leads.length * PITCH + 26);
  const cy = H / 2;
  const tipX = W - 8;
  const ys = s.leads.map((_, i) => cy + (i - (s.leads.length - 1) / 2) * PITCH);
  const leads = s.leads
    .map((l, i) => {
      const y = ys[i];
      return `<path d="M104 ${cy} C122 ${cy} 124 ${y} 142 ${y} H${tipX}" fill="none" stroke="#555" stroke-width="3.8"/>
  <path d="M104 ${cy} C122 ${cy} 124 ${y} 142 ${y} H${tipX}" fill="none" stroke="${l.color}" stroke-width="2.6"/>
  <rect x="${tipX - 1}" y="${y - 1.6}" width="6" height="3.2" fill="#c8a24a" stroke="#7a6220" stroke-width="0.3"/>
  ${text(146, y - 3.2, `${l.label} ${l.colorName}`, 4.2, '#333', 'bold', 'start')}`;
    })
    .join('');
  const svg = `
  <defs>
    <linearGradient id="sheath-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8f949a"/>
      <stop offset="0.35" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="sleeve-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7d8287"/>
      <stop offset="0.4" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#5f6469"/>
    </linearGradient>
  </defs>
  <!-- シース（先端が感温部） -->
  <path d="M8 ${cy - 3.2} H66 V${cy + 3.2} H8 A3.2 3.2 0 0 1 8 ${cy - 3.2} Z" fill="url(#sheath-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="5" y="${cy - 4.2}" width="10" height="8.4" rx="3" fill="#c94a2a" opacity="0.35"/>
  ${text(36, cy - 7, s.caption, 4.6, '#333')}
  <!-- スリーブとリード線の被覆 -->
  <rect x="66" y="${cy - 6}" width="22" height="12" rx="2" fill="url(#sleeve-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <rect x="88" y="${cy - 4.4}" width="18" height="8.8" rx="2" fill="#3a3c40"/>
  ${leads}`;

  const terminals: TerminalDef[] = s.leads.map((l, i) => ({
    id: l.id,
    label: l.label,
    note: l.note,
    hint: l.hint,
    x: tipX,
    y: ys[i],
    side: 'right',
    role: 'signal',
  }));

  return {
    type: s.type,
    name: s.name,
    model: s.model,
    category: 'sensor',
    description: s.description,
    labelPrefix: 'TE',
    width: W,
    height: H,
    svg,
    terminals,
    ...(s.estimated ? { estimated: s.estimated } : {}),
  };
}
