import type { DeviceDefinition } from '../types';

/**
 * KEYENCE タッチパネルディスプレイ VT5-W07（7型ワイド TFT カラー、800×480）。
 * 上段に正面図（黒いベゼル、操作画面のイメージ、前面 USB カバー、電源 LED）、
 * 下段に背面下部の端子部（LAN、USB-A/B、COM2、COM1、電源端子台）を並べて描く概念図。
 * 縮尺は 1mm ≒ 1.2px（外形 W203×H152mm → 244×182px）。
 */

const W = 280;
const H = 272;

/** 正面図の範囲 */
const FX = 18;
const FY = 6;
const FW = 244;
const FH = 182;

/** 画面（有効表示エリア 153.6×86.6mm） */
const SX = 48;
const SY = 33;
const SW = 184;
const SH = 104;

/** 背面端子部の範囲 */
const RY = 198;
const RH = 68;

/** LAN ポート（RJ45）の差込口中心 */
const LAN_X = 36;
const LAN_Y = 237;
const LAN_W = 20;

/** 電源端子台（左から FG / + / −） */
const PY = 246;
const POWER = [
  { id: 'FG', x: 226 },
  { id: '24V+', x: 241 },
  { id: '24V-', x: 256 },
];

const screw = (x: number, y: number, r = 4.6) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="1"/>`;

/** 緑のプラグイン端子台（COM1/COM2 用の小さいネジ） */
const greenBlock = (x: number, y: number, n: number, pitch: number) => {
  let s = `<rect x="${x}" y="${y}" width="${n * pitch + 2}" height="16" rx="1.5" fill="url(#green-{{uid}})" stroke="#1d6a2a" stroke-width="0.7"/>`;
  for (let i = 0; i < n; i++) {
    const cx = x + 1 + pitch / 2 + i * pitch;
    s += `<circle cx="${cx}" cy="${y + 10}" r="${pitch * 0.36}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>`;
    s += `<line x1="${cx - pitch * 0.22}" y1="${y + 10}" x2="${cx + pitch * 0.22}" y2="${y + 10}" stroke="#444" stroke-width="0.7"/>`;
  }
  return s;
};

/** 操作画面のイメージ（生産モニタ風） */
const screen = `
  <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#e9edf2"/>
  <!-- タイトルバー -->
  <rect x="${SX}" y="${SY}" width="${SW}" height="11" fill="url(#title-{{uid}})"/>
  <text x="${SX + 4}" y="${SY + 8}" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#fff">ライン1 運転モニタ</text>
  <text x="${SX + SW - 4}" y="${SY + 8}" text-anchor="end" font-family="sans-serif" font-size="6" fill="#dbe8ff">12:34</text>
  <!-- 生産数 -->
  <text x="${SX + 5}" y="${SY + 20}" font-family="sans-serif" font-size="5.5" fill="#333">生産数</text>
  <rect x="${SX + 4}" y="${SY + 22}" width="76" height="20" rx="1.5" fill="#101418" stroke="#7a8590" stroke-width="0.6"/>
  <text x="${SX + 77}" y="${SY + 37}" text-anchor="end" font-family="monospace" font-size="15" font-weight="bold" fill="#39ff6a">01234</text>
  <!-- 状態ランプ -->
  <circle cx="${SX + 14}" cy="${SY + 53}" r="5" fill="#2bd94f" stroke="#167a2b" stroke-width="0.8"/>
  <circle cx="${SX + 40}" cy="${SY + 53}" r="5" fill="#8d9298" stroke="#5c6166" stroke-width="0.8"/>
  <circle cx="${SX + 66}" cy="${SY + 53}" r="5" fill="#7a2a2a" stroke="#4a1515" stroke-width="0.8"/>
  <text x="${SX + 14}" y="${SY + 66}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#333">運転</text>
  <text x="${SX + 40}" y="${SY + 66}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#333">停止</text>
  <text x="${SX + 66}" y="${SY + 66}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#333">異常</text>
  <!-- トレンドグラフ -->
  <rect x="${SX + 88}" y="${SY + 15}" width="${SW - 92}" height="54" fill="#fff" stroke="#9aa4ae" stroke-width="0.6"/>
  <path d="M${SX + 88} ${SY + 33} H${SX + SW - 4} M${SX + 88} ${SY + 51} H${SX + SW - 4} M${SX + 118} ${SY + 15} V${SY + 69} M${SX + 148} ${SY + 15} V${SY + 69}" stroke="#dde2e7" stroke-width="0.6"/>
  <polyline points="${SX + 90},${SY + 58} ${SX + 102},${SY + 50} ${SX + 114},${SY + 54} ${SX + 126},${SY + 40} ${SX + 138},${SY + 44} ${SX + 150},${SY + 30} ${SX + 162},${SY + 34} ${SX + 176},${SY + 24}" fill="none" stroke="#1f6fe0" stroke-width="1.4"/>
  <text x="${SX + 91}" y="${SY + 22}" font-family="sans-serif" font-size="5" fill="#555">温度 [℃]</text>
  <!-- 操作ボタン -->
  ${[
    { label: '運転', c1: '#3ccf5c', c2: '#1d8a35' },
    { label: '停止', c1: '#f0574d', c2: '#b0201a' },
    { label: 'リセット', c1: '#f5c844', c2: '#b88a00' },
    { label: 'メニュー', c1: '#5b8fe8', c2: '#2a56a8' },
  ]
    .map(
      (b, i) => `
  <rect x="${SX + 4 + i * 45}" y="${SY + 76}" width="41" height="22" rx="3" fill="${b.c2}"/>
  <rect x="${SX + 5 + i * 45}" y="${SY + 77}" width="39" height="19" rx="2.5" fill="${b.c1}"/>
  <text x="${SX + 24.5 + i * 45}" y="${SY + 90}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#fff">${b.label}</text>`,
    )
    .join('')}
  <!-- 画面の映り込み -->
  <path d="M${SX} ${SY} H${SX + 70} L${SX + 30} ${SY + SH} H${SX} Z" fill="#fff" fill-opacity="0.08"/>`;

