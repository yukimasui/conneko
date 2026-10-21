import type { DeviceDefinition, ParamValues } from '../types';

/**
 * 三菱電機 漏電遮断器 NV32-SV 3P（WS-Vシリーズ 汎用品）。
 * 外形 W75 × H130 mm（1mm = 2px）。極間ピッチ 25mm、主端子ネジの上下間隔 112mm。
 * 端子記号は実機の印字に合わせ、一次側（LINE）1/3/5、二次側（LOAD）2/4/6。
 * ハンドル右側にテストボタン・漏電表示ボタン、左下にトリップボタンがある。
 */

const W = 150;
const H = 260;
/** 各極の端子ネジの X 座標（極間ピッチ 25mm） */
const POLES = [
  { line: '1', load: '2', x: 25 },
  { line: '3', load: '4', x: 75 },
  { line: '5', load: '6', x: 125 },
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
  <rect x="48" y="${y0 + 2}" width="4" height="36" rx="1" fill="#d2cec5" stroke="#aaa59b" stroke-width="0.6"/>
  <rect x="98" y="${y0 + 2}" width="4" height="36" rx="1" fill="#d2cec5" stroke="#aaa59b" stroke-width="0.6"/>`;

/** XML として安全な文字列にする（パラメータ値を SVG に埋め込む用） */
const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 文字列が最大幅[px]に収まるフォントサイズ（文字幅は 1文字 ≒ ratio×フォントサイズ で概算） */
const fitSize = (text: string, maxWidth: number, base: number, ratio = 0.62) =>
  Math.min(base, +(maxWidth / (text.length * ratio)).toFixed(2));

/** 定格表示などはパラメータに連動させる */
const svg = (p: ParamValues) => {
  const rating = `${esc(p.ratedCurrent)}A`;
  const sens = `${esc(p.sensitivity)}mA`;
  // 15/30mA は高速形（動作時間 0.1s 以内）
  const sensSpec = typeof p.sensitivity === 'number' && p.sensitivity <= 30 ? `IΔn ${sens} 0.1s` : `IΔn ${sens}`;
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
    <radialGradient id="test-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#f4f4f2"/>
      <stop offset="1" stop-color="#8e8e8a"/>
    </radialGradient>
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
  <!-- 中央のハンドル枠 -->
  <rect x="53" y="47" width="44" height="166" fill="#e7e4dc" stroke="#b3afa5" stroke-width="0.8"/>
  <rect x="59" y="66" width="32" height="88" rx="3" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <rect x="63" y="70" width="24" height="80" rx="2" fill="#2a2a2a"/>
  <!-- ハンドル（ON 位置）。下側に赤の ON 表示が見える -->
  <rect x="64" y="71" width="22" height="42" rx="2" fill="url(#handle-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <path d="M67 76 H83 M67 80 H83 M67 84 H83" stroke="#5a5a5a" stroke-width="0.9"/>
  <rect x="64" y="116" width="22" height="32" rx="1.5" fill="#d7262e"/>
  <text x="75" y="128" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#fff">I</text>
  <text x="75" y="140" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#fff">ON</text>
  <text x="75" y="62" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#666">ON ▲</text>
  <text x="75" y="162" text-anchor="middle" font-family="sans-serif" font-size="5" fill="#666">OFF ▼</text>
  <!-- 左側: 三菱マークと型式 -->
  <g transform="translate(17 60)" fill="#e60012">
    <path d="M0 -7 L2.3 -3 L0 1 L-2.3 -3 Z"/>
    <path d="M0 1 L4.6 1 L6.9 5 L2.3 5 Z"/>
    <path d="M0 1 L-4.6 1 L-6.9 5 L-2.3 5 Z"/>
  </g>
  <text x="25" y="58" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">MITSUBISHI</text>
  <text x="25" y="64" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#333">ELECTRIC</text>
  <text x="11" y="76" font-family="sans-serif" font-size="4.2" fill="#555">EARTH-LEAKAGE</text>
  <text x="11" y="81" font-family="sans-serif" font-size="4.2" fill="#555">CIRCUIT BREAKER</text>
  <text x="11" y="88" font-family="sans-serif" font-size="4.2" fill="#555">MODEL</text>
  <text x="11" y="98" font-family="sans-serif" font-size="9" font-weight="bold" fill="#222">NV32-SV</text>
  <!-- トリップボタン -->
  <rect x="12" y="118" width="30" height="10" rx="5" fill="#e0262c" stroke="#9e1218" stroke-width="0.7"/>
  <text x="11" y="137" font-family="sans-serif" font-size="4.4" fill="#555">PUSH TO TRIP</text>
  <!-- 定格表示（定格電流・定格感度電流） -->
  <rect x="10" y="148" width="40" height="42" rx="2" fill="#fbfaf7" stroke="#777" stroke-width="0.8"/>
  <text x="13" y="155" font-family="sans-serif" font-size="4.2" fill="#555">JET</text>
  <text x="30" y="172" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(rating, 36, 15)}" font-weight="bold" fill="#222">${rating}</text>
  <text x="30" y="185" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(sens, 36, 6)}" font-weight="bold" fill="#222">${sens}</text>
  <text x="11" y="206" font-family="sans-serif" font-size="4.2" fill="#666">MADE IN JAPAN</text>
  <!-- 右側: テストボタン -->
  <circle cx="119" cy="70" r="9.5" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <circle cx="119" cy="70" r="7.5" fill="url(#test-{{uid}})" stroke="#6f6f6a" stroke-width="0.8"/>
  <text x="104" y="89" font-family="sans-serif" font-size="7" font-weight="bold" fill="#333">T</text>
  <text x="111" y="87" font-family="sans-serif" font-size="4.2" fill="#555">TEST</text>
  <text x="111" y="92" font-family="sans-serif" font-size="4.2" fill="#555">BUTTON</text>
  <!-- 右側: 漏電表示ボタン -->
  <circle cx="119" cy="106" r="6" fill="#c9c5bb" stroke="#9b978d" stroke-width="0.8"/>
  <circle cx="119" cy="106" r="4.2" fill="#f7f7f2" stroke="#7a7a74" stroke-width="0.8"/>
  <text x="102" y="120" font-family="sans-serif" font-size="4.2" fill="#555">LEAKAGE</text>
  <text x="102" y="125" font-family="sans-serif" font-size="4.2" fill="#555">INDICATOR</text>
  <!-- 右側: 仕様 -->
  <text x="102" y="139" font-family="sans-serif" font-size="4.4" fill="#555">POLE 3P 50/60Hz</text>
  <text x="102" y="146" font-family="sans-serif" font-size="4.4" fill="#555">Ue 100-440V</text>
  <text x="102" y="153" font-family="sans-serif" font-size="${fitSize(sensSpec, 38, 4.4, 0.55)}" fill="#555">${sensSpec}</text>
  <g stroke="#a4a096" stroke-width="0.8">
    <path d="M102 160 H138 M102 166 H132 M102 172 H138 M102 178 H130 M102 184 H136"/>
  </g>
  <rect x="117" y="190" width="18" height="18" rx="9" fill="none" stroke="#777" stroke-width="0.9"/>
  <text x="126" y="202" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#666">CCC</text>
`;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.nv32-sv.3p',
  name: '漏電遮断器',
  model: 'NV32-SV 3P',
  maker: '三菱電機',
  category: 'breaker',
  description:
    '三菱電機 WS-Vシリーズの漏電遮断器（ELB）32Aフレーム 3極。過電流・短絡に加えて地絡（漏電）も検出して遮断する。主幹や機器ごとの感電・火災防止に使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。',
  labelPrefix: 'ELB',
  width: W,
  height: H,
  svg,
  terminals: [
    ...POLES.map((p) => ({ id: p.line, x: p.x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
    ...POLES.map((p) => ({ id: p.load, x: p.x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
  ],
  links: POLES.map((p) => ({ from: p.line, to: p.load, directed: true, protects: true })),
  params: [
    {
      key: 'ratedCurrent',
      label: '定格電流',
      unit: 'A',
      options: [5, 10, 15, 20, 30, 32].map((v) => ({ value: v, label: `${v}A` })),
      default: 20,
    },
    {
      // 定格感度電流（表示用。電気チェックには使わない）
      key: 'sensitivity',
      label: '定格感度電流',
      unit: 'mA',
      options: [
        { value: 15, label: '15mA' },
        { value: 30, label: '30mA' },
        { value: '100/200/500', label: '100/200/500mA 切換' },
      ],
      default: 30,
    },
  ],
  protectionCurrent: { param: 'ratedCurrent' },
};

export default def;
