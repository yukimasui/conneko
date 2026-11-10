import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * オムロン プログラマブルターミナル NB シリーズ NB7W-TW01B（7 型ワイド TFT カラー 800×480、Ethernet 付き、DC24V 電源）。
 * 外形 W202 × H148 × D46 mm（大型機器のため 1mm ≒ 1px）。
 *
 * 上段に正面図（濃いグレーのベゼル、操作画面のイメージ、OMRON のロゴ）、下段に背面下部のインタフェース
 * （電源端子台 +・−・⏚、シリアルポート A（RS-232C、D-sub 9 ピン メス）、シリアルポート B（RS-232C/RS-422A/RS-485、D-sub 9 ピン メス）、
 * Ethernet、USB ホスト・USB スレーブ）を並べた概念図。背面のインタフェースの並びは実機と異なる。
 * 出典: オムロン NB シリーズの仕様（https://www.ia.omron.com/products/family/3983/specification.html。DC24V ±15%（20.4〜27.6V）、
 *       シリアルポート A は EIA RS-232C・D-sub 9 ピン（ソケット）・6 番ピンから DC+5V 250mA 以下、USB Type-A・Type-B 各 1、SD カード）、
 *       販売店の製品情報（7 型 800×480、外形 202 × 148 × 46mm、IP65、Ethernet・RS-485）
 */

const FX = 8;
const FY = 6;
const FW = 202;
const FH = 148;
const W = FW + 16;
const RY = FY + FH + 10;
const RH = 64;
const H = RY + RH + 6;
/** 7 型ワイドの有効表示エリア（約 154 × 86mm） */
const SW = 154;
const SH = 86;
const SX = FX + (FW - SW) / 2;
const SY = FY + 22;

const PY = RY + 44;
const POWER = [
  { id: '+', x: 22 },
  { id: '-', x: 38 },
  { id: 'FG', x: 54 },
];
const COM1 = { x: 88, y: RY + 44 };
const COM2 = { x: 134, y: RY + 44 };
const LAN = { x: 176, y: RY + 44 };

