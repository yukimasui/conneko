import type { DeviceDefinition, TerminalDef } from '../types';
import { cContact } from '../generic/relay-socket';

/**
 * オムロン フロートなしスイッチ 61F-G（基本タイプ、AC100/200V、1 回路の給水・排水制御）。
 * 水槽に吊るした電極（電極保持器 PS-3S と電極棒）の間が液で導通するかで液面を検出し、内部のリレー（1c 接点 Ta・Tc・Tb）を開閉する。
 *
 * 出典: オムロン 61F-G データシート（CSM_61F-G__DS_J / CSM_61F-G__DS_E）、フロートなしスイッチ よくあるお問い合わせ解決ガイド（SGFE-021）、
 *       電気工事士メモ「61F フロートなしスイッチ ポンプ制御」
 * - 端子の並び（内部接続図）: 上段 Ta・Tc・Tb・E2・E1、下段 S0・S1・S2・E3
 * - 電源: S0-S1 に AC100（110）V、S0-S2 に AC200（220）V（AC100/200 の 2 電圧品）
 * - 電極間電圧 AC8V、電極間電流 約 1mA 以下
 * - 出力: リレーの 1c 接点（Tc が共通、Ta が a 接点、Tb が b 接点）。定格 3A AC200V（抵抗負荷）、2A AC220V（誘導負荷 cosφ = 0.4）
 * - E1 = 上限（満水）の電極、E2 = 下限の電極（自己保持。コンタクタでポンプを入り切りする場合は必ず使う）、E3 = コモンの電極（一番長い。接地する）
 * - 自動給水: 液面が下がって E2 から離れるとリレーが復帰し、Tb-Tc が閉じてポンプ（コンタクタ）を動かす。E1 に達するとリレーが動作して Tb-Tc が開く。
 *   自動排水は Ta-Tc を使う
 * 推定: 消費電力（約 3.2VA。販売店の仕様。電源電流 0.032A とした）、電源電圧の許容範囲（定格の 85〜110%）、外形の見た目。
 */

const W = 120;
const H = 150;
const TOP_Y = 26;
const BOT_Y = 124;
const TOP = ['Ta', 'Tc', 'Tb', 'E2', 'E1'];
const BOT = ['S0', 'S1', 'S2', 'E3'];
const P = 20;
const topX = (i: number) => 20 + i * P;
const botX = (i: number) => 30 + i * P;

const screw = (x: number, y: number) => `
  <rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="1.2" fill="#3b3d40"/>
  <circle cx="${x}" cy="${y}" r="5.2" fill="url(#f61-screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - 3} ${y} H${x + 3} M${x} ${y - 3} V${y + 3}" stroke="#4a4a4a" stroke-width="1.1" stroke-linecap="round"/>`;
