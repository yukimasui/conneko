import { SWITCHABLE_PROTOCOLS } from '../generic/ethernet-switch';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * MOXA EDS-G205A-4PoE（産業用 アンマネージ ギガビット スイッチングハブ、5 ポート（うち 4 ポートが PoE+ 給電）、DIN レール取付）。
 * 図は DIN レールに縦に付けた姿: 上面に電源の端子台（2 接点 × 2: PWR1 V1+ V1−、PWR2 V2+ V2−）、
 * 正面に PWR1・PWR2 の LED と、RJ-45 ポート P1〜P5 を縦に並べた（P1〜P4 が PoE、ケーブルは左へ出す）。
 * 外形（W50 × H115mm として描いた）と端子台・ポートの並びは推定。
 *
 * 出典: MOXA EDS-G205A-4PoE の製品ページ・データシート（10/100/1000BASE-T(X) 5 ポート、うち 4 ポートが IEEE 802.3af/at の PoE/PoE+、
 *       1 ポート最大 36W、PoE の合計 12V 入力時 62W・24V 時 120W・48V 時 144W、電源 12/24/48VDC（12〜57V）の冗長入力、
 *       着脱式の 2 接点端子台 × 2、入力電流 最大 7.5A（24VDC、PoE 給電を含む））
 *       https://www.moxa.com/en/products/industrial-network-infrastructure/ethernet-switches/poe-switches/eds-g205a-series/eds-g205a-4poe
 */

const W = 100;
const H = 230;
const PWR = [
  { id: 'V1+', x: 18, print: 'V1+' },
  { id: 'V1-', x: 32, print: 'V1−' },
  { id: 'V2+', x: 62, print: 'V2+' },
  { id: 'V2-', x: 76, print: 'V2−' },
];
const PWR_Y = 14;
const PORT_X = 50;
const portY = (i: number) => 74 + i * 34;

const t = (x: number, y: number, s: string, size = 3.4, fill = '#e5e7eb', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const screw = (x: number, y: number) => `
  <rect x="${x - 6}" y="${y - 7}" width="12" height="14" rx="0.8" fill="#14532d" stroke="#0b2e19" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="4" fill="url(#edsscrew-{{uid}})" stroke="#555" stroke-width="0.4"/>
  <path d="M${x - 2.5} ${y} H${x + 2.5}" stroke="#444" stroke-width="1"/>`;

/** 横向きの RJ-45（ケーブルは左へ。ラッチの切り欠きは左側） */
const rj45 = (cx: number, cy: number) => `
  <rect x="${cx - 12}" y="${cy - 13}" width="24" height="26" rx="1.2" fill="#c9ccd0" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${cx - 10}" y="${cy - 11}" width="20" height="22" fill="#0c0d0e"/>
  <rect x="${cx - 10}" y="${cy - 5}" width="4.5" height="10" fill="#2a2c2f"/>
  <path d="M${cx + 7} ${cy - 8} V${cy + 8}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>`;

const svg = `
  <defs>
    <linearGradient id="edsbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2d31"/>
      <stop offset="0.15" stop-color="#3a3e43"/>
      <stop offset="0.85" stop-color="#34383d"/>
      <stop offset="1" stop-color="#25282c"/>
    </linearGradient>
    <radialGradient id="edsscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
  </defs>
  <!-- 本体（金属ケース） -->
  <rect x="2" y="4" width="${W - 4}" height="${H - 6}" rx="3" fill="url(#edsbody-{{uid}})" stroke="#111315" stroke-width="1.2"/>
  <!-- 電源の端子台（上面、2 接点 × 2） -->
  <rect x="9" y="5" width="32" height="18" rx="1.2" fill="#166534" stroke="#0b2e19" stroke-width="0.6"/>
  <rect x="53" y="5" width="32" height="18" rx="1.2" fill="#166534" stroke="#0b2e19" stroke-width="0.6"/>
  ${PWR.map((p) => `${screw(p.x, PWR_Y)}${t(p.x, 29, p.print, 3)}`).join('')}
  ${t(25, 35, 'PWR1', 3, '#9ca3af')}${t(69, 35, 'PWR2', 3, '#9ca3af')}
  <!-- ロゴ・LED -->
  ${t(10, 46, 'MOXA', 6, '#34d399', 'start', 'bold')}
  ${t(W - 8, 46, 'EDS-G205A-4PoE', 3, '#d1d5db', 'end')}
  ${[
    ['PWR1', '#22c55e'],
    ['PWR2', '#3b4a3c'],
  ]
    .map(([l, c], i) => `<circle cx="${14 + i * 18}" cy="54" r="2" fill="${c}"/>${t(18 + i * 18, 55.2, l, 2.6, '#cbd5e1', 'start')}`)
    .join('')}
  ${t(W - 8, 56, '10/100/1000', 2.6, '#9ca3af', 'end')}
  <!-- ポート（P1〜P4 は PoE+） -->
  ${Array.from({ length: 5 }, (_, i) => {
    const y = portY(i);
    const poe = i < 4;
    return `${rj45(PORT_X, y)}
  ${t(PORT_X + 16, y - 6, `P${i + 1}`, 4, '#f3f4f6', 'start', 'bold')}
  ${poe ? `<rect x="${PORT_X + 15}" y="${y - 1}" width="17" height="7" rx="1" fill="#f59e0b"/>${t(PORT_X + 23.5, y + 4.2, 'PoE', 3.4, '#1f2937', 'middle', 'bold')}` : ''}
  <circle cx="${PORT_X - 18}" cy="${y - 6}" r="1.8" fill="#22c55e"/><circle cx="${PORT_X - 18}" cy="${y + 6}" r="1.8" fill="${poe ? '#f59e0b' : '#3b4a3c'}"/>`;
  }).join('')}
`;

const power = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 12, maxVoltage: 57, conductors: [c] });

