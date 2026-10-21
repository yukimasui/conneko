import type { DeviceDefinition, ParamValues } from '../types';

/**
 * 三菱電機 サーキットプロテクタ CP30-BA 1P（1極品）。
 * 外形 W17.5 × H73 mm（1mm = 2px）。主端子ネジは左端から 9.5mm、上下間隔 54mm。
 * 本体はライトグレー、赤いハンドルに白で「ON / I」表示。
 * 端子記号は電源側 1、負荷側 2 とする。
 */

const W = 35;
const H = 146;
/** 端子ネジの X 座標（左端から 9.5mm） */
const TX = 19;
/** 電源側・負荷側の端子ネジの Y 座標（上下間隔 54mm） */
const TY_LINE = 19;
const TY_LOAD = 127;

/** 端子ネジ（線押え付き +- 溝のなべねじ M4） */
const screw = (x: number, y: number) => `
  <rect x="${x - 7.5}" y="${y - 7.5}" width="15" height="15" rx="1.2" fill="url(#washer-{{uid}})" stroke="#6d6d6d" stroke-width="0.6"/>
  <circle cx="${x}" cy="${y}" r="5.8" fill="url(#screw-{{uid}})" stroke="#5a5a5a" stroke-width="0.7"/>
  <path d="M${x - 3.8} ${y} H${x + 3.8} M${x} ${y - 3.8} V${y + 3.8}" stroke="#4a4a4a" stroke-width="1.4" stroke-linecap="round"/>`;

/** 端子部（開閉式小形端子カバーの窓と端子ネジ） */
const terminalBlock = (y0: number, ty: number) => `
  <rect x="2" y="${y0}" width="${W - 4}" height="36" fill="url(#term-{{uid}})"/>
  <rect x="${TX - 10}" y="${ty - 10}" width="20" height="20" rx="1.5" fill="#3b3b3b"/>
  ${screw(TX, ty)}`;

/** XML として安全な文字列にする（パラメータ値を SVG に埋め込む用） */
const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 文字列が最大幅[px]に収まるフォントサイズ（文字幅は 1文字 ≒ ratio×フォントサイズ で概算） */
const fitSize = (text: string, maxWidth: number, base: number, ratio = 0.62) =>
  Math.min(base, +(maxWidth / (text.length * ratio)).toFixed(2));

/** 定格表示などはパラメータに連動させる */
const svg = (p: ParamValues) => {
  const rating = `${esc(p.ratedCurrent)}A ${esc(p.characteristic)}`;
  return `
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
  <text x="4" y="35" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#333">1</text>
  <text x="4" y="${H - 21}" font-family="sans-serif" font-size="6.5" font-weight="bold" fill="#333">2</text>
  <!-- 前面カバー -->
  <rect x="2.5" y="38" width="${W - 5}" height="70" rx="1.5" fill="#efeeea" stroke="#a9a8a1" stroke-width="0.8"/>
  <path d="M4 41.5 H${W - 4} M4 44.5 H${W - 4} M4 47.5 H${W - 4}" stroke="#c4c3bc" stroke-width="0.8"/>
  <!-- ハンドル（ON 位置） -->
  <rect x="3.5" y="51" width="${W - 7}" height="26" rx="1.5" fill="#d3d2cc" stroke="#9e9d96" stroke-width="0.6"/>
  <path d="M4.5 52 H${W - 4.5} V71 L${W - 8} 75 H4.5 Z" fill="url(#handle-{{uid}})" stroke="#8c0f16" stroke-width="0.6"/>
  <text x="${W / 2}" y="63" text-anchor="middle" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#fff" letter-spacing="1">ON</text>
  <text x="${W / 2}" y="71.5" text-anchor="middle" font-family="sans-serif" font-size="5.5" font-weight="bold" fill="#fff">I</text>
  <path d="M3.5 79 H${W - 3.5}" stroke="#b9b8b1" stroke-width="0.8"/>
  <!-- 銘板 -->
  <text x="${W / 2}" y="91" text-anchor="middle" font-family="sans-serif" font-size="5.6" font-weight="bold" fill="#444">CP30-BA</text>
  <text x="5" y="98" font-family="sans-serif" font-size="3.4" fill="#666">AC</text>
  <text x="5" y="102.5" font-family="sans-serif" font-size="3.4" fill="#666">DC</text>
  <text x="${W - 4}" y="102" text-anchor="end" font-family="sans-serif" font-size="${fitSize(rating, 20, 6, 0.58)}" fill="#444">${rating}</text>
`;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.cp30-ba.1p',
  name: 'サーキットプロテクタ',
  model: 'CP30-BA 1P',
  maker: '三菱電機',
  category: 'breaker',
  description:
    '三菱電機のサーキットプロテクタ CP30-BA 1極品（横幅17.5mm、AC/DC共用）。制御回路やDC24V回路などの分岐保護に使う。上側が電源側（1）、下側が負荷側（2）。',
  labelPrefix: 'CP',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1', x: TX, y: TY_LINE, side: 'top', role: 'line' },
    { id: '2', x: TX, y: TY_LOAD, side: 'bottom', role: 'load' },
  ],
  links: [{ from: '1', to: '2', directed: true, protects: true }],
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
