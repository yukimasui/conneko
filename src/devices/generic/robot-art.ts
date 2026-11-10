/**
 * 産業用ロボットの絵（横から見た姿）を描くための共通の描画部品。
 *
 * メーカーをまたいで使う、塗装の陰影（円筒・丸いふた）・ボルトの頭・付け根の陰・光沢・鋼の部品のグラデーションを置く。
 * 形（腕の長さ・カバーの形・ロゴ）は機器ごとに catalog/ の各ファイルで描く。
 * id はすべて `${p}-…-{{uid}}` の形（p は機器ごとの接頭辞）にして、同じ画面に複数のロボットを置いても重ならないようにする。
 */

/** 数値を SVG 用に丸める */
const r1 = (v: number) => Math.round(v * 10) / 10;

/** 塗装の色（明・基本・暗・縁） */
export interface Paint {
  light: string;
  base: string;
  dark: string;
  edge: string;
}

/**
 * グラデーションの定義（<defs> の中に入れる）。
 * - `${p}-h`・`${p}-v`: 円筒・丸みのある面の陰影（横向き・縦向き）
 * - `${p}-cap`: 軸の丸いふた、`${p}-ao`: 付け根の陰、`${p}-bolt`: ボルトの頭
 * - `${p}-steel`・`${p}-steel-h`: 鋼の部品（フランジ・継手）、`${p}-dark`: 黒い樹脂・コネクターパネル、`${p}-gloss`: 光沢の帯
 */
export function robotDefs(p: string, c: Paint): string {
  const cyl = (id: string, x2: number, y2: number) => `
    <linearGradient id="${p}-${id}-{{uid}}" x1="0" y1="0" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="${c.dark}"/>
      <stop offset="0.17" stop-color="${c.base}"/>
      <stop offset="0.35" stop-color="${c.light}"/>
      <stop offset="0.5" stop-color="${c.base}"/>
      <stop offset="0.85" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </linearGradient>`;
  return `
    ${cyl('h', 1, 0)}
    ${cyl('v', 0, 1)}
    <radialGradient id="${p}-cap-{{uid}}" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stop-color="${c.light}"/>
      <stop offset="0.55" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </radialGradient>
    <radialGradient id="${p}-ao-{{uid}}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.7" stop-color="#000" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}-bolt-{{uid}}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="1" stop-color="#7d8288"/>
    </radialGradient>
    <linearGradient id="${p}-steel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d9298"/>
      <stop offset="0.4" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#767b81"/>
    </linearGradient>
    <linearGradient id="${p}-steel-h-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7c8187"/>
      <stop offset="0.35" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="${p}-dark-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55595f"/>
      <stop offset="1" stop-color="#202326"/>
    </linearGradient>
    <linearGradient id="${p}-gloss-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>`;
}

/** 六角穴付きボルトの頭 */
export const bolt = (p: string, x: number, y: number, r = 1.5) =>
  `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="url(#${p}-bolt-{{uid}})" stroke="#00000059" stroke-width="0.35"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 0.45)}" fill="#2a2a2a" opacity="0.75"/>`;

/** 円周上に並べたボルト */
export const boltRing = (p: string, cx: number, cy: number, r: number, n: number, start = 0, br = 1.3) =>
  Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return bolt(p, cx + r * Math.cos(a), cy + r * Math.sin(a), br);
  }).join('');

/**
 * 軸の丸いふた（モーター・減速機のカバー）。付け根の陰・外周の段・ボルトの輪・中央の小さいふた・光沢の弧を重ねる。
 * r は外周の半径、bolts はボルトの数（0 で描かない）。
 */
export function jointCap(p: string, c: Paint, cx: number, cy: number, r: number, bolts = 8, opts: { inner?: number; boltR?: number } = {}): string {
  const inner = opts.inner ?? r * 0.42;
  const br = opts.boltR ?? (r > 20 ? 1.4 : 1.15);
  return `
  <circle cx="${cx}" cy="${cy}" r="${r1(r * 1.2)}" fill="url(#${p}-ao-{{uid}})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <circle cx="${cx}" cy="${cy}" r="${r1(r * 0.78)}" fill="none" stroke="${c.edge}" stroke-width="0.55" opacity="0.6"/>
  ${inner > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r1(inner)}" fill="url(#${p}-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.5" opacity="0.9"/>` : ''}
  ${bolts ? boltRing(p, cx, cy, r * 0.89, bolts, Math.PI / bolts, br) : ''}
  <path d="M${r1(cx - r * 0.58)} ${r1(cy - r * 0.6)} A${r1(r * 0.84)} ${r1(r * 0.84)} 0 0 1 ${r1(cx + r * 0.3)} ${r1(cy - r * 0.8)}" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.45" stroke-linecap="round"/>`;
}

