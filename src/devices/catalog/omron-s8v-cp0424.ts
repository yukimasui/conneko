import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { SCREW_GRADIENT, text } from '../generic/parts';
import { screwTerminal } from '../generic/power-parts';

/**
 * オムロン DC 電子式サーキットプロテクタ S8V-CP0424（DC24V、4 分岐出力）。
 * DC24V 電源の出力を 4 つの分岐に分け、分岐ごとに設定した定格出力電流（2・3・4・6・8・10A、前面のロータリスイッチ）を超えると
 * その分岐だけを切る。センサー・PLC・電磁弁などの DC24V の分岐の保護に使う（サーキットプロテクタの代わり）。
 *
 * 端子: 入力 +V（+VI）・−V、分岐出力 +VO1〜+VO4、アラーム出力 ALM1・ALM2（MOS FET リレー出力 DC30V 50mA 以下）。
 * 出典: オムロン S8V-CP 製品ページ・カタログ SGTC-076（4 分岐 / 8 分岐、定格出力電流 2〜10A をロータリスイッチで分岐ごとに設定、
 * 分岐出力 +VO1〜 の順に起動、アラーム出力 MOS FET リレー DC30V 50mA）、S8V-CP0424S の入力電圧の許容範囲 DC20〜28.8V。
 *
 * 電気的な表現: 各分岐を +V → +VO□ の保護の経路（protects）にし、保護電流は「定格出力電流」のパラメータ 1 つで全分岐に同じ値を使う
 * （分岐ごとに別の設定は表せない簡略化）。−V は機器自身の電源の受電端子。分類は遮断器（電流の余裕の対象）。
 * 推定: 外形（幅 45 × 高さ 90mm）・端子の位置、アラーム出力の接点の向き（異常で閉）、機器自身の消費電流（約 50mA）。
 */

const W = 90;
const H = 180;
const TOP_Y = 15;
const BOT_Y = H - 15;
const TOP = { plus: 14, minus: 33, alm1: 58, alm2: 77 };
const OUT_X = [14, 35, 56, 77];
const RATINGS = [2, 3, 4, 6, 8, 10];

const svg = (p: ParamValues) => `
  <defs>
    ${SCREW_GRADIENT}
    <linearGradient id="cpbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9bcc0"/>
      <stop offset="0.15" stop-color="#e2e4e6"/>
      <stop offset="0.85" stop-color="#dfe1e3"/>
      <stop offset="1" stop-color="#b3b6ba"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#cpbody-{{uid}})" stroke="#7d8186" stroke-width="0.9"/>
  <rect x="3" y="3" width="${W - 6}" height="26" rx="1.5" fill="#2f3236"/>
  <rect x="3" y="${H - 29}" width="${W - 6}" height="26" rx="1.5" fill="#2f3236"/>
  ${[TOP.plus, TOP.minus, TOP.alm1, TOP.alm2].map((x) => screwTerminal(x, TOP_Y, 4.6, '#111')).join('')}
  ${OUT_X.map((x) => screwTerminal(x, BOT_Y, 4.6, '#111')).join('')}
  ${text(TOP.plus, 37, '+VI', 4.4, '#333')}
  ${text(TOP.minus, 37, '−V', 4.4, '#333')}
  ${text(TOP.alm1, 37, 'ALM1', 3.8, '#333')}
  ${text(TOP.alm2, 37, 'ALM2', 3.8, '#333')}
  ${OUT_X.map((x, i) => text(x, H - 33, `+VO${i + 1}`, 3.8, '#333')).join('')}
  <!-- 前面: 銘板・分岐ごとの表示灯とロータリスイッチ -->
  <rect x="7" y="43" width="${W - 14}" height="${H - 88}" rx="2" fill="#f4f5f6" stroke="#9a9ea3" stroke-width="0.6"/>
  ${text(W / 2, 53, 'OMRON', 5.6, '#1a1a1a')}
  ${text(W / 2, 61, 'S8V-CP0424', 4.4, '#333', 'normal')}
  ${text(W / 2, 68, 'DC24V  4ch', 3.8, '#555', 'normal')}
  ${OUT_X.map(
    (x, i) => `
  <circle cx="${x}" cy="80" r="2.8" fill="#2fbf4f" stroke="#145a24" stroke-width="0.5"/>
  ${text(x, 91, `${i + 1}`, 4.4, '#333')}
  <circle cx="${x}" cy="104" r="6.5" fill="#2b2d30" stroke="#000" stroke-width="0.6"/>
  <path d="M${x} 98.5 V103" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
  ${text(x, 118, `${p.rating}A`, 3.8, '#333')}`,
  ).join('')}
  ${text(W / 2, 130, 'RESET', 3.6, '#555', 'normal')}
`;

