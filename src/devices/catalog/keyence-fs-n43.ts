import type { DeviceDefinition } from '../types';
import { ampBody, ampDefs } from '../keyence/amp';
import { FSN_HOST_BUS } from '../keyence/fs-n';
import { OUTPUT_PARAM, outName, sensorCable, sensorInput, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/**
 * KEYENCE デジタルファイバセンサ FS-N40 シリーズ アンプ FS-N43N / FS-N43P（ケーブルタイプ・親機、2 出力 + 外部入力 1）。
 * 外形 76.8 × 30.5 × 10.7 mm（DIN レール取付）。ケーブル: ø3.9 5芯（茶・青 0.34mm²、黒・白・桃 0.18mm²）、2m
 * （KEYENCE 外形寸法図より）。茶 = DC10〜30V、青 = 0V、黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力。
 * 黒・白・桃の機能は FS-N40 シリーズ ユーザーズマニュアル p.3 の入出力回路図で確認（https://www.autodev.com/uploads/resources/220779_8830-sensor-instructions.pdf、第三者の転載）。
 * 出典: https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n43n/
 *       https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n41n/dimensions/
 */

const W = 190;
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
  centerX: BX + BW - 18,
  vmin: 10,
  vmax: 30,
  leads: [
    { color: 'BN', label: '+V（DC10〜30V）', role: 'plus' },
    { color: 'BU', label: '0V', role: 'minus' },
    { color: 'BK', label: '制御出力1', role: 'out', signal: switchedOut },
    { color: 'WH', label: '制御出力2', role: 'out', signal: switchedOut },
    { color: 'PK', label: '外部入力', role: 'in', signal: sensorInput },
  ],
});

const fibers = `
  <path d="M${BX + 1} ${BY + BH * 0.42 + 6} C${BX - 8} ${BY + 40} -4 ${BY + 70} 4 ${BY + 104}" fill="none" stroke="#2f3236" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${BX + 1} ${BY + BH * 0.42 + 13} C${BX - 4} ${BY + 50} 2 ${BY + 75} 10 ${BY + 104}" fill="none" stroke="#2f3236" stroke-width="2.2" stroke-linecap="round"/>
  <text x="8" y="${BY + 112}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">ファイバ</text>`;

const def: DeviceDefinition = {
  type: 'keyence.fs-n43',
  name: 'ファイバアンプ',
  model: 'FS-N43N / FS-N43P',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE のデジタルファイバセンサ アンプ FS-N43（FS-N40 シリーズ、ケーブルタイプ親機、2 出力 + 外部入力 1、DIN レール取付）。出力形式は params の output で NPN（FS-N43N）/PNP（FS-N43P）を選ぶ。ケーブルは 5 芯で、茶 = +24V、青 = 0V、黒 = 制御出力1、白 = 制御出力2（オープンコレクタ 30V、2 出力合計 100mA）、桃 = 外部入力（チューニング・投光停止など）。外部入力は NPN タイプは 0V、PNP タイプは +V と短絡で ON。電源 DC10〜30V、消費電流 24V 時 34mA 以下。',
  labelPrefix: 'FS',
  width: W,
  height: H,
  svg: (p) => `${ampDefs}${cable.svg}${fibers}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: `FS-N43${p.output === 'P' ? 'P' : 'N'}`, top: '9999', bottom: '9999', left: 'fiber', accent: '#d8262a', series: 'FS-N40' })}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">ファイバアンプ 2出力+外部入力・${outName(p)}</text>`,
  terminals: cable.terminals,
  // 1 出力 100mA、2 出力の合計でも 100mA
  links: sensorOutputLinks(['BK', 'WH'], 0.1),
  commonLimits: [{ outputs: ['BK', 'WH'], current: 0.1, label: '制御出力 1・2 の合計' }],
  params: [OUTPUT_PARAM],
  loadCurrent: 0.034,
  // 子機（FS-N42 / FS-N44）を最大 16 台連結できる
  bus: FSN_HOST_BUS,
};

export default def;
