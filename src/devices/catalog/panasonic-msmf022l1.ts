import { MINAS_A6, MINAS_A6_ENCODER, text } from '../panasonic/minas-a6';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * パナソニック AC サーボモーター MINAS A6 MSMF022L1（低慣性、□60mm、200W、200V、定格 3000r/min、23 ビットのアブソリュートエンコーダ、IP67）。
 * 電磁ブレーキの有無は params の brake で選ぶ。
 *
 * 出典: src/devices/panasonic/minas-a6.ts のとおり（定格トルク 0.64N·m・瞬時最大 1.91N·m、定格電流 1.5A、
 *       ブレーキ DC24V（22.8〜25.2V）0.36A・静摩擦トルク 1.27N·m）。
 * - 型式: MSMF022L1U2M（キー溝・センタタップ付き、ブレーキなし）。ブレーキ付きは MSMF022L1V2M とした（推定）
 * - 動力（U・V・W・接地）・エンコーダ・ブレーキは、サーボアンプ MADLN15SG の U・V・W・⏚・X6 と、ブレーキ電源（DC24V）へ専用ケーブルでつなぐ
 *
 * 描き方: 盤外の機器のため実寸より縮めて横から描く（SGM7J・HK-KT と同じ並び）。
 */

const W = 230;
const H = 120;
const CY = 74;
const HALF = 30;

const brakeOf = (p: ParamValues) => String(p.brake) === 'yes';

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

function svg(p: ParamValues) {
  const brake = brakeOf(p);
  const bodyEnd = brake ? 184 : 172;
  return `
  <defs>
    <linearGradient id="msmf-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#16171a"/>
      <stop offset="0.32" stop-color="#4d5157"/>
      <stop offset="0.5" stop-color="#303338"/>
      <stop offset="1" stop-color="#0f1012"/>
    </linearGradient>
    <linearGradient id="msmf-shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="${H - 4}" rx="${W / 2 - 14}" ry="3" fill="#000" fill-opacity="0.12"/>
  <!-- 出力軸（キー溝付き） -->
  <rect x="6" y="${CY - 5}" width="30" height="10" rx="1.5" fill="url(#msmf-shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <rect x="10" y="${CY - 5}" width="16" height="2.2" fill="#8a8a8a"/>
  <!-- 角形フランジ（□60） -->
  <rect x="34" y="${CY - HALF - 8}" width="13" height="${2 * HALF + 16}" rx="1.5" fill="url(#msmf-body-{{uid}})" stroke="#000" stroke-width="1"/>
  <circle cx="40.5" cy="${CY - HALF - 2}" r="2" fill="#000"/><circle cx="40.5" cy="${CY + HALF + 2}" r="2" fill="#000"/>
  <!-- 胴 -->
  <rect x="47" y="${CY - HALF}" width="${bodyEnd - 47}" height="${2 * HALF}" rx="3" fill="url(#msmf-body-{{uid}})" stroke="#000" stroke-width="1"/>
  ${brake ? `<line x1="148" y1="${CY - HALF}" x2="148" y2="${CY + HALF}" stroke="#666" stroke-width="0.8"/>${text(166, CY + HALF - 4, 'BRAKE', 4.2, '#d0d0d0')}` : ''}
  <!-- エンコーダ部 -->
  <rect x="${bodyEnd}" y="${CY - HALF + 3}" width="${W - 12 - bodyEnd}" height="${2 * HALF - 6}" rx="4" fill="url(#msmf-body-{{uid}})" stroke="#000" stroke-width="1"/>
  <!-- 銘板 -->
  <rect x="80" y="${CY - 12}" width="60" height="26" rx="1.5" fill="#c9ccd0" stroke="#6a6d70" stroke-width="0.7"/>
  ${text(110, CY - 4, 'Panasonic AC SERVO MOTOR', 3.4, '#1d3f8f', 'middle', 'bold')}
  ${text(110, CY + 4, `${MINAS_A6.motor}`, 6.4, '#111', 'middle', 'bold')}
  ${text(110, CY + 11, `${MINAS_A6.watt}W 3000r/min ${MINAS_A6.motorCurrent}A`, 4, '#333')}
  <!-- 動力コネクタ（上） -->
  <rect x="132" y="${POWER_Y - 8}" width="50" height="${CY - HALF - POWER_Y + 10}" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  ${POWER.map((t) => pin(t.x, POWER_Y) + text(t.x, POWER_Y + 11, t.id === 'E' ? '⏚' : t.id, 4.2, '#eee', 'middle', 'bold')).join('')}
  ${text(157, POWER_Y + 17, 'POWER', 3.4, '#aaa')}
  ${
    brake
      ? `<rect x="97" y="${POWER_Y - 8}" width="25" height="${CY - HALF - POWER_Y + 10}" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  ${BRAKE.map((t) => pin(t.x, POWER_Y) + text(t.x, POWER_Y + 11, t.id, 4.2, '#eee', 'middle', 'bold')).join('')}
  ${text(109.5, POWER_Y + 17, 'BRAKE', 3.4, '#aaa')}`
      : ''
  }
  <!-- エンコーダのコネクタ（右の端） -->
  <rect x="${W - 14}" y="${CY - 9}" width="12" height="18" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  <rect x="${W - 11}" y="${CY - 6}" width="6" height="12" rx="1" fill="#555"/>
  ${text(W - 22, CY - HALF + 12, 'ENC', 3.4, '#aaa')}
`;
}

