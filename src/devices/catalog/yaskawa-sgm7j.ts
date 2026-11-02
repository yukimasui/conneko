import { SIGMA7_ENCODER, text } from '../yaskawa/parts';
import { SIGMA7 } from '../yaskawa/sigma7';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * 安川電機 AC サーボモーター Σ-7 SGM7J（中慣性・高速、200V、定格 3000min⁻¹、24 ビットのエンコーダー）。
 *
 * 出典: 安川電機 e-mechatronics「SGM7J モデル」（定格電流 01A 0.85A・02A 1.6A・04A 2.5A・08A 4.4A、保持ブレーキ DC24V ±10%、
 *       0.23 / 0.25 / 0.25 / 0.27A）。数値の表は src/devices/yaskawa/sigma7.ts。
 * - 型式: SGM7J-□A7A21（保持ブレーキなし）/ SGM7J-□A7AC1（保持ブレーキ付き、DC24V）。□は容量（01 = 100W、02 = 200W、04 = 400W、08 = 750W）。
 *   型式の末尾（エンコーダー・軸端・オプションの記号）は代表の例。
 * - 動力（U・V・W・接地）・エンコーダー・保持ブレーキは、サーボパックの U・V・W・⏚・CN2 と、ブレーキ電源（DC24V）へ専用ケーブルでつなぐ。
 *
 * 描き方: 盤外の機器のため実寸より縮めて横から描く。左に出力軸と角形のフランジ、黒い胴、右にエンコーダー部。
 * 動力とブレーキのコネクタのピンを端子として上に出し、エンコーダーのコネクタを右の端に出す（HK-KT と同じ並び）。
 */

const W = 230;
const H = 120;
const CY = 74;

const capOf = (p: ParamValues) => SIGMA7.find((c) => c.motor === String(p.capacity)) ?? SIGMA7[2];
const brakeOf = (p: ParamValues) => String(p.brake) === 'C';

const POWER = [
  { id: 'U', x: 140 },
  { id: 'V', x: 151 },
  { id: 'W', x: 162 },
  { id: 'E', x: 173 },
];
const POWER_Y = 18;
const BRAKE = [
  { id: 'B1', x: 104 },
  { id: 'B2', x: 115 },
];
const ENC = { x: W - 4, y: CY };

const pin = (x: number, y: number) => `
  <rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1" fill="#111" stroke="#555" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="2.3" fill="#c9a24a" stroke="#6b5520" stroke-width="0.5"/>`;

