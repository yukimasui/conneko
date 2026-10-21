import type { DeviceDefinition } from '../types';
import { pzgDefs, pzgHead } from '../keyence/pz-g';
import { OUTPUT_PARAM, outName, sensorCable, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/**
 * KEYENCE アンプ内蔵型光電センサ PZ-G51N / PZ-G51P（透過型、角型、ケーブル 2m）。投光器と受光器の 1 組。
 * 線色（KEYENCE 入出力回路図・外形寸法図より）:
 *   投光器: 2芯（茶 = DC10〜30V、青 = 0V）
 *   受光器: 3芯（茶 = DC10〜30V、黒 = 制御出力、青 = 0V）
 * 端子ID は投光器が 'T-BN' / 'T-BU'、受光器が 'R-BN' / 'R-BU' / 'R-BK'。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g51n/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g51n/io-circuit/
 */

const W = 130;
const H = 168;

const tx = sensorCable({
  cx: 41,
  y0: 78,
  yFan: 132,
  yEnd: 164,
  pitch: 11,
  centerX: 32,
  vmin: 10,
  vmax: 30,
  leads: [
    { id: 'T-BN', color: 'BN', label: '投光器 +V（DC10〜30V）', role: 'plus' },
    { id: 'T-BU', color: 'BU', label: '投光器 0V', role: 'minus' },
  ],
});
const rx = sensorCable({
  cx: 106,
  y0: 78,
  yFan: 132,
  yEnd: 164,
  pitch: 11,
  centerX: 97,
  vmin: 10,
  vmax: 30,
  leads: [
    { id: 'R-BN', color: 'BN', label: '受光器 +V（DC10〜30V）', role: 'plus' },
    { id: 'R-BU', color: 'BU', label: '受光器 0V', role: 'minus' },
    { id: 'R-BK', color: 'BK', label: '受光器 制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut },
  ],
});

const def: DeviceDefinition = {
  type: 'keyence.pz-g51',
  name: '光電センサ（透過型）',
  model: 'PZ-G51N / PZ-G51P',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE のアンプ内蔵型光電センサ PZ-G51（透過型、検出距離 20m、角型 20×31mm、ケーブル 2m）。投光器（2芯: 茶・青）と受光器（3芯: 茶・青・黒）の 1 組で、両方に電源（茶 = +24V、青 = 0V）が必要。受光器の黒（制御出力、オープンコレクタ 30V 100mA）を PLC の入力につなぐ。出力形式は params の output で NPN（PZ-G51N）/PNP（PZ-G51P）を選ぶ。電源 DC10〜30V、消費電流 投光器 20mA・受光器 28mA 以下。',
  labelPrefix: 'PH',
  width: W,
  height: H,
  svg: (p) => `${pzgDefs}${tx.svg}${rx.svg}
  ${pzgHead(10, 12, `PZ-G51${p.output === 'P' ? 'P' : 'N'}`, 'emitter')}
  ${pzgHead(75, 12, `PZ-G51${p.output === 'P' ? 'P' : 'N'}`, 'receiver')}  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">透過型 20m・${outName(p)}</text>`,
  terminals: (p) => [...tx.terminals(p), ...rx.terminals(p)],
  links: sensorOutputLinks(['R-BK'], 0.1, { plus: 'R-BN', minus: 'R-BU' }),
  params: [OUTPUT_PARAM],
  loadCurrent: 0.048,
};

export default def;
