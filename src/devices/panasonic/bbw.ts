/**
 * パナソニック 盤用ブレーカ（サーキットブレーカ BBW 型・漏電ブレーカ BJW 型、3P3E、表面形）の機器定義を作る。
 *
 * 外形は 幅 70 × 高さ 96 × 奥行 52mm（ハンドルを含む奥行 67.6mm。BBW-50 型 3P3E 50A・BJW-50 型 3P3E 50A 30mA・BJW-30 型 3P3E 20A 30mA の品番詳細）。
 * 端子ねじは M5（締付トルク 2.0〜2.5N・m）。極間ピッチは 22mm、主端子ネジは上下の端から 9mm とした（推定）。
 * 端子 ID は三菱電機 WS-V・富士電機 G-TWIN の遮断器とそろえ、一次側 1/3/5、二次側 2/4/6。
 * 「ノーヒューズブレーカー」「漏電ブレーカー」のファミリーで機種を変えても電線はつながったまま。
 */
import { poleHint } from '../mitsubishi/pole-hint';
import type { DeviceDefinition, ParamValues } from '../types';
import { esc, fitSize } from '../generic/power-parts';
import { SCREW_GRADIENT, text } from '../generic/parts';

export interface PanaBreakerSpec {
  type: string;
  /** 漏電ブレーカ（テストボタン・漏電表示・定格感度電流を描く） */
  earthLeakage?: boolean;
  description: string;
  estimated: string;
}

const W = 140;
const H = 192;
const TY_LINE = 18;
const TY_LOAD = H - 18;
const PITCH = 44;
const X0 = W / 2 - PITCH;
const RATINGS = [10, 15, 20, 30, 40, 50];

/** 品番（定格電流の 2 桁。漏電ブレーカは末尾に感度の記号 3 = 30mA） */
const code = (elb: boolean, rating: number) => `${elb ? 'BJW' : 'BBW'}3${String(rating).padStart(2, '0')}${elb ? '3' : ''}`;
/** フレーム（30A までは 30AF、40・50A は 50AF） */
const frame = (rating: number) => (rating <= 30 ? 30 : 50);

const screw = (x: number, y: number) => `
  <rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="1.5" fill="#3b3b3b"/>
  <circle cx="${x}" cy="${y}" r="6.6" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - 4.2} ${y} H${x + 4.2} M${x} ${y - 4.2} V${y + 4.2}" stroke="#4a4a4a" stroke-width="1.5" stroke-linecap="round"/>`;