const svg = (p: ParamValues) => {
  const c = capOf(p);
  const brake = brakeOf(p);
  const half = c.flangeMm === 40 ? 24 : c.flangeMm === 60 ? 30 : 36;
  const bodyEnd = brake ? 184 : 172;
  return `
  <defs>
    <linearGradient id="sgm-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141517"/>
      <stop offset="0.32" stop-color="#4a4d52"/>
      <stop offset="0.5" stop-color="#2e3034"/>
      <stop offset="1" stop-color="#0e0f10"/>
    </linearGradient>
    <linearGradient id="sgm-flange-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1b1d"/>
      <stop offset="0.35" stop-color="#55585d"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <linearGradient id="sgm-shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="${H - 4}" rx="${W / 2 - 14}" ry="3" fill="#000" fill-opacity="0.12"/>
  <!-- 出力軸（キー溝付き） -->
  <rect x="6" y="${CY - 5}" width="30" height="10" rx="1.5" fill="url(#sgm-shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <rect x="10" y="${CY - 5}" width="16" height="2.2" fill="#8a8a8a"/>
  <!-- 角形フランジ（黒い塗装、取付穴付き） -->
  <rect x="34" y="${CY - half - 8}" width="13" height="${2 * half + 16}" rx="1.5" fill="url(#sgm-flange-{{uid}})" stroke="#000" stroke-width="1"/>
  <circle cx="40.5" cy="${CY - half - 2}" r="2" fill="#000"/><circle cx="40.5" cy="${CY + half + 2}" r="2" fill="#000"/>
  <!-- 胴 -->
  <rect x="47" y="${CY - half}" width="${bodyEnd - 47}" height="${2 * half}" rx="3" fill="url(#sgm-body-{{uid}})" stroke="#000" stroke-width="1"/>
  <g stroke="#000" stroke-opacity="0.4" stroke-width="0.7">${[60, 66, 72].map((x) => `<line x1="${x}" y1="${CY - half + 2}" x2="${x}" y2="${CY + half - 2}"/>`).join('')}</g>
  ${brake ? `<line x1="148" y1="${CY - half}" x2="148" y2="${CY + half}" stroke="#666" stroke-width="0.8"/>${text(166, CY + half - 4, 'BRAKE', 4.2, '#d0d0d0')}` : ''}
  <!-- エンコーダー部 -->
  <rect x="${bodyEnd}" y="${CY - half + 3}" width="${W - 12 - bodyEnd}" height="${2 * half - 6}" rx="4" fill="url(#sgm-body-{{uid}})" stroke="#000" stroke-width="1"/>
  <!-- 銘板 -->
  <rect x="80" y="${CY - 12}" width="60" height="26" rx="1.5" fill="#c9ccd0" stroke="#6a6d70" stroke-width="0.7"/>
  ${text(110, CY - 4, 'YASKAWA AC SERVO MOTOR', 3.6, '#003f7a', 'middle', 'bold')}
  ${text(110, CY + 4, `SGM7J-${c.motor}A`, 6.4, '#111', 'middle', 'bold')}
  ${text(110, CY + 11, `${c.watt}W 3000min⁻¹ ${c.motorCurrent}A`, 4, '#333')}
  <!-- 動力コネクタ（上） -->
  <rect x="132" y="${POWER_Y - 8}" width="50" height="${CY - half - POWER_Y + 10}" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  ${POWER.map((t) => pin(t.x, POWER_Y) + text(t.x, POWER_Y + 11, t.id === 'E' ? '⏚' : t.id, 4.2, '#eee', 'middle', 'bold')).join('')}
  ${text(157, POWER_Y + 17, 'POWER', 3.4, '#aaa')}
  ${
    brake
      ? `<!-- 保持ブレーキのコネクタ（上） -->
  <rect x="97" y="${POWER_Y - 8}" width="25" height="${CY - half - POWER_Y + 10}" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  ${BRAKE.map((t) => pin(t.x, POWER_Y) + text(t.x, POWER_Y + 11, t.id, 4.2, '#eee', 'middle', 'bold')).join('')}
  ${text(109.5, POWER_Y + 17, 'BRAKE', 3.4, '#aaa')}`
      : ''
  }
  <!-- エンコーダーのコネクタ（右の端） -->
  <rect x="${W - 14}" y="${CY - 9}" width="12" height="18" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  <rect x="${W - 11}" y="${CY - 6}" width="6" height="12" rx="1" fill="#555"/>
  ${text(W - 22, CY - half + 12, 'ENC', 3.4, '#aaa')}
`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const c = capOf(p);
  const out: TerminalDef[] = [
    ...POWER.filter((t) => t.id !== 'E').map(
      (t): TerminalDef => ({
        id: t.id,
        note: `動力（サーボパックの ${t.id} へ。定格電流 ${c.motorCurrent}A）`,
        hint: '動力',
        x: t.x,
        y: POWER_Y,
        side: 'top',
        role: 'input',
        accepts: { system: 'AC', minVoltage: 170, maxVoltage: 240, conductors: ['R', 'S', 'T'] },
      }),
    ),
    { id: 'E', label: '⏚', note: '接地（サーボパックの ⏚ へ）', x: 173, y: POWER_Y, side: 'top', role: 'ground' },
    {
      id: 'ENC',
      label: 'エンコーダー',
      note: 'エンコーダーのコネクタ。サーボパック Σ-7 の CN2 へ、専用のエンコーダーケーブルでつなぐ',
      x: ENC.x,
      y: ENC.y,
      side: 'right',
      role: 'connector',
      connector: { kind: SIGMA7_ENCODER, pins: 0, width: 14, required: true },
    },
  ];
  if (brakeOf(p)) {
    for (const t of BRAKE)
      out.push({
        id: t.id,
        note: '保持ブレーキ（DC24V ±10%、極性なし）。サーボパックのブレーキ出力（/BK）で入り切りするリレーを通して DC24V をつなぐ',
        hint: 'ブレーキ',
        x: t.x,
        y: POWER_Y,
        side: 'top',
        role: 'input',
        accepts: { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+', '-'] },
        loadCurrent: c.brakeCurrent,
      });
  }
  return out;
};

const def: DeviceDefinition = {
  type: 'yaskawa.sgm7j',
  name: 'サーボモーター',
  model: 'SGM7J-04A7A21',
  modelOf: (p) => `SGM7J-${capOf(p).motor}A7A${brakeOf(p) ? 'C1' : '21'}`,
  maker: '安川電機',
  category: 'load',
  labelPrefix: 'SM',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'capacity',
      label: '容量',
      options: SIGMA7.map((c) => ({ value: c.motor, label: `SGM7J-${c.motor}A（${c.watt}W、□${c.flangeMm}mm、SGD7S-${c.amp}A 用）` })),
      default: '04',
    },
    {
      key: 'brake',
      label: '保持ブレーキ',
      options: [
        { value: 'none', label: 'なし' },
        { value: 'C', label: 'あり（DC24V）' },
      ],
      default: 'none',
    },
  ],
  loadCurrent: (p) => capOf(p).motorCurrent,
  distinctGroups: [['U', 'V', 'W']],
  schematic: { elements: [{ kind: 'motor', terminals: ['U', 'V', 'W'] }] },
  description:
    '安川電機の AC サーボモーター Σ-7 SGM7J（中慣性・高速、200V、定格 3000min⁻¹、24 ビットのアブソリュート / インクリメンタルエンコーダー）。' +
    '組み合わせるサーボパックは SGD7S-R90A（SGM7J-01A）・1R6A（02A）・2R8A（04A）・5R5A（08A）。' +
    '動力 U・V・W はサーボパックの U・V・W へ相をそろえてつなぎ、接地はサーボパックの ⏚ へ。エンコーダーはサーボパックの CN2 へ専用ケーブルでつなぐ。' +
    '保持ブレーキ付きは B1・B2 に DC24V（±10%、極性なし）を入れると解除される無励磁作動形。ブレーキ電源はサーボパックのブレーキ出力（/BK）で動くリレーで切る。' +
    '電源を直接つないではいけない（サーボパックの出力でだけ回す）。',
  estimated: '型式の末尾（7A21・7AC1）は代表の例。コネクタの位置・外観は図面用に整理したもの（推定）',
};

export default def;
