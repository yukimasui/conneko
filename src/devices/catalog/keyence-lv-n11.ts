import type { DeviceDefinition } from '../types';
import { ampBody, ampDefs } from '../keyence/amp';
import { OUTPUT_PARAM, outName, sensorCable, sensorInput, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/**
 * KEYENCE デジタルレーザセンサ LV-N シリーズ アンプ LV-N11N / LV-N11P（ケーブルタイプ・親機、2 出力 + 外部入力 1）。
 * 外形 78.7 × 32.6 × 9.8 mm（DIN レール取付）。左端にセンサヘッド（LV-NH シリーズ、別売）のケーブルを差し込む。
 * ケーブル: ø3.9 5芯（茶・青 0.34mm²、黒・白・桃 0.18mm²）、2m（KEYENCE 外形寸法図より）。
 * 茶 = DC10〜30V、青 = 0V、黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力（仕様: 制御出力 2、外部入力 1）。
 * ※黒・白・桃の機能の割り当ては KEYENCE アンプの慣例による（入出力回路図は Web 非公開）。
 * 出典: https://www.keyence.co.jp/products/sensor/laser/lv-n/models/lv-n11n/
 *       https://www.keyence.co.jp/products/sensor/laser/lv-n/models/lv-n11n/dimensions/
 */

const W = 196;
const H = 150;
const BX = 24;
const BY = 22;
const BW = 157;
const BH = 65;

const cable = sensorCable({
  cx: BX + BW - 8,
  y0: BY + BH - 2,
  yFan: 116,
  yEnd: 146,
  pitch: 11,
  centerX: BX + BW - 20,
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

/** センサヘッドへのケーブル */
const head = `
  <path d="M${BX - 2} ${BY + 46} C${BX - 14} ${BY + 50} 6 ${BY + 80} 12 ${BY + 104}" fill="none" stroke="#2b2c2e" stroke-width="3.4" stroke-linecap="round"/>
  <rect x="2" y="${BY + 104}" width="22" height="13" rx="1.5" fill="#c9ccd0" stroke="#6d7277" stroke-width="0.6"/>
  <circle cx="8" cy="${BY + 110.5}" r="2.6" fill="#2a8a3a" stroke="#155a22" stroke-width="0.5"/>
  <text x="13" y="${BY + 124}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">ヘッド LV-NH</text>`;

const def: DeviceDefinition = {
  type: 'keyence.lv-n11',
  name: 'レーザセンサ アンプ',
  model: 'LV-N11N / LV-N11P',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE のデジタルレーザセンサ LV-N シリーズのアンプ LV-N11（ケーブルタイプ親機、2 出力 + 外部入力 1、DIN レール取付）。センサヘッド（LV-NH シリーズ）は別売。出力形式は params の output で NPN（LV-N11N）/PNP（LV-N11P）を選ぶ。ケーブルは 5 芯で、茶 = +24V、青 = 0V、黒 = 制御出力1、白 = 制御出力2（オープンコレクタ 30V、2 出力合計 100mA）、桃 = 外部入力。電源 DC24V（動作 DC10〜30V）、消費電流 24V 時 30mA 以下。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg: (p) => `${ampDefs}${cable.svg}${head}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: `LV-N11${p.output === 'P' ? 'P' : 'N'}`, top: '3500', bottom: '3000', left: 'head', series: 'LV-N' })}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">レーザアンプ 2出力+外部入力・${outName(p)}</text>`,
  terminals: cable.terminals,
  // 2 出力の合計で 100mA（1 点あたりの上限として 0.1A を書く）
  links: sensorOutputLinks(['BK', 'WH'], 0.1),
  params: [OUTPUT_PARAM],
  loadCurrent: 0.03,
};

export default def;
