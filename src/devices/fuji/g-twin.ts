/**
 * 富士電機 G-TWIN シリーズの 32AF の遮断器（オートブレーカ BW32AAG・漏電遮断器 EW32AAG。3 極、表面形）の機器定義を作る。
 *
 * 外形は 幅 75 × 高さ 100 × 奥行 84mm（富士電機の新旧比較表・販売店の仕様表）。端子ねじは M5（亀の甲ねじ）。
 * 極間ピッチは 25mm、主端子ネジは上下の端から 9mm とした（推定）。
 * 端子 ID は三菱電機の WS-V の遮断器とそろえ、一次側（LINE）1/3/5、二次側（LOAD）2/4/6。
 * 「ノーヒューズブレーカー」「漏電ブレーカー」のファミリーで機種を変えても電線はつながったまま。
 */
import { poleHint } from '../mitsubishi/pole-hint';
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { esc, fitSize } from '../generic/power-parts';
import { FUJI_DEFS, fScrew, fText, fujiName } from './parts';

export interface GTwinSpec {
  type: string;
  modelName: string;
  /** 漏電遮断器（テストボタン・漏電表示・定格感度電流を描く） */
  earthLeakage?: boolean;
  ratings: number[];
  defaultRating: number;
  sensitivity?: ParamDef['options'];
  defaultSensitivity?: number;
  description: string;
  estimated: string;
}

const W = 150;
const H = 200;
const TY_LINE = 18;
const TY_LOAD = H - 18;
const PITCH = 50;
const X0 = W / 2 - PITCH;

