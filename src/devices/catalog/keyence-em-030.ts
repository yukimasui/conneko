import type { DeviceDefinition } from '../types';
import { sensorCable } from '../keyence/sensor-parts';

/**
 * KEYENCE アンプ内蔵型 近接センサ EM シリーズ EM-030（ø3 円柱形ヘッド、シールドタイプ、NPN、ケーブル 2m）。
 * 細いヘッドから出たケーブルの途中に円筒形のアンプ（出力表示灯 赤）があり、その先が 3 芯（茶・黒・青）になる。
 * 線色（KEYENCE 入出力回路図より）: 茶 = DC10.8〜30V、黒 = 制御出力（NPN オープンコレクタ 200mA）、青 = 0V。
 * 見た目は ø3 のヘッドが小さすぎるため拡大して描く。
 * 出典: https://www.keyence.co.jp/products/sensor/proximity/em/models/em-030/
 *       https://www.keyence.co.jp/products/sensor/proximity/em/models/em-030/io-circuit/
 */

const W = 60;
const H = 196;
const CX = 30;

const cable = sensorCable({
  cx: CX,
  y0: 128,
  yFan: 162,
  yEnd: 192,
  pitch: 12,
  vmin: 10.8,
  vmax: 30,
  leads: [
    { color: 'BN', label: '+V（DC10.8〜30V）', role: 'plus' },
    { color: 'BK', label: '制御出力（NPN）', role: 'out', signal: { dir: 'out', kind: 'npn' } },
    { color: 'BU', label: '0V', role: 'minus' },
  ],
});

const svg = `
  <defs>
    <linearGradient id="emsus-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8e949a"/>
      <stop offset="0.35" stop-color="#f2f4f6"/>
      <stop offset="0.7" stop-color="#b8bdc2"/>
      <stop offset="1" stop-color="#7b8187"/>
    </linearGradient>
  </defs>
  <!-- ヘッド（ø3、拡大） -->
  <rect x="${CX - 5}" y="16" width="10" height="34" rx="1" fill="url(#emsus-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  <rect x="${CX - 4.2}" y="14" width="8.4" height="3" rx="1" fill="#c8742a" stroke="#6d3a10" stroke-width="0.4"/>
  <text x="${CX + 8}" y="34" font-family="sans-serif" font-size="3.4" fill="#555">ø3</text>
  <!-- ヘッドからアンプまでの細いケーブル -->
  <path d="M${CX} 50 C${CX} 60 ${CX - 6} 66 ${CX} 76" fill="none" stroke="#2b2c2e" stroke-width="2.6" stroke-linecap="round"/>
  <!-- アンプ（円筒形） -->
  <rect x="${CX - 7}" y="76" width="14" height="52" rx="3" fill="url(#emsus-{{uid}})" stroke="#5c6166" stroke-width="0.6"/>
  <rect x="${CX - 7}" y="76" width="14" height="6" rx="2" fill="#2a2c2f"/>
  <rect x="${CX - 7}" y="122" width="14" height="6" rx="2" fill="#2a2c2f"/>
  <circle cx="${CX}" cy="92" r="2.2" fill="#ff3b30" stroke="#8a1a14" stroke-width="0.4"/>
  <text x="${CX}" y="106" text-anchor="middle" font-family="sans-serif" font-size="2.8" font-weight="bold" fill="#333" transform="rotate(-90 ${CX} 106)">KEYENCE</text>
  ${cable.svg}
  <text x="${W / 2}" y="8" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">EM-030・検出 0.6mm</text>`;

const def: DeviceDefinition = {
  type: 'keyence.em-030',
  name: '近接センサ（アンプ内蔵・小径）',
  model: 'EM-030',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE のアンプ内蔵型近接センサ EM-030（ø3 円柱形ヘッド、シールドタイプ、検出距離 0.6mm、N.O.、NPN オープンコレクタ 200mA、ケーブル 2m）。ケーブルの途中に円筒形のアンプ（出力表示灯 赤）がある。茶を +24V、青を 0V、黒（制御出力）を PLC の入力につなぐ（NPN なので PLC 入力の COM は +24V 側）。電源 DC10.8〜30V、消費電流 12mA 以下。',
  labelPrefix: 'PX',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  links: [{ from: 'BK', to: 'BU', switch: 'output', ratedCurrent: 0.2 }],
  loadCurrent: 0.012,
};

export default def;
