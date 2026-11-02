import type { DeviceDefinition, InternalLink, InternalLoad, PinDef, TerminalDef } from '../types';
import { SCREW_GRADIENT, sideShade, text } from '../generic/parts';
import { screwTerminal } from '../generic/power-parts';

/**
 * オムロン I/O リレーターミナル G7TC-OC16 DC24（出力用 16 点、NPN 対応（+ コモン）、リレー G7T 1a × 16）。
 * PLC のトランジスタ出力（シンク）のコネクタから MIL 20 極のケーブル 1 本でつなぎ、リレーの a 接点をネジ端子に出す。
 * PLC の出力より大きな負荷・AC の負荷（電磁接触器のコイル・ヒーター用の SSR など）を開閉するのに使う。
 *
 * 電源端子 +V・0V に DC24V を入れると、リレーのコイルの + 側が +V につながり（NPN 対応品は正極側が共通）、
 * コイルの − 側がコネクタのピンを通って PLC の出力へ行く。出力が ON（0V へ引き込む）になったリレーが動作する。
 * コネクタのコモンのピン（19・20）は 0V に、+V のピン（1・2）は +V につながる（PLC の出力ユニットのコモンへ 0V を送る）。
 * 1 台に別々に動く 16 個のリレーがあるので、コイルを internalLoads、接点を actor で結びつける（短絡の検査はリレーごと）。
 *
 * 出典: オムロン G7TC 製品ページ・形式一覧（出力 16 点、1a × 16、G7T、NPN 対応品は正極側が共通、幅 182mm）、
 * 販売店の仕様表（コイル DC24V 21mA・0.5W/点、負荷定格 AC220V 2A（抵抗負荷）/ DC24V、電源電圧 DC24V ±5%）。
 *
 * 推定: コネクタのピンの割付け（KEYENCE KV-NC16ET と同じ並び: 1・2 = +V、3・5…17 = リレー 0〜7、4・6…18 = リレー 8〜15、19・20 = 0V）、
 * 出力端子の並び（上段 0〜15、下段 C0〜C15 で各点独立）と電源端子の位置。
 */

const N = 16;
const W = 364;
const H = 116;
const X0 = 84;
const PITCH = 17;
const TOP_Y = 15;
const BOT_Y = H - 15;
const cx = (i: number) => X0 + PITCH * i + PITCH / 2;
const CN = { x: 26, y: 62, w: 52, l: 18 };
const PWR = { plus: 50, zero: 68, y: 16 };

/** リレー i のコイル − 側のピン番号（推定。KV-NC16ET と同じ千鳥の並び） */
const coilPin = (i: number) => (i < 8 ? 3 + 2 * i : 4 + 2 * (i - 8));

const coil = { system: 'DC' as const, minVoltage: 22.8, maxVoltage: 25.2 };

const relay = (i: number) => {
  const x = X0 + PITCH * i;
  return `
  <rect x="${x + 1.5}" y="34" width="${PITCH - 3}" height="48" rx="1.5" fill="url(#relay-{{uid}})" stroke="#000" stroke-width="0.5"/>
  <rect x="${x + 3.5}" y="38" width="${PITCH - 7}" height="7" rx="0.8" fill="#e8e8e8"/>
  ${text(x + PITCH / 2, 43.5, 'G7T', 3.6, '#222')}
  <circle cx="${x + PITCH / 2}" cy="52" r="1.8" fill="#c33" stroke="#7a1414" stroke-width="0.3"/>
  ${text(x + PITCH / 2, 76, `${i}`, 5.5, '#fff')}
  ${screwTerminal(cx(i), TOP_Y, 4, '#0d0d0e')}
  ${screwTerminal(cx(i), BOT_Y, 4, '#0d0d0e')}
  ${text(cx(i), TOP_Y + 12.5, `${i}`, 4.4, '#eee')}
  ${text(cx(i), BOT_Y - 8.5, `C${i}`, 3.8, '#eee')}`;
};

const svg = `
  <defs>
    ${SCREW_GRADIENT}
    ${sideShade('base', '#2a2c30', '#3f4247')}
    <linearGradient id="relay-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3b3e"/>
      <stop offset="1" stop-color="#18191b"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="2" width="${W - 1}" height="${H - 4}" rx="3" fill="url(#base-{{uid}})" stroke="#111" stroke-width="0.8"/>
  <rect x="${X0 - 2}" y="4" width="${W - X0 - 2}" height="23" rx="1.5" fill="#1d1f22"/>
  <rect x="${X0 - 2}" y="${H - 27}" width="${W - X0 - 2}" height="23" rx="1.5" fill="#1d1f22"/>
  <!-- コネクタ（MIL 20 極）と電源端子 -->
  <rect x="${CN.x - CN.l / 2 - 2}" y="${CN.y - CN.w / 2 - 2}" width="${CN.l + 4}" height="${CN.w + 4}" rx="1.5" fill="#111" stroke="#555" stroke-width="0.6"/>
  ${Array.from({ length: 10 }, (_, k) => `<rect x="${CN.x - 4.5}" y="${CN.y - CN.w / 2 + 3 + k * 4.9}" width="2.4" height="2.4" fill="#c9a24a"/><rect x="${CN.x + 2.1}" y="${CN.y - CN.w / 2 + 3 + k * 4.9}" width="2.4" height="2.4" fill="#c9a24a"/>`).join('')}
  ${text(CN.x, CN.y + CN.w / 2 + 10, 'CN', 4.4, '#eee')}
  ${screwTerminal(PWR.plus, PWR.y, 4.4, '#0d0d0e')}
  ${screwTerminal(PWR.zero, PWR.y, 4.4, '#0d0d0e')}
  ${text(PWR.plus, PWR.y + 13, '+', 6, '#f0a0a0')}
  ${text(PWR.zero, PWR.y + 13, '−', 6, '#a0c0f0')}
  ${text(59, 40, 'DC24V', 4, '#ccc', 'normal')}
  ${text(59, 72, 'OMRON', 5.4, '#eee')}
  ${text(59, 80, 'G7TC', 5, '#ddd')}
  ${text(59, 87, '-OC16', 4.2, '#ddd', 'normal')}
  ${Array.from({ length: N }, (_, i) => relay(i)).join('')}
`;

