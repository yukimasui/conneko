import type { DeviceDefinition, ParamValues } from '../types';
import { A22N_LIT } from '../generic/omron-a22n';
import { LED_24V_ACDC, a22nLedCurrent } from '../generic/panel-switch';
import { SCREW_GRADIENT, TINTS, screw, text, tintGradient } from '../generic/parts';

/**
 * オムロン Φ22 表示灯 M22N（樹脂ベゼル・フラット形、LED 24V AC/DC、ネジ端子）M22N-BN-T□A-□C。
 * 左に正面から見たレンズとベゼル、右に裏から見たソケットユニット（M3.5 ネジ 2 本が対角に並ぶ）を描く（1mm ≒ 2px）。
 *
 * 出典: オムロン A22N/M22N/A30N データシート p.48（M22N Terminal Arrangement、BOTTOM VIEW）:
 *   裏から見て左上のネジが X2、右下のネジが X1（ネジの間隔 横 14mm・縦 9.3mm）。LED は極性なし
 *   LED 24V AC/DC ±10%、約 12mA（赤・橙・黄・青）/ 約 5mA（白・緑）
 */

const W = 150;
const H = 90;
const CX = 34;
const CY = 45;
const BEZEL_R = 29;
/** ソケットユニット（24.2mm 角）の中心 */
const UX = 112;
const UY = 45;
const X2 = { x: UX - 14, y: UY - 9.3 };
const X1 = { x: UX + 14, y: UY + 9.3 };

const svg = (p: ParamValues) => {
  const opt = A22N_LIT.find((c) => c.code === String(p.color)) ?? A22N_LIT[0];
  const c = TINTS[opt.tint];
  return `
  <defs>
    ${tintGradient('lens', c)}
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a5d61"/>
      <stop offset="0.5" stop-color="#2a2c2f"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <linearGradient id="unit-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a4d51"/>
      <stop offset="1" stop-color="#1c1d1f"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>
  <!-- 胴部 -->
  <rect x="${CX + 20}" y="${CY - 17}" width="${UX - 24 - CX - 20}" height="34" rx="3" fill="#2c2e31"/>
  <rect x="${CX + 34}" y="${CY - 24}" width="12" height="48" rx="2" fill="#2a2c2f" stroke="#111" stroke-width="0.6"/>
  <!-- ベゼルとレンズ -->
  <circle cx="${CX + 1.2}" cy="${CY + 1.6}" r="${BEZEL_R}" fill="#000" opacity="0.22"/>
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R}" fill="url(#bezel-{{uid}})" stroke="#0c0c0d" stroke-width="0.8"/>
  <circle cx="${CX}" cy="${CY}" r="${BEZEL_R - 5}" fill="url(#lens-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  ${[6, 11, 16].map((r) => `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="0.8"/>`).join('')}
  <ellipse cx="${CX - 8}" cy="${CY - 10}" rx="8" ry="4.6" fill="#fff" opacity="0.45" transform="rotate(-35 ${CX - 8} ${CY - 10})"/>
  <!-- ソケットユニット（裏から見た図） -->
  <rect x="${UX - 24.2}" y="${UY - 24.2}" width="48.4" height="48.4" rx="3" fill="url(#unit-{{uid}})" stroke="#0a0a0b" stroke-width="0.8"/>
  ${text(UX + 9, UY - 13, 'OMRON', 5, '#d9dcdf')}
  ${screw(X2.x, X2.y, 5, '#c9cdd1')}
  ${screw(X1.x, X1.y, 5, '#c9cdd1')}
  ${text(X2.x, X2.y + 13, 'X2', 5, '#f2f2f2')}
  ${text(X1.x, X1.y - 8.5, 'X1', 5, '#f2f2f2')}
  ${text(UX - 8, UY + 19, '24V', 4.4, '#cfd3d6', 'normal')}
  ${text(W / 2, H - 3, `M22N-BN-${opt.code}A-${opt.code.slice(1)}C`, 4.6, '#333', 'normal')}`;
};

const def: DeviceDefinition = {
  type: 'omron.m22n-bn-a-c',
  name: '表示灯',
  model: 'M22N-BN-T□A-□C',
  maker: 'オムロン',
  category: 'control',
  description:
    'オムロンの Φ22 表示灯 M22N（樹脂ベゼル・フラット形、LED 照光、24V AC/DC ±10%、ネジ端子 M3.5）。端子は X1・X2（極性なし）。' +
    '定格電流 約 12mA（赤・橙・黄・青）/ 約 5mA（白・緑）。レンズの色は params の color（型式の □ に入る色記号）。',
  labelPrefix: 'PL',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'X2', label: 'X2', note: 'LED（24V AC/DC、極性なし）', x: X2.x, y: X2.y, side: 'top', role: 'input', accepts: LED_24V_ACDC },
    { id: 'X1', label: 'X1', note: 'LED（24V AC/DC、極性なし）', x: X1.x, y: X1.y, side: 'bottom', role: 'input', accepts: LED_24V_ACDC },
  ],
  params: [
    {
      key: 'color',
      label: 'レンズの色',
      options: A22N_LIT.map((c) => ({ value: c.code, label: `${TINTS[c.tint].label}（${c.code}）` })),
      default: 'TG',
    },
  ],
  // LED の電流は色で変わる（赤・橙・黄・青 約 12mA、白・緑 約 5mA）
  loadCurrent: a22nLedCurrent,
  schematic: { elements: [{ kind: 'lamp', terminals: ['X1', 'X2'] }] },
};

export default def;
