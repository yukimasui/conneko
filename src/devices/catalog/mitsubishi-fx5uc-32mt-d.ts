import { FX5_BUS } from '../mitsubishi/melsec';
import type { AcceptSpec, CommonLimit, DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * 三菱電機 MELSEC iQ-F シリーズ CPU ユニット FX5UC-32MT/D（DC24V 電源、DC 入力 16 点（シンク）、トランジスタ出力 16 点（シンク）、コネクタ式）。
 * 外形 W42.1 × H89.1 mm（1mm ≒ 2px）。本体はライトグレー。上面に電源コネクタ（24V・0V・⏚、電源ケーブル FX2NC-100MPCB など）、
 * 正面上部に Ethernet ポートと状態 LED、中央に入出力表示 LED、下部に入力用（X）・出力用（Y）の 20 ピンコネクタ（MIL 規格のボックスヘッダ）が並ぶ。
 *
 * 20 ピンコネクタのピン配置（推定。MIL の千鳥番号、▲側の端が 1・2）:
 *   入力: 1・3・…・15 = X0〜X7、2・4・…・16 = X10〜X17、17・18 = COM、19・20 = 空き
 *   出力: 1・3・…・15 = Y0〜Y7、2・4・…・16 = Y10〜Y17、17・18 = COM0、19・20 = 空き
 * MIL 20 極のケーブルで変換端子台へつなぐと、同じ番号のピンが端子台のネジ端子になる。
 *
 * 増設ユニットは右側に増設する（バスの親。FX5U と同じく入出力番号は X・Y を別々に 8 進で、X20・Y20 から 8 点単位で続く）。
 * 実機では FX5-C 形の増設ユニットを直接つなぎ、増設ケーブルタイプ（FX5-16EX/ES など）はコネクタ変換ユニット FX5-CNV-IFC を介してつなぐ。
 */

const W = 84;
const H = 178;

const PWR = [
  { id: '24V', label: '24V', note: '電源 DC24V +（電源ケーブルの赤）', x: 14 },
  { id: '0V', label: '0V', note: '電源 0V（電源ケーブルの黒）', x: 24 },
  { id: 'FG', label: '⏚', note: '機能接地（電源ケーブルの緑）', x: 34 },
];
const PWR_Y = 4;
const ETH = { x: 64, y: 34, w: 22, h: 20 };
const CN_X = { x: 22, y: 136 };
const CN_Y = { x: 62, y: 136 };
const MIL_P = 5.08;

const text = (x: number, y: number, t: string, size = 4, fill = '#232427', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 縦向きの MIL 20 極ボックスヘッダ（左列が奇数、▲側の上端が 1） */
const milHeader = (cx: number, cy: number, label: string) => {
  const row0 = cy - 4.5 * MIL_P;
  const top = row0 - 5;
  const bottom = row0 + 9 * MIL_P + 5;
  const dots = Array.from({ length: 10 }, (_, i) => {
    const y = +(row0 + i * MIL_P).toFixed(2);
    return `<rect x="${cx - 2.54 - 0.9}" y="${(y - 0.9).toFixed(2)}" width="1.8" height="1.8" fill="url(#pin-{{uid}})"/><rect x="${cx + 2.54 - 0.9}" y="${(y - 0.9).toFixed(2)}" width="1.8" height="1.8" fill="url(#pin-{{uid}})"/>`;
  }).join('');
  return `
  <rect x="${cx - 11}" y="${(top - 4).toFixed(2)}" width="22" height="${(bottom - top + 8).toFixed(2)}" rx="1.5" fill="#1c1d20" stroke="#060607" stroke-width="0.8"/>
  <rect x="${cx - 7.5}" y="${top.toFixed(2)}" width="15" height="${(bottom - top).toFixed(2)}" rx="0.8" fill="#0c0c0d" stroke="#3b3d41" stroke-width="0.6"/>
  <rect x="${cx - 9.5}" y="${(cy - MIL_P / 2 - 0.5).toFixed(2)}" width="2.4" height="${(MIL_P + 1).toFixed(2)}" fill="#0c0c0d"/>
  ${dots}
  <path d="M${cx - 10} ${(top + 3.2).toFixed(2)} l1.6 -2.8 l1.6 2.8 z" fill="#e8e9eb"/>
  ${text(cx, +(top - 6).toFixed(2), label, 3.6, '#2f3134')}`;
};

const ioLeds = (title: string, y: number) => {
  const xs = Array.from({ length: 8 }, (_, i) => 18 + i * 7.6);
  return `
  ${text(6, y + 2.4, title, 3, '#f2f3f4', 'start')}
  ${xs.map((x, i) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#3b4a36"/>${text(x, y + 4.6, String(i), 2.6, '#f2f3f4')}`).join('')}
  ${xs.map((x, i) => `<circle cx="${x}" cy="${y + 8}" r="1.3" fill="#3b4a36"/>${text(x, y + 12.6, String(10 + i), 2.2, '#f2f3f4')}`).join('')}`;
};

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9dcdf"/>
      <stop offset="0.5" stop-color="#cdd0d3"/>
      <stop offset="1" stop-color="#bfc2c5"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55585d"/>
      <stop offset="1" stop-color="#3f4246"/>
    </linearGradient>
    <radialGradient id="green-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
    <radialGradient id="pin-{{uid}}" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#b8902e"/>
    </radialGradient>
  </defs>

  <!-- 電源コネクタ（上面） -->
  <rect x="7" y="0" width="34" height="9" rx="1.2" fill="#2a2b2e" stroke="#0e0e0f" stroke-width="0.6"/>
  ${PWR.map((p, i) => `<rect x="${p.x - 3}" y="${PWR_Y - 2.6}" width="6" height="5.2" rx="0.8" fill="${['#d6332f', '#1a1a1a', '#2f9a4a'][i]}" stroke="#555" stroke-width="0.4"/>`).join('')}
  <!-- 本体 -->
  <rect x="0.5" y="8" width="${W - 1}" height="${H - 8.5}" rx="2.5" fill="url(#body-{{uid}})" stroke="#7c8085" stroke-width="1"/>
  ${PWR.map((p) => text(p.x, 14.6, p.label, 2.8, '#2f3134')).join('')}

  <!-- 上部パネル（状態 LED・Ethernet） -->
  <rect x="4" y="18" width="${W - 8}" height="38" rx="1.5" fill="url(#panel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${[
    { t: 'PWR', on: true },
    { t: 'ERR' },
    { t: 'P.RUN', on: true },
    { t: 'BAT' },
    { t: 'CARD' },
    { t: 'SD/RD' },
  ]
    .map((l, i) => `${text(8, 24.5 + i * 5.4, l.t, 2.8, '#f2f3f4', 'start')}<rect x="${22}" y="${22.2 + i * 5.4}" width="4.4" height="2.4" rx="0.5" fill="${l.on ? 'url(#green-{{uid}})' : '#3b3d40'}"/>`)
    .join('')}
  ${text(ETH.x, 20.8 + 1.6, 'LAN', 2.8, '#f2f3f4')}
  <rect x="${ETH.x - ETH.w / 2 - 1.5}" y="${ETH.y - ETH.h / 2 - 1.5}" width="${ETH.w + 3}" height="${ETH.h + 3}" rx="1" fill="#b9bdc2" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${ETH.x - ETH.w / 2}" y="${ETH.y - ETH.h / 2}" width="${ETH.w}" height="${ETH.h}" fill="#0b0c0d"/>
  <rect x="${ETH.x - 6}" y="${ETH.y + ETH.h / 2 - 4}" width="12" height="4" fill="#2a2c2f"/>
  <path d="M${ETH.x - 7} ${ETH.y - 5} H${ETH.x + 7}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>
  ${text(40, 52.5, 'FX5UC-32MT/D', 3.6, '#ffffff')}

  <!-- 入出力表示 LED -->
  <rect x="4" y="59" width="${W - 8}" height="38" rx="1.5" fill="url(#panel-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${ioLeds('IN', 63)}
  ${ioLeds('OUT', 82)}

  <!-- 入出力コネクタ -->
  ${milHeader(CN_X.x, CN_X.y, 'X (IN)')}
  ${milHeader(CN_Y.x, CN_Y.y, 'Y (OUT)')}
  ${text(42, H - 4, 'MELSEC iQ-F', 3, '#6a6e73', 'middle', 'normal')}
`;

const COM_IN: AcceptSpec = { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+'] };
const COM_OUT: AcceptSpec = { system: 'DC', minVoltage: 5, maxVoltage: 30, conductors: ['-'] };

/** ユニット内の番号（0〜15）→ 8 進の番号（X0〜X7・X10〜X17） */
const oct = (i: number) => (i < 8 ? i : 10 + (i - 8));
/** ユニット内の番号 → MIL のピン番号（下位 8 点が奇数、上位 8 点が偶数。推定） */
const pinNo = (i: number) => (i < 8 ? 2 * i + 1 : 2 * (i - 8) + 2);

const pins: PinDef[] = [
  ...Array.from({ length: 16 }, (_, i): PinDef => ({
    id: `X#${pinNo(i)}`,
    label: `X${oct(i)} (${pinNo(i)})`,
    note: '入力（シンク。推定のピン位置）',
    role: 'signal',
    signal: { dir: 'in', kind: 'dc', common: 'X#17' },
    optional: true,
  })),
  { id: 'X#17', label: 'COM (17)', note: '入力コモン（シンク入力なので DC24V の + をつなぐ。18 と内部で共通。推定のピン位置）', role: 'input', accepts: COM_IN, optional: true },
  { id: 'X#18', label: 'COM (18)', note: '入力コモン（17 と内部で共通。推定のピン位置）', role: 'input', accepts: COM_IN, optional: true },
  { id: 'X#19', label: '空き (19)', role: 'signal', optional: true },
  { id: 'X#20', label: '空き (20)', role: 'signal', optional: true },
  ...Array.from({ length: 16 }, (_, i): PinDef => ({
    id: `Y#${pinNo(i)}`,
    label: `Y${oct(i)} (${pinNo(i)})`,
    note: `トランジスタ出力（シンク）${i < 4 ? ' 0.3A' : ' 0.1A'}（推定のピン位置）`,
    role: 'signal',
    signal: { dir: 'out', kind: 'npn' },
    optional: true,
  })),
  { id: 'Y#17', label: 'COM0 (17)', note: '出力コモン（負荷電源の 0V。18 と内部で共通。推定のピン位置）', role: 'input', accepts: COM_OUT, optional: true },
  { id: 'Y#18', label: 'COM0 (18)', note: '出力コモン（17 と内部で共通。推定のピン位置）', role: 'input', accepts: COM_OUT, optional: true },
  { id: 'Y#19', label: '空き (19)', role: 'signal', optional: true },
  { id: 'Y#20', label: '空き (20)', role: 'signal', optional: true },
];

const links: InternalLink[] = [
  { from: 'X#17', to: 'X#18' },
  { from: 'Y#17', to: 'Y#18' },
  ...Array.from({ length: 16 }, (_, i): InternalLink => ({ from: `Y#${pinNo(i)}`, to: 'Y#17', switch: 'output', ratedCurrent: i < 4 ? 0.3 : 0.1 })),
];

const commonLimits: CommonLimit[] = [
  { outputs: Array.from({ length: 8 }, (_, i) => `Y#${pinNo(i)}`), current: 0.8, label: '出力 Y0〜Y7' },
  { outputs: Array.from({ length: 8 }, (_, i) => `Y#${pinNo(8 + i)}`), current: 0.8, label: '出力 Y10〜Y17' },
];

const terminals: TerminalDef[] = [
  ...PWR.map(
    (p): TerminalDef =>
      p.id === 'FG'
        ? { id: p.id, label: p.label, note: p.note, x: p.x, y: PWR_Y, side: 'top', role: 'ground' }
        : { id: p.id, label: p.label, note: p.note, x: p.x, y: PWR_Y, side: 'top', role: 'input', accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: [p.id === '24V' ? '+' : '-'] } },
  ),
  {
    id: 'ETH',
    label: 'Ethernet',
    x: ETH.x,
    y: ETH.y,
    side: 'right',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: ETH.h, length: ETH.w, facing: 'front', protocols: ['ethernet', 'slmp', 'cc-link-ie-field-basic'] },
    optional: true,
  },
  { id: 'X', label: 'X 入力コネクタ（MIL 20 極）', x: CN_X.x, y: CN_X.y, side: 'bottom', role: 'connector', connector: { kind: 'MIL20', pins: 20, width: 20, length: 66, facing: 'front' }, optional: true },
  { id: 'Y', label: 'Y 出力コネクタ（MIL 20 極）', x: CN_Y.x, y: CN_Y.y, side: 'bottom', role: 'connector', connector: { kind: 'MIL20', pins: 20, width: 20, length: 66, facing: 'front' }, optional: true },
];