const terminals: TerminalDef[] = [
  { id: '+V', label: '+VI', hint: '入力 +24V', note: '入力 +（DC24V 電源の +V から）', x: TOP.plus, y: TOP_Y, side: 'top', role: 'line' },
  { id: '-V', label: '−V', hint: '入力 0V', note: '入力 −（DC24V 電源の 0V。機器自身の電源）', x: TOP.minus, y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'DC', minVoltage: 20, maxVoltage: 28.8, conductors: ['-'] } },
  { id: 'ALM1', hint: 'アラーム', note: 'アラーム出力（MOS FET リレー、DC30V 50mA 以下）', x: TOP.alm1, y: TOP_Y, side: 'top', role: 'signal', optional: true },
  { id: 'ALM2', hint: 'アラーム', note: 'アラーム出力（MOS FET リレー、DC30V 50mA 以下）', x: TOP.alm2, y: TOP_Y, side: 'top', role: 'signal', optional: true },
  ...OUT_X.map((x, i): TerminalDef => ({
    id: `+VO${i + 1}`,
    hint: `分岐 ${i + 1} +24V`,
    note: `分岐出力 ${i + 1}（+24V。設定した定格出力電流を超えるとこの分岐だけを切る）`,
    x,
    y: BOT_Y,
    side: 'bottom',
    role: 'load',
    optional: true,
  })),
];

const def: DeviceDefinition = {
  type: 'omron.s8v-cp0424',
  name: '電子サーキットプロテクタ',
  model: 'S8V-CP0424',
  maker: 'オムロン',
  category: 'breaker',
  description:
    'オムロンの DC 電子式サーキットプロテクタ S8V-CP0424（DC24V、4 分岐出力）。+VI・−V に DC24V 電源をつなぎ、+VO1〜+VO4 から分岐ごとに保護した +24V を出す。' +
    '定格出力電流（2・3・4・6・8・10A）は分岐ごとに前面のロータリスイッチで設定する（Conneko では全分岐に同じ値）。過電流を検出するとその分岐だけを切り、アラーム出力 ALM1-ALM2 で知らせる。負荷の 0V は電源の −V へ直接戻す。',
  estimated: '外形（幅 45 × 高さ 90mm）と端子の位置、アラーム出力の接点の向き（異常で閉じる a 接点とした）、機器自身の消費電流（約 50mA）は推定。',
  labelPrefix: 'CP',
  width: W,
  height: H,
  svg,
  terminals,
  links: [
    ...OUT_X.map((_, i) => ({ from: '+V', to: `+VO${i + 1}`, directed: true, protects: true })),
    { from: 'ALM1', to: 'ALM2', switch: 'NO', ratedCurrent: 0.05 },
  ],
  params: [
    {
      key: 'rating',
      label: '定格出力電流（各分岐）',
      unit: 'A',
      options: RATINGS.map((v) => ({ value: v, label: `${v}A` })),
      default: 4,
    },
  ],
  protectionCurrent: { param: 'rating' },
  loadCurrent: 0.05,
};

export default def;
