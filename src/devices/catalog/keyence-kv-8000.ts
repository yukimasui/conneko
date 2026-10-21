import type { DeviceDefinition } from '../types';

/**
 * KEYENCE KV-8000 シリーズ CPU ユニット KV-8000。
 * 外形 W56.3 × H92.5（DINレール部 90）× D115 mm（1mm ≒ 2px）。本体は黒。
 * 正面上部に液晶のアクセスウィンドウ（メニュー表示）と KEYENCE ロゴ、その下に操作キー 6 個、
 * 下段は左から USB・設定スイッチのカバー、中央カバー、メモリカード（CARD）カバー。
 * 左下に EtherNet/IP 対応の Ethernet ポート（RJ45）がある。
 * 電源端子（DC24V +/−、FG）は実機では底面にあるため、本体下端に張り出した端子台として描く。
 * 拡張ユニット（I/O ユニットなど）は本体右側に連結し、電源は CPU から拡張バス経由で供給される。
 */

const W = 113;
/** 本体の下端（92.5mm） */
const BODY_H = 185;
const H = 207;

/** 電源端子（底面の 3 極端子台。ピッチ約 7.5mm） */
const PWR_Y = 199;
const PWR = [
  { id: '24V+', label: '+', x: 20 },
  { id: '24V-', label: '−', x: 35 },
  { id: 'FG', label: 'FG', x: 50 },
];

/** Ethernet ポート（RJ45）の差込口 */
const ETH = { x: 27.5, y: 161, w: 24, h: 22 };