const t = (x: number, y: number, s: string, size = 5, fill = '#d6d9dc', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const label = (x: number, y: number, w: number, s: string) => `<rect x="${x}" y="${y}" width="${w}" height="8" rx="1" fill="#3a3d40"/>${t(x + w / 2, y + 5.9, s, 4.6)}`;

const screw = (x: number, y: number) => `
  <rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" rx="1" fill="#101112" stroke="#333" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="4.4" fill="url(#nbscrew-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <path d="M${x - 2.6} ${y} H${x + 2.6} M${x} ${y - 2.6} V${y + 2.6}" stroke="#444" stroke-width="1"/>`;

/** D-sub 9 ピン メス（台形のシェル） */
const dsub = (cx: number, cy: number) => `
  <rect x="${cx - 17}" y="${cy - 9}" width="34" height="18" rx="2" fill="url(#nbshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <circle cx="${cx - 13.5}" cy="${cy}" r="2" fill="#555"/><circle cx="${cx + 13.5}" cy="${cy}" r="2" fill="#555"/>
  <path d="M${cx - 10} ${cy - 5.5} H${cx + 10} L${cx + 8} ${cy + 5.5} H${cx - 8} Z" fill="#2b2c2e" stroke="#777" stroke-width="0.5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${cx - 7.2 + i * 3.6}" cy="${cy - 2.2}" r="0.85" fill="#0a0a0a"/>`).join('')}
  ${[0, 1, 2, 3].map((i) => `<circle cx="${cx - 5.4 + i * 3.6}" cy="${cy + 2.2}" r="0.85" fill="#0a0a0a"/>`).join('')}`;

const screen = `
  <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#f3f5f7"/>
  <rect x="${SX}" y="${SY}" width="${SW}" height="11" fill="#2f6f8f"/>
  ${t(SX + 4, SY + 8, '搬送コンベア', 6.4, '#ffffff', 'start', 'bold')}
  ${t(SX + SW - 4, SY + 8, 'AUTO', 5.6, '#d8f0ff', 'end', 'bold')}
  ${t(SX + 6, SY + 23, '速度', 5.6, '#333', 'start')}
  <rect x="${SX + 26}" y="${SY + 15}" width="46" height="12" rx="1.5" fill="#101418"/>
  ${t(SX + 70, SY + 25, '25.0 m/min', 7, '#39ff6a', 'end', 'bold')}
  ${t(SX + 6, SY + 41, '個数', 5.6, '#333', 'start')}
  <rect x="${SX + 26}" y="${SY + 33}" width="46" height="12" rx="1.5" fill="#ffffff" stroke="#7a8590" stroke-width="0.5"/>
  ${t(SX + 70, SY + 43, '1280', 8, '#2f6f8f', 'end', 'bold')}
  ${['#2bd94f', '#f0b429', '#8d9298']
    .map((c, i) => `<circle cx="${SX + 98 + i * 20}" cy="${SY + 26}" r="7" fill="${c}" stroke="#333" stroke-width="0.5"/>${t(SX + 98 + i * 20, SY + 41, ['運転', '注意', '停止'][i], 5, '#333')}`)
    .join('')}
  ${[
    { s: '起動', c: '#3ccf5c' },
    { s: '停止', c: '#f0574d' },
    { s: '原点', c: '#5b8fe8' },
  ]
    .map((b, i) => `<rect x="${SX + 6 + i * 49}" y="${SY + SH - 26}" width="45" height="21" rx="2.5" fill="${b.c}" stroke="#333" stroke-width="0.4"/>${t(SX + 28.5 + i * 49, SY + SH - 12, b.s, 7.4, '#fff', 'middle', 'bold')}`)
    .join('')}
  <path d="M${SX} ${SY} H${SX + SW * 0.36} L${SX + SW * 0.18} ${SY + SH} H${SX} Z" fill="#fff" fill-opacity="0.08"/>`;

const svg = `
  <defs>
    <linearGradient id="nbbezel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#2c2e32"/>
    </linearGradient>
    <linearGradient id="nbrear-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4044"/>
      <stop offset="1" stop-color="#2a2c2f"/>
    </linearGradient>
    <linearGradient id="nbshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <radialGradient id="nbscrew-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
  </defs>

  <!-- ===== 正面図 ===== -->
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="5" fill="url(#nbbezel-{{uid}})" stroke="#111" stroke-width="1.1"/>
  <rect x="${FX + 3}" y="${FY + 3}" width="${FW - 6}" height="${FH - 6}" rx="4" fill="none" stroke="#6a6e73" stroke-width="0.5"/>
  ${t(FX + 10, FY + 13, 'OMRON', 8, '#e8eaec', 'start', 'bold')}
  ${t(FX + FW - 10, FY + 13, 'NB', 7, '#b9bdc2', 'end', 'bold')}
  <rect x="${SX - 4}" y="${SY - 4}" width="${SW + 8}" height="${SH + 8}" rx="1.5" fill="#0c0d0e" stroke="#4a4d50" stroke-width="0.5"/>
  ${screen}
  <rect x="${FX + FW - 26}" y="${FY + FH - 13}" width="6" height="3.4" rx="1" fill="#49d34f" stroke="#1f6a24" stroke-width="0.4"/>
  ${t(FX + FW - 18, FY + FH - 10, 'RUN', 4.4, '#c9ccd0', 'start')}
  ${t(FX + 10, FY + FH - 8, 'NB7W-TW01B', 4.4, '#8d9297', 'start')}

  <!-- ===== 背面下部のインタフェース（概念図） ===== -->
  <rect x="${FX}" y="${RY}" width="${FW}" height="${RH}" rx="4" fill="url(#nbrear-{{uid}})" stroke="#0e0f10" stroke-width="1"/>
  ${t(FX + 5, RY + 8, '背面 インタフェース', 5, '#9aa0a6', 'start')}
  ${label(12, RY + 14, 52, 'DC24V')}
  ${t(POWER[0].x, RY + 30, '+', 6, '#e2e5e8', 'middle', 'bold')}
  ${t(POWER[1].x, RY + 30, '−', 6, '#e2e5e8', 'middle', 'bold')}
  ${t(POWER[2].x, RY + 30, '⏚', 6, '#e2e5e8', 'middle', 'bold')}
  <rect x="${POWER[0].x - 9}" y="${PY - 9}" width="50" height="18" rx="1.5" fill="#1b1c1e" stroke="#000" stroke-width="0.8"/>
  ${POWER.map((p) => screw(p.x, PY)).join('')}
  ${label(COM1.x - 20, RY + 14, 40, 'COM1')}
  ${t(COM1.x, RY + 30, 'RS-232C', 4.4)}
  ${dsub(COM1.x, COM1.y)}
  ${label(COM2.x - 20, RY + 14, 40, 'COM2')}
  ${t(COM2.x, RY + 30, '232C/422A/485', 4.2)}
  ${dsub(COM2.x, COM2.y)}
  ${label(LAN.x - 16, RY + 14, 32, 'LAN')}
  <rect x="${LAN.x - 12}" y="${LAN.y - 11}" width="24" height="21" rx="1" fill="url(#nbshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <path d="M${LAN.x - 9} ${LAN.y - 8} H${LAN.x + 9} V${LAN.y + 4} H${LAN.x + 4} V${LAN.y + 7} H${LAN.x - 4} V${LAN.y + 4} H${LAN.x - 9} Z" fill="#111"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${LAN.x - 7 + i * 1.9}" y="${LAN.y - 7}" width="1" height="4" fill="#c9a43a"/>`).join('')}
  <rect x="${FX + FW - 18}" y="${RY + 10}" width="12" height="6" rx="0.8" fill="url(#nbshield-{{uid}})" stroke="#555" stroke-width="0.5"/>
  ${t(FX + FW - 12, RY + 23, 'USB', 4, '#9aa0a6')}