function terminals(p: ParamValues): TerminalDef[] {
  const out: TerminalDef[] = [
    ...POWER.filter((t) => t.id !== 'E').map(
      (t): TerminalDef => ({
        id: t.id,
        note: `動力（サーボアンプの ${t.id} へ。定格電流 ${MINAS_A6.motorCurrent}A）`,
        hint: '動力',
        x: t.x,
        y: POWER_Y,
        side: 'top',
        role: 'input',
        accepts: { system: 'AC', minVoltage: 170, maxVoltage: 240, conductors: ['R', 'S', 'T'] },
      }),
    ),
    { id: 'E', label: '⏚', note: '接地（サーボアンプの ⏚ へ）', x: 173, y: POWER_Y, side: 'top', role: 'ground' },
    {
      id: 'ENC',
      label: 'エンコーダ',
      note: 'エンコーダのコネクタ。サーボアンプ MINAS A6 の X6 へ、専用のエンコーダケーブルでつなぐ',
      x: ENC.x,
      y: ENC.y,
      side: 'right',
      role: 'connector',
      connector: { kind: MINAS_A6_ENCODER, pins: 0, width: 14, required: true },
    },
  ];
  if (brakeOf(p)) {
    for (const t of BRAKE)
      out.push({
        id: t.id,
        note: '電磁ブレーキ（DC24V、22.8〜25.2V、0.36A、極性なし）。サーボアンプの BRKOFF で動かすリレーを通して DC24V をつなぐ',
        hint: 'ブレーキ',
        x: t.x,
        y: POWER_Y,
        side: 'top',
        role: 'input',
        accepts: { system: 'DC', minVoltage: 22.8, maxVoltage: 25.2, conductors: ['+', '-'] },
        loadCurrent: MINAS_A6.brakeCurrent,
      });
  }
  return out;
}

const def: DeviceDefinition = {
  type: 'panasonic.msmf022l1',
  name: 'サーボモーター',
  model: 'MSMF022L1U2M',
  modelOf: (p) => (brakeOf(p) ? 'MSMF022L1V2M' : 'MSMF022L1U2M'),
  maker: 'パナソニック',
  category: 'load',
  labelPrefix: 'SM',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'brake',
      label: '電磁ブレーキ',
      options: [
        { value: 'no', label: 'なし' },
        { value: 'yes', label: 'あり（DC24V）' },
      ],
      default: 'no',
    },
  ],
  loadCurrent: MINAS_A6.motorCurrent,
  distinctGroups: [['U', 'V', 'W']],
  schematic: { elements: [{ kind: 'motor', terminals: ['U', 'V', 'W'] }] },
  description:
    'パナソニックの AC サーボモーター MINAS A6 MSMF022L1（低慣性、□60mm、200W、200V、定格 3000r/min・最高 6000r/min、定格トルク 0.64N·m、定格電流 1.5A、23 ビットのアブソリュートエンコーダ、IP67）。' +
    '組み合わせるサーボアンプは MADLN15SG（A6SG）など A 枠の 200V 品。動力 U・V・W はサーボアンプの U・V・W へ相をそろえてつなぎ、接地はサーボアンプの ⏚ へ。エンコーダはサーボアンプの X6 へ専用ケーブルでつなぐ。' +
    '電磁ブレーキ付きは B1・B2 に DC24V（22.8〜25.2V、0.36A、極性なし）を入れると解除される無励磁作動形。ブレーキ電源はサーボアンプの BRKOFF 出力で動くリレーで切る。' +
    '電源を直接つないではいけない（サーボアンプの出力でだけ回す）。',
  estimated: 'ブレーキ付きの型式の末尾（V2M とした）、コネクタの位置・外観（図面用に整理したもの）',
};

export default def;
