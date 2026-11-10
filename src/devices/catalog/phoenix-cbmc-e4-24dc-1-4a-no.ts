import type { DeviceDefinition, ParamValues, TerminalDef, WireAcceptSpec } from '../types';
import { text } from '../generic/parts';

/**
 * フエニックス・コンタクト 電子式機器保護用遮断器 CBMC E4 24DC/1-4A NO（2906031。DC24V、4 チャンネル）。
 * DC24V 電源の出力を 4 つのチャンネルに分け、チャンネルごとに設定した定格電流（1・2・3・4A、出荷時 4A）を超えるとそのチャンネルだけを切る。
 * 状態は無電圧の信号接点 13-14 で知らせる（NO = a 接点）。
 *
 * 出典: フエニックス・コンタクトの製品ページ（使用電圧 DC18〜30V、定格電圧 DC24V、入力 IN+ 最大 16A、出力 1 / 2 / 3 / 4A をチャンネルごとに設定・出荷時 4A、
 *   消費電流 25mA、信号接点 13-14（無電圧）、プッシュイン接続）、販売店の仕様表（幅 36 × 高さ 90 × 奥行 98mm、DIN レール 35mm、
 *   出力のプッシュイン 単線 0.2〜2.5㎟、ストリップ長 10mm）。
 * 電気的な表現: オムロン S8V-CP と同じく、各チャンネルを IN+ → OUT□ の保護の経路（protects）にし、保護電流は定格電流のパラメータ 1 つで全チャンネルに同じ値を使う。
 * GND は機器自身の電源の受電端子。分類は遮断器（電流の余裕の対象）。
 * 推定: 端子の位置と記号（IN+・GND・OUT1〜OUT4・13・14）、信号接点の向き（正常で閉じる a 接点）と定格（DC30V 100mA）。
 */

const W = 72;
const H = 180;
const TOP_Y = 14;
const BOT_Y = H - 14;
const XS = [12, 28, 44, 60];
const RATINGS = [1, 2, 3, 4];

/** 出力のプッシュイン端子: 単線 0.2〜2.5㎟（フェルールも可） */
const OUT_WIRE: WireAcceptSpec = { methods: ['ferrule', 'bare'], minSq: 0.2, maxSq: 2.5 };

/** プッシュイン端子（差込口とオレンジのプッシュボタン）。up: 差込口が上 */
const pushIn = (x: number, y: number, up: boolean) => {
  const by = up ? y + 9 : y - 13;
  return `
  <rect x="${x - 5}" y="${y - 4.5}" width="10" height="9" rx="1.2" fill="#121314" stroke="#3c3f43" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="2.6" fill="#050505"/>
  <rect x="${x - 3.5}" y="${by}" width="7" height="4" rx="0.8" fill="#f07d00" stroke="#9a4f00" stroke-width="0.4"/>`;
};

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="cbbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4b4f54"/>
      <stop offset="0.15" stop-color="#6b7076"/>
      <stop offset="0.85" stop-color="#666b71"/>
      <stop offset="1" stop-color="#45494e"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#cbbody-{{uid}})" stroke="#2a2d30" stroke-width="0.9"/>
  <rect x="3" y="3" width="${W - 6}" height="30" rx="1.5" fill="#35383c"/>
  <rect x="3" y="${H - 33}" width="${W - 6}" height="30" rx="1.5" fill="#35383c"/>
  ${XS.map((x) => pushIn(x, TOP_Y, true)).join('')}
  ${XS.map((x) => pushIn(x, BOT_Y, false)).join('')}
  ${text(XS[0], 40, 'IN+', 4, '#eee')}
  ${text(XS[1], 40, 'GND', 4, '#eee')}
  ${text(XS[2], 40, '13', 4, '#eee')}
  ${text(XS[3], 40, '14', 4, '#eee')}
  ${XS.map((x, i) => text(x, H - 36, `${i + 1}`, 4.4, '#eee')).join('')}
  <!-- 前面: 銘板・チャンネルごとの表示灯と押しボタン -->
  <rect x="6" y="46" width="${W - 12}" height="${H - 92}" rx="2" fill="#f2f3f4" stroke="#9a9ea3" stroke-width="0.6"/>
  ${text(W / 2, 56, 'PHOENIX', 4.6, '#1a1a1a')}
  ${text(W / 2, 61.5, 'CONTACT', 3.4, '#1a1a1a', 'normal')}
  ${text(W / 2, 70, 'CBMC E4', 4.6, '#333')}
  ${text(W / 2, 76, '24DC/1-4A NO', 3.6, '#555', 'normal')}
  ${XS.map(
    (x, i) => `
  <circle cx="${x}" cy="88" r="2.8" fill="#2fbf4f" stroke="#145a24" stroke-width="0.5"/>
  ${text(x, 97, `${i + 1}`, 4, '#333')}
  <rect x="${x - 5}" y="101" width="10" height="9" rx="1.5" fill="#2b2d30" stroke="#000" stroke-width="0.5"/>
  ${text(x, 118, `${p.rating}A`, 3.6, '#333')}`,
  ).join('')}
  ${text(W / 2, 128, 'ON/OFF・RESET', 3.2, '#555', 'normal')}