const text = (x: number, y: number, t: string, size = 4, fill = '#d8dadd', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 端子ネジ（座金付き） */
const screw = (x: number, y: number) => `
  <rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="1" fill="#141516"/>
  <circle cx="${x}" cy="${y}" r="4.6" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.6"/>
  <path d="M${x - 2.8} ${y} H${x + 2.8} M${x} ${y - 2.8} V${y + 2.8}" stroke="#444" stroke-width="1.1" stroke-linecap="round"/>`;

/** 操作キー（3 列 × 2 段） */
const KEYS = [
  { x: 17, y: 73, t: 'MENU' },
  { x: 45, y: 73, t: '▲' },
  { x: 73, y: 73, t: 'ENTER' },
  { x: 17, y: 81.5, t: '◀' },
  { x: 45, y: 81.5, t: '▼' },
  { x: 73, y: 81.5, t: '▶' },
];
const key = (k: { x: number; y: number; t: string }) => `
  <rect x="${k.x}" y="${k.y}" width="23" height="6.5" rx="1.6" fill="url(#key-{{uid}})" stroke="#0b0b0c" stroke-width="0.6"/>
  ${text(k.x + 11.5, k.y + 4.7, k.t, 3.4, '#e9eaec', 'middle', 'bold')}`;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#151617"/>
      <stop offset="0.08" stop-color="#2a2c2f"/>
      <stop offset="0.92" stop-color="#26282a"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <linearGradient id="panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3d42"/>
      <stop offset="0.55" stop-color="#25272b"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
    <linearGradient id="lcd-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2d3c52"/>
      <stop offset="1" stop-color="#1e2a3b"/>
    </linearGradient>
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#222427"/>
      <stop offset="0.5" stop-color="#2e3034"/>
      <stop offset="1" stop-color="#1f2124"/>
    </linearGradient>
    <linearGradient id="key-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#2a2c30"/>
    </linearGradient>
    <linearGradient id="tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#232427"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="led-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>

  <!-- 電源端子台（実機は底面。DC24V +/−、FG） -->
  <rect x="7" y="${BODY_H - 2}" width="70" height="${H - BODY_H + 1}" rx="2" fill="url(#tb-{{uid}})" stroke="#0e0e0f" stroke-width="0.8"/>
  ${PWR.map((p) => text(p.x, 191, p.label, p.id === 'FG' ? 3.8 : 5, '#e6e8ea', 'middle', 'bold')).join('')}
  ${text(67, 196, 'DC', 4, '#cfd2d6', 'middle', 'bold')}
  ${text(67, 201.5, '24V', 4, '#cfd2d6', 'middle', 'bold')}
  ${PWR.map((p) => screw(p.x, PWR_Y)).join('')}

  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${BODY_H - 2}" rx="3" fill="url(#body-{{uid}})" stroke="#050505" stroke-width="1.2"/>

  <!-- 上部: アクセスウィンドウ（液晶）パネル -->
  <rect x="3" y="3" width="${W - 6}" height="66" rx="2" fill="url(#panel-{{uid}})" stroke="#0c0c0d" stroke-width="0.6"/>
  <rect x="5" y="4.5" width="${W - 10}" height="3" rx="1.5" fill="#ffffff" opacity="0.06"/>
  ${text(8, 12, 'KV-8000', 4.6, '#c9cbcf', 'start', 'bold')}
  <rect x="21" y="16" width="70" height="33" rx="1" fill="#101113"/>
  <rect x="23" y="17.5" width="66" height="30" fill="url(#lcd-{{uid}})"/>
  <g font-family="monospace" font-size="5" fill="#e8eef7">
    <text x="26" y="24.5">1.Device Mode</text>
    <text x="26" y="31.5">2.Error Clear</text>
    <text x="26" y="38.5">3.Unit Test</text>
    <text x="26" y="45.5">4.Storage</text>
  </g>
  <!-- KEYENCE ロゴ -->
  ${text(W / 2, 61, 'KEYENCE', 8, '#f4f5f6', 'middle', 'bold')}
  <path d="M4 63 H22 L28 66.5 H85 L91 63 H${W - 4}" fill="none" stroke="#6c7076" stroke-width="0.9"/>
  <!-- 状態表示 LED（RUN / ERR） -->
  <rect x="95" y="52" width="4" height="2.4" rx="0.6" fill="url(#led-{{uid}})"/>
  <rect x="102" y="52" width="4" height="2.4" rx="0.6" fill="#5a1b1b"/>
  ${text(97, 50.5, 'RUN', 2.6, '#b9bcc1')}
  ${text(104, 50.5, 'ERR', 2.6, '#b9bcc1')}

  <!-- 操作キー -->
  <rect x="3" y="70" width="${W - 6}" height="19" fill="#1b1c1f"/>
  ${KEYS.map(key).join('')}

  <!-- 下段: 左カバー（設定スイッチ・USB） -->
  <rect x="3" y="91" width="40" height="${BODY_H - 94}" rx="1.2" fill="url(#cover-{{uid}})" stroke="#0a0a0b" stroke-width="0.7"/>
  <rect x="1" y="104" width="2.5" height="5" fill="#0d0d0e"/>
  <rect x="1" y="134" width="2.5" height="5" fill="#0d0d0e"/>
  ${text(38, 100, 'SW ◀', 3.6, '#d0d2d6', 'end', 'bold')}
  <rect x="9" y="103" width="18" height="5" rx="0.8" fill="#151618" stroke="#3a3c40" stroke-width="0.5"/>
  ${text(38, 120, 'USB ◀', 3.6, '#d0d2d6', 'end', 'bold')}
  <rect x="9" y="123" width="12" height="6" rx="1" fill="#0f1011" stroke="#4a4d52" stroke-width="0.6"/>
  <rect x="11" y="125" width="8" height="2" fill="#7c7f84"/>
  <!-- Ethernet ポート（RJ45, EtherNet/IP） -->
  <rect x="${ETH.x - ETH.w / 2 - 2}" y="${ETH.y - ETH.h / 2 - 2}" width="${ETH.w + 4}" height="${ETH.h + 4}" rx="1" fill="#bfc3c8" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${ETH.x - ETH.w / 2}" y="${ETH.y - ETH.h / 2}" width="${ETH.w}" height="${ETH.h}" fill="#0b0c0d"/>
  <rect x="${ETH.x - 7}" y="${ETH.y - ETH.h / 2}" width="14" height="4" fill="#2a2c2f"/>
  <path d="M${ETH.x - 8} ${ETH.y + 6} H${ETH.x + 8}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.2"/>
  <rect x="${ETH.x + ETH.w / 2 - 4}" y="${ETH.y - ETH.h / 2 + 1}" width="3" height="2.2" fill="url(#led-{{uid}})"/>
  <rect x="${ETH.x + ETH.w / 2 - 4}" y="${ETH.y + ETH.h / 2 - 3.2}" width="3" height="2.2" fill="#c8a42a"/>
  ${text(2.6, 151, 'LINK', 2.4, '#c4c7cb', 'start')}
  ${text(2.6, 175, 'ACT', 2.4, '#c4c7cb', 'start')}
  ${text(ETH.x, 180.5, 'EtherNet/IP', 3.1, '#d0d2d6', 'middle', 'bold')}

  <!-- 下段: 中央カバー -->
  <rect x="45" y="91" width="21" height="${BODY_H - 94}" rx="1.2" fill="url(#cover-{{uid}})" stroke="#0a0a0b" stroke-width="0.7"/>
  <rect x="52" y="93" width="7" height="2" rx="1" fill="#151618"/>

  <!-- 下段: メモリカード（CARD）カバー -->
  <rect x="68" y="91" width="${W - 71}" height="${BODY_H - 94}" rx="1.2" fill="url(#cover-{{uid}})" stroke="#0a0a0b" stroke-width="0.7"/>
  ${text(71, 100, '◀ CARD', 3.6, '#d0d2d6', 'start', 'bold')}
  <rect x="73" y="104" width="30" height="3" rx="1.2" fill="#121315" stroke="#3a3c40" stroke-width="0.4"/>
  <rect x="85" y="176" width="10" height="2.4" rx="1.2" fill="#151618"/>

  <!-- 側面の連結部の影 -->
  <rect x="${W - 3}" y="6" width="2" height="${BODY_H - 12}" fill="#000" opacity="0.35"/>
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-8000.cpu',
  name: 'PLC CPUユニット',
  model: 'KV-8000',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-8000 シリーズのビルディングブロック型 PLC の CPU ユニット。電源は DC24V（KV-8000/7000 シリーズ拡張ユニットのみの構成で −15%〜+20%、KV-5000/3000 シリーズ拡張ユニット併用時は ±10%）。右側に I/O ユニットなどの拡張ユニットを連結し、拡張ユニットの内部電源も CPU の電源端子から供給される（内部消費電流 CPU 単体 400mA 以下、拡張ユニット込み最大 3.2A）。Ethernet ポート（EtherNet/IP 対応）でタッチパネル（VT5 など）や PC と LAN ケーブルでつなぐ。電源端子は実機では底面にある。',
  labelPrefix: 'PLC',
  width: W,
  height: H,
  svg,
  terminals: [
    {
      id: '24V+',
      label: '+',
      x: PWR[0].x,
      y: PWR_Y,
      side: 'bottom',
      role: 'input',
      accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+'] },
    },
    {
      id: '24V-',
      label: '−',
      x: PWR[1].x,
      y: PWR_Y,
      side: 'bottom',
      role: 'input',
      accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['-'] },
    },
    { id: 'FG', label: 'FG', x: PWR[2].x, y: PWR_Y, side: 'bottom', role: 'ground' },
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
      // 拡張ユニットの内部消費電流も CPU の電源端子から流れるため、構成に合わせて選ぶ
      key: 'consumption',
      label: '消費電流（拡張ユニット込み）',
      unit: 'A',
      options: [
        { value: 0.4, label: '0.4A（CPU 単体）' },
        { value: 0.5, label: '0.5A（CPU + I/O ユニット数台）' },
        { value: 1, label: '1A' },
        { value: 2, label: '2A' },
        { value: 3.2, label: '3.2A（最大）' },
      ],
      default: 0.5,
    },
  ],
  loadCurrent: { param: 'consumption' },
};

export default def;
