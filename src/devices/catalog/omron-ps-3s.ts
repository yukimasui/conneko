import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * オムロン 電極保持器 PS-3S（フロートなしスイッチ 61F 用、3 極、一般用）+ 電極棒（F03-01 など）。
 * 水槽の天板に取り付け、長さの違う 3 本の電極棒を吊るす。上の端子を 61F-G の E1・E2・E3 へつなぐ。
 *
 * 出典: オムロン 61F-G データシート（基本構成: 61F 本体・電極保持器・電極棒）、フロートなしスイッチ よくあるお問い合わせ解決ガイド、
 *       レベル機器 技術解説（電極の長さ: E1 上限が一番短く、E2 下限、E3 コモンが一番長い。コモンの電極は接地する）
 * 推定: 端子の印字（E1・E2・E3 としたが、実機は 1・2・3 の番号の可能性がある）と、外形の見た目（六角の保持器・電極棒の長さは概略）。
 *
 * 液を通して電極の間が導通することは内部経路にしていない（液面の検出は 61F-G の側で扱う）。
 */

const W = 90;
const H = 190;
const TY = 20;
const XS = [24, 45, 66];
const IDS = ['E1', 'E2', 'E3'];
/** 電極棒の下端（E1 上限が短く、E3 コモンが長い） */
const ROD_END = [110, 140, 176];

const screw = (x: number, y: number) => `
  <rect x="${x - 6.5}" y="${y - 6.5}" width="13" height="13" rx="1.2" fill="#3a2a22"/>
  <circle cx="${x}" cy="${y}" r="4.8" fill="url(#ps-screw-{{uid}})" stroke="#666" stroke-width="0.5"/>
  <path d="M${x - 2.8} ${y} H${x + 2.8} M${x} ${y - 2.8} V${y + 2.8}" stroke="#4a4a4a" stroke-width="1" stroke-linecap="round"/>`;

const svg = `
  <defs>
    <linearGradient id="ps-head-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3b2a20"/>
      <stop offset="0.45" stop-color="#6b4e3c"/>
      <stop offset="1" stop-color="#2e2018"/>
    </linearGradient>
    <linearGradient id="ps-rod-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.45" stop-color="#f2f4f6"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
    <radialGradient id="ps-screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- 保持器（樹脂の頭部と端子） -->
  <path d="M10 10 H80 L86 20 V44 H4 V20 Z" fill="url(#ps-head-{{uid}})" stroke="#1d140f" stroke-width="0.9"/>
  ${XS.map((x, i) => screw(x, TY) + `<text x="${x}" y="${TY + 15}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#f2e8dc">${IDS[i]}</text>`).join('')}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.2" fill="#333">電極保持器 PS-3S</text>
  <!-- 取付けねじ部と水槽の天板 -->
  <rect x="22" y="44" width="46" height="12" fill="url(#ps-rod-{{uid}})" stroke="#5c6166" stroke-width="0.5"/>
  ${[46, 49, 52].map((y) => `<line x1="22" y1="${y}" x2="68" y2="${y + 1}" stroke="#7d8287" stroke-width="0.45"/>`).join('')}
  <rect x="0" y="56" width="${W}" height="5" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.5"/>
  <text x="${W - 2}" y="67" text-anchor="end" font-family="sans-serif" font-size="3.2" fill="#555">水槽の天板</text>
  <!-- 液 -->
  <rect x="0" y="122" width="${W}" height="${H - 122}" fill="#9fd0f2" opacity="0.45"/>
  <path d="M0 122 H${W}" stroke="#3f8fd0" stroke-width="0.8"/>
  <!-- 電極棒（E1 上限が短く、E3 コモンが長い） -->
  ${XS.map((x, i) => `<rect x="${x - 2}" y="61" width="4" height="${ROD_END[i] - 61}" fill="url(#ps-rod-{{uid}})" stroke="#5c6166" stroke-width="0.4"/>
  <rect x="${x - 3}" y="${ROD_END[i] - 4}" width="6" height="5" rx="1" fill="#d7dadd" stroke="#5c6166" stroke-width="0.4"/>
  <text x="${x + 4}" y="${ROD_END[i] - 1}" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="#234">${IDS[i]}</text>`).join('')}
  <text x="2" y="${ROD_END[0] + 2}" font-family="sans-serif" font-size="3" fill="#555">上限</text>
  <text x="2" y="${ROD_END[1] + 2}" font-family="sans-serif" font-size="3" fill="#555">下限</text>
`;

const NOTES = [
  '電極 E1（上限・満水。一番短い電極棒）。フロートなしスイッチ 61F の E1 へ',
  '電極 E2（下限。自己保持）。61F の E2 へ',
  '電極 E3（コモン。一番長い電極棒）。61F の E3 へ。接地する',
];

const terminals: TerminalDef[] = IDS.map((id, i) => ({
  id,
  x: XS[i],
  y: TY,
  side: 'top',
  role: 'signal',
  note: NOTES[i],
  hint: ['上限電極', '下限電極', 'コモン電極'][i],
  ...(id === 'E2' ? { optional: true } : {}),
}));

const def: DeviceDefinition = {
  type: 'omron.ps-3s',
  name: '電極保持器（フロートなしスイッチ用）',
  model: 'PS-3S',
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンの電極保持器 PS-3S（3 極、一般用）。フロートなしスイッチ 61F の電極（電極棒 F03-01 などを長さに切って取り付ける）を水槽の天板に保持する。' +
    '端子 E1・E2・E3 を 61F-G の E1・E2・E3 へつなぐ。E1 = 上限（一番短い）、E2 = 下限（自己保持）、E3 = コモン（一番長い。接地する）。' +
    '電極間は AC8V・約 1mA の小さな電流なので、電線は動力線と離して配線する。',
  labelPrefix: 'LE',
  width: W,
  height: H,
  svg,
  terminals,
  estimated: '端子の印字（E1・E2・E3 とした。実機は番号の可能性がある）と外形の見た目（六角の保持器・電極棒の長さは概略）',
};

export default def;