const def: DeviceDefinition = {
  type: 'mitsubishi.fx5uc-32mt-d',
  name: 'PLC CPUユニット（トランジスタ出力）',
  model: 'FX5UC-32MT/D',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-F シリーズのコネクタ式 CPU ユニット FX5UC-32MT/D（DC24V 電源、DC 入力 16 点・トランジスタ出力 16 点、どちらもシンク、外形 W42.1 × H89.1mm）。電源は上面のコネクタに DC24V（+20% / −15%）を入れる。入力 X0〜X17: DC24V 5.3mA、シンク入力（入力コネクタの COM に DC24V の + をつなぎ、NPN センサー・接点を X と 0V の間に入れる）。出力 Y0〜Y17: トランジスタ（シンク）DC5〜30V、Y0〜Y3 は 0.3A/点・Y4〜Y17 は 0.1A/点、COM0 に負荷電源の 0V をつなぐ。入出力はそれぞれ 20 ピンコネクタ（MIL 規格）で、MIL 20 極のケーブルで変換端子台へつなぐ。Ethernet ポート（CC-Link IE フィールドネットワーク Basic 対応）。増設ユニットは右側に増設し、入出力番号は X20・Y20 から 8 進で続く（増設ケーブルタイプの FX5-16EX/ES などはコネクタ変換ユニット FX5-CNV-IFC を介してつなぐ）。コネクタのピン配置、8 点ごとの出力の合計電流 0.8A、内部電源（DC5V 720mA・DC24V 500mA）と消費電流（約 0.25A）は推定。',
  estimated: '20 ピンコネクタのピン配置、出力の 8 点ごとの合計電流 0.8A、増設ユニットへの内部電源の容量、消費電流',
  labelPrefix: 'PLC',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  commonLimits,
  bus: {
    kind: FX5_BUS,
    host: { slots: 16, numbering: { mode: 'separate', unit: 8 } },
    supply: { '5V': 0.72, '24V': 0.5 },
    io: { inputs: 16, outputs: 16, format: 'octal' },
  },
  loadCurrent: 0.25,
};

export default def;
