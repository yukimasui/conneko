import type { DeviceDefinition } from '../types';
import { cContact } from '../generic/relay-socket';
import { SCREW_GRADIENT } from '../generic/parts';
import { screwTerminal, vShade } from '../generic/power-parts';

/**
 * 盤用ドアスイッチ（プランジャ形、1c 接点）。制御盤の枠に付け、扉を閉めるとプランジャが押される。
 * 盤内照明を扉の開閉で点けたり、扉の開きを PLC に知らせたりする（安全用のインタロックスイッチではない）。
 * 接点は COM・NC・NO の切換接点。プランジャが押された状態（扉を閉めた状態）が「動作」:
 * NC（COM-NC）は扉を開けると閉じ（照明用）、NO（COM-NO）は扉を閉めると閉じる。
 * 定格は汎用品の代表値（AC250V 3A、抵抗負荷）。縮尺は 1mm ≒ 2px。
 */

const W = 80;
const H = 150;
const TY = 132;
const TERMS = [
  { id: 'COM', label: 'C', x: 18 },
  { id: 'NC', label: 'NC', x: 40 },
  { id: 'NO', label: 'NO', x: 62 },
];
const RATING = 3;

const svg = `
  <defs>
    ${vShade('bracket', '#d8dbde', '#9fa4aa')}
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1d1f"/>
      <stop offset="0.2" stop-color="#3a3c40"/>
      <stop offset="0.8" stop-color="#35373b"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
    <linearGradient id="rod-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d9298"/>
      <stop offset="0.45" stop-color="#f1f2f3"/>
      <stop offset="1" stop-color="#8d9298"/>
    </linearGradient>
    ${vShade('cap', '#ff8a7a', '#c7261a')}
    ${SCREW_GRADIENT}
  </defs>

  <!-- プランジャ（先端のゴムキャップ） -->
  <rect x="${W / 2 - 5}" y="12" width="10" height="34" fill="url(#rod-{{uid}})" stroke="#6b7076" stroke-width="0.6"/>
  <rect x="${W / 2 - 9}" y="3" width="18" height="12" rx="5" fill="url(#cap-{{uid}})" stroke="#8a160e" stroke-width="0.7"/>
  <!-- 取付ナットと金具 -->
  <rect x="${W / 2 - 13}" y="36" width="26" height="8" rx="1.5" fill="#b9bdc2" stroke="#6b7076" stroke-width="0.6"/>
  <rect x="4" y="44" width="${W - 8}" height="12" rx="2" fill="url(#bracket-{{uid}})" stroke="#6b7076" stroke-width="0.8"/>
  <ellipse cx="12" cy="50" rx="3.5" ry="2.6" fill="#f4f6f8" stroke="#6b7076" stroke-width="0.6"/>
  <ellipse cx="${W - 12}" cy="50" rx="3.5" ry="2.6" fill="#f4f6f8" stroke="#6b7076" stroke-width="0.6"/>

  <!-- 本体（接点ケース） -->
  <rect x="8" y="56" width="${W - 16}" height="${H - 60}" rx="3" fill="url(#body-{{uid}})" stroke="#0e0f10" stroke-width="0.8"/>
  <text x="${W / 2}" y="70" text-anchor="middle" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#f2f2f2">DOOR SW</text>
  <text x="${W / 2}" y="80" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#c9cdd2">AC250V 3A</text>
  <!-- 接点の図記号（C から NC・NO への切換。扉を開けた状態＝NC 側に閉じている） -->
  <path d="M${W / 2 - 10} 92 V100 H${W / 2 - 6} M${W / 2 + 10} 92 V100 M${W / 2} 116 V112 L${W / 2 - 7} 101" stroke="#f2f2f2" stroke-width="1" fill="none" stroke-linecap="round"/>
  <circle cx="${W / 2}" cy="112" r="1.4" fill="#f2f2f2"/>
  <text x="${W / 2 - 10}" y="89" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#c9cdd2">NC</text>
  <text x="${W / 2 + 10}" y="89" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#c9cdd2">NO</text>
  <!-- 端子 -->
  <rect x="10" y="${TY - 12}" width="${W - 20}" height="24" rx="2" fill="#151618"/>
  ${TERMS.map((t) => screwTerminal(t.x, TY, 5, '#0b0c0d')).join('')}
  ${TERMS.map((t) => `<text x="${t.x}" y="${TY - 14}" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#f2f2f2">${t.label}</text>`).join('')}
`;

const def: DeviceDefinition = {
  type: 'generic.door-switch',
  name: '盤用ドアスイッチ',
  model: 'プランジャ形 1c AC250V 3A',
  category: 'control',
  description:
    '制御盤の枠に付けるプランジャ形のドアスイッチ（1c 接点、AC250V 3A）。扉を閉めるとプランジャが押されて動作する。盤内照明は扉を開けると閉じる NC（C-NC）に、扉閉の確認は NO（C-NO）につなぐ。安全用のインタロックスイッチではない。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: TERMS.map((t) => ({
    id: t.id,
    label: t.label,
    hint: t.id === 'COM' ? '共通' : t.id === 'NC' ? '扉開で閉' : '扉閉で閉',
    note: t.id === 'COM' ? '共通（C）' : t.id === 'NC' ? 'b 接点（扉を開けると C と閉じる）' : 'a 接点（扉を閉めると C と閉じる）',
    x: t.x,
    y: TY,
    side: 'bottom' as const,
    role: 'signal' as const,
    optional: true,
  })),
  links: cContact('COM', 'NC', 'NO', RATING),
  schematic: { actuator: 'limit' },
};

export default def;