const svg = `
  <defs>
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3c3f42"/>
      <stop offset="1" stop-color="#26282a"/>
    </linearGradient>
    <linearGradient id="title-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a6fc4"/>
      <stop offset="1" stop-color="#1f4c96"/>
    </linearGradient>
    <linearGradient id="rear-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#303234"/>
      <stop offset="1" stop-color="#1e1f21"/>
    </linearGradient>
    <linearGradient id="green-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5fd27a"/>
      <stop offset="1" stop-color="#2a9a45"/>
    </linearGradient>
    <linearGradient id="shield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e8ea"/>
      <stop offset="1" stop-color="#8e9398"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </radialGradient>
  </defs>

  <!-- ===== 正面図 ===== -->
  <!-- 取付金具 -->
  <rect x="${FX + 18}" y="${FY - 4}" width="10" height="6" rx="1" fill="#9ba1a6" stroke="#555" stroke-width="0.6"/>
  <rect x="${FX + FW - 28}" y="${FY - 4}" width="10" height="6" rx="1" fill="#9ba1a6" stroke="#555" stroke-width="0.6"/>
  <rect x="${FX + 18}" y="${FY + FH - 2}" width="10" height="6" rx="1" fill="#9ba1a6" stroke="#555" stroke-width="0.6"/>
  <rect x="${FX + FW - 28}" y="${FY + FH - 2}" width="10" height="6" rx="1" fill="#9ba1a6" stroke="#555" stroke-width="0.6"/>
  <!-- ベゼル -->
  <rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="5" fill="url(#bezel-{{uid}})" stroke="#111" stroke-width="1.2"/>
  <rect x="${FX + 2}" y="${FY + 2}" width="${FW - 4}" height="${FH - 4}" rx="4" fill="none" stroke="#55595d" stroke-width="0.6"/>
  <!-- 画面枠 -->
  <rect x="${SX - 5}" y="${SY - 5}" width="${SW + 10}" height="${SH + 10}" rx="1.5" fill="#0c0d0e" stroke="#4a4d50" stroke-width="0.6"/>
  ${screen}
  <!-- 電源 LED -->
  <rect x="${FX + 13}" y="${FY + 158}" width="8" height="4" rx="0.8" fill="#49d34f" stroke="#1f6a24" stroke-width="0.5"/>
  <!-- 前面 USB カバー -->
  <rect x="${FX + 40}" y="${FY + 146}" width="88" height="26" rx="1.5" fill="#1b1c1e" stroke="#4a4d50" stroke-width="0.7"/>
  <rect x="${FX + 43}" y="${FY + 149}" width="64" height="20" rx="1" fill="#242628"/>
  <rect x="${FX + 110}" y="${FY + 149}" width="5" height="20" rx="0.8" fill="#2e3033" stroke="#4a4d50" stroke-width="0.5"/>
  <rect x="${FX + 117}" y="${FY + 149}" width="8" height="20" rx="0.8" fill="#2e3033" stroke="#4a4d50" stroke-width="0.5"/>
  <text x="${FX + FW - 10}" y="${FY + 166}" text-anchor="end" font-family="sans-serif" font-size="8" font-weight="bold" fill="#8d9297" letter-spacing="0.6">KEYENCE</text>
  <text x="${FX + FW - 10}" y="${FY + 175}" text-anchor="end" font-family="sans-serif" font-size="6" fill="#6f7479">VT5-W07</text>

  <!-- ===== 背面下部の端子部 ===== -->
  <rect x="8" y="${RY}" width="${W - 16}" height="${RH}" rx="4" fill="url(#rear-{{uid}})" stroke="#0e0f10" stroke-width="1"/>
  <text x="14" y="${RY + 9}" font-family="sans-serif" font-size="6" fill="#9aa0a6">背面 端子部</text>
  <!-- 通風スリット -->
  ${Array.from({ length: 14 }, (_, i) => `<rect x="${70 + i * 9}" y="${RY + 4}" width="3" height="8" rx="0.8" fill="#0b0c0d"/>`).join('')}

  <!-- LAN（RJ45） -->
  <rect x="${LAN_X - 15}" y="${RY + 16}" width="30" height="9" rx="1" fill="#3a3d40"/>
  <text x="${LAN_X}" y="${RY + 23}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#c9cdd1">LAN</text>
  <rect x="${LAN_X - 12}" y="${RY + 28}" width="24" height="22" rx="1" fill="url(#shield-{{uid}})" stroke="#555" stroke-width="0.7"/>
  <path d="M${LAN_X - 9} ${RY + 31} H${LAN_X + 9} V${RY + 44} H${LAN_X + 4} V${RY + 48} H${LAN_X - 4} V${RY + 44} H${LAN_X - 9} Z" fill="#111"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${LAN_X - 7 + i * 1.9}" y="${RY + 32}" width="1" height="4" fill="#c9a43a"/>`).join('')}
  <rect x="${LAN_X - 11}" y="${RY + 29}" width="4" height="2.4" fill="#ffb12e"/>
  <rect x="${LAN_X + 7}" y="${RY + 29}" width="4" height="2.4" fill="#4ad35a"/>

  <!-- USB-A / USB-B -->
  <rect x="56" y="${RY + 16}" width="44" height="9" rx="1" fill="#3a3d40"/>
  <text x="66" y="${RY + 23}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#c9cdd1">USB-A</text>
  <text x="91" y="${RY + 23}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#c9cdd1">USB-B</text>
  <rect x="59" y="${RY + 32}" width="14" height="8" rx="0.8" fill="url(#shield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <rect x="61" y="${RY + 34}" width="10" height="2.5" fill="#1a1a1a"/>
  <path d="M85 ${RY + 30} H97 V${RY + 40} L95 ${RY + 42} H87 L85 ${RY + 40} Z" fill="url(#shield-{{uid}})" stroke="#555" stroke-width="0.6"/>
  <rect x="88" y="${RY + 33}" width="6" height="5" fill="#1a1a1a"/>

  <!-- COM2（RS-422/485）・COM1（RS-232C） -->
  <rect x="106" y="${RY + 16}" width="58" height="9" rx="1" fill="#3a3d40"/>
  <text x="135" y="${RY + 23}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#c9cdd1">COM2</text>
  ${greenBlock(106, RY + 30, 8, 7)}
  <rect x="170" y="${RY + 16}" width="37" height="9" rx="1" fill="#3a3d40"/>
  <text x="188.5" y="${RY + 23}" text-anchor="middle" font-family="sans-serif" font-size="5.5" fill="#c9cdd1">COM1</text>
  ${greenBlock(170, RY + 30, 5, 7)}

  <!-- 電源端子台（24V DC） -->
  <rect x="216" y="${RY + 16}" width="50" height="9" rx="1" fill="#3a3d40"/>
  <text x="248.5" y="${RY + 23}" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#e2e5e8">24V DC</text>
  <text x="241" y="${RY + 34}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#e2e5e8">+</text>
  <text x="256" y="${RY + 34}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#e2e5e8">−</text>
  <path d="M226 ${RY + 27} V${RY + 30} M222 ${RY + 30} H230 M223.5 ${RY + 32} H228.5 M225 ${RY + 34} H227" stroke="#e2e5e8" stroke-width="0.9"/>
  <rect x="217" y="${PY - 10}" width="48" height="20" rx="1.5" fill="url(#green-{{uid}})" stroke="#1d6a2a" stroke-width="0.8"/>
  <line x1="233.5" y1="${PY - 10}" x2="233.5" y2="${PY + 10}" stroke="#1d6a2a" stroke-width="0.8"/>
  ${POWER.map((t) => screw(t.x, PY)).join('')}
