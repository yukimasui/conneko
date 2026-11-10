import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * MOXA TCC-100（産業用のシリアル変換器 RS-232 ⇔ RS-422/485、DIN レール取付キット DK-35A 付き）。
 * 本体は細長い金属ケース。上に RS-232 の D-sub 9 ピン（メス）、下に RS-422/485 の端子台、側面に電源（DC12〜48V）。
 * 図は DIN レールに縦に付けた姿として、上に RS-232、中央に LED と 2 線式/4 線式・終端抵抗の DIP スイッチ、右側に電源の端子台（V+ V− FG）、
 * 下に RS-422/485 の端子台（Tx+ Tx− Rx+ Rx− GND）を並べた。
 * 外形（W30 × H90mm として描いた）と端子台の並び、電源の端子台の FG は推定。
 *
 * 出典: MOXA TCC-100/100I シリーズのデータシート（RS-232 は DB9 メス、RS-422/485 は端子台、電源 DC12〜48V（電源ジャック、
 *       ジャック → 3 ピン端子台のアダプタ付き）、消費電流 TCC-100 47mA 以下、DIN レール取付キット）、
 *       TCC-100I の取扱説明書（端子台: 4 線式 Tx+(B)・Tx−(A)・Rx+(B)・Rx−(A)、2 線式 Data+(B)・Data−(A)、GND）
 *       https://www.moxa.com/en/products/industrial-edge-connectivity/serial-converters/serial-to-serial-converters/tcc-100-100i-series/tcc-100
 */

const W = 64;
const H = 180;
const DB9 = { x: 32, y: 22 };
const RS = ['T+', 'T-', 'R+', 'R-', 'GND'];
const RS_PRINT: Record<string, string> = { 'T+': 'Tx+', 'T-': 'Tx−', 'R+': 'Rx+', 'R-': 'Rx−', GND: 'GND' };
const PW = ['V+', 'V-', 'FG'];
const PW_PRINT: Record<string, string> = { 'V+': 'V+', 'V-': 'V−', FG: 'FG' };
const P = 11;
const RS_Y = 164;
/** 電源の端子台は右側面に縦に並べる（電線は右へ） */
const PW_X = 55;
const rsX = (i: number) => 10 + i * P;
const pwY = (i: number) => 86 + i * P;

const t = (x: number, y: number, s: string, size = 3.2, fill = '#1f2329', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const screw = (x: number, y: number) => `
  <rect x="${x - 5}" y="${y - 5.5}" width="10" height="11" rx="0.8" fill="#14532d" stroke="#0b2e19" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="3.4" fill="url(#mxscrew-{{uid}})" stroke="#555" stroke-width="0.4"/>
  <path d="M${x - 2.1} ${y} H${x + 2.1}" stroke="#444" stroke-width="0.9"/>`;

const svg = `
  <defs>
    <linearGradient id="mxbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9bec4"/>
      <stop offset="0.2" stop-color="#dfe3e7"/>
      <stop offset="0.8" stop-color="#d6dadf"/>
      <stop offset="1" stop-color="#aeb3b9"/>
    </linearGradient>
    <linearGradient id="mxshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e3e6e9"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <radialGradient id="mxscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
  </defs>
  <!-- 本体（金属ケース） -->
  <rect x="2" y="6" width="${W - 4}" height="${H - 8}" rx="3" fill="url(#mxbody-{{uid}})" stroke="#6b7178" stroke-width="1"/>
  <!-- RS-232（D-sub 9 ピン メス） -->
  <rect x="${DB9.x - 17}" y="${DB9.y - 9}" width="34" height="18" rx="2" fill="url(#mxshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <circle cx="${DB9.x - 13.5}" cy="${DB9.y}" r="2" fill="#555"/><circle cx="${DB9.x + 13.5}" cy="${DB9.y}" r="2" fill="#555"/>
  <path d="M${DB9.x - 10} ${DB9.y - 5.5} H${DB9.x + 10} L${DB9.x + 8} ${DB9.y + 5.5} H${DB9.x - 8} Z" fill="#2b2c2e" stroke="#777" stroke-width="0.5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${DB9.x - 7.2 + i * 3.6}" cy="${DB9.y - 2.2}" r="0.85" fill="#0a0a0a"/>`).join('')}
  ${[0, 1, 2, 3].map((i) => `<circle cx="${DB9.x - 5.4 + i * 3.6}" cy="${DB9.y + 2.2}" r="0.85" fill="#0a0a0a"/>`).join('')}
  ${t(W / 2, 38, 'RS-232', 3.6, '#1f2329', 'middle', 'bold')}
  <!-- 銘板 -->
  <rect x="8" y="44" width="${W - 16}" height="26" rx="1.5" fill="#f4f6f8" stroke="#9aa0a6" stroke-width="0.5"/>
  ${t(W / 2, 54, 'MOXA', 6, '#0d8a52', 'middle', 'bold')}
  ${t(W / 2, 61, 'TCC-100', 4.2, '#1f2329', 'middle', 'bold')}
  ${t(W / 2, 67, 'RS-232 / RS-422/485', 2.6)}
  <!-- LED・DIP スイッチ -->
  ${[
    ['PWR', '#f59e0b'],
    ['TxD', '#22c55e'],
    ['RxD', '#22c55e'],
  ]
    .map(([l, c], i) => `<circle cx="${12 + i * 12}" cy="80" r="2" fill="${c}" stroke="#555" stroke-width="0.3"/>${t(12 + i * 12, 86, l, 2.6)}`)
    .join('')}
  <rect x="7" y="94" width="34" height="12" rx="1" fill="#c8102e" stroke="#7a0a1c" stroke-width="0.5"/>
  ${[0, 1, 2].map((i) => `<rect x="${10 + i * 10}" y="96" width="6" height="8" rx="0.6" fill="#f2f2f2"/><rect x="${10 + i * 10}" y="96" width="6" height="3.6" rx="0.5" fill="#3a3c40"/>`).join('')}
  ${t(24, 112, '2W/4W  TERM', 2.6)}
  <!-- 電源の端子台（右側面） -->
  ${t(PW_X, 76, 'DC12-48V', 2.6, '#1f2329', 'middle', 'bold')}
  <rect x="${PW_X - 7}" y="${pwY(0) - 7}" width="14" height="${(PW.length - 1) * P + 14}" rx="1" fill="#166534" stroke="#0b2e19" stroke-width="0.6"/>
  ${PW.map((id, i) => `${screw(PW_X, pwY(i))}${t(PW_X - 8.5, pwY(i) + 1, PW_PRINT[id], 2.6, '#1f2329', 'end')}`).join('')}
  <!-- RS-422/485 の端子台 -->
  ${t(W / 2, 150, 'RS-422/485', 3.2, '#1f2329', 'middle', 'bold')}
  <rect x="${rsX(0) - 6}" y="${RS_Y - 7}" width="${(RS.length - 1) * P + 12}" height="14" rx="1" fill="#166534" stroke="#0b2e19" stroke-width="0.6"/>
  ${RS.map((id, i) => `${screw(rsX(i), RS_Y)}${t(rsX(i), RS_Y - 9, RS_PRINT[id], 2.6)}`).join('')}
