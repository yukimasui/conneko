/**
 * 東洋技研（TOGI）の端子台の描画部品。
 *
 * 寸法は 1mm ≒ 2px。コネクタ端子台は上から見た形（奥側にコネクタ、手前に端子が並ぶ）で描く。
 * 端子の描き分け:
 * - ネジ式（PCN7・PTU）: 十字穴のネジ頭
 * - スプリングロック式 3.5mm ピッチ（PCX・PCXV）: 橙色の開閉ボタン + 丸い電線挿入孔
 * - スプリングロック式 5mm ピッチ（PCV5・PCW・VTX）: ドライバ用の開閉口 + 角形の電線挿入孔
 */

/** 小数点以下 2 桁に丸める（SVG の座標用） */
export const r2 = (v: number) => +v.toFixed(2);

export const text = (x: number, y: number, t: string, size = 4, fill = '#222', anchor = 'middle', weight = 'bold') =>
  `<text x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/** 共通のグラデーション定義（id には {{uid}} を付ける） */
export const defs = `
  <defs>
    <radialGradient id="tgscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
    <linearGradient id="tgplug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/>
      <stop offset="1" stop-color="#141414"/>
    </linearGradient>
    <linearGradient id="tgshell-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6e8ea"/>
      <stop offset="0.5" stop-color="#b7bbc0"/>
      <stop offset="1" stop-color="#d4d7da"/>
    </linearGradient>
    <linearGradient id="tgrail-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ebee"/>
      <stop offset="0.5" stop-color="#b4b8bd"/>
      <stop offset="1" stop-color="#d7dade"/>
    </linearGradient>
  </defs>`;

/** 十字穴のネジ頭（Y 形圧着端子用のセルフアップネジ） */
export const screw = (x: number, y: number, r = 4.4) => `
  <circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="url(#tgscrew-{{uid}})" stroke="#5e5e5e" stroke-width="0.5"/>
  <path d="M${r2(x - r * 0.6)} ${r2(y)} H${r2(x + r * 0.6)} M${r2(x)} ${r2(y - r * 0.6)} V${r2(y + r * 0.6)}" stroke="#454545" stroke-width="1" stroke-linecap="round"/>`;

/**
 * 3.5mm ピッチのスプリングロック端子 1 個（PCX 系）。x, y は電線挿入孔の中心。
 * 上に橙色の開閉ボタン（押すとバネが開く）、間にチェック端子孔。
 */
export const spring35 = (x: number, y: number) => `
  <rect x="${r2(x - 2.6)}" y="${r2(y - 9)}" width="5.2" height="3.6" rx="0.6" fill="#f39a2b" stroke="#b8650f" stroke-width="0.35"/>
  <circle cx="${r2(x)}" cy="${r2(y - 3.9)}" r="0.7" fill="#4a4b4d"/>
  <circle cx="${r2(x)}" cy="${r2(y)}" r="2.3" fill="#3b3d40" stroke="#8e9195" stroke-width="0.5"/>
  <circle cx="${r2(x - 0.5)}" cy="${r2(y - 0.5)}" r="0.9" fill="#55585c"/>`;

/**
 * 5mm ピッチのスプリングロック端子 1 個（PCV5・PCW・VTX 系）。x, y は電線挿入孔の中心。
 * 上にドライバを差し込む開閉口（細長い角穴）。color は開閉口の色。
 */
export const spring5 = (x: number, y: number, hole = '#2b2c2e', slot = '#5d6064') => `
  <rect x="${r2(x - 1.3)}" y="${r2(y - 9)}" width="2.6" height="4.4" rx="0.4" fill="${slot}" stroke="#1d1e20" stroke-width="0.3"/>
  <rect x="${r2(x - 2.7)}" y="${r2(y - 2.7)}" width="5.4" height="5.4" rx="1.4" fill="${hole}" stroke="#8b8e92" stroke-width="0.45"/>
  <circle cx="${r2(x)}" cy="${r2(y)}" r="1.3" fill="#4d5054"/>`;

/**
 * MIL ボックスヘッダ（上から見た横向き。奥側の列が偶数ピン、手前の列が奇数ピン、▲は手前左端のピン 1）。
 * 両端にロックレバー。cx, cy は差込口の中心。戻り値の width はレバー込みの全長[px]。
 */
export function milHeaderH(cx: number, cy: number, poles: number) {
  const cols = poles / 2;
  const pp = 5.08;
  const span = (cols - 1) * pp;
  const housing = span + 14;
  const total = housing + 18;
  const x0 = cx - span / 2;
  const pins = Array.from({ length: cols }, (_, i) => {
    const x = r2(x0 + i * pp);
    return `<rect x="${r2(x - 0.8)}" y="${r2(cy - 3.34)}" width="1.6" height="1.6" fill="#e0b84a"/><rect x="${r2(x - 0.8)}" y="${r2(cy + 1.74)}" width="1.6" height="1.6" fill="#e0b84a"/>`;
  }).join('');
  const svg = `
  <rect x="${r2(cx - total / 2)}" y="${r2(cy - 10)}" width="9" height="20" rx="1.2" fill="#202123" stroke="#050505" stroke-width="0.5"/>
  <rect x="${r2(cx + total / 2 - 9)}" y="${r2(cy - 10)}" width="9" height="20" rx="1.2" fill="#202123" stroke="#050505" stroke-width="0.5"/>
  <rect x="${r2(cx - total / 2 + 2.5)}" y="${r2(cy - 6)}" width="4" height="12" rx="0.6" fill="#36383b"/>
  <rect x="${r2(cx + total / 2 - 6.5)}" y="${r2(cy - 6)}" width="4" height="12" rx="0.6" fill="#36383b"/>
  <rect x="${r2(cx - housing / 2)}" y="${r2(cy - 8.5)}" width="${r2(housing)}" height="17" rx="1" fill="url(#tgplug-{{uid}})" stroke="#050505" stroke-width="0.7"/>
  <rect x="${r2(cx - span / 2 - 3.5)}" y="${r2(cy - 5.6)}" width="${r2(span + 7)}" height="11.2" rx="0.6" fill="#0b0b0b" stroke="#444" stroke-width="0.4"/>
  ${pins}
  <rect x="${r2(cx - 4)}" y="${r2(cy + 5.6)}" width="8" height="2.2" fill="#0b0b0b"/>
  <path d="M${r2(x0)} ${r2(cy + 6.2)} l-1.5 2.2 h3 z" fill="#f2f2f2"/>`;
  return { svg, width: r2(total) };
}

/**
 * FCN 系 40 ピンコネクタ（上から見た横向き。台形の金属シェルと両端の固定ネジ）。
 * cx, cy は差込口の中心。戻り値の width はフランジ込みの全長[px]。
 */
export function fcnHeaderH(cx: number, cy: number) {
  const cols = 20;
  const pp = 3.8;
  const span = (cols - 1) * pp;
  const shell = span + 10;
  const total = 108;
  const x0 = cx - span / 2;
  const pins = Array.from({ length: cols }, (_, i) => {
    const x = r2(x0 + i * pp);
    return `<rect x="${r2(x - 0.7)}" y="${r2(cy - 2.6)}" width="1.4" height="1.4" fill="#e0b84a"/><rect x="${r2(x - 0.7 + pp / 2)}" y="${r2(cy + 1.2)}" width="1.4" height="1.4" fill="#e0b84a"/>`;
  }).join('');
  const svg = `
  <rect x="${r2(cx - total / 2)}" y="${r2(cy - 9)}" width="${total}" height="18" rx="1.5" fill="url(#tgshell-{{uid}})" stroke="#6d7177" stroke-width="0.6"/>
  <circle cx="${r2(cx - total / 2 + 6)}" cy="${r2(cy)}" r="4" fill="url(#tgscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${r2(cx - total / 2 + 3.6)} ${r2(cy)} H${r2(cx - total / 2 + 8.4)}" stroke="#444" stroke-width="0.9"/>
  <circle cx="${r2(cx + total / 2 - 6)}" cy="${r2(cy)}" r="4" fill="url(#tgscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${r2(cx + total / 2 - 8.4)} ${r2(cy)} H${r2(cx + total / 2 - 3.6)}" stroke="#444" stroke-width="0.9"/>
  <path d="M${r2(cx - shell / 2)} ${r2(cy - 6)} H${r2(cx + shell / 2)} L${r2(cx + shell / 2 - 3)} ${r2(cy + 6)} H${r2(cx - shell / 2 + 3)} Z" fill="#9aa0a6" stroke="#5a5f65" stroke-width="0.6"/>
  <path d="M${r2(cx - shell / 2 + 2)} ${r2(cy - 4.4)} H${r2(cx + shell / 2 - 2)} L${r2(cx + shell / 2 - 4.4)} ${r2(cy + 4.4)} H${r2(cx - shell / 2 + 4.4)} Z" fill="#1a1a1b"/>
  ${pins}
  <path d="M${r2(x0)} ${r2(cy + 6.8)} l-1.4 2 h2.8 z" fill="#2a2a2a"/>`;
  return { svg, width: total };
}

/** IEC35mm（DIN）レール。y は上端、h は見えている高さ */
export const rail = (x: number, y: number, w: number, h = 34) => `
  <rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${h}" fill="url(#tgrail-{{uid}})" stroke="#8d9197" stroke-width="0.5"/>
  ${Array.from({ length: Math.max(0, Math.floor((w - 20) / 50)) }, (_, i) => `<rect x="${r2(x + 16 + i * 50)}" y="${r2(y + h / 2 - 2.6)}" width="10" height="5.2" rx="2.6" fill="#8c9096"/>`).join('')}`;

/** マーカーの 1 マス（白地に黒文字。hl を指定すると色付きのマス） */
export const markerCell = (x: number, y: number, w: number, h: number, label: string, size: number, hl?: string) => {
  const fill = hl ?? '#fbfbf8';
  const ink = hl && hl !== '#f5b532' ? '#ffffff' : '#1d1d1d';
  return `<rect x="${r2(x - w / 2)}" y="${r2(y)}" width="${r2(w)}" height="${h}" fill="${fill}" stroke="#8c8f93" stroke-width="0.3"/>${text(x, y + h / 2 + size * 0.36, label, size, ink)}`;
};

/** マーカーのマスの色（端子の mark に対応） */
export const MARK_COLORS: Record<string, string> = {
  /** 5 番ごとの目印（A・B 連番の記名板） */
  black: '#232323',
  /** 4 点ごとの目印（PLC 対応品の記名板） */
  orange: '#f5b532',
  /** コモン（PLC 対応品の記名板） */
  blue: '#2c5aa8',
  /** ＋コモン */
  red: '#d9322b',
};

/** 東洋技研のロゴ（文字のみ） */
export const togiLogo = (x: number, y: number, size = 4.4, fill = '#c8202a') =>
  `<text x="${r2(x)}" y="${r2(y)}" font-family="sans-serif" font-size="${size}" font-style="italic" font-weight="bold" fill="${fill}">TOGI</text>`;
