/**
 * KEYENCE タッチパネルディスプレイ VT5 シリーズ（VT5-W10 / VT5-X10 / VT5-X12 / VT5-X15 など）の共通描画。
 *
 * 上段に正面図（黒いベゼル、操作画面のイメージ、前面 USB カバー、電源 LED）、
 * 下段に背面下部の端子部（LAN、USB、COM1/COM2、X シリーズは RGB 入力・DVI 出力、電源端子台）を並べて描く概念図。
 * 縮尺は 1mm ≒ 1px（大型機器のため縮小）。外形寸法は KEYENCE 外形寸法図より。
 * 背面の端子の並びは VT5-W07 の図にそろえた概念図で、実機の配置とは異なる場合がある。
 */
import type { DeviceDefinition } from '../types';
import { PROTO, rj45Connector } from './kv-parts';

export interface Vt5Spec {
  model: string;
  /** 正面の外形 [mm] */
  w: number;
  h: number;
  /** 有効表示面積 [mm] */
  sw: number;
  sh: number;
  /** 表示ドット数 */
  dots: string;
  /** 画面サイズの表記（例: '10型ワイド'） */
  size: string;
  /** 消費電流 [A] */
  current: number;
  /** 前面 USB カバーの位置（W 系は画面下、X 系は画面左） */
  usb: 'bottom' | 'left';
  /** RGB 入力・DVI 出力の有無（X 系） */
  video: boolean;
}

const screw = (x: number, y: number, r = 4.6) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#vscrew-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="1"/>`;

const greenBlock = (x: number, y: number, n: number, pitch: number) => {
  let s = `<rect x="${x}" y="${y}" width="${n * pitch + 2}" height="16" rx="1.5" fill="url(#vgreen-{{uid}})" stroke="#1d6a2a" stroke-width="0.7"/>`;
  for (let i = 0; i < n; i++) {
    const cx = x + 1 + pitch / 2 + i * pitch;
    s += `<circle cx="${cx}" cy="${y + 10}" r="${pitch * 0.36}" fill="url(#vscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>`;
    s += `<line x1="${cx - pitch * 0.22}" y1="${y + 10}" x2="${cx + pitch * 0.22}" y2="${y + 10}" stroke="#444" stroke-width="0.7"/>`;
  }
  return s;
};

const label = (x: number, y: number, w: number, t: string, bold = false) => `
  <rect x="${x}" y="${y}" width="${w}" height="9" rx="1" fill="#3a3d40"/>
  <text x="${x + w / 2}" y="${y + 6.6}" text-anchor="middle" font-family="sans-serif" font-size="5.5" ${bold ? 'font-weight="bold"' : ''} fill="#d6d9dc">${t}</text>`;