`;

const RS_NOTE: Record<string, string> = {
  'T+': '4 線式の送信 Tx+(B)',
  'T-': '4 線式の送信 Tx−(A)',
  'R+': '4 線式の受信 Rx+(B)・2 線式の Data+(B)',
  'R-': '4 線式の受信 Rx−(A)・2 線式の Data−(A)',
  GND: '信号グランド',
};

const power = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 12, maxVoltage: 48, conductors: [c] });
/** RS-422/485 側の通信方式。変換器は中身のプロトコルによらず通すので、RS-485 の上の Modbus RTU も含める */
const SERIAL = ['rs-422', 'rs-485', 'modbus-rtu'];

const terminals: TerminalDef[] = [
  {
    id: 'RS232',
    label: 'RS-232（D-sub 9 ピン メス）',
    note: 'RS-232 側（2 TxD・3 RxD・5 GND ほか）。PLC・HMI・PC の RS-232C ポートとストレートのケーブルでつなぐ',
    x: DB9.x,
    y: DB9.y,
    side: 'top',
    role: 'connector',
    connector: { kind: 'DSUB9', pins: 0, width: 30, length: 14, facing: 'front', protocols: ['rs-232c'] },
    optional: true,
  },
  ...RS.map(
    (id, i): TerminalDef => ({
      id,
      label: RS_PRINT[id],
      note: RS_NOTE[id],
      x: rsX(i),
      y: RS_Y,
      side: 'bottom',
      role: 'signal',
      optional: true,
      ...(id === 'GND' ? {} : { port: 'RS-422/485', protocols: SERIAL }),
    }),
  ),
  { id: 'V+', label: 'V+', hint: '電源+', note: '電源 DC12〜48V +', x: PW_X, y: pwY(0), side: 'right', role: 'input', accepts: power('+') },
  { id: 'V-', label: 'V−', hint: '電源−', note: '電源の 0V', x: PW_X, y: pwY(1), side: 'right', role: 'input', accepts: power('-') },
  { id: 'FG', label: 'FG', hint: '機能接地', note: '機能接地（推定）', x: PW_X, y: pwY(2), side: 'right', role: 'ground', optional: true },
];

const def: DeviceDefinition = {
  type: 'moxa.tcc-100',
  name: 'シリアル変換器（RS-232C ⇔ RS-422/485）',
  model: 'TCC-100',
  maker: 'MOXA',
  category: 'network',
  description:
    'MOXA の産業用シリアル変換器 TCC-100（RS-232 ⇔ RS-422/RS-485、2 線式/4 線式は DIP スイッチで切換、終端抵抗 120Ω 内蔵、最大 921.6kbps、DIN レール取付キット DK-35A 付き）。' +
    'RS-232 側（D-sub 9 ピン メス）を PLC・タッチパネル・PC の RS-232C ポートにつなぎ、RS-422/485 側の端子台（Tx+・Tx−・Rx+・Rx−・GND）からインバータ・温調器・電力計などの RS-485 機器（Modbus RTU など）へ渡り配線する。' +
    '2 線式の RS-485 は Rx+(B)・Rx−(A) を Data+・Data− として使う。伝送路の両端だけ終端抵抗を入れる。電源 DC12〜48V（消費電流 47mA 以下）。中身のプロトコルは変換しない（通すだけ）。' +
    '外形（W30 × H90mm として描いた）と端子台の並び、電源の端子台の FG は推定。',
  estimated: '外形寸法（W30 × H90mm として描いた）、RS-422/485 と電源の端子台の並び、電源の端子台の FG',
  labelPrefix: 'CNV',
  width: W,
  height: H,
  svg,
  terminals,
  loadCurrent: 0.05,
};

export default def;