export function buildGTwin(spec: GTwinSpec): DeviceDefinition {
  const elb = !!spec.earthLeakage;
  const poles = [
    { line: '1', load: '2', x: X0 },
    { line: '3', load: '4', x: X0 + PITCH },
    { line: '5', load: '6', x: X0 + 2 * PITCH },
  ];

  const terminalBlock = (y0: number, ty: number) => `
  <rect x="3" y="${y0}" width="${W - 6}" height="36" rx="1.5" fill="url(#fpocket-{{uid}})"/>
  ${poles.map((p) => fScrew(p.x, ty, 6.6)).join('')}
  ${poles
    .slice(1)
    .map((p) => `<rect x="${p.x - PITCH / 2 - 1.5}" y="${y0 + 2}" width="3" height="32" rx="1" fill="#a7abb0"/>`)
    .join('')}`;

  const svg = (p: ParamValues) => {
    const rating = `${esc(p.ratedCurrent)}A`;
    const sens = elb ? `${esc(p.sensitivity)}mA` : '';
    const model = esc(spec.modelName);
    const hx = W / 2;
    return `
  <defs>${FUJI_DEFS}
    <linearGradient id="handle-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1c1c"/>
      <stop offset="0.45" stop-color="#454545"/>
      <stop offset="1" stop-color="#151515"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#fbody-{{uid}})" stroke="#8d9196" stroke-width="1.4"/>
  ${terminalBlock(0, TY_LINE)}
  ${terminalBlock(H - 36, TY_LOAD)}
  ${poles.map((q) => fText(q.x - 13, 45, q.line, 7, '#333')).join('')}
  ${poles.map((q) => fText(q.x - 13, H - 39, q.load, 7, '#333')).join('')}
  <!-- 前面（ハンドル部・銘板） -->
  <rect x="6" y="50" width="${W - 12}" height="${H - 100}" rx="4" fill="#dfe2e5" stroke="#a2a6ab" stroke-width="0.9"/>
  <rect x="${hx - 17}" y="54" width="34" height="${H - 108}" rx="3" fill="#b8bcc1" stroke="#8c9095" stroke-width="0.7"/>
  <rect x="${hx - 11}" y="60" width="22" height="40" rx="2" fill="url(#handle-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <path d="M${hx - 7} 66 H${hx + 7} M${hx - 7} 70 H${hx + 7}" stroke="#666" stroke-width="0.9"/>
  ${fText(hx, 112, 'ON', 6, '#c11')}
  ${fText(hx, 140, 'OFF', 5, '#333')}
  <rect x="${hx - 9}" y="118" width="18" height="14" rx="1.5" fill="#d7262e"/>
  ${fText(hx, 128, 'I', 7, '#fff')}
  ${fujiName(11, 61, 4.4)}
  ${fText(11, 71, elb ? 'EARTH LEAKAGE' : 'AUTO BREAKER', 3.8, '#555', 'normal', 'start')}
  ${fText(11, 84, model, fitSize(spec.modelName, hx - 32, 8.5), '#1b1d20', 'bold', 'start')}
  <rect x="11" y="92" width="${hx - 32}" height="${elb ? 40 : 30}" rx="2" fill="#fbfbfa" stroke="#777" stroke-width="0.7"/>
  ${fText(11 + (hx - 32) / 2, elb ? 112 : 113, rating, fitSize(rating, hx - 36, 15), '#222')}
  ${elb ? fText(11 + (hx - 32) / 2, 126, sens, fitSize(sens, hx - 36, 7), '#222') : ''}
  ${fText(11, 142, '3P3E 32AF', 3.8, '#555', 'normal', 'start')}
  ${fText(11, 148, '50/60Hz', 3.8, '#555', 'normal', 'start')}
  ${
    elb
      ? `
  <circle cx="${hx + 37}" cy="70" r="9" fill="#b8bcc1" stroke="#8c9095" stroke-width="0.7"/>
  <circle cx="${hx + 37}" cy="70" r="7" fill="#f3c300" stroke="#8a6d00" stroke-width="0.7"/>
  ${fText(hx + 37, 88, 'TEST', 4, '#444')}
  <circle cx="${hx + 37}" cy="104" r="5.5" fill="#b8bcc1" stroke="#8c9095" stroke-width="0.7"/>
  <circle cx="${hx + 37}" cy="104" r="3.8" fill="#f7f7f2" stroke="#7a7a74" stroke-width="0.7"/>
  ${fText(hx + 37, 117, 'LEAK', 3.8, '#444')}
  ${fText(hx + 22, 132, `IΔn ${sens}`, fitSize(`IΔn ${sens}`, W - hx - 30, 4.2), '#444', 'normal', 'start')}`
      : `
  <rect x="${hx + 24}" y="62" width="26" height="9" rx="4.5" fill="#d7262e" stroke="#9e1218" stroke-width="0.6"/>
  ${fText(hx + 37, 80, 'PUSH TO', 3.6, '#444')}
  ${fText(hx + 37, 85, 'TRIP', 3.6, '#444')}`
  }
  <g stroke="#a4a8ad" stroke-width="0.8"><path d="M${hx + 22} 138 H${W - 12} M${hx + 22} 144 H${W - 16}"/></g>
`;
  };

  const params: ParamDef[] = [
    { key: 'ratedCurrent', label: '定格電流', unit: 'A', options: spec.ratings.map((v) => ({ value: v, label: `${v}A` })), default: spec.defaultRating },
  ];
  if (elb && spec.sensitivity) {
    params.push({ key: 'sensitivity', label: '定格感度電流', unit: 'mA', options: spec.sensitivity, default: spec.defaultSensitivity ?? 30 });
  }

  return {
    type: spec.type,
    name: elb ? '漏電遮断器' : 'ノーヒューズ遮断器',
    model: spec.modelName,
    modelOf: (p) => (elb ? `${spec.modelName} ${p.ratedCurrent}A ${p.sensitivity}mA` : `${spec.modelName} ${p.ratedCurrent}A`),
    maker: '富士電機',
    category: 'breaker',
    description: spec.description,
    estimated: spec.estimated,
    labelPrefix: elb ? 'ELB' : 'MCCB',
    width: W,
    height: H,
    svg,
    terminals: [
      ...poles.map((q, i) => ({ id: q.line, hint: poleHint(3, i, '一次'), x: q.x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
      ...poles.map((q, i) => ({ id: q.load, hint: poleHint(3, i, '二次'), x: q.x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
    ],
    links: poles.map((q) => ({ from: q.line, to: q.load, directed: true, protects: true })),
    params,
    protectionCurrent: { param: 'ratedCurrent' },
    ...(elb ? { schematic: { earthLeakage: true } } : {}),
  };
}