`;

const terminals: TerminalDef[] = [
  { id: 'IN+', hint: '入力 +24V', note: '入力 +（DC24V 電源の + から。最大 16A）', x: XS[0], y: TOP_Y, side: 'top', role: 'line' },
  { id: 'GND', hint: '入力 0V', note: '入力 GND（DC24V 電源の 0V。機器自身の電源）', x: XS[1], y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'DC', minVoltage: 18, maxVoltage: 30, conductors: ['-'] } },
  { id: '13', hint: '信号接点', note: '信号接点 13-14（無電圧の a 接点。状態の通知）', x: XS[2], y: TOP_Y, side: 'top', role: 'signal', optional: true },
  { id: '14', hint: '信号接点', note: '信号接点 13-14（無電圧の a 接点。状態の通知）', x: XS[3], y: TOP_Y, side: 'top', role: 'signal', optional: true },
  ...XS.map((x, i): TerminalDef => ({
    id: `OUT${i + 1}`,
    label: String(i + 1),
    hint: `出力 ${i + 1} +24V`,
    note: `チャンネル ${i + 1} の出力（+24V。設定した定格電流を超えるとこのチャンネルだけを切る）`,
    x,
    y: BOT_Y,
    side: 'bottom',
    role: 'load',
    optional: true,
    wire: OUT_WIRE,
  })),
];

const def: DeviceDefinition = {
  type: 'phoenix.cbmc-e4-24dc-1-4a-no',
  name: '電子サーキットプロテクタ',
  model: 'CBMC E4 24DC/1-4A NO',
  maker: 'フエニックス・コンタクト',
  category: 'breaker',
  description:
    'フエニックス・コンタクトの電子式機器保護用遮断器 CBMC E4 24DC/1-4A NO（DC24V、4 チャンネル、プッシュイン接続）。IN+・GND に DC24V 電源をつなぎ、出力 1〜4 からチャンネルごとに保護した +24V を出す。' +
    '定格電流（1・2・3・4A）はチャンネルごとに前面の押しボタンで設定する（Conneko では全チャンネルに同じ値）。過電流を検出するとそのチャンネルだけを切り、信号接点 13-14 で知らせる。負荷の 0V は電源の 0V へ直接戻す。',
  estimated: '端子の位置と記号（IN+・GND・OUT1〜OUT4・13・14）、信号接点の向き（正常で閉じる a 接点とした）と定格（DC30V 100mA）は推定。',
  labelPrefix: 'CP',
  width: W,
  height: H,
  svg,
  terminals,
  links: [
    ...XS.map((_, i) => ({ from: 'IN+', to: `OUT${i + 1}`, directed: true, protects: true })),
    { from: '13', to: '14', switch: 'NO', ratedCurrent: 0.1 },
  ],
  params: [
    {
      key: 'rating',
      label: '定格電流（各チャンネル）',
      unit: 'A',
      options: RATINGS.map((v) => ({ value: v, label: `${v}A` })),
      default: 4,
    },
  ],
  protectionCurrent: { param: 'rating' },
  loadCurrent: 0.025,
};

export default def;
