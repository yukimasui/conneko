import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 サーキットプロテクタ CP30-BA 2P（2極品）。
 * 外形 W35 × H73 mm（1mm = 2px）。主端子ネジは左端から 9.5mm、極間ピッチ 17.5mm、上下間隔 54mm。
 * 本体はライトグレー、2極共通の赤いハンドルに白で「ON / I」表示。
 * 端子記号は電源側 1/3、負荷側 2/4 とする。
 */

const W = 70;
const H = 146;
/** 各極の端子ネジの X 座標（左端から 9.5mm、極間ピッチ 17.5mm） */
const POLES = [
  { line: '1', load: '2', x: 19 },
  { line: '3', load: '4', x: 54 },
];
/** 電源側・負荷側の端子ネジの Y 座標（上下間隔 54mm） */
const TY_LINE = 19;
const TY_LOAD = 127;

/** 端子ネジ（線押え付き +- 溝のなべねじ M4） */
const screw = (x: number, y: number) => `
  <rect x="${x - 7.5}" y="${y - 7.5}" width="15" height="15" rx="1.2" fill="url(#washer-{{uid}})" stroke="#6d6d6d" stroke-width="0.6"/>
  <circle cx="${x}" cy="${y}" r="5.8" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - 3.8} ${y} H${x + 3.8} M${x} ${y - 3.8} V${y + 3.8}" stroke="#4a4a4a" stroke-width="1.4" stroke-linecap="round"/>`;

/** 端子部（開閉式小形端子カバーの窓と端子ネジ、極間の仕切り） */
const terminalBlock = (y0: number, ty: number) => `
  <rect x="2" y="${y0}" width="${W - 4}" height="36" fill="url(#term-{{uid}})"/>
  ${POLES.map(
    (p) => `
  <rect x="${p.x - 10}" y="${ty - 10}" width="20" height="20" rx="1.5" fill="#3b3b3b"/>
  ${screw(p.x, ty)}`,
  ).join('')}
  <rect x="34.5" y="${y0 + 2}" width="1.5" height="32" fill="#c4c3bc"/>`;

const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dcdbd6"/>
      <stop offset="0.5" stop-color="#eeede9"/>
      <stop offset="1" stop-color="#d4d3ce"/>
    </linearGradient>
    <linearGradient id="term-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e5e0"/>
      <stop offset="1" stop-color="#d5d4ce"/>
    </linearGradient>
    <linearGradient id="handle-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8434b"/>
      <stop offset="1" stop-color="#b3121c"/>
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
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="2.5" fill="url(#body-{{uid}})" stroke="#8b8a84" stroke-width="1.2"/>
  ${terminalBlock(1, TY_LINE)}
  ${terminalBlock(H - 37, TY_LOAD)}
  <!-- 取付穴（φ4.5 の切欠き） -->
  <path d="M1 ${TY_LINE - 4.5} A4.5 4.5 0 0 1 1 ${TY_LINE + 4.5}" fill="#f4f6f8" stroke="#8b8a84" stroke-width="0.8"/>
  <path d="M${W - 1} ${TY_LOAD - 4.5} A4.5 4.5 0 0 0 ${W - 1} ${TY_LOAD + 4.5}" fill="#f4f6f8" stroke="#8b8a84" stroke-width="0.8"/>
  <!-- 端子記号 -->
  ${POLES.map(
    (p) => `
  <text x="${p.x - 15}" y="35" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#333">${p.line}</text>
  <text x="${p.x - 15}" y="${H - 21}" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#333">${p.load}</text>`,
  ).join('')}
  <!-- 前面カバー -->
  <rect x="2.5" y="38" width="${W - 5}" height="70" rx="1.5" fill="#efeeea" stroke="#a9a8a1" stroke-width="0.8"/>
  <path d="M4 41.5 H${W - 4} M4 44.5 H${W - 4} M4 47.5 H${W - 4}" stroke="#c4c3bc" stroke-width="0.8"/>
  <path d="M${W / 2} 49 V51 M${W / 2} 79 V83" stroke="#c4c3bc" stroke-width="0.8"/>
  <!-- ハンドル（ON 位置、2極共通） -->
  <rect x="16" y="51" width="38" height="26" rx="1.5" fill="#d3d2cc" stroke="#9e9d96" stroke-width="0.6"/>
  <path d="M17 52 H53 V71 L49.5 75 H17 Z" fill="url(#handle-{{uid}})" stroke="#8c0f16" stroke-width="0.6"/>
  <text x="${W / 2}" y="63" text-anchor="middle" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#fff" letter-spacing="1">ON</text>
  <text x="${W / 2}" y="71.5" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#fff">I</text>
  <path d="M3.5 79 H${W - 3.5}" stroke="#b9b8b1" stroke-width="0.8"/>
  <!-- 銘板 -->
  <text x="${W / 2}" y="91" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#444">CP30-BA</text>
  <text x="20" y="98" font-family="sans-serif" font-size="3.4" fill="#666">AC</text>
  <text x="20" y="102.5" font-family="sans-serif" font-size="3.4" fill="#666">DC</text>
  <text x="50" y="102" text-anchor="end" font-family="sans-serif" font-size="6" fill="#444">5A M</text>
`;

const def: DeviceDefinition = {
  type: 'mitsubishi.cp30-ba.2p',
  name: 'サーキットプロテクタ',
  model: 'CP30-BA 2P',
  maker: '三菱電機',
  category: 'breaker',
  description:
    '三菱電機のサーキットプロテクタ CP30-BA 2極品（横幅35mm）。単相AC200V/100V の制御電源やDC回路の両極を同時に開閉・保護する。上側が電源側（1/3）、下側が負荷側（2/4）。',
  labelPrefix: 'CP',
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
      options: [0.1, 0.25, 0.3, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 30].map((v) => ({ value: v, label: `${v}A` })),
      default: 5,
    },
    {
      // 動作特性（表示用。電気チェックには使わない）
      key: 'characteristic',
      label: '動作特性',
      options: [
        { value: 'I', label: 'I 瞬時形' },
        { value: 'M', label: 'M 中速形' },
        { value: 'S', label: 'S 低速形' },
        { value: 'F', label: 'F 高速形' },
      ],
      default: 'M',
    },
  ],
  protectionCurrent: { param: 'ratedCurrent' },
};

export default def;
