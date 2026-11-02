import { BLE2, BLE2_MOTOR_CONNECTOR, ble2Of } from '../oriental/ble2';
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * オリエンタルモーター ブラシレスモーター BLE2 シリーズのモーター BLM□HP-AS（丸シャフトタイプ）。
 * 出典は src/devices/oriental/ble2.ts。
 *
 * - モーターのケーブルの先のコネクタから、ドライバー BLE2D の CN2 へ専用の接続ケーブル（動力・ホールセンサー一体）でつなぐ。
 *   電源を直接つなぐ端子はない（ドライバーの出力でだけ回る）。
 * - ギヤヘッド付き（GFS タイプ）・中空軸フラットギヤ（FR タイプ）・電磁ブレーキ付きもあるが、この定義では丸シャフトタイプだけを扱う。
 *
 * 描き方: 盤外の機器のため横から描く。左に出力軸、角形のフランジ、アルミの胴、右の端から出るリード線とコネクタ。寸法は推定。
 */

const W = 220;
const H = 120;
const CY = 62;
const CN = { x: W - 4, y: 106 };

const svg = (p: ParamValues) => {
  const c = ble2Of(p.watt);
  const half = c.sizeMm === 60 ? 26 : c.sizeMm === 80 ? 32 : c.sizeMm === 90 ? 36 : 40;
  const len = 70 + (c.watt >= 120 ? 18 : 0);
  const x0 = 36;
  const bodyEnd = x0 + 10 + len;
  return `
  <defs>
    <linearGradient id="blm-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7f858c"/>
      <stop offset="0.3" stop-color="#e3e6e9"/>
      <stop offset="0.55" stop-color="#b5bac0"/>
      <stop offset="1" stop-color="#6c7178"/>
    </linearGradient>
    <linearGradient id="blm-flange-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c6168"/>
      <stop offset="0.4" stop-color="#c4c9ce"/>
      <stop offset="1" stop-color="#4f545a"/>
    </linearGradient>
    <linearGradient id="blm-shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2 - 10}" cy="${H - 4}" rx="${W / 2 - 24}" ry="3" fill="#000" fill-opacity="0.12"/>
  <!-- 出力軸 -->
  <rect x="8" y="${CY - 5}" width="${x0 - 8}" height="10" rx="1.5" fill="url(#blm-shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <!-- フランジ -->
  <rect x="${x0}" y="${CY - half - 4}" width="10" height="${2 * half + 8}" rx="1.5" fill="url(#blm-flange-{{uid}})" stroke="#333" stroke-width="0.9"/>
  <circle cx="${x0 + 5}" cy="${CY - half + 1}" r="1.8" fill="#222"/><circle cx="${x0 + 5}" cy="${CY + half - 1}" r="1.8" fill="#222"/>
  <!-- 胴（アルミのフレーム、放熱の溝） -->
  <rect x="${x0 + 10}" y="${CY - half}" width="${len}" height="${2 * half}" rx="3" fill="url(#blm-body-{{uid}})" stroke="#4a4f55" stroke-width="0.9"/>
  <g stroke="#5c6168" stroke-opacity="0.45" stroke-width="0.8">${Array.from({ length: 5 }, (_, i) => `<line x1="${x0 + 14}" y1="${CY - half + 6 + i * ((2 * half - 12) / 4)}" x2="${bodyEnd - 4}" y2="${CY - half + 6 + i * ((2 * half - 12) / 4)}"/>`).join('')}</g>
  <!-- 反出力側のカバー -->
  <rect x="${bodyEnd}" y="${CY - half + 4}" width="12" height="${2 * half - 8}" rx="3" fill="#2b2d30" stroke="#111" stroke-width="0.8"/>
  <!-- ラベル -->
  <rect x="${x0 + 18}" y="${CY - 11}" width="58" height="22" rx="1.2" fill="#f1f1ee" stroke="#777" stroke-width="0.6"/>
  <text x="${x0 + 47}" y="${CY - 4}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#333">ORIENTAL MOTOR BLE2</text>
  <text x="${x0 + 47}" y="${CY + 3.5}" text-anchor="middle" font-family="sans-serif" font-size="5.4" font-weight="bold" fill="#111">${c.motor}</text>
  <text x="${x0 + 47}" y="${CY + 9}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#333">${c.watt}W □${c.sizeMm}mm</text>
  <!-- リード線（動力・センサー）とコネクタ -->
  <path d="M${bodyEnd + 12} ${CY + 6} C${bodyEnd + 30} ${CY + 6} ${CN.x - 40} ${CN.y} ${CN.x - 14} ${CN.y}" fill="none" stroke="#1d1e20" stroke-width="5" stroke-linecap="round"/>
  <path d="M${bodyEnd + 12} ${CY + 6} C${bodyEnd + 30} ${CY + 6} ${CN.x - 40} ${CN.y} ${CN.x - 14} ${CN.y}" fill="none" stroke="#4a4d52" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="${CN.x - 16}" y="${CN.y - 7}" width="14" height="14" rx="2" fill="#f2f2ef" stroke="#555" stroke-width="0.7"/>
  <rect x="${CN.x - 13}" y="${CN.y - 4.5}" width="8" height="9" rx="1" fill="#c9cbc6"/>
  <text x="${CN.x - 9}" y="${CN.y - 10}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">MOTOR</text>
`;
};

const terminals: TerminalDef[] = [
  {
    id: 'CN',
    label: 'モーターのコネクタ',
    hint: 'ドライバーへ',
    note: 'モーターのリード線の先のコネクタ（動力・センサー）。ドライバー BLE2D の CN2 へ、専用の接続ケーブルでつなぐ',
    x: CN.x,
    y: CN.y,
    side: 'right',
    role: 'connector',
    connector: { kind: BLE2_MOTOR_CONNECTOR, pins: 0, width: 12, required: true },
  },
];

const def: DeviceDefinition = {
  type: 'oriental.blm',
  name: 'ブラシレスモーター',
  model: 'BLM5120HP-AS',
  modelOf: (p) => ble2Of(p.watt).motor,
  maker: 'オリエンタルモーター',
  category: 'load',
  labelPrefix: 'M',
  width: W,
  height: H,
  svg,
  terminals,
  params: [{ key: 'watt', label: '容量', options: BLE2.map((c) => ({ value: String(c.watt), label: `${c.motor}（${c.watt}W、BLE2D${c.driver} 用）` })), default: '120' }],
  description:
    'オリエンタルモーターのブラシレスモーター BLE2 シリーズのモーター（丸シャフトタイプ）。ドライバー BLE2D□ と組み合わせて速度制御する（80〜4000r/min）。' +
    'モーターのコネクタからドライバーの CN2 へ専用の接続ケーブルでつなぐ（電源を直接つなぐ端子はない）。コンベヤ・搬送など、インバーターと誘導モーターより広い速度範囲・一定の速度が要るところに使う。' +
    'ギヤヘッド付き・電磁ブレーキ付きは、ドライバー・ケーブルの組み合わせが変わる。',
  estimated: '取付角・外観・リード線の長さと位置（推定）',
};

export default def;
