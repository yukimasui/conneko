import type { AcceptSpec, ConnectorSpec, DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * KEYENCE 4 ポート EtherNet/IP 対応 IO-Link マスタ NQ-EP4L。
 * 上部に Ethernet ポート（M8 4 ピン メス A コード × 2: P1・P2）と電源コネクタ（IN: M8 4 ピン オス、OUT: M8 4 ピン メス）、
 * その下に IO-Link ポート（M12 5 ピン メス A コード、ポート 1〜4 はすべて Class A）が縦に 4 個並ぶ（外形は推定、1mm ≒ 2px）。
 *
 * IO-Link ポートのピン（IO-Link の Class A の標準）: 1 L+（センサー電源 +24V）・2 DI（デジタル入力）・3 L−（0V）・4 C/Q（IO-Link 通信 / デジタル入力）・5 NC。
 * M12 4 ピンのセンサー（オス）・センサー用ケーブルをそのまま差せる（kind 'M12-5'、mates 'M12-4'。ピン 1〜4 が同じ番号で導通する）。
 * DI モードでは C/Q・DI をデジタル入力（PNP 用、最大 8 点）として使う。
 *
 * 電源コネクタのピンの割付け（1 V1+・2 V2+・3 V1−・4 V2−）と、ポートの L+/L− がどちらの系統から出るか（V2）は推定。
 * IN と OUT の同じ番号のピンは内部で導通する（次の機器へ渡り配線できる）。
 */

const W = 64;
const H = 300;
const P1 = { x: 16, y: 22 };
const P2 = { x: 48, y: 22 };
const PIN = { x: 16, y: 58 };
const POUT = { x: 48, y: 58 };
const PORTS = [1, 2, 3, 4].map((n) => ({ n, x: 26, y: 98 + (n - 1) * 48 }));

const text = (x: number, y: number, t: string, size = 4, fill = '#e6e7e9', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 丸形コネクタ（六角のナットとピンの穴）。r は外径の半径 */
const round = (cx: number, cy: number, r: number, holes: number, female: boolean) => {
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + (r + 3) * Math.cos(a)).toFixed(2)},${(cy + (r + 3) * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  const pins = Array.from({ length: holes }, (_, i) => {
    if (holes === 5 && i === 4) return `<circle cx="${cx}" cy="${cy}" r="${r * 0.13}" fill="${female ? '#111' : '#d8b552'}"/>`;
    const a = (Math.PI / 2) * i + Math.PI / 4;
    return `<circle cx="${(cx + r * 0.5 * Math.cos(a)).toFixed(2)}" cy="${(cy + r * 0.5 * Math.sin(a)).toFixed(2)}" r="${r * 0.13}" fill="${female ? '#111' : '#d8b552'}"/>`;
  }).join('');
  return `
  <polygon points="${hex}" fill="url(#nqmetal-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${female ? '#2c2d30' : '#3a3b3e'}" stroke="#777" stroke-width="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.78}" fill="${female ? '#1a1b1d' : '#26272a'}"/>
  ${pins}`;
};

const svg = `
  <defs>
    <linearGradient id="nqbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a2c30"/>
      <stop offset="0.15" stop-color="#3c3f44"/>
      <stop offset="0.85" stop-color="#383b40"/>
      <stop offset="1" stop-color="#25272b"/>
    </linearGradient>
    <linearGradient id="nqmetal-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9ebed"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
  </defs>
  <!-- 本体（取付け穴付き） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#nqbody-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <circle cx="${W / 2}" cy="8" r="3" fill="#15161a" stroke="#555" stroke-width="0.5"/>
  <circle cx="${W / 2}" cy="${H - 8}" r="3" fill="#15161a" stroke="#555" stroke-width="0.5"/>
  ${round(P1.x, P1.y, 6, 4, true)}${text(P1.x, P1.y + 14, 'P1', 3.4)}
  ${round(P2.x, P2.y, 6, 4, true)}${text(P2.x, P2.y + 14, 'P2', 3.4)}
  ${round(PIN.x, PIN.y, 6, 4, false)}${text(PIN.x, PIN.y + 14, 'PWR IN', 3)}
  ${round(POUT.x, POUT.y, 6, 4, true)}${text(POUT.x, POUT.y + 14, 'PWR OUT', 3)}
  <rect x="4" y="76" width="${W - 8}" height="0.8" fill="#1fa0e0"/>
  ${PORTS.map(
    (p) => `
  ${round(p.x, p.y, 9, 5, true)}
  ${text(p.x, p.y - 15, `PORT ${p.n}`, 3.2)}
  <rect x="${W - 14}" y="${p.y - 8}" width="5" height="3" rx="0.6" fill="${p.n === 1 ? '#4be04a' : '#3b3d40'}"/>${text(W - 7, p.y - 5.6, 'C/Q', 2.4, '#c9ccd0', 'start', 'normal')}
  <rect x="${W - 14}" y="${p.y + 2}" width="5" height="3" rx="0.6" fill="#3b3d40"/>${text(W - 7, p.y + 4.4, 'DI', 2.4, '#c9ccd0', 'start', 'normal')}`,
  ).join('')}
  <text x="10" y="${H - 18}" font-family="sans-serif" font-size="5.6" font-weight="bold" letter-spacing="0.4" fill="#f2f3f4">KEYENCE</text>
  ${text(W / 2, H - 26, 'NQ-EP4L', 4, '#c9ccd0')}
  ${text(W / 2, H - 36, 'IO-Link', 4.4, '#1fa0e0')}
`;

const POWER: AcceptSpec = { system: 'DC', minVoltage: 18, maxVoltage: 30 };

/** Ethernet ポート（M8 4 ピン D コード相当。M8−RJ45 の変換ケーブルで LAN につなぐ） */
const ethConnector: ConnectorSpec = { kind: 'M8-ETH', pins: 0, width: 14, length: 14, facing: 'front', style: 'round', mates: ['RJ45'], protocols: ['ethernet', 'ethernet-ip', 'modbus-tcp'] };
const powerConnector: ConnectorSpec = { kind: 'M8-4', pins: 4, width: 14, style: 'round', pinColors: { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black' } };
const portConnector: ConnectorSpec = { kind: 'M12-5', pins: 5, width: 20, style: 'round', mates: ['M12-4'], protocols: ['io-link'], pinColors: { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black', 5: 'gray' } };

const terminals: TerminalDef[] = [
  { id: 'P1', label: 'P1 Ethernet (M8)', x: P1.x, y: P1.y, side: 'top', role: 'connector', connector: ethConnector, optional: true },
  { id: 'P2', label: 'P2 Ethernet (M8)', x: P2.x, y: P2.y, side: 'top', role: 'connector', connector: ethConnector, optional: true },
  { id: 'PWR', label: '電源 IN（M8 4 ピン オス）', x: PIN.x, y: PIN.y, side: 'left', role: 'connector', connector: { ...powerConnector, required: true } },
  { id: 'PWROUT', label: '電源 OUT（M8 4 ピン メス）', x: POUT.x, y: POUT.y, side: 'right', role: 'connector', connector: powerConnector, optional: true },
  ...PORTS.map((p): TerminalDef => ({ id: `X${p.n}`, label: `PORT ${p.n}（IO-Link、M12 5 ピン メス）`, x: p.x, y: p.y, side: 'left', role: 'connector', connector: portConnector, optional: true })),
];

const powerPins = (cn: string, out: boolean): PinDef[] => [
  { id: `${cn}#1`, label: `1 V1+（推定）`, note: '本体・通信の電源 +24V（推定の割付け）', role: 'input', accepts: { ...POWER, conductors: ['+'] }, ...(out ? { optional: true } : {}) },
  { id: `${cn}#2`, label: `2 V2+（推定）`, note: 'センサー電源（ポートの L+）+24V（推定の割付け）', role: 'input', accepts: { ...POWER, conductors: ['+'] }, ...(out ? { optional: true } : {}) },
  { id: `${cn}#3`, label: `3 V1−（推定）`, note: 'V1 の 0V（推定の割付け）', role: 'input', accepts: { ...POWER, conductors: ['-'] }, ...(out ? { optional: true } : {}) },
  { id: `${cn}#4`, label: `4 V2−（推定）`, note: 'V2 の 0V（推定の割付け）', role: 'input', accepts: { ...POWER, conductors: ['-'] }, ...(out ? { optional: true } : {}) },
];

const pins: PinDef[] = [
  ...powerPins('PWR', false),
  ...powerPins('PWROUT', true),
  ...PORTS.flatMap((p): PinDef[] => [
    { id: `X${p.n}#1`, label: `PORT${p.n}-L+`, note: 'センサー電源 +24V（V2 から。推定）', role: 'pass', optional: true },
    { id: `X${p.n}#2`, label: `PORT${p.n}-DI`, note: 'デジタル入力（PNP 用）', role: 'signal', signal: { dir: 'in', kind: 'dc', commonPolarity: '-' }, optional: true },
    { id: `X${p.n}#3`, label: `PORT${p.n}-L-`, note: 'センサー電源 0V（V2 から。推定）', role: 'pass', optional: true },
    { id: `X${p.n}#4`, label: `PORT${p.n}-C/Q`, note: 'IO-Link 通信 / デジタル入力（PNP 用）', role: 'signal', signal: { dir: 'in', kind: 'dc', commonPolarity: '-' }, optional: true },
    { id: `X${p.n}#5`, label: `PORT${p.n}-NC`, note: '未使用（Class A）', role: 'signal', optional: true },
  ]),
];

const links: InternalLink[] = [
  // 電源 IN と OUT は同じ番号のピンどうしが導通（渡り配線）
  ...[1, 2, 3, 4].map((n) => ({ from: `PWR#${n}`, to: `PWROUT#${n}` })),
  // ポートのセンサー電源は V2 から（推定）
  ...PORTS.flatMap((p) => [
    { from: 'PWR#2', to: `X${p.n}#1` },
    { from: 'PWR#4', to: `X${p.n}#3` },
  ]),
];

const def: DeviceDefinition = {
  type: 'keyence.nq-ep4l',
  name: 'IO-Link マスタ',
  model: 'NQ-EP4L',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE の 4 ポート EtherNet/IP 対応 IO-Link マスタ（NQ シリーズ）。EtherNet/IP・Modbus/TCP（10/100Mbps）で PLC（KV-X・KV-8000 など）とつなぎ、IO-Link 対応のセンサー（ポート 1〜4、Class A、M12 5 ピン メス）のプロセスデータ（入出力 各最大 32 バイト）とパラメータを読み書きする。IO-Link でないセンサーも DI モードで PNP 入力（最大 8 点、C/Q と DI）として使える。Ethernet は M8 4 ピン メス（P1・P2、M8−RJ45 の変換ケーブルで LAN につなぐ）。電源は DC18〜30V（IO-Link 通信中は 20.4〜28.8V）、V1・V2 の 2 系統（許容電流は各 4A まで、消費電流 V1 110mA・V2 115mA 以下、センサーへの供給はポート 1〜4 の合計 4A まで）。電源 IN（M8 オス）から OUT（M8 メス）へ渡り配線できる。電源ピンの割付け・ポートのセンサー電源の系統・外形は推定。',
  estimated: '電源コネクタのピンの割付け（1 V1+・2 V2+・3 V1−・4 V2−）、ポートの L+/L− の系統（V2）、外形寸法',
  labelPrefix: 'IOL',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  loadCurrent: 0.225,
};

export default def;
