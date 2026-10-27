import { AZ_MOTOR_CONNECTOR, AZ_MOTOR_OPTIONS, azMotorOf } from '../oriental/az';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * オリエンタルモーター αSTEP AZ シリーズ モーター AZM□□AK（標準、DC 電源入力用）/ AZM□□MK（電磁ブレーキ付き）。
 * 出典は src/devices/oriental/az.ts。
 *
 * - モーターとドライバー AZD-KD は、モーターのコネクタからドライバーの CN2 へ専用の接続ケーブル（モーター・エンコーダー一体）でつなぐ。
 * - 電磁ブレーキ付き（MK）は、ケーブルから出るブレーキのリード線 MB1（黒）・MB2（白）をドライバーの CN1 の MB1・MB2 へつなぐ。
 *
 * 描き方: 盤外の機器のため横から描く（取付角 42mm で縦 76px 程度、60mm で 96px 程度）。左に出力軸、角形のフランジ、
 * 積層の胴、右に ABZO センサの黒いカバーとコネクタ。
 */

const W = 220;
const H = 120;
const CY = 66;

const brakeOf = (p: ParamValues) => String(p.brake) === 'M';
const BRAKE = [
  { id: 'MB1', x: 96, label: 'MB1', color: '#222' },
  { id: 'MB2', x: 116, label: 'MB2', color: '#f4f4f4' },
];
const LEAD_Y = 7;

const svg = (p: ParamValues) => {
  const m = azMotorOf(p.motor);
  const brake = brakeOf(p);
  const half = m.sizeMm === 42 ? 36 : 44;
  const x0 = 34;
  const bodyEnd = x0 + 8 + m.lengthPx + (brake ? 22 : 0);
  const capEnd = W - 18;
  return `
  <defs>
    <linearGradient id="flange-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7c8086"/>
      <stop offset="0.4" stop-color="#d5d8dc"/>
      <stop offset="1" stop-color="#6c7076"/>
    </linearGradient>
    <linearGradient id="stack-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d1e20"/>
      <stop offset="0.4" stop-color="#55585d"/>
      <stop offset="1" stop-color="#161718"/>
    </linearGradient>
    <linearGradient id="shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="${H - 4}" rx="${W / 2 - 16}" ry="3" fill="#000" fill-opacity="0.12"/>
  <!-- 出力軸（D カット） -->
  <rect x="8" y="${CY - 4}" width="${x0 - 8}" height="8" rx="1.2" fill="url(#shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <rect x="10" y="${CY - 4}" width="14" height="2" fill="#9a9a9a"/>
  <!-- フランジ（アルミ） -->
  <rect x="${x0}" y="${CY - half}" width="8" height="${2 * half}" rx="1.5" fill="url(#flange-{{uid}})" stroke="#444" stroke-width="0.9"/>
  <!-- 胴（積層の固定子） -->
  <rect x="${x0 + 8}" y="${CY - half + 2}" width="${bodyEnd - x0 - 8}" height="${2 * half - 4}" fill="url(#stack-{{uid}})" stroke="#0b0b0c" stroke-width="0.9"/>
  <g stroke="#000" stroke-opacity="0.35" stroke-width="0.6">${Array.from({ length: Math.floor((bodyEnd - x0 - 12) / 4) }, (_, i) => `<line x1="${x0 + 12 + i * 4}" y1="${CY - half + 3}" x2="${x0 + 12 + i * 4}" y2="${CY + half - 3}"/>`).join('')}</g>
  ${brake ? `<rect x="${bodyEnd - 22}" y="${CY - half + 2}" width="22" height="${2 * half - 4}" fill="#2c2e31" stroke="#0b0b0c" stroke-width="0.9"/>` : ''}
  <!-- 反出力側のフランジと ABZO センサのカバー -->
  <rect x="${bodyEnd}" y="${CY - half}" width="6" height="${2 * half}" rx="1" fill="url(#flange-{{uid}})" stroke="#444" stroke-width="0.9"/>
  <rect x="${bodyEnd + 6}" y="${CY - half + 6}" width="${capEnd - bodyEnd - 6}" height="${2 * half - 12}" rx="4" fill="#1b1c1e" stroke="#000" stroke-width="0.9"/>
  <text x="${(bodyEnd + 6 + capEnd) / 2}" y="${CY - half + 16}" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#d33">ABZO</text>
  <!-- ラベル -->
  <rect x="${x0 + 16}" y="${CY - 12}" width="64" height="24" rx="1.2" fill="#f1f1ee" stroke="#777" stroke-width="0.6"/>
  <text x="${x0 + 48}" y="${CY - 4}" text-anchor="middle" font-family="sans-serif" font-size="3.8" fill="#333">ORIENTAL MOTOR αSTEP</text>
  <text x="${x0 + 48}" y="${CY + 4}" text-anchor="middle" font-family="sans-serif" font-size="6.6" font-weight="bold" fill="#111">${m.frame}${brake ? 'M' : 'A'}K</text>
  <text x="${x0 + 48}" y="${CY + 10}" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#333">□${m.sizeMm}mm${brake ? ' BRAKE' : ''}</text>
  <!-- コネクタ（右の端） -->
  <rect x="${capEnd - 2}" y="${CY - 9}" width="16" height="18" rx="2" fill="#2b2d30" stroke="#000" stroke-width="0.8"/>
  <rect x="${capEnd + 1}" y="${CY - 6}" width="9" height="12" rx="1" fill="#555"/>
  ${
    brake
      ? `<!-- 電磁ブレーキのリード線 -->
  ${BRAKE.map((b) => `<path d="M${b.x} ${CY - half + 2} V${LEAD_Y + 6}" stroke="${b.color}" stroke-width="2.6" fill="none"/><path d="M${b.x} ${CY - half + 2} V${LEAD_Y + 6}" stroke="#555" stroke-width="0.4" fill="none" stroke-dasharray="0"/>
  <rect x="${b.x - 3}" y="${LEAD_Y - 2}" width="6" height="8" rx="1" fill="#c8a33e" stroke="#6b5520" stroke-width="0.5"/>
  <text x="${b.x + 4.5}" y="${LEAD_Y + 2.5}" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#333">${b.label}</text>`).join('')}`
      : ''
  }
`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const m = azMotorOf(p.motor);
  const out: TerminalDef[] = [
    {
      id: 'MOTOR',
      label: 'モーター（コネクタ）',
      note: `ドライバー AZD-KD の CN2 へ、専用の接続ケーブル（モーター・エンコーダー一体）でつなぐ（${m.frame}）`,
      x: W - 4,
      y: CY,
      side: 'right',
      role: 'connector',
      connector: { kind: AZ_MOTOR_CONNECTOR, pins: 0, width: 16, required: true },
    },
  ];
  if (brakeOf(p))
    for (const b of BRAKE)
      out.push({
        id: b.id,
        note: `電磁ブレーキのリード線（${b.id === 'MB1' ? '黒、−' : '白、＋'}）。ドライバー AZD-KD の CN1 の ${b.id} へ`,
        hint: b.id === 'MB1' ? 'ブレーキ−' : 'ブレーキ+',
        x: b.x,
        y: LEAD_Y,
        side: 'top',
        role: 'signal',
      });
  return out;
};

