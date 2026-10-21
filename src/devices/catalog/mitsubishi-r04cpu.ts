import type { DeviceDefinition, ParamValues } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ CPU ユニット R04CPU（R08/R16/R32/R120CPU も同形状）。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。
 * 正面上部は黒い LED カバー（型式と READY / ERROR / PROGRAM RUN / USER / BATTERY / CARD READY /
 * CARD ACCESS / FUNCTION の LED。カバー内に SD カードスロット・RUN/STOP/RESET スイッチ）、
 * 下部は USB（miniB）カバーと CC-Link IE フィールドネットワーク Basic 対応の Ethernet ポート（SPEED / SD/RD LED 付き）。
 *
 * CPU の電源（DC5V）はベースユニット経由で電源ユニットから供給されるため、外部の電源端子はない。
 * 型式（プログラム容量違い）はパラメータで選び、正面の型式表示に反映する。
 */

const W = 56;
const H = 212;

/** Ethernet ポート（RJ45）の差込口 */
const ETH = { x: 35, y: 183, w: 23, h: 21 };

const MODELS = [
  { value: 'R04CPU', label: 'R04CPU（40K ステップ）' },
  { value: 'R08CPU', label: 'R08CPU（80K ステップ）' },
  { value: 'R16CPU', label: 'R16CPU（160K ステップ）' },
  { value: 'R32CPU', label: 'R32CPU（320K ステップ）' },
  { value: 'R120CPU', label: 'R120CPU（1200K ステップ）' },
];

