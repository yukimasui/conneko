import type { DeviceDefinition } from '../types';
import { ampBody, ampDefs } from '../keyence/amp';
import { FSN_HOST_BUS } from '../keyence/fs-n';
import { OUTPUT_PARAM, outName, sensorCable, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/**
 * KEYENCE デジタルファイバセンサ FS-N40 シリーズ アンプ FS-N41N / FS-N41P（ケーブルタイプ・親機、1 出力）。
 * 外形 76.8 × 30.5 × 10.7 mm（DIN レール取付）。図は側面から見た姿で、左端にファイバ差込口（T: 投光、R: 受光）。
 * ケーブル: ø3.9 3芯（茶・青・黒）、2m（KEYENCE 外形寸法図より）。茶 = DC10〜30V、青 = 0V、黒 = 制御出力。
 * ファイバユニット（FU シリーズ）は別売。
 * 出典: https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n41n/
 *       https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n41n/dimensions/
 */

const W = 176;
const H = 150;
const BX = 14;
const BY = 22;
const BW = 154;
const BH = 61;

const cable = sensorCable({
  cx: BX + BW - 8,
  y0: BY + BH - 2,
  yFan: 116,
  yEnd: 146,
  pitch: 11,
  centerX: BX + BW - 26,
  vmin: 10,
  vmax: 30,
  leads: [
    { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
    { color: 'BU', label: '0V', role: 'minus' },
    { color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut },
  ],
});

/** ファイバ（投光・受光の 2 本） */
const fibers = `
  <path d="M${BX + 1} ${BY + BH * 0.42 + 6} C${BX - 8} ${BY + 40} -4 ${BY + 70} 4 ${BY + 104}" fill="none" stroke="#2f3236" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${BX + 1} ${BY + BH * 0.42 + 13} C${BX - 4} ${BY + 50} 2 ${BY + 75} 10 ${BY + 104}" fill="none" stroke="#2f3236" stroke-width="2.2" stroke-linecap="round"/>
  <text x="8" y="${BY + 112}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">ファイバ</text>`;

const def: DeviceDefinition = {
  type: 'keyence.fs-n41',
  name: 'ファイバアンプ',
  model: 'FS-N41N / FS-N41P',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE のデジタルファイバセンサ アンプ FS-N41（FS-N40 シリーズ、ケーブルタイプ親機、1 出力、DIN レール取付）。出力形式は params の output で NPN（FS-N41N）/PNP（FS-N41P）を選ぶ。ケーブルは 3 芯で、茶を +24V、青を 0V、黒（制御出力、オープンコレクタ 30V 100mA）を PLC の入力につなぐ。左端にファイバユニット（FU シリーズ、別売）の投光・受光ファイバを差し込む。電源 DC10〜30V、消費電流 24V 時 34mA 以下。子機（FS-N42）を最大 16 台連結でき、子機の電源は親機から供給される。',
  labelPrefix: 'FS',
  width: W,
  height: H,
  svg: (p) => `${ampDefs}${cable.svg}${fibers}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: `FS-N41${p.output === 'P' ? 'P' : 'N'}`, top: '9999', bottom: '9999', left: 'fiber', accent: '#d8262a', series: 'FS-N40' })}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">ファイバアンプ 1出力・${outName(p)}</text>`,
  terminals: cable.terminals,
  links: sensorOutputLinks(['BK'], 0.1),
  params: [OUTPUT_PARAM],
  loadCurrent: 0.034,
  // 子機（FS-N42 / FS-N44）を最大 16 台連結できる
  bus: FSN_HOST_BUS,
};

export default def;
