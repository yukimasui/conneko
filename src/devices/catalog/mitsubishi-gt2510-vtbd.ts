import { threeDiamonds } from '../mitsubishi/iqr-parts';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * 三菱電機 GOT2000 シリーズ GT25 モデル GT2510-VTBD（10.4 型 TFT カラー、VGA 640×480、DC24V 電源、黒枠）。
 * 外形 W303 × H218 × D52 mm（大型機器のため 1mm ≒ 1px）。
 *
 * 上段に正面図（黒いベゼル、操作画面のイメージ、POWER LED、三菱電機のロゴ）、
 * 下段に背面下部のインタフェース（Ethernet、RS-232（D-sub 9 ピン オス）、RS-422/485（D-sub 9 ピン メス）、USB、電源端子台）を並べた概念図。
 * 背面のインタフェースの並びは概念図で、実機の配置とは異なる。
 */

const FX = 8;
const FY = 6;
const FW = 303;
const FH = 218;
const W = FW + 16;
const RY = FY + FH + 12;
const RH = 70;
const H = RY + RH + 6;
/** 有効表示エリア（10.4 型 VGA: 約 211 × 158mm） */
const SW = 211;
const SH = 158;
const SX = FX + (FW - SW) / 2;
const SY = FY + 18;

const LAN = { x: 34, y: RY + 44 };
const RS232 = { x: 92, y: RY + 44 };
const RS422 = { x: 146, y: RY + 44 };
const PY = RY + 50;
const PX0 = W - 66;
const POWER = [
  { id: 'FG', x: PX0 },
  { id: '+24V', x: PX0 + 18 },
  { id: '0V', x: PX0 + 36 },
];

