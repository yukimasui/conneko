import { MELSERVO_J5, MR_J5_ENCODER } from '../mitsubishi/melservo';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * 三菱電機 ロータリサーボモーター HK-KT（MELSERVO-J5、低慣性・小容量、200V、3000r/min、26 ビットのバッテリーレスアブソリュートエンコーダー）。
 *
 * 出典: 三菱電機 FA サイト「仕様から探す」HK-KT_W / HK-KT_WB シリーズ（電磁ブレーキ: 無励磁作動形、DC24V −10%〜0%、HK-KT43WB で 7.9W）、
 *       HK-KT43W の定格電流 2.6A（販売店の仕様）。HK-KT13W・23W・7M3W の定格電流は同じ容量の HG-KR の値を推定として使った。
 * - 型式: HK-KT□W（電磁ブレーキなし）/ HK-KT□WB（電磁ブレーキ付き）。□は容量（13 = 100W、23 = 200W、43 = 400W、7M3 = 750W）。
 * - 動力（U・V・W・接地）・エンコーダー・電磁ブレーキはそれぞれのコネクタから、サーボアンプの CNP3・PE・CN2 と、ブレーキ電源（DC24V）へ専用ケーブルでつなぐ。
 *
 * 描き方: 盤外の機器のため実寸より縮めて横から描く。左に出力軸と角形のフランジ、右に黒いエンコーダー部、上にコネクタ。
 * 動力とブレーキのコネクタのピンを端子として上に出し、エンコーダーのコネクタを右の端に出す。
 */

const W = 230;
const H = 120;
const CY = 74;

const capOf = (p: ParamValues) => MELSERVO_J5.find((c) => c.motor === String(p.capacity)) ?? MELSERVO_J5[2];
const brakeOf = (p: ParamValues) => String(p.brake) === 'B';

/** 動力コネクタのピン（上に出す）: U・V・W・接地 */
const POWER = [
  { id: 'U', x: 140 },
  { id: 'V', x: 151 },
  { id: 'W', x: 162 },
  { id: 'E', x: 173 },
];
const POWER_Y = 18;
/** 電磁ブレーキのコネクタのピン */
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
  // フランジ角で胴の太さを少し変える（40 / 60 / 80mm）
  const half = c.flangeMm === 40 ? 24 : c.flangeMm === 60 ? 30 : 36;
  const bodyEnd = brake ? 186 : 176;
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#18191b"/>
      <stop offset="0.35" stop-color="#4a4d52"/>
      <stop offset="0.55" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    <linearGradient id="flange-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5d6064"/>
      <stop offset="0.4" stop-color="#a9adb2"/>
      <stop offset="1" stop-color="#4b4e52"/>
    </linearGradient>
    <linearGradient id="shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="${H - 4}" rx="${W / 2 - 14}" ry="3" fill="#000" fill-opacity="0.12"/>
  <!-- 出力軸 -->
  <rect x="6" y="${CY - 5}" width="30" height="10" rx="1.5" fill="url(#shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <!-- 角形フランジ（取付穴付き） -->
  <rect x="34" y="${CY - half - 8}" width="12" height="${2 * half + 16}" rx="1.5" fill="url(#flange-{{uid}})" stroke="#333" stroke-width="1"/>
  <circle cx="40" cy="${CY - half - 2}" r="2" fill="#222"/><circle cx="40" cy="${CY + half + 2}" r="2" fill="#222"/>
  <!-- 胴（固定子） -->
  <rect x="46" y="${CY - half}" width="${bodyEnd - 46}" height="${2 * half}" rx="3" fill="url(#body-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  ${brake ? `<line x1="150" y1="${CY - half}" x2="150" y2="${CY + half}" stroke="#666" stroke-width="0.8"/><text x="168" y="${CY + half - 4}" text-anchor="middle" font-family="sans-serif" font-size="4.2" fill="#d0d0d0">BRAKE</text>` : ''}
  <!-- エンコーダー部 -->
  <rect x="${bodyEnd}" y="${CY - half + 3}" width="${W - 12 - bodyEnd}" height="${2 * half - 6}" rx="4" fill="url(#body-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <!-- 銘板 -->
  <rect x="58" y="${CY - 12}" width="60" height="26" rx="1.5" fill="#d9dcd6" stroke="#6a6d68" stroke-width="0.7"/>
  <text x="88" y="${CY - 4}" text-anchor="middle" font-family="sans-serif" font-size="4" fill="#333">MITSUBISHI SERVO MOTOR</text>
  <text x="88" y="${CY + 4}" text-anchor="middle" font-family="sans-serif" font-size="6.4" font-weight="bold" fill="#111">HK-KT${c.motor}W${brake ? 'B' : ''}</text>
  <text x="88" y="${CY + 11}" text-anchor="middle" font-family="sans-serif" font-size="4.2" fill="#333">${c.watt}W 3000r/min ${c.motorCurrent}A</text>
  <!-- 動力コネクタ（上） -->
  <rect x="132" y="${POWER_Y - 8}" width="50" height="${CY - half - POWER_Y + 10}" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  ${POWER.map((t) => pin(t.x, POWER_Y) + `<text x="${t.x}" y="${POWER_Y + 11}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#eee">${t.id === 'E' ? '⏚' : t.id}</text>`).join('')}
  <text x="157" y="${POWER_Y + 17}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#aaa">POWER</text>
  ${
    brake
      ? `<!-- 電磁ブレーキのコネクタ（上） -->
  <rect x="97" y="${POWER_Y - 8}" width="25" height="${CY - half - POWER_Y + 10}" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  ${BRAKE.map((t) => pin(t.x, POWER_Y) + `<text x="${t.x}" y="${POWER_Y + 11}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#eee">${t.id}</text>`).join('')}
  <text x="109.5" y="${POWER_Y + 17}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#aaa">BRAKE</text>`
      : ''
  }
  <!-- エンコーダーのコネクタ（右の端） -->
  <rect x="${W - 14}" y="${CY - 9}" width="12" height="18" rx="2" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  <rect x="${W - 11}" y="${CY - 6}" width="6" height="12" rx="1" fill="#555"/>
  <text x="${W - 22}" y="${CY - half + 12}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#aaa">ENC</text>