`;

const acc = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 20.4, maxVoltage: 27.6, conductors: [c] });

const terminals: TerminalDef[] = [
  { id: '+', label: '+ (DC24V)', hint: '電源+', x: POWER[0].x, y: PY, side: 'bottom', role: 'input', accepts: acc('+') },
  { id: '-', label: '− (0V)', hint: '電源−', x: POWER[1].x, y: PY, side: 'bottom', role: 'input', accepts: acc('-') },
  { id: 'FG', label: '⏚', hint: '機能接地', x: POWER[2].x, y: PY, side: 'bottom', role: 'ground' },
  {
    id: 'COM1',
    label: 'COM1 シリアルポート A（RS-232C、D-sub 9 ピン メス）',
    note: 'PLC の RS-232C ポートとつなぐ（6 番ピンから DC+5V 250mA 以下を出せる）',
    x: COM1.x,
    y: COM1.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'DSUB9', pins: 0, width: 30, length: 14, facing: 'front', protocols: ['rs-232c'] },
    optional: true,
  },
  {
    id: 'COM2',
    label: 'COM2 シリアルポート B（RS-232C/RS-422A/RS-485、D-sub 9 ピン メス）',
    x: COM2.x,
    y: COM2.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'DSUB9', pins: 0, width: 30, length: 14, facing: 'front', protocols: ['rs-232c', 'rs-422', 'rs-485'] },
    optional: true,
  },
  {
    id: 'LAN',
    label: 'Ethernet (RJ45)',
    note: '10/100BASE-T。オムロンの PLC（CP・NJ/NX）や他社の PLC と Ethernet でつなぐ',
    x: LAN.x,
    y: LAN.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 22, length: 19, facing: 'front', protocols: ['ethernet', 'ethernet-ip', 'modbus-tcp'] },
    optional: true,
  },
];

const def: DeviceDefinition = {
  type: 'omron.nb7w-tw01b',
  name: 'タッチパネルディスプレイ',
  model: 'NB7W-TW01B',
  maker: 'オムロン',
  category: 'control',
  description:
    'オムロン プログラマブルターミナル NB シリーズの 7 型ワイド TFT カラー タッチパネル NB7W-TW01B（800×480、抵抗膜式、Ethernet 付き、外形 W202 × H148 × D46mm、正面 IP65）。電源は DC24V（20.4〜27.6V）を背面の電源端子台の +・− に入れ、⏚ は接地する。COM1（シリアルポート A、RS-232C、D-sub 9 ピン メス）、COM2（シリアルポート B、RS-232C/RS-422A/RS-485、D-sub 9 ピン メス）、Ethernet で PLC（オムロン CP シリーズ・NJ/NX シリーズ、他社の PLC）とつなぐ。USB ホスト（Type-A）・USB スレーブ（Type-B、パソコンとの画面データの転送）、SD カードスロット。消費電流（約 7W、0.3A）と COM2 の通信方式は推定。図の下段は背面のインタフェースの概念図（並びは実機と異なる）。',
  estimated: '消費電力（約 7W、0.3A として見込んだ）、COM2（シリアルポート B）の通信方式、背面のインタフェースの並び（概念図）',
  labelPrefix: 'PT',
  width: W,
  height: H,
  svg,
  terminals,
  loadCurrent: 0.3,
};

export default def;