const terminals: TerminalDef[] = [
  { id: 'V1+', label: 'V1+', hint: '電源1+', note: '電源入力 1（PWR1）+ DC12/24/48V（12〜57V）', x: PWR[0].x, y: PWR_Y, side: 'top', role: 'input', accepts: power('+') },
  { id: 'V1-', label: 'V1−', hint: '電源1−', note: '電源入力 1（PWR1）の 0V', x: PWR[1].x, y: PWR_Y, side: 'top', role: 'input', accepts: power('-') },
  { id: 'V2+', label: 'V2+', hint: '電源2+', note: '電源入力 2（PWR2、冗長電源。使わなければ空き）+', x: PWR[2].x, y: PWR_Y, side: 'top', role: 'input', accepts: power('+'), optional: true },
  { id: 'V2-', label: 'V2−', hint: '電源2−', note: '電源入力 2（PWR2）の 0V', x: PWR[3].x, y: PWR_Y, side: 'top', role: 'input', accepts: power('-'), optional: true },
  ...Array.from(
    { length: 5 },
    (_, i): TerminalDef => ({
      id: `P${i + 1}`,
      label: i < 4 ? `ポート${i + 1}（PoE+）` : `ポート${i + 1}`,
      note: i < 4 ? '10/100/1000BASE-T、PoE/PoE+ 給電（IEEE 802.3af/at、1 ポート最大 36W）。IP カメラ・無線 LAN のアクセスポイント・PoE 受電のコードリーダなど' : '10/100/1000BASE-T（PoE 給電なし）。上位のネットワーク・PLC などへ',
      x: PORT_X,
      y: portY(i),
      side: 'left',
      role: 'connector',
      connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: SWITCHABLE_PROTOCOLS },
      optional: true,
    }),
  ),
];

/** 給電する PoE 機器の消費電力の合計[W]（電源から見た消費電流に足す） */
const POE_OPTIONS = [0, 15, 30, 60, 90, 120];

const def: DeviceDefinition = {
  type: 'moxa.eds-g205a-4poe',
  name: 'スイッチングハブ（PoE 給電）',
  model: 'EDS-G205A-4PoE',
  maker: 'MOXA',
  category: 'network',
  description:
    'MOXA の産業用アンマネージ スイッチングハブ EDS-G205A-4PoE（10/100/1000BASE-T 5 ポート、うち P1〜P4 は PoE/PoE+ 給電（IEEE 802.3af/at、1 ポート最大 36W）、DIN レール取付）。' +
    'IP カメラ・無線 LAN のアクセスポイント・PoE 受電の機器へ LAN ケーブル 1 本で電源と通信を送る。電源は DC12/24/48V（12〜57V）の冗長入力（PWR1: V1+・V1−、PWR2: V2+・V2−）。' +
    'PoE の合計の上限は電源電圧で変わる（12V 入力 62W、24V 入力 120W、48V 入力 144W）。入力電流は最大 7.5A（24V 入力、PoE 給電を含む）。' +
    'パラメータ「PoE 給電の合計」に給電する機器の消費電力を書くと、24V 入力として電源から見た消費電流（本体 約 0.3A + PoE 分）を見込む。' +
    'Ethernet の上で動く通信方式（EtherNet/IP、PROFINET、Modbus/TCP など）を中継できるが、EtherCAT・CC-Link IE Field などの専用の方式は通せない。' +
    '外形（W50 × H115mm として描いた）、端子台・ポートの並び、本体の消費電流（約 0.3A）は推定。',
  estimated: '外形寸法（W50 × H115mm として描いた）、電源の端子台とポートの並び、本体の消費電流（約 0.3A）',
  labelPrefix: 'HUB',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'poe',
      label: 'PoE 給電の合計',
      unit: 'W',
      options: POE_OPTIONS.map((w) => ({ value: w, label: w === 0 ? 'なし（0W）' : `${w}W` })),
      default: 0,
    },
  ],
  // 24V 入力として、本体 約 0.3A と PoE 給電分（効率 90% と見込む）
  loadCurrent: (p: ParamValues) => Math.round((0.3 + Number(p.poe ?? 0) / 24 / 0.9) * 100) / 100,
};

export default def;