`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const c = capOf(p);
  const out: TerminalDef[] = [
    ...POWER.filter((t) => t.id !== 'E').map(
      (t): TerminalDef => ({
        id: t.id,
        note: `動力（サーボアンプの ${t.id} へ。定格電流 ${c.motorCurrent}A）`,
        hint: '動力',
        x: t.x,
        y: POWER_Y,
        side: 'top',
        role: 'input',
        accepts: { system: 'AC', minVoltage: 170, maxVoltage: 240, conductors: ['R', 'S', 'T'] },
      }),
    ),
    { id: 'E', label: '⏚', note: '接地（サーボアンプの PE へ）', x: 173, y: POWER_Y, side: 'top', role: 'ground' },
    {
      id: 'ENC',
      label: 'エンコーダー',
      note: 'エンコーダーのコネクタ。サーボアンプ MR-J5 の CN2 へ、専用のエンコーダーケーブルでつなぐ',
      x: ENC.x,
      y: ENC.y,
      side: 'right',
      role: 'connector',
      connector: { kind: MR_J5_ENCODER, pins: 0, width: 14, required: true },
    },
  ];
  if (brakeOf(p)) {
    for (const t of BRAKE)
      out.push({
        id: t.id,
        note: '電磁ブレーキ（DC24V −10%〜0%、極性なし）。サーボアンプの MBR 出力で入り切りするリレーを通して DC24V をつなぐ',
        hint: 'ブレーキ',
        x: t.x,
        y: POWER_Y,
        side: 'top',
        role: 'input',
        accepts: { system: 'DC', minVoltage: 21.6, maxVoltage: 24, conductors: ['+', '-'] },
        // ブレーキのコイルの電流（モーターの動力の電流とは別の回路）
        loadCurrent: c.brakeCurrent,
      });
  }
  return out;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.hk-kt',
  name: 'サーボモーター',
  model: 'HK-KT43W',
  modelOf: (p) => `HK-KT${capOf(p).motor}W${brakeOf(p) ? 'B' : ''}`,
  maker: '三菱電機',
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
      options: MELSERVO_J5.map((c) => ({ value: c.motor, label: `HK-KT${c.motor}W（${c.watt}W、□${c.flangeMm}mm、MR-J5-${c.amp} 用）` })),
      default: '43',
    },
    {
      key: 'brake',
      label: '電磁ブレーキ',
      options: [
        { value: 'none', label: 'なし（HK-KT□W）' },
        { value: 'B', label: 'あり（HK-KT□WB、DC24V）' },
      ],
      default: 'none',
    },
  ],
  loadCurrent: (p) => capOf(p).motorCurrent,
  distinctGroups: [['U', 'V', 'W']],
  schematic: { elements: [{ kind: 'motor', terminals: ['U', 'V', 'W'] }] },
  description:
    '三菱電機のロータリサーボモーター HK-KT（MELSERVO-J5、低慣性・小容量、200V、定格 3000r/min、バッテリーレスアブソリュートエンコーダー）。' +
    '組み合わせるサーボアンプは MR-J5-10A（HK-KT13W）・20A（23W）・40A（43W）・70A（7M3W）。' +
    '動力 U・V・W はサーボアンプの U・V・W（CNP3）へ相をそろえてつなぎ（入れ替えると回らない）、接地はサーボアンプの PE へ。エンコーダーはサーボアンプの CN2 へ専用ケーブルでつなぐ。' +
    '電磁ブレーキ付き（HK-KT□WB）は B1・B2 に DC24V（−10%〜0%、極性なし）を入れると解除される無励磁作動形。ブレーキ電源はサーボアンプの MBR 出力で動くリレーと非常停止の接点で切る。' +
    '電源を直接つないではいけない（サーボアンプの出力でだけ回す）。',
  estimated:
    'HK-KT13W・23W・7M3W の定格電流は同じ容量の HG-KR の値（推定）。電磁ブレーキの電流は HK-KT43WB の 7.9W から求め、ほかの容量は推定。コネクタの位置は図面用に整理したもの',
};

export default def;
