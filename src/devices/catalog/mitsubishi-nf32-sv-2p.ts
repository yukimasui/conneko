import type { DeviceDefinition, ParamValues } from '../types';
import { poleHint } from '../mitsubishi/pole-hint';

/**
 * 三菱電機 ノーヒューズ遮断器（配線用遮断器）NF32-SV 2P（WS-Vシリーズ 汎用品）。
 * 外形 W50 × H130 mm（1mm = 2px）。極間ピッチ 25mm、主端子ネジの上下間隔 112mm。
 * 外形図に合わせてハンドルは左寄り、トリップボタンは右側に配置。
 * 端子記号は一次側（LINE）1/3、二次側（LOAD）2/4。
 */

const W = 100;
const H = 260;
/** 各極の端子ネジの X 座標（極間ピッチ 25mm） */
const POLES = [
  { line: '1', load: '2', x: 25 },
  { line: '3', load: '4', x: 75 },
];
/** 一次側・二次側の端子ネジの Y 座標（上下間隔 112mm） */
const TY_LINE = 18;
const TY_LOAD = 242;

/** 端子ネジ（座金付き +- 溝のなべねじ） */
const screw = (x: number, y: number) => `
  <rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="1.5" fill="url(#washer-{{uid}})" stroke="#6d6d6d" stroke-width="0.7"/>
  <circle cx="${x}" cy="${y}" r="7" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.8"/>
  <path d="M${x - 4.5} ${y} H${x + 4.5} M${x} ${y - 4.5} V${y + 4.5}" stroke="#4a4a4a" stroke-width="1.6" stroke-linecap="round"/>`;

/** 端子部（一次側/二次側）。各極の端子カバーの窓とバリアを描く */
const terminalBlock = (y0: number, ty: number) => `
  <rect x="2" y="${y0}" width="${W - 4}" height="40" fill="url(#term-{{uid}})"/>
  ${POLES.map(
    (p) => `
  <rect x="${p.x - 12}" y="${ty - 12}" width="24" height="24" rx="2" fill="#3b3b3b"/>
  ${screw(p.x, ty)}`,
  ).join('')}
  <rect x="48" y="${y0 + 2}" width="4" height="36" rx="1" fill="#d2cec5" stroke="#aaa59b" stroke-width="0.6"/>`;

/** XML として安全な文字列にする（パラメータ値を SVG に埋め込む用） */
const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 文字列が最大幅[px]に収まるフォントサイズ（文字幅は 1文字 ≒ ratio×フォントサイズ で概算） */
const fitSize = (text: string, maxWidth: number, base: number, ratio = 0.62) =>
  Math.min(base, +(maxWidth / (text.length * ratio)).toFixed(2));