`;

const def: DeviceDefinition = {
  type: 'keyence.vt5-w07',
  name: 'タッチパネルディスプレイ',
  model: 'VT5-W07',
  maker: 'KEYENCE',
  category: 'control',
  description:
    'KEYENCE VT5 シリーズの 7型ワイド TFT カラー タッチパネル（800×480）。電源は DC24V（±20%、0.9A 以下）で、背面の電源端子台に +/−/FG を接続する。LAN ポートで PLC（KV-8000 など）と Ethernet 接続する。図の下段は背面下部の端子部。',
  labelPrefix: 'HMI',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'FG', label: 'FG', hint: '機能接地', x: POWER[0].x, y: PY, side: 'bottom', role: 'ground' },
    {
      id: '24V+',
      label: '+',
      x: POWER[1].x,
      y: PY,
      side: 'bottom',
      role: 'input',
      accepts: { system: 'DC', minVoltage: 19.2, maxVoltage: 28.8, conductors: ['+'] },
    },
    {
      id: '24V-',
      label: '−',
      x: POWER[2].x,
      y: PY,
      side: 'bottom',
      role: 'input',
      accepts: { system: 'DC', minVoltage: 19.2, maxVoltage: 28.8, conductors: ['-'] },
    },
    {
      id: 'LAN',
      x: LAN_X,
      y: LAN_Y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: 'RJ45', pins: 0, width: LAN_W, protocols: ['ethernet'] },
      optional: true,
    },
  ],
  // 消費電流 900mA 以下（銘板 POWER INPUT: 24V 0.9A）
  loadCurrent: 0.9,
};

export default def;
