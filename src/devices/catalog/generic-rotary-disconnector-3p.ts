import type { DeviceDefinition, ParamValues } from '../types';
import { SCREW_GRADIENT } from '../generic/parts';
import { esc, screwTerminal } from '../generic/power-parts';

/**
 * ロータリー断路器（負荷開閉器、3 極、盤の主幹開閉器。扉の外部操作ハンドル付き。汎用品）。
 * 盤の扉のハンドルを回して主回路を入り切りする。扉を開ける前に主回路を切る主幹開閉器・保守用の断路に使う。
 * 過電流を検出して切る機能はない（短絡・過負荷の保護は上流・下流の遮断器・ヒューズで行う）。
 *
 * 端子は遮断器とそろえ、上が電源側 1・3・5、下が負荷側 2・4・6（IEC の開閉器の端子記号）。
 * 主接点は「位置 I で閉じる a 接点」とし、定格電流（AC-23A 相当の使用電流）を `ratedCurrent` に書いて、開閉する負荷の電流の合計と比べる。
 * 定格・外形は DIN レール・盤取付の 3 極のロータリー断路器の代表的な系列（16〜125A）。特定の製品の値ではない。
 */

const W = 112;
const H = 164;
const PITCH = 32;
const XS = [W / 2 - PITCH, W / 2, W / 2 + PITCH];
const TY_LINE = 16;
const TY_LOAD = H - 16;
const RATINGS = [16, 25, 32, 40, 63, 80, 100, 125];

const svg = (p: ParamValues) => `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="rbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2c2f33"/>
      <stop offset="0.15" stop-color="#43474d"/>
      <stop offset="0.85" stop-color="#40444a"/>
      <stop offset="1" stop-color="#26292c"/>
    </linearGradient>
    <radialGradient id="rhandle-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#ff6b5e"/>
      <stop offset="1" stop-color="#a5130c"/>
    </radialGradient>
  </defs>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#rbody-{{uid}})" stroke="#111" stroke-width="1"/>
  <!-- 端子部 -->
  <rect x="4" y="3" width="${W - 8}" height="27" rx="1.5" fill="#1d1f22"/>
  <rect x="4" y="${H - 30}" width="${W - 8}" height="27" rx="1.5" fill="#1d1f22"/>
  ${XS.map((x) => screwTerminal(x, TY_LINE, 6, '#111')).join('')}
  ${XS.map((x) => screwTerminal(x, TY_LOAD, 6, '#111')).join('')}
  ${XS.map((x, i) => `<text x="${x}" y="39" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#eee">${['1', '3', '5'][i]}</text>`).join('')}
  ${XS.map((x, i) => `<text x="${x}" y="${H - 34}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#eee">${['2', '4', '6'][i]}</text>`).join('')}
  <!-- 扉の外部操作ハンドル（黄色の銘板に赤いハンドル。主幹・非常用の色）。位置 0（OFF）・I（ON） -->
  <rect x="${W / 2 - 34}" y="${H / 2 - 30}" width="68" height="64" rx="4" fill="#f4c400" stroke="#8a6d00" stroke-width="0.8"/>
  <text x="${W / 2 - 26}" y="${H / 2 - 22}" font-family="sans-serif" font-size="7" font-weight="bold" fill="#222">0</text>
  <text x="${W / 2 + 22}" y="${H / 2 - 22}" font-family="sans-serif" font-size="7" font-weight="bold" fill="#222">I</text>
  <text x="${W / 2 - 30}" y="${H / 2 - 14}" font-family="sans-serif" font-size="3.6" fill="#333">OFF</text>
  <text x="${W / 2 + 19}" y="${H / 2 - 14}" font-family="sans-serif" font-size="3.6" fill="#333">ON</text>
  <circle cx="${W / 2}" cy="${H / 2 + 2}" r="20" fill="url(#rhandle-{{uid}})" stroke="#6a0706" stroke-width="0.8"/>
  <rect x="${W / 2 - 6}" y="${H / 2 - 26}" width="12" height="54" rx="5" fill="url(#rhandle-{{uid}})" stroke="#6a0706" stroke-width="0.8" transform="rotate(45 ${W / 2} ${H / 2 + 2})"/>
  <circle cx="${W / 2}" cy="${H / 2 + 2}" r="4" fill="#7d0f0a"/>
  <!-- 定格の表示 -->
  <text x="${W / 2}" y="${H - 44}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#eee">${esc(p.ratedCurrent)}A 3P</text>
  <text x="${W / 2}" y="48" text-anchor="middle" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#ddd">SWITCH-DISCONNECTOR</text>
`;

const def: DeviceDefinition = {
  type: 'generic.rotary-disconnector.3p',
  name: 'ロータリー断路器',
  model: 'ロータリー断路器 3P',
  modelOf: (p) => `ロータリー断路器 3P ${p.ratedCurrent}A`,
  category: 'breaker',
  description:
    '盤の主幹開閉器に使う 3 極のロータリー断路器（負荷開閉器、扉の外部操作ハンドル付き、汎用品）。扉のハンドルを I（ON）に回すと 1-2・3-4・5-6 が閉じる。' +
    '過電流の保護はしないので、上流（または下流）に遮断器・ヒューズを置く。定格電流（16〜125A）はパラメータで選び、下流の負荷の電流の合計と比べる。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg,
  terminals: [
    ...XS.map((x, i) => ({ id: String(i * 2 + 1), hint: `一次 ${'RST'[i]}`, x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
    ...XS.map((x, i) => ({ id: String(i * 2 + 2), hint: `二次 ${'RST'[i]}`, x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
  ],
  links: [0, 1, 2].map((i) => ({ from: String(i * 2 + 1), to: String(i * 2 + 2), directed: true, switch: 'NO' as const, ratedCurrent: { param: 'ratedCurrent' } })),
  params: [{ key: 'ratedCurrent', label: '定格電流', unit: 'A', options: RATINGS.map((v) => ({ value: v, label: `${v}A` })), default: 40 }],
  schematic: { actuator: 'selector' },
};

export default def;