/** 操作画面のイメージ（運転モニタ風）。sx, sy, sw, sh は画面の範囲 */
function screenImage(sx: number, sy: number, sw: number, sh: number) {
  const k = sw / 184;
  const fs = (v: number) => +(v * Math.min(k, sh / 104)).toFixed(2);
  const bw = (sw - 20) / 4;
  return `
  <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="#e9edf2"/>
  <rect x="${sx}" y="${sy}" width="${sw}" height="${fs(12)}" fill="url(#vtitle-{{uid}})"/>
  <text x="${sx + 4}" y="${sy + fs(8.6)}" font-family="sans-serif" font-size="${fs(7)}" font-weight="bold" fill="#fff">ライン1 運転モニタ</text>
  <text x="${sx + sw - 4}" y="${sy + fs(8.6)}" text-anchor="end" font-family="sans-serif" font-size="${fs(6.4)}" fill="#dbe8ff">12:34</text>
  <text x="${sx + 5}" y="${sy + fs(22)}" font-family="sans-serif" font-size="${fs(6)}" fill="#333">生産数</text>
  <rect x="${sx + 4}" y="${sy + fs(25)}" width="${sw * 0.42}" height="${fs(22)}" rx="1.5" fill="#101418" stroke="#7a8590" stroke-width="0.6"/>
  <text x="${sx + 4 + sw * 0.42 - 3}" y="${sy + fs(42)}" text-anchor="end" font-family="monospace" font-size="${fs(17)}" font-weight="bold" fill="#39ff6a">01234</text>
  ${['#2bd94f', '#8d9298', '#7a2a2a']
    .map((c, i) => `<circle cx="${sx + sw * (0.08 + i * 0.14)}" cy="${sy + sh * 0.6}" r="${fs(5.5)}" fill="${c}" stroke="#333" stroke-width="0.6"/>`)
    .join('')}
  ${['運転', '停止', '異常'].map((t, i) => `<text x="${sx + sw * (0.08 + i * 0.14)}" y="${sy + sh * 0.6 + fs(14)}" text-anchor="middle" font-family="sans-serif" font-size="${fs(6)}" fill="#333">${t}</text>`).join('')}
  <rect x="${sx + sw * 0.5}" y="${sy + fs(17)}" width="${sw * 0.47}" height="${sh * 0.52}" fill="#fff" stroke="#9aa4ae" stroke-width="0.6"/>
  <polyline points="${[0, 0.1, 0.2, 0.32, 0.45, 0.58, 0.7, 0.85, 1]
    .map((t, i) => `${(sx + sw * 0.5 + 3 + t * (sw * 0.47 - 6)).toFixed(1)},${(sy + fs(17) + sh * 0.52 * (0.8 - [0, 0.15, 0.08, 0.35, 0.28, 0.5, 0.45, 0.62, 0.7][i] * 0.9)).toFixed(1)}`)
    .join(' ')}" fill="none" stroke="#1f6fe0" stroke-width="1.4"/>
  ${[
    { t: '運転', c1: '#3ccf5c', c2: '#1d8a35' },
    { t: '停止', c1: '#f0574d', c2: '#b0201a' },
    { t: 'リセット', c1: '#f5c844', c2: '#b88a00' },
    { t: 'メニュー', c1: '#5b8fe8', c2: '#2a56a8' },
  ]
    .map(
      (b, i) => `
  <rect x="${(sx + 4 + i * (bw + 4)).toFixed(1)}" y="${(sy + sh - fs(26)).toFixed(1)}" width="${bw.toFixed(1)}" height="${fs(22)}" rx="3" fill="${b.c2}"/>
  <rect x="${(sx + 5 + i * (bw + 4)).toFixed(1)}" y="${(sy + sh - fs(25)).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${fs(19)}" rx="2.5" fill="${b.c1}"/>
  <text x="${(sx + 4 + i * (bw + 4) + bw / 2).toFixed(1)}" y="${(sy + sh - fs(12)).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="${fs(7.5)}" font-weight="bold" fill="#fff">${b.t}</text>`,
    )
    .join('')}
  <path d="M${sx} ${sy} H${sx + sw * 0.38} L${sx + sw * 0.16} ${sy + sh} H${sx} Z" fill="#fff" fill-opacity="0.08"/>`;
}

export function buildVt5(s: Vt5Spec): DeviceDefinition {
  const FX = 10;
  const FY = 6;
  const FW = s.w;
  const FH = s.h;
  const W = Math.round(FW + 20);
  /** 背面端子部 */
  const RY = FY + FH + 12;
  const RH = 68;
  const H = Math.round(RY + RH + 6);
  const SX = +(FX + (FW - s.sw) / 2 + (s.usb === 'left' ? 8 : 0)).toFixed(1);
  const SY = +(FY + (FH - s.sh) / 2 - (s.usb === 'bottom' ? 10 : 0)).toFixed(1);

  const LAN = { x: 30, y: RY + 39 };
  const PY = RY + 48;
  const PX0 = W - 52;
  const POWER = [
    { id: 'FG', x: PX0 },
    { id: '24V+', x: PX0 + 15 },
    { id: '24V-', x: PX0 + 30 },
  ];

  const usbCover =
    s.usb === 'bottom'
      ? `<rect x="${FX + 40}" y="${FY + FH - 30}" width="88" height="24" rx="1.5" fill="#1b1c1e" stroke="#4a4d50" stroke-width="0.7"/>
  <rect x="${FX + 43}" y="${FY + FH - 27}" width="64" height="18" rx="1" fill="#242628"/>
  <rect x="${FX + 110}" y="${FY + FH - 27}" width="5" height="18" rx="0.8" fill="#2e3033" stroke="#4a4d50" stroke-width="0.5"/>
  <rect x="${FX + 13}" y="${FY + FH - 20}" width="8" height="4" rx="0.8" fill="#49d34f" stroke="#1f6a24" stroke-width="0.5"/>`
      : `<rect x="${FX + 13}" y="${FY + FH * 0.38}" width="18" height="${FH * 0.3}" rx="1.5" fill="#1b1c1e" stroke="#4a4d50" stroke-width="0.7"/>
  <rect x="${FX + 16}" y="${FY + FH * 0.38 + 3}" width="12" height="${FH * 0.3 - 6}" rx="1" fill="#242628"/>
  <rect x="${FX + 18}" y="${FY + FH * 0.3}" width="8" height="4" rx="0.8" fill="#49d34f" stroke="#1f6a24" stroke-width="0.5"/>`;

  const video = s.video
    ? `${label(150, RY + 16, 30, 'RGB IN')}
  <path d="M152 ${RY + 30} H178 L175 ${RY + 42} H155 Z" fill="url(#vshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <path d="M156 ${RY + 33} H174 L172 ${RY + 39} H158 Z" fill="#1a1a1a"/>
  ${label(186, RY + 16, 34, 'DVI OUT')}
  <rect x="188" y="${RY + 30}" width="30" height="12" rx="1.5" fill="url(#vshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <rect x="191" y="${RY + 33}" width="24" height="6" rx="0.8" fill="#f2f2f2" stroke="#777" stroke-width="0.4"/>`
    : '';

  const svg = `
  <defs>
    <linearGradient id="vbezel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3c3f42"/>
      <stop offset="1" stop-color="#26282a"/>
    </linearGradient>
    <linearGradient id="vtitle-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a6fc4"/>
      <stop offset="1" stop-color="#1f4c96"/>
    </linearGradient>
    <linearGradient id="vrear-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#303234"/>
      <stop offset="1" stop-color="#1e1f21"/>
    </linearGradient>
    <linearGradient id="vgreen-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5fd27a"/>
      <stop offset="1" stop-color="#2a9a45"/>
    </linearGradient>
    <linearGradient id="vshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e8ea"/>
      <stop offset="1" stop-color="#8e9398"/>
    </linearGradient>
    <radialGradient id="vscrew-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </radialGradient>
  </defs>

  <!-- ===== 正面図 ===== -->
  ${[0.12, 0.88].flatMap((t) => [FY - 4, FY + FH - 2].map((y) => `<rect x="${(FX + FW * t - 5).toFixed(1)}" y="${y}" width="10" height="6" rx="1" fill="#9ba1a6" stroke="#555" stroke-width="0.6"/>`)).join('')}
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="5" fill="url(#vbezel-{{uid}})" stroke="#111" stroke-width="1.2"/>
  <rect x="${FX + 2}" y="${FY + 2}" width="${FW - 4}" height="${FH - 4}" rx="4" fill="none" stroke="#55595d" stroke-width="0.6"/>
  <rect x="${SX - 5}" y="${SY - 5}" width="${s.sw + 10}" height="${s.sh + 10}" rx="1.5" fill="#0c0d0e" stroke="#4a4d50" stroke-width="0.6"/>
  ${screenImage(SX, SY, s.sw, s.sh)}
  ${usbCover}
  <text x="${FX + FW - 10}" y="${FY + FH - 14}" text-anchor="end" font-family="sans-serif" font-size="8" font-weight="bold" fill="#8d9297" letter-spacing="0.6">KEYENCE</text>
  <text x="${FX + FW - 10}" y="${FY + FH - 6}" text-anchor="end" font-family="sans-serif" font-size="6" fill="#6f7479">${s.model}</text>

  <!-- ===== 背面下部の端子部（概念図） ===== -->
  <rect x="8" y="${RY}" width="${W - 16}" height="${RH}" rx="4" fill="url(#vrear-{{uid}})" stroke="#0e0f10" stroke-width="1"/>
  <text x="14" y="${RY + 9}" font-family="sans-serif" font-size="6" fill="#9aa0a6">背面 端子部</text>
  ${Array.from({ length: Math.floor((W - 140) / 9) }, (_, i) => `<rect x="${70 + i * 9}" y="${RY + 4}" width="3" height="8" rx="0.8" fill="#0b0c0d"/>`).join('')}
  ${label(LAN.x - 15, RY + 16, 30, 'LAN', true)}
  <rect x="${LAN.x - 12}" y="${RY + 28}" width="24" height="22" rx="1" fill="url(#vshield-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${LAN.x - 9} ${RY + 31} H${LAN.x + 9} V${RY + 44} H${LAN.x + 4} V${RY + 48} H${LAN.x - 4} V${RY + 44} H${LAN.x - 9} Z" fill="#111"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${LAN.x - 7 + i * 1.9}" y="${RY + 32}" width="1" height="4" fill="#c9a43a"/>`).join('')}
  ${label(56, RY + 16, 44, 'USB-A　USB-B')}
  <rect x="59" y="${RY + 32}" width="14" height="8" rx="0.8" fill="url(#vshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <rect x="61" y="${RY + 34}" width="10" height="2.5" fill="#1a1a1a"/>
  <path d="M85 ${RY + 30} H97 V${RY + 40} L95 ${RY + 42} H87 L85 ${RY + 40} Z" fill="url(#vshield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <rect x="88" y="${RY + 33}" width="6" height="5" fill="#1a1a1a"/>
  ${label(106, RY + 16, 38, 'COM1 / COM2')}
  ${greenBlock(106, RY + 30, 5, 7)}
  ${greenBlock(106, RY + 48, 5, 7)}
  ${video}
  ${label(PX0 - 10, RY + 16, 50, '24V DC', true)}
  <text x="${POWER[1].x}" y="${RY + 34}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#e2e5e8">+</text>
  <text x="${POWER[2].x}" y="${RY + 34}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#e2e5e8">−</text>
  <path d="M${POWER[0].x} ${RY + 27} V${RY + 30} M${POWER[0].x - 4} ${RY + 30} H${POWER[0].x + 4} M${POWER[0].x - 2.5} ${RY + 32} H${POWER[0].x + 2.5} M${POWER[0].x - 1} ${RY + 34} H${POWER[0].x + 1}" stroke="#e2e5e8" stroke-width="0.9"/>
  <rect x="${PX0 - 9}" y="${PY - 10}" width="48" height="20" rx="1.5" fill="url(#vgreen-{{uid}})" stroke="#1d6a2a" stroke-width="0.8"/>
  <line x1="${PX0 + 7.5}" y1="${PY - 10}" x2="${PX0 + 7.5}" y2="${PY + 10}" stroke="#1d6a2a" stroke-width="0.8"/>
  ${POWER.map((t) => screw(t.x, PY)).join('')}