const def: DeviceDefinition = {
  type: 'oriental.azm',
  name: 'ステッピングモーター（AZ シリーズ）',
  model: 'AZM46AK',
  modelOf: (p) => `${azMotorOf(p.motor).frame}${brakeOf(p) ? 'M' : 'A'}K`,
  maker: 'オリエンタルモーター',
  category: 'load',
  labelPrefix: 'M',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    { key: 'motor', label: 'モーター', options: AZ_MOTOR_OPTIONS, default: 'AZM46' },
    {
      key: 'brake',
      label: '電磁ブレーキ',
      options: [
        { value: 'A', label: 'なし（AZM□□AK）' },
        { value: 'M', label: 'あり（AZM□□MK）' },
      ],
      default: 'A',
    },
  ],
  description:
    'オリエンタルモーターの αSTEP AZ シリーズのステッピングモーター（DC 電源入力のドライバー用、バッテリーレスのアブソリュートセンサ ABZO 搭載）。' +
    'モーターのコネクタからドライバー AZD-KD の CN2 へ、専用の接続ケーブル 1 本でつなぐ（動力とセンサの線をまとめたケーブル）。' +
    '電磁ブレーキ付き（AZM□□MK）は、無励磁作動形のブレーキのリード線 MB1（黒）・MB2（白）をドライバーの CN1 につなぎ、ドライバーが制御する。' +
    '電流はドライバーの主電源の入力電流（ドライバーの「モーター」のパラメータ）で扱う。',
  estimated: 'ブレーキのリード線の出る位置と外観は図面用に整理したもの（推定）',
};

export default def;
