import type { DeviceDefinition, ParamValues } from '../types';
import { OUTPUT_PARAM, cablePlug, outName, sensorCable } from '../keyence/sensor-parts';

/**
 * KEYENCE アンプ内蔵型 CMOS レーザセンサ LR-Z シリーズ（LR-ZB250CN / LR-ZB250CP など、M8 4ピンコネクタタイプ）。
 * 外形 28.7 × 43.1 × 14.5 mm（KEYENCE 外形寸法図より、1mm ≒ 2px）。図は側面（M3 取付穴 2 個）と背面（表示・ボタン）を並べた姿。
 * 底面の M8 4ピンコネクタに接続ケーブル（別売）を差す。
 *
 * M8 接続ケーブルの標準線色で端子を定義する:
 *   1 茶 = DC10〜30V、2 白 = 外部入力（チューニング / 投光停止）、3 青 = 0V、4 黒 = 制御出力
 * ※ピン 1〜4 と機能の対応は M8 4ピンセンサの標準的な割り当てによる推定（KEYENCE の入出力回路図は Web 非公開）。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/dimensions/
 */

const W = 110;
const H = 196;
const SX = 14;
const SY = 16;
const SW = 57;
const SH = 86;
const CN = { x: SX + 36, y: SY + SH };

const plug = cablePlug(CN.x, CN.y, 'M8');
const cable = sensorCable({
  cx: CN.x,
  y0: plug.y1,
  yFan: 160,
  yEnd: 192,
  pitch: 12,
  centerX: 52,
  vmin: 10,
  vmax: 30,
  leads: [
    { color: 'BN', label: '+V（DC10〜30V、M8 ピン1）', role: 'plus' },
    { color: 'WH', label: '外部入力 チューニング/投光停止（M8 ピン2）', role: 'in' },
    { color: 'BU', label: '0V（M8 ピン3）', role: 'minus' },
    { color: 'BK', label: '制御出力（NPN/PNP は出力形式による、M8 ピン4）', role: 'out' },
  ],
});

const svg = (p: ParamValues) => `
  <defs>
    <linearGradient id="lrbody-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
  </defs>
  <!-- 側面 -->
  <path d="M${SX} ${SY + 6} Q${SX} ${SY} ${SX + 8} ${SY} H${SX + SW - 6} Q${SX + SW} ${SY} ${SX + SW} ${SY + 6} V${SY + SH} H${SX} Z" fill="url(#lrbody-{{uid}})" stroke="#0a0a0b" stroke-width="0.9"/>
  <path d="M${SX + 3} ${SY + 4} q4 -6 14 -6 h14 l2 3 h-14 q-8 0 -12 6 z" fill="#f2a12a" stroke="#9a5f00" stroke-width="0.4"/>
  ${[SY + 13, SY + 64].map((cy) => `<circle cx="${SX + 9}" cy="${cy}" r="3.2" fill="#141516" stroke="#55585d" stroke-width="0.6"/><circle cx="${SX + 9}" cy="${cy}" r="1.5" fill="#050505"/>`).join('')}
  <text x="${SX + 32}" y="${SY + 36}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#c9ccd0">KEYENCE</text>
  <text x="${SX + 32}" y="${SY + 43}" text-anchor="middle" font-family="sans-serif" font-size="3.8" fill="#9a9ea3">LR-ZB250C${p.output === 'P' ? 'P' : 'N'}</text>
  <rect x="${SX + 20}" y="${SY + 52}" width="26" height="8" rx="1" fill="#e9ebed"/>
  <text x="${SX + 33}" y="${SY + 57.6}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#c00">CLASS 1 LASER</text>
  <!-- 背面（表示・ボタン） -->
  <rect x="${SX + SW + 4}" y="${SY + 2}" width="29" height="${SH - 2}" rx="3" fill="url(#lrbody-{{uid}})" stroke="#0a0a0b" stroke-width="0.8"/>
  <circle cx="${SX + SW + 18.5}" cy="${SY + 18}" r="4" fill="#c9ccd0" stroke="#6d7277" stroke-width="0.5"/>
  <rect x="${SX + SW + 8}" y="${SY + 28}" width="21" height="28" rx="1.5" fill="#0b0b0c" stroke="#55585c" stroke-width="0.5"/>
  <text x="${SX + SW + 18.5}" y="${SY + 46}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="bold" fill="#ff3b30">150</text>
  <circle cx="${SX + SW + 18.5}" cy="${SY + 66}" r="4" fill="#c9ccd0" stroke="#6d7277" stroke-width="0.5"/>
  <rect x="${SX + SW + 9}" y="${SY + 74}" width="4" height="2.4" rx="0.5" fill="#ffd21f"/>
  <rect x="${SX + SW + 15}" y="${SY + 74}" width="4" height="2.4" rx="0.5" fill="#ff9d2e"/>
  <rect x="${SX + SW + 21}" y="${SY + 74}" width="4" height="2.4" rx="0.5" fill="#45e05f"/>
  <!-- M8 コネクタ -->
  <rect x="${CN.x - 5}" y="${CN.y - 1}" width="10" height="4" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.4"/>
  ${plug.svg}
  ${cable.svg}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">CMOS レーザセンサ 35〜250mm・${outName(p)}</text>`;

const def: DeviceDefinition = {
  type: 'keyence.lr-zb250c',
  name: 'レーザセンサ（距離設定型）',
  model: 'LR-ZB250CN / LR-ZB250CP',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE のアンプ内蔵型 CMOS レーザセンサ LR-Z シリーズ LR-ZB250C（距離設定型、検出距離 35〜250mm、角型、M8 4ピンコネクタ）。出力形式は params の output で NPN（LR-ZB250CN）/PNP（LR-ZB250CP）を選ぶ。接続ケーブル（別売）の茶 = +24V、青 = 0V、黒 = 制御出力（オープンコレクタ 30V 100mA）、白 = 外部入力（チューニング / 投光停止）。電源 DC10〜30V、消費電流 24V 時 18mA 以下。ピンと線色の対応は M8 センサの標準割り当てによる推定。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  params: [OUTPUT_PARAM],
  loadCurrent: 0.018,
};

export default def;