`;

  const acc = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 19.2, maxVoltage: 28.8, conductors: [c] });

  return {
    type: `keyence.${s.model.toLowerCase()}`,
    name: 'タッチパネルディスプレイ',
    model: s.model,
    maker: 'KEYENCE',
    category: 'control',
    description:
      `KEYENCE VT5 シリーズの ${s.size} TFT カラー タッチパネル（${s.dots}、有効表示面積 ${s.sw}×${s.sh}mm）。電源は DC24V（±20%、${s.current}A 以下）で、背面の電源端子台に +/−/FG を接続する。LAN ポートで PLC（KV-8000・KV-X など）と Ethernet 接続する。` +
      (s.video ? 'X シリーズはアナログ RGB 入力・DVI-D 出力も持つ。' : '') +
      '図の下段は背面下部の端子部の概念図（端子の並びは VT5-W07 の図にそろえたもので、実機の配置とは異なる場合がある）。',
    labelPrefix: 'HMI',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'FG', label: 'FG', x: POWER[0].x, y: PY, side: 'bottom', role: 'ground' },
      { id: '24V+', label: '+', x: POWER[1].x, y: PY, side: 'bottom', role: 'input', accepts: acc('+') },
      { id: '24V-', label: '−', x: POWER[2].x, y: PY, side: 'bottom', role: 'input', accepts: acc('-') },
      { id: 'LAN', x: LAN.x, y: LAN.y, side: 'bottom', role: 'connector', connector: rj45Connector(PROTO.ethernet), optional: true },
    ],
    loadCurrent: s.current,
  };
}
