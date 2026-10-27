/**
 * オムロン ソリッドステート・タイマ H3CR-A8（DIN 48 × 48mm、8 ピン、マルチモード、限時 c 接点 2 極）を
 * 表面接続ソケット P2CF-08 に挿した状態の機器定義を作る。
 *
 * 正面から見た図（1mm ≒ 2px）。ソケットの上下の段にネジ端子が 4 つずつ並び、その間にタイマー本体（正面パネル）が載る。
 *
 * 出典:
 *   端子（H3CR-A データシート L084 の接続図。販売店掲載の写しで確認）:
 *     電源 2・7（DC は 2 が −、7 が +）。限時接点 1 極目 = COM 1・NC 4・NO 3、2 極目 = COM 8・NC 5・NO 6。
 *     H3CR-A8 にはスタート・リセット・ゲートの入力はない（電源の投入で計時を始める）
 *   定格（H3CR-A8 / -A8S 取扱説明書 2217323-0）: 電源電圧の許容範囲は定格の 85〜110%（DC12V は 90〜110%）、
 *     消費電力 AC100-240V 形 約 2.0VA（1.6W）、AC24-48/DC12-48 形 約 0.8W（DC24V、出力 ON）。
 *     限時接点 AC250V 5A・DC30V 5A（抵抗負荷）
 *   ソケット P2CF-08 の端子の並び（オムロン H5CZ 取扱説明書の P2CF-08 上面図）: 上の段 左から 6・5・4・3、下の段 左から 7・8・1・2
 * 動作モード（A: オンディレー、B2: フリッカ、E: インターバル、J: ワンショット）は本体の切換スイッチで選ぶ。
 * 図面では限時接点をオンディレーの限時動作接点として表す。
 */
import type { AcceptSpec, DeviceDefinition, InternalLink, TerminalDef } from '../types';
import { cContact } from './relay-socket';
import { SCREW_GRADIENT, screw, sideShade, text } from './parts';

export type H3crSupply = 'ac100-240' | 'ac24-48';

const W = 100;
const H = 172;
const TOP_Y = 18;
const BOT_Y = 154;
const COLS = [23, 41, 59, 77];

const SUPPLY: Record<H3crSupply, { model: string; label: string; plus: AcceptSpec[]; minus: AcceptSpec[]; current: number; note: string }> = {
  'ac100-240': {
    model: 'AC100-240/DC100-125',
    label: 'AC100-240V DC100-125V',
    plus: [
      { system: 'AC', minVoltage: 85, maxVoltage: 264 },
      { system: 'DC', minVoltage: 85, maxVoltage: 137.5, conductors: ['+'] },
    ],
    minus: [
      { system: 'AC', minVoltage: 85, maxVoltage: 264 },
      { system: 'DC', minVoltage: 85, maxVoltage: 137.5, conductors: ['-'] },
    ],
    // 約 2.0VA を AC100V で割った値
    current: 0.02,
    note: 'AC100〜240V（50/60Hz）または DC100〜125V。許容 85〜110%',
  },
  'ac24-48': {
    model: 'AC24-48/DC12-48',
    label: 'AC24-48V DC12-48V',
    plus: [
      { system: 'AC', minVoltage: 20.4, maxVoltage: 52.8 },
      { system: 'DC', minVoltage: 10.8, maxVoltage: 52.8, conductors: ['+'] },
    ],
    minus: [
      { system: 'AC', minVoltage: 20.4, maxVoltage: 52.8 },
      { system: 'DC', minVoltage: 10.8, maxVoltage: 52.8, conductors: ['-'] },
    ],
    // 約 0.8W（DC24V、出力 ON）
    current: 0.034,
    note: 'AC24〜48V（50/60Hz）または DC12〜48V。許容 85〜110%（DC12V は 90〜110%）',
  },
};

/** 時間設定つまみ（0〜10 の目盛） */
function dial(cx: number, cy: number, r: number): string {
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = ((-135 + i * 27) * Math.PI) / 180;
    const p = (rr: number) => [(cx + rr * Math.sin(a)).toFixed(2), (cy - rr * Math.cos(a)).toFixed(2)];
    const [x1, y1] = p(r + 2);
    const [x2, y2] = p(r + (i % 5 === 0 ? 6 : 4.5));
    const [lx, ly] = p(r + 10.5);
    const label = i % 2 === 0 ? text(+lx, +ly + 1.8, String(i), 4.6, '#222', 'normal') : '';
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#222" stroke-width="0.7"/>${label}`;
  }).join('');
  return `
  ${ticks}
  <circle cx="${cx + 0.8}" cy="${cy + 1.2}" r="${r}" fill="#000" opacity="0.25"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#knob-{{uid}})" stroke="#111" stroke-width="0.7"/>
  <path d="M${cx} ${cy} L${cx - r * 0.62} ${cy - r * 0.62}" stroke="#f2f2f2" stroke-width="2" stroke-linecap="round"/>`;
}

/** 小さな切換つまみ（レンジ・時間単位・動作モード） */
const selector = (cx: number, cy: number, label: string) => `
  <circle cx="${cx}" cy="${cy}" r="6.4" fill="#f6f5f0" stroke="#7d7c76" stroke-width="0.5"/>
  <circle cx="${cx}" cy="${cy}" r="4.6" fill="url(#knob-{{uid}})"/>
  <line x1="${cx}" y1="${cy}" x2="${cx + 3}" y2="${cy - 3}" stroke="#eee" stroke-width="1"/>
  ${text(cx, cy + 11, label, 3.6, '#333', 'normal')}`;