export function buildPanaBreaker(spec: PanaBreakerSpec): DeviceDefinition {
  const elb = !!spec.earthLeakage;
  const poles = [
    { line: '1', load: '2', x: X0 },
    { line: '3', load: '4', x: X0 + PITCH },
    { line: '5', load: '6', x: X0 + 2 * PITCH },
  ];

  const terminalBlock = (y0: number, ty: number) => `
  <rect x="3" y="${y0}" width="${W - 6}" height="36" rx="1.5" fill="url(#pterm-{{uid}})"/>
  ${poles.map((p) => screw(p.x, ty)).join('')}
  ${poles
    .slice(1)
    .map((p) => `<rect x="${p.x - PITCH / 2 - 1.5}" y="${y0 + 2}" width="3" height="32" rx="1" fill="#e9e7e1" stroke="#b9b5ab" stroke-width="0.5"/>`)
    .join('')}`;

  const svg = (p: ParamValues) => {
    const rating = Number(p.ratedCurrent);
    const r = `${esc(rating)}A`;
    const hx = W / 2;
    const model = code(elb, rating);
    return `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="pbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e2e1dc"/>
      <stop offset="0.12" stop-color="#f6f5f1"/>
      <stop offset="0.88" stop-color="#f3f2ee"/>
      <stop offset="1" stop-color="#dbdad4"/>
    </linearGradient>
    <linearGradient id="pterm-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eae8e2"/>
      <stop offset="1" stop-color="#d9d7d0"/>
    </linearGradient>
    <linearGradient id="phandle-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1c1c"/>
      <stop offset="0.45" stop-color="#474747"/>
      <stop offset="1" stop-color="#151515"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#pbody-{{uid}})" stroke="#9c9a92" stroke-width="1.3"/>
  ${terminalBlock(0, TY_LINE)}
  ${terminalBlock(H - 36, TY_LOAD)}
  ${poles.map((q) => text(q.x - 14, 44, q.line, 6.5, '#444')).join('')}
  ${poles.map((q) => text(q.x - 14, H - 39, q.load, 6.5, '#444')).join('')}
  <!-- 前面（ハンドル部・銘板） -->
  <rect x="6" y="48" width="${W - 12}" height="${H - 96}" rx="4" fill="#f8f7f4" stroke="#b1aea6" stroke-width="0.9"/>
  <rect x="${hx - 15}" y="52" width="30" height="${H - 104}" rx="3" fill="#d6d4cd" stroke="#a09d95" stroke-width="0.7"/>
  <rect x="${hx - 10}" y="57" width="20" height="38" rx="2" fill="url(#phandle-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <path d="M${hx - 6} 63 H${hx + 6} M${hx - 6} 67 H${hx + 6}" stroke="#666" stroke-width="0.9"/>
  ${text(hx, 106, 'ON', 5.6, '#c11')}
  ${text(hx, 134, 'OFF', 4.6, '#333')}
  <rect x="${hx - 8}" y="112" width="16" height="13" rx="1.5" fill="#d7262e"/>
  ${text(hx, 121.5, 'I', 6.5, '#fff')}
  ${text(10, 58, 'Panasonic', 5, '#123c8c', 'bold', 'start')}
  ${text(10, 66, elb ? 'EARTH LEAKAGE' : 'CIRCUIT', 3.4, '#555', 'normal', 'start')}
  ${text(10, 71, elb ? 'CIRCUIT BREAKER' : 'BREAKER', 3.4, '#555', 'normal', 'start')}
  ${text(10, 81, model, fitSize(model, hx - 28, 7), '#1b1d20', 'bold', 'start')}
  <rect x="10" y="88" width="${hx - 28}" height="${elb ? 34 : 26}" rx="2" fill="#fff" stroke="#777" stroke-width="0.7"/>
  ${text(10 + (hx - 28) / 2, 106, r, fitSize(r, hx - 32, 13), '#222')}
  ${elb ? text(10 + (hx - 28) / 2, 117, '30mA', 6, '#222') : ''}
  ${text(10, 134, `3P3E ${frame(rating)}AF`, 3.6, '#555', 'normal', 'start')}
  ${text(10, 140, 'AC100-200V', 3.6, '#555', 'normal', 'start')}
  ${
    elb
      ? `
  <circle cx="${hx + 33}" cy="64" r="8" fill="#d6d4cd" stroke="#a09d95" stroke-width="0.7"/>
  <circle cx="${hx + 33}" cy="64" r="6" fill="#f3c300" stroke="#8a6d00" stroke-width="0.7"/>
  ${text(hx + 33, 80, 'TEST', 3.8, '#444')}
  <rect x="${hx + 23}" y="88" width="20" height="8" rx="1" fill="#f7f7f2" stroke="#7a7a74" stroke-width="0.6"/>
  ${text(hx + 33, 103, '漏電表示', 3.6, '#444')}
  <rect x="${hx + 23}" y="110" width="20" height="8" rx="1" fill="#f7f7f2" stroke="#7a7a74" stroke-width="0.6"/>
  ${text(hx + 33, 125, 'O.C 表示', 3.6, '#444')}`
      : `
  <rect x="${hx + 22}" y="60" width="22" height="8" rx="4" fill="#d7262e" stroke="#9e1218" stroke-width="0.6"/>
  ${text(hx + 33, 77, 'PUSH TO', 3.4, '#444')}
  ${text(hx + 33, 82, 'TRIP', 3.4, '#444')}`
  }
  <g stroke="#bdbab2" stroke-width="0.8"><path d="M${hx + 20} 134 H${W - 12} M${hx + 20} 140 H${W - 16}"/></g>
`;
  };

  return {
    type: spec.type,
    name: elb ? '漏電遮断器' : 'ノーヒューズ遮断器',
    model: elb ? 'BJW 3P' : 'BBW 3P',
    modelOf: (p) => code(elb, Number(p.ratedCurrent)),
    maker: 'パナソニック',
    category: 'breaker',
    description: spec.description,
    estimated: spec.estimated,
    labelPrefix: elb ? 'ELB' : 'MCCB',
    width: W,
    height: H,
    svg,
    terminals: [
      ...poles.map((q, i) => ({ id: q.line, hint: poleHint(3, i, '一次'), note: '一次側（電源側。M5 ねじ）', x: q.x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
      ...poles.map((q, i) => ({ id: q.load, hint: poleHint(3, i, '二次'), note: '二次側（負荷側。M5 ねじ）', x: q.x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
    ],
    links: poles.map((q) => ({ from: q.line, to: q.load, directed: true, protects: true })),
    params: [{ key: 'ratedCurrent', label: '定格電流', unit: 'A', options: RATINGS.map((v) => ({ value: v, label: `${v}A（${code(elb, v)}）` })), default: 20 }],
    protectionCurrent: { param: 'ratedCurrent' },
    ...(elb ? { schematic: { earthLeakage: true } } : {}),
  };
}
