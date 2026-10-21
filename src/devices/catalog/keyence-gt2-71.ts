import type { DeviceDefinition } from '../types';
import { ampBody, ampDefs } from '../keyence/amp';
import { OUTPUT_PARAM, outName, sensorCable, sensorInput, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/**
 * KEYENCE 高精度接触式デジタルセンサ GT2 シリーズ アンプ GT2-71N / GT2-71P（DIN レール取付・親機、バラ線タイプ）。
 * 外形 75.8 × 36.9 mm（側面）。左端にセンサヘッド（GT2-H12 / GT2-P12 など、別売）のケーブルを接続する。
 * ケーブル: ø4.7 12芯（茶・青 0.20mm²、黒・白・灰・橙・緑・桃・紫・黄・赤・紫/桃 0.15mm²）、2m（KEYENCE 外形寸法図より）。
 * 線色（KEYENCE 入出力回路図より）: 茶 = DC10〜30V、青 = 0V、
 *   橙 = HH 出力、黒 = HI 出力、灰 = GO 出力、白 = LO 出力、緑 = LL 出力（NPN/PNP オープンコレクタ 40V 50mA）、
 *   桃 = プリセット入力、紫 = バンク A 入力、桃/紫 = タイミング入力、黄 = バンク B 入力、赤 = リセット入力（無電圧入力）。
 * 出典: https://www.keyence.co.jp/products/sensor/contact/gt2/models/gt2-71n/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/contact/gt2/models/gt2-71n/dimensions/
 */

const W = 206;
const H = 158;
const BX = 34;
const BY = 22;
const BW = 152;
const BH = 74;

const cable = sensorCable({
  cx: BX + BW - 8,
  y0: BY + BH - 2,
  yFan: 122,
  yEnd: 154,
  pitch: 12.5,
  centerX: 120,
  vmin: 10,
  vmax: 30,
  leads: [
    { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
    { color: 'BU', label: '0V', role: 'minus' },
    { color: 'OG', label: 'HH 出力', role: 'out', signal: switchedOut },
    { color: 'BK', label: 'HI 出力', role: 'out', signal: switchedOut },
    { color: 'GY', label: 'GO 出力', role: 'out', signal: switchedOut },
    { color: 'WH', label: 'LO 出力', role: 'out', signal: switchedOut },
    { color: 'GN', label: 'LL 出力', role: 'out', signal: switchedOut },
    { color: 'PK', label: 'プリセット入力', role: 'in', signal: sensorInput },
    { color: 'VT', label: 'バンク A 入力', role: 'in', signal: sensorInput },
    { id: 'PKVT', color: 'PKVT', label: 'タイミング入力', role: 'in', signal: sensorInput },
    { color: 'YE', label: 'バンク B 入力', role: 'in', signal: sensorInput },
    { color: 'RD', label: 'リセット入力', role: 'in', signal: sensorInput },
  ],
});

/** 接触式センサヘッド（ペン型プローブ） */
const head = `
  <path d="M${BX - 2} ${BY + 55} C${BX - 20} ${BY + 60} 12 ${BY + 76} 14 ${BY + 90}" fill="none" stroke="#2b2c2e" stroke-width="3.4" stroke-linecap="round"/>
  <rect x="9" y="${BY + 90}" width="10" height="26" rx="1.5" fill="url(#gtprobe-{{uid}})" stroke="#6d7277" stroke-width="0.6"/>
  <rect x="11.5" y="${BY + 116}" width="5" height="6" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.4"/>
  <rect x="13.2" y="${BY + 122}" width="1.6" height="5" fill="#d9dcdf"/>
  <circle cx="14" cy="${BY + 127.5}" r="1.4" fill="#e8b0b0" stroke="#8a5050" stroke-width="0.3"/>
  <text x="26" y="${BY + 108}" font-family="sans-serif" font-size="3.2" fill="#555">ヘッド</text>
  <text x="26" y="${BY + 112}" font-family="sans-serif" font-size="3.2" fill="#555">GT2-□</text>`;

const def: DeviceDefinition = {
  type: 'keyence.gt2-71',
  name: '接触式変位センサ アンプ',
  model: 'GT2-71N / GT2-71P',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE の高精度接触式デジタルセンサ GT2 シリーズのアンプ GT2-71（DIN レール取付・親機、12 芯バラ線ケーブル）。センサヘッド（GT2-H12 / GT2-P12 など）は別売。出力形式は params の output で NPN（GT2-71N）/PNP（GT2-71P）を選ぶ。判定出力 HH（橙）・HI（黒）・GO（灰）・LO（白）・LL（緑）はオープンコレクタ（40V 50mA、N.O./N.C. 切換）で PLC の入力へ。制御入力 プリセット（桃）・バンク A（紫）・タイミング（桃/紫）・バンク B（黄）・リセット（赤）は無電圧入力（NPN タイプは 0V と、PNP タイプは +V と短絡で ON）。電源 DC10〜30V、消費電力 2.2W 以下（30V 時 73.3mA）。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg: (p) => `${ampDefs}
  <defs>
    <linearGradient id="gtprobe-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.4" stop-color="#eef0f2"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
  </defs>
  ${cable.svg}${head}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: `GT2-71${p.output === 'P' ? 'P' : 'N'}`, top: '1.2345', left: 'head', series: 'GT2' })}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">接触式センサアンプ 5出力・${outName(p)}</text>`,
  terminals: cable.terminals,
  // 判定出力はオープンコレクタ 40V 50mA
  links: sensorOutputLinks(['OG', 'BK', 'GY', 'WH', 'GN'], 0.05),
  params: [OUTPUT_PARAM],
  loadCurrent: 0.074,
};

export default def;