const t = (x: number, y: number, s: string, size = 6, fill = '#d6d9dc', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const label = (x: number, y: number, w: number, s: string) => `
  <rect x="${x}" y="${y}" width="${w}" height="9" rx="1" fill="#3a3d40"/>${t(x + w / 2, y + 6.6, s, 5.5)}`;

const screw = (x: number, y: number) => `
  <rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="1" fill="#101112" stroke="#333" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="5" fill="url(#gscrew-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${x - 3} ${y} H${x + 3} M${x} ${y - 3} V${y + 3}" stroke="#444" stroke-width="1"/>`;

/** D-sub 9 ピン（台形のシェル） */
const dsub = (cx: number, cy: number, male: boolean) => `
  <rect x="${cx - 19}" y="${cy - 10}" width="38" height="20" rx="2" fill="url(#gshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <circle cx="${cx - 15}" cy="${cy}" r="2.2" fill="#555"/><circle cx="${cx + 15}" cy="${cy}" r="2.2" fill="#555"/>
  <path d="M${cx - 11} ${cy - 6} H${cx + 11} L${cx + 9} ${cy + 6} H${cx - 9} Z" fill="${male ? '#1a1a1a' : '#2b2c2e'}" stroke="#777" stroke-width="0.5"/>
  ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${cx - 8 + i * 4}" cy="${cy - 2.5}" r="${male ? 1.1 : 0.9}" fill="${male ? '#d8b552' : '#0a0a0a'}"/>`).join('')}
  ${[0, 1, 2, 3].map((i) => `<circle cx="${cx - 6 + i * 4}" cy="${cy + 2.5}" r="${male ? 1.1 : 0.9}" fill="${male ? '#d8b552' : '#0a0a0a'}"/>`).join('')}`;

const screen = () => {
  const bw = (SW - 20) / 4;
  return `
  <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#eef1f5"/>
  <rect x="${SX}" y="${SY}" width="${SW}" height="14" fill="#1d4f9c"/>
  ${t(SX + 5, SY + 10, '組立ライン 運転画面', 8, '#ffffff', 'start', 'bold')}
  ${t(SX + SW - 5, SY + 10, '08:15', 7, '#dbe8ff', 'end')}
  ${t(SX + 8, SY + 30, '生産数', 7, '#333', 'start')}
  <rect x="${SX + 6}" y="${SY + 34}" width="${SW * 0.42}" height="26" rx="2" fill="#101418" stroke="#7a8590" stroke-width="0.6"/>
  ${t(SX + 6 + SW * 0.42 - 4, SY + 54, '00512', 20, '#39ff6a', 'end', 'bold')}
  ${t(SX + 8, SY + 76, 'サイクルタイム', 7, '#333', 'start')}
  <rect x="${SX + 6}" y="${SY + 80}" width="${SW * 0.42}" height="18" rx="2" fill="#ffffff" stroke="#7a8590" stroke-width="0.6"/>
  ${t(SX + 6 + SW * 0.42 - 4, SY + 94, '12.4 s', 12, '#1d4f9c', 'end', 'bold')}
  ${['#2bd94f', '#8d9298', '#7a2a2a']
    .map((c, i) => `<circle cx="${SX + SW * (0.6 + i * 0.13)}" cy="${SY + 46}" r="9" fill="${c}" stroke="#333" stroke-width="0.6"/>${t(SX + SW * (0.6 + i * 0.13), SY + 66, ['運転', '停止', '異常'][i], 7, '#333')}`)
    .join('')}
  ${[
    { s: '運転', c1: '#3ccf5c', c2: '#1d8a35' },
    { s: '停止', c1: '#f0574d', c2: '#b0201a' },
    { s: 'リセット', c1: '#f5c844', c2: '#b88a00' },
    { s: 'メニュー', c1: '#5b8fe8', c2: '#2a56a8' },
  ]
    .map(
      (b, i) => `
  <rect x="${(SX + 4 + i * (bw + 4)).toFixed(1)}" y="${SY + SH - 34}" width="${bw.toFixed(1)}" height="30" rx="3" fill="${b.c2}"/>
  <rect x="${(SX + 5 + i * (bw + 4)).toFixed(1)}" y="${SY + SH - 33}" width="${(bw - 2).toFixed(1)}" height="26" rx="2.5" fill="${b.c1}"/>
  ${t(+(SX + 4 + i * (bw + 4) + bw / 2).toFixed(1), SY + SH - 15, b.s, 9, '#fff', 'middle', 'bold')}`,
    )
    .join('')}
  <path d="M${SX} ${SY} H${SX + SW * 0.38} L${SX + SW * 0.16} ${SY + SH} H${SX} Z" fill="#fff" fill-opacity="0.08"/>`;
};

const svg = `
  <defs>
    <linearGradient id="gbezel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#1d1e21"/>
    </linearGradient>
    <linearGradient id="grear-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4044"/>
      <stop offset="1" stop-color="#2a2c2f"/>
    </linearGradient>
    <linearGradient id="gshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#9aa0a6"/>
    </linearGradient>
    <radialGradient id="gscrew-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
  </defs>

  <!-- ===== 正面図 ===== -->
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="6" fill="url(#gbezel-{{uid}})" stroke="#0b0b0c" stroke-width="1.2"/>
  <rect x="${FX + 3}" y="${FY + 3}" width="${FW - 6}" height="${FH - 6}" rx="5" fill="none" stroke="#56595e" stroke-width="0.6"/>
  <rect x="${SX - 5}" y="${SY - 5}" width="${SW + 10}" height="${SH + 10}" rx="1.5" fill="#0c0d0e" stroke="#4a4d50" stroke-width="0.6"/>
  ${screen()}
  ${threeDiamonds(FX + 20, FY + FH - 12, 5)}
  ${t(FX + 30, FY + FH - 17, 'MITSUBISHI', 6.4, '#e6e7e9', 'start', 'bold')}
  ${t(FX + 30, FY + FH - 10, 'ELECTRIC', 6.4, '#e6e7e9', 'start', 'bold')}
  ${t(FX + FW / 2, FY + FH - 12, 'GOT2000', 9, '#b9bdc2', 'middle', 'bold')}
  <rect x="${FX + FW - 40}" y="${FY + FH - 19}" width="8" height="4" rx="1" fill="#49d34f" stroke="#1f6a24" stroke-width="0.5"/>
  ${t(FX + FW - 26, FY + FH - 15, 'POWER', 5, '#c9ccd0', 'start')}
  ${t(FX + FW - 8, FY + FH - 6, 'GT2510-VTBD', 5, '#8d9297', 'end')}

  <!-- ===== 背面下部のインタフェース（概念図） ===== -->
  <rect x="${FX}" y="${RY}" width="${FW}" height="${RH}" rx="4" fill="url(#grear-{{uid}})" stroke="#0e0f10" stroke-width="1"/>
  ${t(FX + 6, RY + 9, '背面 インタフェース', 6, '#9aa0a6', 'start')}
  ${label(LAN.x - 17, RY + 18, 34, 'Ethernet')}
  <rect x="${LAN.x - 12}" y="${LAN.y - 12}" width="24" height="22" rx="1" fill="url(#gshield-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${LAN.x - 9} ${LAN.y - 9} H${LAN.x + 9} V${LAN.y + 4} H${LAN.x + 4} V${LAN.y + 8} H${LAN.x - 4} V${LAN.y + 4} H${LAN.x - 9} Z" fill="#111"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${LAN.x - 7 + i * 1.9}" y="${LAN.y - 8}" width="1" height="4" fill="#c9a43a"/>`).join('')}
  ${label(RS232.x - 21, RY + 18, 42, 'RS-232')}
  ${dsub(RS232.x, RS232.y, true)}
  ${label(RS422.x - 24, RY + 18, 48, 'RS-422/485')}
  ${dsub(RS422.x, RS422.y, false)}
  ${label(186, RY + 18, 40, 'USB')}
  <rect x="190" y="${RY + 38}" width="14" height="8" rx="0.8" fill="url(#gshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <rect x="192" y="${RY + 40}" width="10" height="2.5" fill="#1a1a1a"/>
  <path d="M210 ${RY + 36} H221 V${RY + 45} L219 ${RY + 47} H212 L210 ${RY + 45} Z" fill="url(#gshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  ${label(PX0 - 12, RY + 18, 60, 'DC24V 電源')}
  ${t(POWER[0].x, RY + 34, 'FG', 6, '#e2e5e8', 'middle', 'bold')}
  ${t(POWER[1].x, RY + 34, '+24V', 6, '#e2e5e8', 'middle', 'bold')}
  ${t(POWER[2].x, RY + 34, '0V', 6, '#e2e5e8', 'middle', 'bold')}
  <rect x="${PX0 - 11}" y="${PY - 10}" width="58" height="20" rx="1.5" fill="#1b1c1e" stroke="#000" stroke-width="0.8"/>
  ${POWER.map((p) => screw(p.x, PY)).join('')}