/** 銘板（小さな金属の板に刻印の線） */
export const namePlate = (p: string, x: number, y: number, w = 20, h = 8) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.8" fill="url(#${p}-steel-{{uid}})" stroke="#6b7076" stroke-width="0.4"/>
  <path d="M${x + 3} ${y + 3} H${x + w - 3} M${x + 3} ${y + 5.5} H${x + w - 7}" stroke="#5a5f65" stroke-width="0.5"/>`;

/** 注意ラベル（黄色の三角に !） */
export const cautionLabel = (x: number, y: number, s = 10) => `
  <path d="M${x - s / 2} ${y} L${x} ${y - s * 0.9} L${x + s / 2} ${y} Z" fill="#ffd400" stroke="#111" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M${x} ${r1(y - s * 0.6)} V${r1(y - s * 0.28)}" stroke="#111" stroke-width="0.9" stroke-linecap="round"/><circle cx="${x}" cy="${r1(y - s * 0.14)}" r="0.5" fill="#111"/>`;

/** ロボットの腕の中を通るエアの配管の、ねじポート（横向き、継手の付く口） */
export const airPortSide = (p: string, x: number, y: number) => `
  <rect x="${x + 2}" y="${y - 2.8}" width="10" height="5.6" rx="0.8" fill="#2c2f33" stroke="#0e0f10" stroke-width="0.45"/>
  <path d="M${x + 10} ${y - 3.6} h4 v7.2 h-4 z" fill="url(#${p}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>`;

/** 上向きのエア出口（ねじポート） */
export const airPortTop = (p: string, x: number, y: number) => `
  <rect x="${r1(x - 2.6)}" y="${y + 0.5}" width="5.2" height="4" rx="0.6" fill="url(#${p}-steel-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <circle cx="${x}" cy="${y + 1.4}" r="1.2" fill="#16181a"/>`;

/** 横向きの角形コネクター（ロボット接続ケーブルのレセプタクル。x は差込口の左端、y は中心） */
export const squareConnector = (p: string, x: number, y: number, h = 11) => `
  <rect x="${x}" y="${r1(y - h / 2)}" width="12" height="${h}" rx="1.6" fill="#1a1c1f" stroke="#000" stroke-width="0.5"/>
  <rect x="${x + 10}" y="${r1(y - h / 2 - 1.5)}" width="5" height="${h + 3}" rx="1" fill="url(#${p}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  ${bolt(p, x + 18.5, y - h / 2 + 0.5, 0.9)}${bolt(p, x + 18.5, y + h / 2 - 0.5, 0.9)}`;

/** 上向きの丸形コネクター（キャップ付き。x は中心、y は差込口の上端） */
export const roundConnectorTop = (p: string, x: number, y: number, w = 12) => `
  <rect x="${r1(x - w / 2)}" y="${y + 0.5}" width="${w}" height="4" rx="1" fill="url(#${p}-steel-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <rect x="${r1(x - w / 2 + 1.5)}" y="${y - 1.2}" width="${w - 3}" height="2.6" rx="0.8" fill="#26292c"/>`;

/* ------------------------------------------------------------------ */
/* コントローラーの正面の部品                                            */
/* ------------------------------------------------------------------ */

/** コントローラーの部品のグラデーション（ねじ・プラグ・端子台）。`${p}-screw`・`${p}-plug`・`${p}-tb` */
export const controllerDefs = (p: string, tb: [string, string] = ['#f1ede2', '#cfc9b8']) => `
    <radialGradient id="${p}-screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="0.6" stop-color="#bfc3c7"/>
      <stop offset="1" stop-color="#8b9095"/>
    </radialGradient>
    <linearGradient id="${p}-plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b7077"/>
      <stop offset="0.5" stop-color="#a7acb2"/>
      <stop offset="1" stop-color="#5a5f65"/>
    </linearGradient>
    <linearGradient id="${p}-tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${tb[0]}"/>
      <stop offset="1" stop-color="${tb[1]}"/>
    </linearGradient>`;

/** ねじ端子 1 極（上から見たプラスねじ） */
export const screw = (p: string, x: number, y: number, r = 4.2) => `
  <circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="url(#${p}-screw-{{uid}})" stroke="#4d5156" stroke-width="0.5"/>
  <path d="M${r1(x - r * 0.6)} ${r1(y)} H${r1(x + r * 0.6)} M${r1(x)} ${r1(y - r * 0.6)} V${r1(y + r * 0.6)}" stroke="#41454a" stroke-width="0.8"/>`;

/** MIL・D-sub などのボックスヘッダを正面から見た縦長の形（cx, cy は中心、w は縦の長さ、l は横幅、rows は 1 列のピン数） */
export const headerFront = (cx: number, cy: number, w: number, l: number, rows: number, name: string, nameColor = '#e9ebed', shell = '#1a1c1f', dsub = false) => {
  const x0 = cx - l / 2;
  const y0 = cy - w / 2;
  const pitch = (w - 10) / rows;
  const holes = Array.from({ length: rows }, (_, i) =>
    [cx - l * 0.13, cx + l * 0.13].map((x) => `<rect x="${r1(x - 0.8)}" y="${r1(y0 + 5.2 + i * pitch)}" width="1.6" height="${r1(Math.min(1.1, pitch * 0.6))}" fill="#c8a54a"/>`).join(''),
  ).join('');
  return `
  <rect x="${r1(x0 - 2)}" y="${r1(y0 - 3)}" width="${l + 4}" height="${w + 6}" rx="1.5" fill="${shell}" stroke="#000" stroke-width="0.6"/>
  ${
    dsub
      ? `<path d="M${r1(x0)} ${r1(y0 + 1)} L${r1(x0 + l)} ${r1(y0 + 4)} V${r1(y0 + w - 4)} L${r1(x0)} ${r1(y0 + w - 1)} Z" fill="#2c2f33" stroke="#4b4f55" stroke-width="0.5"/>
  ${[y0 - 1, y0 + w + 1].map((y) => `<circle cx="${r1(cx)}" cy="${r1(y)}" r="1.4" fill="#c3c7cb" stroke="#4b4f55" stroke-width="0.4"/>`).join('')}`
      : `<rect x="${r1(x0)}" y="${r1(y0 + 2)}" width="${l}" height="${w - 4}" rx="1" fill="#2c2f33" stroke="#4b4f55" stroke-width="0.5"/>`
  }
  ${holes}
  <path d="M${r1(x0 + 1.5)} ${r1(y0 + 3.6)} l2.4 2.6 l-2.4 0 z" fill="#e8e9eb"/>
  <text x="${r1(x0 - 5)}" y="${r1(cy)}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="${nameColor}" transform="rotate(-90 ${r1(x0 - 5)} ${r1(cy)})">${name}</text>`;
};

/** RJ-45 のポートを正面から見た形（cx, cy は中心。右向きの差込口） */
export const lanPort = (cx: number, cy: number, name: string, nameColor = '#e9ebed') => `
  <rect x="${cx - 11}" y="${cy - 9.5}" width="22" height="19" rx="1.2" fill="#c3c7cb" stroke="#5f646a" stroke-width="0.6"/>
  <rect x="${cx - 7}" y="${cy - 6}" width="12" height="12" rx="0.6" fill="#16181b"/>
  <rect x="${cx + 5}" y="${cy - 3}" width="3" height="6" fill="#16181b"/>
  <rect x="${cx - 10}" y="${cy - 9}" width="3" height="2" fill="#3ccf52"/>
  <text x="${cx - 16}" y="${cy}" text-anchor="middle" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="${nameColor}" transform="rotate(-90 ${cx - 16} ${cy})">${name}</text>`;

/** 角形の丸い差込口のプラグ（下向き。x は中心、bottom は本体の下端、w は幅） */
export const plugBottom = (p: string, x: number, bottom: number, w: number, name: string, nameColor = '#e9ebed') => `
  <rect x="${r1(x - w / 2)}" y="${bottom - 22}" width="${w}" height="20" rx="2" fill="url(#${p}-plug-{{uid}})" stroke="#2b2e32" stroke-width="0.8"/>
  <rect x="${r1(x - w / 2 + 4)}" y="${bottom - 18}" width="${w - 8}" height="12" rx="1" fill="#1b1d20"/>
  <text x="${x}" y="${bottom - 26}" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="${nameColor}">${name}</text>`;

/** 丸形のプラグ（下向き。ティーチングペンダントのコネクターなど） */
export const roundPlugBottom = (p: string, x: number, bottom: number, name: string, nameColor = '#e9ebed') => `
  <circle cx="${x}" cy="${bottom - 12}" r="9" fill="url(#${p}-plug-{{uid}})" stroke="#2b2e32" stroke-width="0.8"/>
  <circle cx="${x}" cy="${bottom - 12}" r="5.5" fill="#1b1d20"/>
  <text x="${x + 13}" y="${bottom - 10}" text-anchor="start" font-family="sans-serif" font-size="6" font-weight="bold" fill="${nameColor}">${name}</text>`;