export function buildH3crA8(supply: H3crSupply): DeviceDefinition {
  const sp = SUPPLY[supply];
  const svg = `
  <defs>
    ${sideShade('sock', '#161718', '#2c2e30')}
    <linearGradient id="face-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e5df"/>
      <stop offset="1" stop-color="#cfcec7"/>
    </linearGradient>
    <radialGradient id="knob-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#6a6d72"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>
  <!-- ソケット P2CF-08 -->
  <rect x="12" y="4" width="76" height="${H - 8}" rx="3" fill="url(#sock-{{uid}})" stroke="#000" stroke-width="0.7"/>
  <rect x="44" y="0" width="12" height="6" rx="1.5" fill="#161718"/>
  <rect x="44" y="${H - 6}" width="12" height="6" rx="1.5" fill="#161718"/>
  <!-- タイマー本体（正面） -->
  <rect x="2.6" y="39.6" width="96" height="96" rx="3" fill="#000" opacity="0.25"/>
  <rect x="2" y="38" width="96" height="96" rx="3" fill="#3a3b3d" stroke="#111" stroke-width="0.7"/>
  <rect x="6" y="42" width="88" height="88" rx="2" fill="url(#face-{{uid}})" stroke="#8a8984" stroke-width="0.5"/>
  ${text(12, 51, 'OMRON', 4.6, '#1a3f80', 'bold', 'start')}
  ${text(88, 51, 'H3CR', 5.4, '#222', 'bold', 'end')}
  <circle cx="15" cy="58" r="2" fill="#3ad45a" stroke="#174" stroke-width="0.4"/>
  ${text(19, 59.6, 'POWER', 3.2, '#333', 'normal', 'start')}
  <circle cx="15" cy="65" r="2" fill="#ff8a1e" stroke="#741" stroke-width="0.4"/>
  ${text(19, 66.6, 'OUT', 3.2, '#333', 'normal', 'start')}
  ${selector(80, 63, 'RANGE')}
  ${dial(50, 98, 15)}
  ${selector(18, 116, 'UNIT')}
  ${selector(82, 116, 'MODE')}
  ${text(50, 127.5, sp.label, 3.6, '#333', 'normal')}
  <!-- ネジ端子と端子番号（上の段 6・5・4・3、下の段 7・8・1・2） -->
  ${COLS.map((x) => screw(x, TOP_Y, 4.4, '#0b0b0c') + screw(x, BOT_Y, 4.4, '#0b0b0c')).join('')}
  ${['6', '5', '4', '3'].map((id, i) => text(COLS[i], TOP_Y + 13, id, 5, '#f2f2f2')).join('')}
  ${['7', '8', '1', '2'].map((id, i) => text(COLS[i], BOT_Y - 8.5, id, 5, '#f2f2f2')).join('')}
  ${text(74, H - 7, 'P2CF-08', 3.4, '#cfd3d6', 'normal')}`;

  const c = (id: string, note: string, hint: string, x: number, y: number): TerminalDef => ({
    id,
    label: id,
    note,
    hint,
    x,
    y,
    side: y < 80 ? 'top' : 'bottom',
    role: 'signal',
    optional: true,
  });
  const terminals: TerminalDef[] = [
    c('6', '限時接点 2 極目の NO（a 接点 8-6）', '限時NO2', COLS[0], TOP_Y),
    c('5', '限時接点 2 極目の NC（b 接点 8-5）', '限時NC2', COLS[1], TOP_Y),
    c('4', '限時接点 1 極目の NC（b 接点 1-4）', '限時NC1', COLS[2], TOP_Y),
    c('3', '限時接点 1 極目の NO（a 接点 1-3）', '限時NO1', COLS[3], TOP_Y),
    { id: '7', label: '7', note: `電源（DC は +）。${sp.note}`, hint: '電源+', x: COLS[0], y: BOT_Y, side: 'bottom', role: 'input', accepts: sp.plus },
    c('8', '限時接点 2 極目の COM（8-5 が b 接点、8-6 が a 接点）', '限時COM2', COLS[1], BOT_Y),
    c('1', '限時接点 1 極目の COM（1-4 が b 接点、1-3 が a 接点）', '限時COM1', COLS[2], BOT_Y),
    { id: '2', label: '2', note: `電源（DC は −）。${sp.note}`, hint: '電源−', x: COLS[3], y: BOT_Y, side: 'bottom', role: 'input', accepts: sp.minus },
  ];
  const links: InternalLink[] = [...cContact('1', '4', '3', 5), ...cContact('8', '5', '6', 5)].map((l) => ({ ...l, timed: 'on-delay' as const }));

  return {
    type: `omron.h3cr-a8.${supply}`,
    name: 'タイマー（マルチモード 2c、ソケット付き）',
    model: `H3CR-A8 ${sp.model} + P2CF-08`,
    maker: 'オムロン',
    category: 'contactor',
    description:
      `オムロンのソリッドステート・タイマ H3CR-A8（DIN 48 × 48mm、8 ピン、マルチモード、限時 c 接点 2 極、電源 ${sp.note}）を表面接続ソケット P2CF-08 に挿した状態。` +
      '電源 2・7（DC は 7 が +、2 が −）に通電すると計時を始め、設定時間の後に限時接点が切り換わる（1 極目: COM 1・NC 4・NO 3、2 極目: COM 8・NC 5・NO 6）。' +
      'スタート・リセットの入力はない（電源の投入・遮断で始動・リセット）。動作モード（A オンディレー・B2 フリッカ・E インターバル・J ワンショット）と' +
      '時間レンジ（0.05s〜300h）は本体の切換スイッチで選ぶ。接点定格 AC250V 5A・DC30V 5A（抵抗負荷）。図面では限時接点をオンディレーの接点として表す。',
    labelPrefix: 'TR',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    loadCurrent: sp.current,
  };
}