/** 定格表示などはパラメータに連動させる */
const svg = (p: ParamValues) => {
  const rating = `${esc(p.ratedCurrent)}A`;
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dedad2"/>
      <stop offset="0.5" stop-color="#ece9e2"/>
      <stop offset="1" stop-color="#d6d2c9"/>
    </linearGradient>
    <linearGradient id="face-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f1ec"/>
      <stop offset="1" stop-color="#e2dfd7"/>
    </linearGradient>
    <linearGradient id="term-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e4e0d8"/>
      <stop offset="1" stop-color="#d3cfc6"/>
    </linearGradient>
    <linearGradient id="handle-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1c1c"/>
      <stop offset="0.45" stop-color="#3d3d3d"/>
      <stop offset="1" stop-color="#151515"/>
    </linearGradient>
    <linearGradient id="washer-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6e6e6"/>
      <stop offset="1" stop-color="#9c9c9c"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#fafafa"/>
      <stop offset="1" stop-color="#8f8f8f"/>
    </radialGradient>
  </defs>
  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#body-{{uid}})" stroke="#8d897f" stroke-width="1.5"/>
  ${terminalBlock(0, TY_LINE)}
  ${terminalBlock(H - 40, TY_LOAD)}
  <!-- 端子記号 -->
  ${POLES.map(
    (p) => `
  <text x="${p.x - 13}" y="40" font-family="sans-serif" font-size="8" font-weight="bold" fill="#333">${p.line}</text>
  <text x="${p.x - 13}" y="${H - 34}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#333">${p.load}</text>`,
  ).join('')}
  <text x="${W - 8}" y="40" text-anchor="end" font-family="sans-serif" font-size="7" fill="#555">LINE</text>
  <text x="${W - 8}" y="${H - 34}" text-anchor="end" font-family="sans-serif" font-size="7" fill="#555">LOAD</text>
  <!-- 前面カバー（銘板・ハンドル部） -->
  <rect x="6" y="46" width="${W - 12}" height="168" rx="4" fill="url(#face-{{uid}})" stroke="#a7a399" stroke-width="1"/>
  <!-- 左寄りのハンドル枠 -->
  <rect x="9" y="47" width="38" height="166" fill="#e7e4dc" stroke="#b3afa5" stroke-width="0.8"/>
  <rect x="12" y="66" width="32" height="88" rx="3" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <rect x="16" y="70" width="24" height="80" rx="2" fill="#2a2a2a"/>
  <!-- ハンドル（ON 位置）。下側に赤の ON 表示が見える -->
  <rect x="17" y="71" width="22" height="42" rx="2" fill="url(#handle-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <path d="M20 76 H36 M20 80 H36 M20 84 H36" stroke="#5a5a5a" stroke-width="0.9"/>
  <rect x="17" y="116" width="22" height="32" rx="1.5" fill="#d7262e"/>
  <text x="28" y="128" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#fff">I</text>
  <text x="28" y="140" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#fff">ON</text>
  <text x="28" y="62" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#666">ON ▲</text>
  <text x="28" y="162" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#666">OFF ▼</text>
  <g stroke="#b3afa5" stroke-width="0.8">
    <path d="M14 180 H42 M14 186 H38 M14 192 H42"/>
  </g>
  <!-- 右側: 三菱マークと型式 -->
  <g transform="translate(56 59)" fill="#e60012">
    <path d="M0 -6 L2 -2.5 L0 1 L-2 -2.5 Z"/>
    <path d="M0 1 L4 1 L6 4.5 L2 4.5 Z"/>
    <path d="M0 1 L-4 1 L-6 4.5 L-2 4.5 Z"/>
  </g>
  <text x="63" y="58" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="63" y="63" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#333">ELECTRIC</text>
  <text x="51" y="74" font-family="sans-serif" font-size="4.2" fill="#555">NO-FUSE</text>
  <text x="51" y="79" font-family="sans-serif" font-size="4.2" fill="#555">BREAKER</text>
  <text x="51" y="86" font-family="sans-serif" font-size="4.2" fill="#555">MODEL</text>
  <text x="51" y="96" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#222">NF32-SV</text>
  <!-- トリップボタン -->
  <rect x="52" y="104" width="28" height="9" rx="4.5" fill="#e0262c" stroke="#9e1218" stroke-width="0.7"/>
  <text x="51" y="121" font-family="sans-serif" font-size="4.2" fill="#555">PUSH TO TRIP</text>
  <!-- 定格表示 -->
  <rect x="51" y="128" width="38" height="34" rx="2" fill="#fbfaf7" stroke="#777" stroke-width="0.8"/>
  <text x="54" y="135" font-family="sans-serif" font-size="4.2" fill="#555">JET</text>
  <text x="70" y="154" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(rating, 34, 15)}" font-weight="bold" fill="#222">${rating}</text>
  <text x="51" y="172" font-family="sans-serif" font-size="4.2" fill="#555">POLE 2P 50/60Hz</text>
  <g stroke="#a4a096" stroke-width="0.8">
    <path d="M51 179 H89 M51 185 H83 M51 191 H89 M51 197 H80"/>
  </g>
  <text x="51" y="207" font-family="sans-serif" font-size="4.2" fill="#666">MADE IN JAPAN</text>
`;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.nf32-sv.2p',
  name: 'ノーヒューズ遮断器',
  model: 'NF32-SV 2P',
  maker: '三菱電機',
  category: 'breaker',
  description:
    '三菱電機 WS-Vシリーズの配線用遮断器（MCCB）32Aフレーム 2極。単相回路や直流回路の過電流・短絡保護に使う。上側が電源側（1/3）、下側が負荷側（2/4）。',
  labelPrefix: 'MCCB',
  width: W,
  height: H,
  svg,
  terminals: [
    ...POLES.map((p, i) => ({ id: p.line, hint: poleHint(POLES.length, i, '一次'), x: p.x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
    ...POLES.map((p, i) => ({ id: p.load, hint: poleHint(POLES.length, i, '二次'), x: p.x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
  ],
  links: POLES.map((p) => ({ from: p.line, to: p.load, directed: true, protects: true })),
  params: [
    {
      key: 'ratedCurrent',
      label: '定格電流',
      unit: 'A',
      options: [3, 5, 10, 15, 20, 30, 32].map((v) => ({ value: v, label: `${v}A` })),
      default: 20,
    },
  ],
  protectionCurrent: { param: 'ratedCurrent' },
};

export default def;