const terminals: TerminalDef[] = [
  {
    id: 'CN',
    label: 'CN（MIL 20P）',
    note: 'PLC の出力ユニット（シンク）のコネクタへ MIL 20 極のケーブルでつなぐ',
    x: CN.x,
    y: CN.y,
    side: 'left',
    role: 'connector',
    connector: { kind: 'MIL20', pins: 20, width: CN.w, facing: 'front', length: CN.l },
  },
  { id: '+V', label: '+', hint: '電源 +24V', note: '電源 DC24V の +（リレーのコイルの共通。コネクタの 1・2 にもつながる）', x: PWR.plus, y: PWR.y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['+'] } },
  { id: '0V', label: '−', hint: '電源 0V', note: '電源 DC24V の −（コネクタの 19・20 につながり、PLC の出力のコモンへ送る）', x: PWR.zero, y: PWR.y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['-'] } },
  ...Array.from({ length: N }, (_, i): TerminalDef[] => [
    { id: String(i), label: String(i), hint: `${i} a 接点`, note: `リレー ${i} の a 接点（NO）。コイルが動作すると C${i} と閉じる`, x: cx(i), y: TOP_Y, side: 'top', role: 'signal', optional: true },
    { id: `C${i}`, label: `C${i}`, hint: `${i} 共通`, note: `リレー ${i} の接点の共通（各点独立）`, x: cx(i), y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
  ]).flat(),
];

const pins: PinDef[] = [
  { id: 'CN#1', label: '+V', note: '+V（電源端子 + とつながる）', role: 'pass', optional: true },
  { id: 'CN#2', label: '+V', note: '+V（電源端子 + とつながる）', role: 'pass', optional: true },
  ...Array.from({ length: N }, (_, i): PinDef => ({
    id: `CN#${coilPin(i)}`,
    label: `IN${i}`,
    note: `リレー ${i} のコイルの −（PLC の出力へ。ON で 0V になるとリレーが動作する）`,
    role: 'input',
    accepts: { ...coil, conductors: ['-'] },
    // PLC の出力 1 点が受け持つのはこのリレーのコイルの電流だけ
    loadCurrent: 0.021,
    optional: true,
  })),
  { id: 'CN#19', label: 'COM(0V)', note: '0V（電源端子 − とつながる。PLC の出力のコモンへ）', role: 'pass', optional: true },
  { id: 'CN#20', label: 'COM(0V)', note: '0V（電源端子 − とつながる。PLC の出力のコモンへ）', role: 'pass', optional: true },
];

const internalLoads: InternalLoad[] = Array.from({ length: N }, (_, i) => ({ id: `K${i}`, label: `リレー ${i}`, terminals: ['+V', `CN#${coilPin(i)}`] as [string, string] }));

const links: InternalLink[] = [
  { from: '+V', to: 'CN#1' },
  { from: '+V', to: 'CN#2' },
  { from: '0V', to: 'CN#19' },
  { from: '0V', to: 'CN#20' },
  // 接点の負荷定格は AC220V 2A（抵抗負荷）
  ...Array.from({ length: N }, (_, i): InternalLink => ({ from: `C${i}`, to: String(i), switch: 'NO', actor: `K${i}`, ratedCurrent: 2 })),
];

const def: DeviceDefinition = {
  type: 'omron.g7tc-oc16.dc24',
  name: 'リレーターミナル',
  model: 'G7TC-OC16 DC24',
  maker: 'オムロン',
  category: 'control',
  description:
    'オムロンの I/O リレーターミナル G7TC-OC16（出力用 16 点、NPN 対応（+ コモン）、リレー G7T 1a × 16、DC24V）。PLC のシンク出力ユニットのコネクタから MIL 20 極のケーブル 1 本でつなぎ、' +
    '出力が ON のリレーの接点（C□-□）を閉じる。電源端子 + / − に DC24V を入れる（コネクタを通して PLC の出力のコモンへ 0V を送る）。接点の負荷定格 AC220V 2A（抵抗負荷）。コイル 21mA/点。',
  estimated:
    'コネクタのピンの割付け（1・2 = +V、3・5…17 = リレー 0〜7、4・6…18 = リレー 8〜15、19・20 = 0V。KEYENCE KV-NC16ET と同じ並びとした）、出力端子の並び（各点独立の 0〜15 と C0〜C15）、電源端子の位置は推定。',
  labelPrefix: 'RT',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  internalLoads,
  // コイル 16 個（1 個 21mA）
  loadCurrent: 0.336,
};

export default def;