`;

const acc = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 19.2, maxVoltage: 30, conductors: [c] });

const terminals: TerminalDef[] = [
  { id: 'FG', label: 'FG', hint: '機能接地', x: POWER[0].x, y: PY, side: 'bottom', role: 'ground' },
  { id: '+24V', label: '+24V', x: POWER[1].x, y: PY, side: 'bottom', role: 'input', accepts: acc('+') },
  { id: '0V', label: '0V', x: POWER[2].x, y: PY, side: 'bottom', role: 'input', accepts: acc('-') },
  {
    id: 'LAN',
    label: 'Ethernet (RJ45)',
    x: LAN.x,
    y: LAN.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 22, length: 19, facing: 'front', protocols: ['ethernet', 'slmp', 'ethernet-ip', 'modbus-tcp'] },
    optional: true,
  },
  {
    id: 'RS232',
    label: 'RS-232（D-sub 9 ピン オス）',
    x: RS232.x,
    y: RS232.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'DSUB9', pins: 0, width: 32, length: 14, facing: 'front', protocols: ['rs-232c'] },
    optional: true,
  },
  {
    id: 'RS422',
    label: 'RS-422/485（D-sub 9 ピン メス）',
    x: RS422.x,
    y: RS422.y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: 'DSUB9', pins: 0, width: 32, length: 14, facing: 'front', protocols: ['rs-422', 'rs-485'] },
    optional: true,
  },
];

const def: DeviceDefinition = {
  type: 'mitsubishi.gt2510-vtbd',
  name: 'タッチパネルディスプレイ',
  model: 'GT2510-VTBD',
  maker: '三菱電機',
  category: 'control',
  description:
    '三菱電機 GOT2000 シリーズ GT25 モデルの 10.4 型 TFT カラー タッチパネル（VGA 640×480、黒枠、外形 W303 × H218 × D52mm）。電源は DC24V（+25% / −20%）を背面の電源端子台の +24V・0V に入れ、FG は接地する。消費電力は本体のみで約 12W（バックライト・増設オプションを含む最大は約 34W）。Ethernet ポートで PLC（MELSEC iQ-R・iQ-F の CPU 内蔵ポートや Ethernet ユニット、他社の PLC）と LAN ケーブルでつなぐ。RS-232（D-sub 9 ピン オス）・RS-422/485（D-sub 9 ピン メス）でシリアル接続もできる。USB（ホスト・デバイス）、SD カード。図の下段は背面のインタフェースの概念図（並びは実機と異なる）。',
  labelPrefix: 'GOT',
  width: W,
  height: H,
  svg,
  terminals,
  // 本体のみの消費電力 約 12W / DC24V
  loadCurrent: 0.5,
};

export default def;
