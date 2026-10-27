import type { AcceptSpec, DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';
import { cContact } from '../generic/relay-socket';
import { SCREW_GRADIENT, screw, text } from '../generic/parts';

/**
 * オムロン ソリッドステート・タイマ H3DT-N2（幅 17.5mm の DIN レール取付け、マルチモード、c 接点 2 極、AC/DC24〜240V）。
 * 正面から見た図。実物は幅 17.5mm と細いので、端子の文字が読めるよう横を広げて描く（縦 1mm ≒ 2px）。
 *
 * 出典: オムロン H3DT データシート（M090-E1。販売店掲載の写しの内容）:
 *   電源 A1-A2（極性なし）、AC/DC24〜240V（50/60Hz）。スタート入力は A1 と B1 の間に接点を入れる（電圧入力）。
 *   限時接点 R1: COM 15・NC 16・NO 18、R2: COM 25・NC 26・NO 28（R2 は前面のスイッチで瞬時接点（21・22・24）にもできる）。
 *   接点定格 AC250V 5A・DC30V 5A（抵抗負荷）、最小適用負荷 DC5V 10mA
 * 推定: 端子の位置（上の段 A1・B1・15・25、下の段 16・18・26・28・A2）と消費電流（約 30mA）は資料の図を確かめられなかった。
 */

const W = 76;
const H = 180;
const TOP_Y = 14;
const BOT_Y = 166;
const TOP_X = [14, 30, 46, 62];
const BOT_X = [10, 24, 38, 52, 66];

const ACC: AcceptSpec[] = [
  { system: 'AC', minVoltage: 20.4, maxVoltage: 264 },
  { system: 'DC', minVoltage: 20.4, maxVoltage: 264 },
];

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#bfc0bb"/>
      <stop offset="0.2" stop-color="#e9e9e4"/>
      <stop offset="0.8" stop-color="#e9e9e4"/>
      <stop offset="1" stop-color="#b4b5b0"/>
    </linearGradient>
    <radialGradient id="knob-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#7a7d82"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>
  <!-- 端子部（上下）と本体 -->
  <rect x="2" y="2" width="${W - 4}" height="30" rx="2" fill="#d6d6d0" stroke="#7d7c76" stroke-width="0.6"/>
  <rect x="2" y="${H - 32}" width="${W - 4}" height="30" rx="2" fill="#d6d6d0" stroke="#7d7c76" stroke-width="0.6"/>
  <rect x="6" y="30" width="${W - 12}" height="${H - 60}" rx="3" fill="url(#case-{{uid}})" stroke="#7d7c76" stroke-width="0.7"/>
  <rect x="12" y="38" width="${W - 24}" height="${H - 76}" rx="2" fill="#f4f4f0" stroke="#a5a49e" stroke-width="0.5"/>
  ${text(W / 2, 48, 'OMRON', 5, '#1a3f80')}
  ${text(W / 2, 56, 'H3DT-N', 4.6, '#222')}
  <circle cx="24" cy="65" r="2" fill="#3ad45a" stroke="#174" stroke-width="0.4"/>
  ${text(24, 72, 'PWR', 3.2, '#333', 'normal')}
  <circle cx="${W - 24}" cy="65" r="2" fill="#ff8a1e" stroke="#741" stroke-width="0.4"/>
  ${text(W - 24, 72, 'OUT', 3.2, '#333', 'normal')}
  <circle cx="${W / 2}" cy="92" r="11" fill="#f6f5f0" stroke="#7d7c76" stroke-width="0.5"/>
  <circle cx="${W / 2}" cy="92" r="8.5" fill="url(#knob-{{uid}})"/>
  <path d="M${W / 2} 92 L${W / 2 - 5} 87" stroke="#eee" stroke-width="1.6" stroke-linecap="round"/>
  ${text(W / 2, 109, 'SET', 3.4, '#333', 'normal')}
  <circle cx="26" cy="122" r="5.4" fill="url(#knob-{{uid}})"/>
  ${text(26, 132, 'RANGE', 3.2, '#333', 'normal')}
  <circle cx="${W - 26}" cy="122" r="5.4" fill="url(#knob-{{uid}})"/>
  ${text(W - 26, 132, 'MODE', 3.2, '#333', 'normal')}
  ${text(W / 2, 141, `R2: ${p.r2 === 'instant' ? '瞬時' : '限時'}`, 3.6, '#333', 'normal')}
  ${TOP_X.map((x) => screw(x, TOP_Y, 4.2, '#9b9a94')).join('')}
  ${BOT_X.map((x) => screw(x, BOT_Y, 4.2, '#9b9a94')).join('')}
  ${['A1', 'B1', '15', '25'].map((id, i) => text(TOP_X[i], TOP_Y + 13, id, 4.6, '#222')).join('')}
  ${['16', '18', '26', '28', 'A2'].map((id, i) => text(BOT_X[i], BOT_Y - 8.5, id, 4.6, '#222')).join('')}`;

const sig = (id: string, note: string, hint: string, x: number, y: number): TerminalDef => ({
  id,
  label: id,
  note,
  hint,
  x,
  y,
  side: y < H / 2 ? 'top' : 'bottom',
  role: 'signal',
  optional: true,
});

const terminals: TerminalDef[] = [
  { id: 'A1', label: 'A1', note: '電源（AC/DC24〜240V、極性なし）', hint: '電源', x: TOP_X[0], y: TOP_Y, side: 'top', role: 'input', accepts: ACC },
  {
    id: 'B1',
    label: 'B1',
    note: 'スタート入力（A1 との間に接点を入れる。電源と同じ電圧の入力）',
    hint: 'スタート',
    x: TOP_X[1],
    y: TOP_Y,
    side: 'top',
    role: 'input',
    accepts: ACC,
    optional: true,
  },
  sig('15', 'R1（限時）の COM（15-16 が b 接点、15-18 が a 接点）', '限時COM1', TOP_X[2], TOP_Y),
  sig('25', 'R2 の COM（25-26 が b 接点、25-28 が a 接点。前面のスイッチで限時・瞬時を切換）', 'COM2', TOP_X[3], TOP_Y),
  sig('16', 'R1（限時）の NC（b 接点 15-16）', '限時NC1', BOT_X[0], BOT_Y),
  sig('18', 'R1（限時）の NO（a 接点 15-18）', '限時NO1', BOT_X[1], BOT_Y),
  sig('26', 'R2 の NC（b 接点 25-26）', 'NC2', BOT_X[2], BOT_Y),
  sig('28', 'R2 の NO（a 接点 25-28）', 'NO2', BOT_X[3], BOT_Y),
  { id: 'A2', label: 'A2', note: '電源（AC/DC24〜240V、極性なし）', hint: '電源', x: BOT_X[4], y: BOT_Y, side: 'bottom', role: 'input', accepts: ACC },
];

const links = (p: ParamValues): InternalLink[] => [
  ...cContact('15', '16', '18', 5).map((l) => ({ ...l, timed: 'on-delay' as const })),
  ...cContact('25', '26', '28', 5).map((l) => (p.r2 === 'instant' ? l : { ...l, timed: 'on-delay' as const })),
];

const def: DeviceDefinition = {
  type: 'omron.h3dt-n2',
  name: 'タイマー（マルチモード 2c、DIN レール取付け）',
  model: 'H3DT-N2 AC24-240/DC24-240',
  maker: 'オムロン',
  category: 'contactor',
  description:
    'オムロンのソリッドステート・タイマ H3DT-N2（幅 17.5mm の DIN レール取付け、マルチモード 8 種類、時間レンジ 0.1s〜1200h、c 接点 2 極、電源 AC/DC24〜240V（極性なし））。' +
    '電源 A1-A2 に通電すると計時を始め（モードによっては A1-B1 の間のスタート入力で始動）、設定時間の後に R1（COM 15・NC 16・NO 18）が切り換わる。' +
    'R2（COM 25・NC 26・NO 28）は前面のスイッチで限時接点か瞬時接点かを選ぶ（params の r2）。接点定格 AC250V 5A・DC30V 5A（抵抗負荷）。' +
    '図面では限時接点をオンディレーの接点として表す。端子の位置と消費電流は推定。',
  labelPrefix: 'TR',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  params: [
    {
      key: 'r2',
      label: 'R2 の接点',
      options: [
        { value: 'timed', label: '限時接点' },
        { value: 'instant', label: '瞬時接点' },
      ],
      default: 'timed',
    },
  ],
  loadCurrent: 0.03,
  // 電源 A1-A2 をコイルの記号に（スタート入力 B1 も受電端子なので、自動の切り出しでは決まらない）
  schematic: { elements: [{ kind: 'coil', terminals: ['A1', 'A2'] }] },
  estimated: '端子の位置（上の段 A1・B1・15・25、下の段 16・18・26・28・A2）と消費電流（約 30mA）は推定',
};

export default def;