const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const text = (x: number, y: number, t: string, size = 4, fill = '#eeeff1', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** LED（ラベルは左側に右寄せ） */
const LEDS: { t: string; on?: string }[] = [
  { t: 'READY', on: 'url(#green-{{uid}})' },
  { t: 'ERROR' },
  { t: 'PROGRAM RUN', on: 'url(#green-{{uid}})' },
  { t: 'USER' },
  { t: 'BATTERY' },
  { t: 'CARD READY' },
  { t: 'CARD ACCESS' },
  { t: 'FUNCTION' },
];

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#262833"/>
      <stop offset="0.12" stop-color="#3d4150"/>
      <stop offset="0.88" stop-color="#383b49"/>
      <stop offset="1" stop-color="#23252f"/>
    </linearGradient>
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1d20"/>
      <stop offset="1" stop-color="#0a0a0c"/>
    </linearGradient>
    <linearGradient id="lower-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#454958"/>
      <stop offset="1" stop-color="#363946"/>
    </linearGradient>
    <radialGradient id="green-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>

  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="1.5" fill="url(#body-{{uid}})" stroke="#111214" stroke-width="1"/>

  <!-- LED カバー -->
  <rect x="1.5" y="1.5" width="${W - 3}" height="104" rx="1" fill="url(#cover-{{uid}})" stroke="#0d0d0e" stroke-width="0.5"/>
  ${text(3.5, 8.8, esc(p.cpuModel), String(p.cpuModel).length > 6 ? 4.6 : 5.2, '#ffffff', 'start')}
  ${LEDS.map(
    (l, i) => `
  ${text(47, 18 + i * 6.2, l.t, 3.9, '#f4f5f6', 'end')}
  <rect x="48.5" y="${14.9 + i * 6.2}" width="4.4" height="2.6" rx="0.4" fill="${l.on ?? '#2a2b2e'}"/>`,
  ).join('')}
  ${[2, 5, 7]
    .map((i) => `<line x1="3" y1="${19.6 + (i - 1) * 6.2}" x2="47" y2="${19.6 + (i - 1) * 6.2}" stroke="#d0d2d5" stroke-width="0.4"/>`)
    .join('')}
  ${text(33, 100.5, '▼PULL', 3.2, '#e6e7e9')}

  <!-- 下部（USB カバー・Ethernet ポート） -->
  <rect x="1.5" y="107" width="${W - 3}" height="${H - 113}" rx="1" fill="url(#lower-{{uid}})"/>
  <rect x="3" y="109" width="${W - 6}" height="34" rx="1" fill="#3e4250" stroke="#24262f" stroke-width="0.5"/>
  ${text(33, 116, '▲PULL', 3.2, '#e6e7e9')}
  ${text(16, 129, 'USB', 4.6, '#f2f3f4', 'start')}
  <path d="M31 127.5 H40 M33 125.5 L31 127.5 L33 129.5 M36 127.5 L37.5 125 H39.5 M37.5 127.5 L38.5 130 H40" stroke="#f2f3f4" stroke-width="0.6" fill="none"/>
  <text x="4" y="154" font-family="sans-serif" font-size="4.4" font-weight="bold" font-style="italic" fill="#f2f3f4">CC-Link IE</text>
  <rect x="4" y="156.4" width="27" height="4.4" rx="0.6" fill="#f2f3f4"/>
  <text x="5.2" y="159.8" font-family="sans-serif" font-size="3.2" font-weight="bold" font-style="italic" fill="#46494d">Field Basic</text>

  <!-- Ethernet ポート -->
  <rect x="${ETH.x - ETH.w / 2 - 1.5}" y="${ETH.y - ETH.h / 2 - 1.5}" width="${ETH.w + 3}" height="${ETH.h + 3}" rx="1" fill="#b9bdc2" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${ETH.x - ETH.w / 2}" y="${ETH.y - ETH.h / 2}" width="${ETH.w}" height="${ETH.h}" fill="#0b0c0d"/>
  <rect x="${ETH.x - 6}" y="${ETH.y + ETH.h / 2 - 4}" width="12" height="4" fill="#2a2c2f"/>
  <path d="M${ETH.x - 7} ${ETH.y - 5} H${ETH.x + 7}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>
  <rect x="3.5" y="171" width="12" height="5" rx="1" fill="none" stroke="#c9ccd0" stroke-width="0.5"/>
  ${text(9.5, 174.8, 'SPEED', 2.6, '#e6e7e9')}
  <rect x="17.5" y="172" width="3" height="3" fill="url(#green-{{uid}})"/>
  <rect x="3.5" y="189" width="12" height="5" rx="1" fill="none" stroke="#c9ccd0" stroke-width="0.5"/>
  ${text(9.5, 192.8, 'SD/RD', 2.6, '#e6e7e9')}
  <rect x="17.5" y="190" width="3" height="3" fill="#c8a42a"/>

  <!-- 下端の固定フック -->
  <rect x="12" y="${H - 5}" width="30" height="4" rx="1" fill="#2a2c2f" stroke="#111" stroke-width="0.5"/>
`;

const def: DeviceDefinition = {
  type: 'mitsubishi.r04cpu',
  name: 'PLC CPUユニット',
  model: 'R04CPU',
  maker: '三菱電機',
  category: 'plc',
  description:
    '三菱電機 MELSEC iQ-R シリーズのシーケンサ CPU ユニット（R04CPU。R08CPU・R16CPU・R32CPU・R120CPU は同形状でプログラム容量違い）。ベースユニットの CPU スロット（電源ユニットの右隣）に装着し、DC5V はベースユニット経由で電源ユニットから供給される（外部の電源端子はない。内部消費電流 DC5V 0.67A）。右側のスロットに入出力ユニットなどを装着する。Ethernet ポート（CC-Link IE フィールドネットワーク Basic・SLMP 対応）でタッチパネル（GOT）や PC と LAN ケーブルでつなぐ。USB（miniB）は LED カバー下、SD メモリカードスロット・RUN/STOP/RESET スイッチは上部カバー内。',
  labelPrefix: 'PLC',
  width: W,
  height: H,
  svg,
  terminals: [
    {
      id: 'ETH',
      label: 'Ethernet',
      x: ETH.x,
      y: ETH.y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: 'RJ45', pins: 0, width: ETH.w },
      optional: true,
    },
  ],
  params: [
    {
      key: 'cpuModel',
      label: '型式',
      options: MODELS,
      default: 'R04CPU',
    },
  ],
};

export default def;