const text = (x: number, y: number, t: string, size: number, fill = '#222', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const svg = `
  <defs>
    <linearGradient id="f61-case-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e3e4e1"/>
      <stop offset="1" stop-color="#b9bbb7"/>
    </linearGradient>
    <radialGradient id="f61-screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- 取付け穴のタブ -->
  <rect x="${W / 2 - 10}" y="0" width="20" height="10" rx="3" fill="#a6a8a4" stroke="#6d6f6b" stroke-width="0.6"/>
  <circle cx="${W / 2}" cy="5" r="2.5" fill="#555"/>
  <rect x="${W / 2 - 10}" y="${H - 10}" width="20" height="10" rx="3" fill="#a6a8a4" stroke="#6d6f6b" stroke-width="0.6"/>
  <circle cx="${W / 2}" cy="${H - 5}" r="2.5" fill="#555"/>
  <!-- 本体 -->
  <rect x="2" y="8" width="${W - 4}" height="${H - 16}" rx="4" fill="url(#f61-case-{{uid}})" stroke="#6d6f6b" stroke-width="1"/>
  <!-- 上段・下段の端子台 -->
  <rect x="6" y="${TOP_Y - 11}" width="${W - 12}" height="30" rx="2" fill="#2f3134"/>
  <rect x="16" y="${BOT_Y - 19}" width="${W - 32}" height="30" rx="2" fill="#2f3134"/>
  ${TOP.map((id, i) => screw(topX(i), TOP_Y) + text(topX(i), TOP_Y + 15, id, 5.4, '#f2f2f2')).join('')}
  ${BOT.map((id, i) => screw(botX(i), BOT_Y) + text(botX(i), BOT_Y - 10, id, 5.4, '#f2f2f2')).join('')}
  <!-- 銘板・動作表示 -->
  <rect x="14" y="52" width="${W - 28}" height="44" rx="2" fill="#f4f4f2" stroke="#8d8f8b" stroke-width="0.6"/>
  ${text(W / 2, 62, 'OMRON', 6, '#1b3f8f')}
  ${text(W / 2, 72, '61F-G', 8.4, '#111')}
  ${text(W / 2, 80, 'FLOATLESS LEVEL SWITCH', 3.4, '#444', 'normal')}
  ${text(W / 2, 88, 'AC100/200V  電極間 AC8V', 3.6, '#444', 'normal')}
  <circle cx="${W - 22}" cy="62" r="2.6" fill="#d33" stroke="#622" stroke-width="0.5"/>
  ${text(W - 22, 69, 'OPR', 3, '#444', 'normal')}
  <!-- 内部接続（1c 接点）の印刷 -->
  <path d="M${topX(0)} 42 V46 H${topX(1)} M${topX(2)} 42 V46 H${topX(1)} M${topX(1)} 46 V49" stroke="#9fa29d" stroke-width="0.7" fill="none"/>
`;

const POWER_NOTE = '電源（S0 が共通。S0-S1 に AC100/110V、S0-S2 に AC200/220V。どちらか一方だけを使う）';

const terminals: TerminalDef[] = [
  ...TOP.map((id, i): TerminalDef => {
    const base = { id, x: topX(i), y: TOP_Y, side: 'top' as const };
    if (id === 'Tc') return { ...base, role: 'signal', note: 'リレー出力の共通（1c 接点。定格 3A AC200V 抵抗負荷、2A AC220V 誘導負荷）', hint: '出力 共通', optional: true, signal: { dir: 'out', kind: 'contact' } };
    if (id === 'Ta') return { ...base, role: 'signal', note: 'リレー出力の a 接点（液面が E1 に達すると Tc と閉じる。自動排水に使う）', hint: '出力 a', optional: true, signal: { dir: 'out', kind: 'contact' } };
    if (id === 'Tb') return { ...base, role: 'signal', note: 'リレー出力の b 接点（液面が E2 より下がると Tc と閉じる。自動給水でポンプのコンタクタのコイルへ）', hint: '出力 b', optional: true, signal: { dir: 'out', kind: 'contact' } };
    if (id === 'E1') return { ...base, role: 'signal', note: '電極 E1（上限・満水。電極保持器の一番短い電極棒へ）。電極間 AC8V・約 1mA', hint: '上限電極' };
    return { ...base, role: 'signal', optional: true, note: '電極 E2（下限。自己保持の電極。コンタクタでポンプを入り切りする場合は必ず使う）', hint: '下限電極' };
  }),
  ...BOT.map((id, i): TerminalDef => {
    const base = { id, x: botX(i), y: BOT_Y, side: 'bottom' as const };
    if (id === 'S0') return { ...base, role: 'input', accepts: { system: 'AC', minVoltage: 85, maxVoltage: 242 }, note: POWER_NOTE, hint: '電源 共通' };
    if (id === 'S1') return { ...base, role: 'input', accepts: { system: 'AC', minVoltage: 85, maxVoltage: 121 }, optional: true, note: `${POWER_NOTE}。S1 は AC100/110V 用`, hint: '電源100V' };
    if (id === 'S2') return { ...base, role: 'input', accepts: { system: 'AC', minVoltage: 170, maxVoltage: 242 }, optional: true, note: `${POWER_NOTE}。S2 は AC200/220V 用`, hint: '電源200V' };
    return { ...base, role: 'signal', note: '電極 E3（コモン。一番長い電極棒へ。必ず接地する）', hint: 'コモン電極' };
  }),
];

const def: DeviceDefinition = {
  type: 'omron.61f-g',
  name: 'フロートなしスイッチ',
  model: '61F-G AC100/200',
  maker: 'オムロン',
  category: 'control',
  description:
    'オムロンのフロートなしスイッチ 61F-G（基本タイプ、AC100/200V）。水槽の電極（電極保持器 PS-3S と電極棒）の間が液で導通するかで液面を検出し、内部リレーの 1c 接点（Tc 共通・Ta a 接点・Tb b 接点、3A AC200V）で給水・排水のポンプを制御する。' +
    '電源は S0-S1 に AC100/110V、または S0-S2 に AC200/220V（S1 に AC200V をつながない）。電極は E1 = 上限（一番短い）、E2 = 下限（自己保持）、E3 = コモン（一番長い。接地する）。電極間は AC8V・約 1mA。' +
    '自動給水は Tb-Tc でポンプのコンタクタを動かし（液面が E2 より下がると ON、E1 に達すると OFF）、自動排水は Ta-Tc を使う。PLC へ液面を入れる場合は Ta-Tc を無電圧接点として入力へつなぐ。' +
    '電極の配線は導電性の液体（水道水など）に使う。油・純水は検出できない。',
  labelPrefix: 'LV',
  width: W,
  height: H,
  svg,
  terminals,
  links: cContact('Tc', 'Tb', 'Ta', 3),
  distinctGroups: [
    ['S0', 'S1'],
    ['S0', 'S2'],
  ],
  loadCurrent: 0.032,
  estimated: '消費電力（約 3.2VA として電源電流 0.032A とした）、電源電圧の許容範囲（定格の 85〜110%）、外形の見た目',
};

export default def;
