/**
 * ロボットのティーチングペンダント（正面）を描くための共通部品。
 *
 * 上に非常停止ボタンとモード切換キー（またはロゴ）、中央にカラー液晶（タッチパネル）、下にキーが並ぶ形を、メーカーごとの色・ロゴ・キーの並びで描く。
 * 外形・キーの並びは製品写真の印象から描いたもので、寸法は推定（1mm ≒ 0.5px）。
 */

const r1 = (v: number) => Math.round(v * 10) / 10;

const t = (x: number, y: number, s: string, size: number, fill: string, anchor = 'middle', extra = '') =>
  `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${fill}"${extra}>${s}</text>`;

export interface PendantStyle {
  /** id の接頭辞 */
  p: string;
  /** 幅・高さ（ケーブルの付け根を含む） */
  w: number;
  h: number;
  /** 本体の色 [縁, 中央] */
  body: [string, string];
  /** 本体の縁の線 */
  edge: string;
  /** 上の中央のロゴ（SVG） */
  logo: string;
  /** 画面の上の帯の文字 */
  title: string;
  /** キーの色・文字の色 */
  keyFill: string;
  keyText: string;
  /** 軸操作キーの色 */
  jogFill: string;
  /** 軸操作キーの名前（4 段） */
  jog: string[];
  /** 画面の下の 1 段のキー（名前・色） */
  row: { label: string; fill: string; color: string }[];
  /** ケーブルの付け根の x */
  cableX: number;
  /** 非常停止ボタンの台の色（黄色が多い） */
  estopBase?: string;
  /** 左上の部品（モード切換キーなど。SVG）。省略すると何も描かない */
  topLeft?: string;
}

export function pendantSvg(s: PendantStyle): string {
  const { p, w: W, h: H } = s;
  const key = (x: number, y: number, w: number, h: number, fill: string, label: string, color: string, size = 3.6) => `
  <rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="1.6" fill="${fill}" stroke="#0e0f11" stroke-opacity="0.45" stroke-width="0.5"/>
  ${label ? t(x + w / 2, y + h / 2 + 1.3, label, size, color) : ''}`;
  const kw = (W - 24 - (s.row.length - 1) * 3) / s.row.length;
  return `
  <defs>
    <linearGradient id="${p}-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${s.body[0]}"/>
      <stop offset="0.15" stop-color="${s.body[1]}"/>
      <stop offset="0.85" stop-color="${s.body[1]}"/>
      <stop offset="1" stop-color="${s.body[0]}"/>
    </linearGradient>
    <linearGradient id="${p}-lcd-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#25578f"/>
      <stop offset="1" stop-color="#0f2f57"/>
    </linearGradient>
    <radialGradient id="${p}-estop-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ff6a5a"/>
      <stop offset="0.6" stop-color="#d81e10"/>
      <stop offset="1" stop-color="#8a0d05"/>
    </radialGradient>
  </defs>

  <!-- ケーブルの付け根 -->
  <rect x="${s.cableX - 6}" y="${H - 14}" width="12" height="14" rx="2" fill="#2a2c2f" stroke="#000" stroke-width="0.6"/>

  <!-- 本体（握りやすい丸みのある形） -->
  <path d="M14 4 H${W - 14} Q${W - 4} 4 ${W - 4} 16 V${H - 26} Q${W - 4} ${H - 12} ${W - 18} ${H - 12} H18 Q4 ${H - 12} 4 ${H - 26} V16 Q4 4 14 4 Z"
        fill="url(#${p}-body-{{uid}})" stroke="${s.edge}" stroke-width="1"/>

  <!-- 左上の部品・ロゴ・非常停止ボタン（右上） -->
  ${s.topLeft ?? ''}
  ${s.logo}
  <circle cx="${W - 21}" cy="19" r="11.5" fill="${s.estopBase ?? '#f6c400'}" stroke="#8f6c00" stroke-width="0.6"/>
  <circle cx="${W - 21}" cy="19" r="8.2" fill="url(#${p}-estop-{{uid}})" stroke="#5c0a04" stroke-width="0.7"/>

  <!-- カラー液晶（タッチパネル） -->
  <rect x="12" y="36" width="${W - 24}" height="68" rx="2" fill="#0b0c0e"/>
  <rect x="15" y="39" width="${W - 30}" height="62" fill="url(#${p}-lcd-{{uid}})"/>
  <rect x="15" y="39" width="${W - 30}" height="7" fill="#dfe3e8"/>
  ${t(18, 44.5, s.title, 3.4, '#1d1f22', 'start')}
  ${Array.from({ length: 6 }, (_, i) => `<rect x="19" y="${50 + i * 7.5}" width="${[56, 70, 44, 62, 38, 50][i]}" height="2.6" rx="1" fill="#cfe0f5" opacity="0.75"/>`).join('')}

  <!-- 画面の下のキー -->
  ${s.row.map((k, i) => key(12 + i * (kw + 3), 108, r1(kw), 9, k.fill, k.label, k.color, 3)).join('')}

  <!-- 数値キー（左）と軸操作キー（右） -->
  ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => key(12 + c * 15, 121 + r * 11, 13, 9, s.keyFill, String([7, 8, 9, 4, 5, 6, 1, 2, 3, 0, '.', '-'][r * 3 + c]), s.keyText)).join('')).join('')}
  ${s.jog.map((a, r) => key(62, 121 + r * 11, (W - 74) / 2 - 1.5, 9, s.jogFill, `${a}−`, '#fff') + key(62 + (W - 74) / 2 + 1.5, 121 + r * 11, (W - 74) / 2 - 1.5, 9, s.jogFill, `${a}+`, '#fff')).join('')}`;
}
