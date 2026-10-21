import type { DeviceDefinition, ParamValues, SignalSpec } from '../types';
import { ampBody, ampDefs } from '../keyence/amp';
import { OUTPUT_PARAM, sensorCable, sensorInput, sensorOutputLinks, switchedOut } from '../keyence/sensor-parts';

/** アナログ出力（設定で電圧 ±5V / 1〜5V / 0〜5V または電流 4〜20mA） */
const analogOut = (p: ParamValues): SignalSpec => ({ dir: 'out', kind: p.analog === 'I' ? 'analog-i' : 'analog-v' });

/**
 * KEYENCE CMOS レーザアプリセンサ IL シリーズ アンプ IL-1000（DIN レール取付・親機）。
 * 外形 76.3 × 37.4 mm（側面）。左端にセンサヘッド（IL-030 / IL-065 / IL-100 など、別売）のケーブルを接続する。
 * ケーブルの線色（KEYENCE 入出力回路図より）:
 *   茶 = DC10〜30V、青 = 0V、黒 = HIGH 判定出力、白 = LOW 判定出力、灰 = GO 判定出力、緑 = アラーム出力、
 *   水色の同軸ケーブル（橙 = アナログ出力 +、シールド = アナログ出力 GND）、
 *   桃 = 外部入力1（ゼロシフト）、黄 = 外部入力2（リセット）、桃/紫 = 外部入力3（タイミング）、紫 = 外部入力4（未使用）
 * 判定出力・アラーム出力は NPN/PNP 切換式。
 * 出典: https://www.keyence.co.jp/products/sensor/laser/il/models/il-1000/io-circuit/
 */

const W = 206;
const H = 158;
const BX = 34;
const BY = 22;
const BW = 152;
const BH = 75;

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
    { color: 'BK', label: 'HIGH 判定出力', role: 'out', signal: switchedOut },
    { color: 'WH', label: 'LOW 判定出力', role: 'out', signal: switchedOut },
    { color: 'GY', label: 'GO 判定出力', role: 'out', signal: switchedOut },
    { color: 'GN', label: 'アラーム出力', role: 'out', signal: switchedOut },
    { color: 'OG', label: 'アナログ出力 +（水色ケーブル内）', role: 'analog', signal: analogOut },
    { id: 'SH', color: 'SH', label: 'アナログ出力 GND（水色ケーブル内）', role: 'analog' },
    { color: 'PK', label: '外部入力1（ゼロシフト）', role: 'in', signal: sensorInput },
    { color: 'YE', label: '外部入力2（リセット）', role: 'in', signal: sensorInput },
    { id: 'PKVT', color: 'PKVT', label: '外部入力3（タイミング）', role: 'in', signal: sensorInput },
    { color: 'VT', label: '外部入力4（未使用）', role: 'in', signal: sensorInput },
  ],
});

const head = `
  <path d="M${BX - 2} ${BY + 56} C${BX - 20} ${BY + 60} 10 ${BY + 82} 16 ${BY + 100}" fill="none" stroke="#2b2c2e" stroke-width="3.6" stroke-linecap="round"/>
  <rect x="2" y="${BY + 100}" width="28" height="18" rx="2" fill="#e8eaec" stroke="#7d8287" stroke-width="0.6"/>
  <rect x="5" y="${BY + 112}" width="10" height="4" rx="1" fill="#2a2c30"/>
  <circle cx="23" cy="${BY + 108}" r="2" fill="#ff3b30"/>
  <text x="16" y="${BY + 125}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">ヘッド IL-□□□</text>`;

const def: DeviceDefinition = {
  type: 'keyence.il-1000',
  name: 'レーザ変位センサ アンプ',
  model: 'IL-1000',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE の CMOS レーザアプリセンサ IL シリーズのアンプ IL-1000（DIN レール取付・親機）。センサヘッド（IL-030 / IL-065 / IL-100 / IL-300 など）は別売。判定出力 HIGH（黒）・LOW（白）・GO（灰）とアラーム出力（緑）は NPN/PNP 切換式のオープンコレクタ（params の output）で PLC の入力へ、アナログ出力（±5V / 1〜5V / 0〜5V / 4〜20mA を選択。params の analog）は水色の同軸ケーブル（橙 = +、シールド = GND）から PLC のアナログ入力ユニットへつなぐ。外部入力は桃（ゼロシフト）・黄（リセット）・桃/紫（タイミング）・紫（未使用）で、NPN 設定では 0V と、PNP 設定では +V と短絡して入力する（無電圧入力）。電源 DC10〜30V、消費電力 2.3W 以下（30V 時 77mA）。',
  labelPrefix: 'DS',
  width: W,
  height: H,
  svg: `${ampDefs}${cable.svg}${head}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: 'IL-1000', top: '-12.345', bottom: '12.345', left: 'head', series: 'IL' })}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">変位センサアンプ（判定3出力・アラーム・アナログ）</text>`,
  terminals: cable.terminals,
  // 判定出力・アラーム出力は ON で NPN なら 0V、PNP なら +V と導通する（1 点の定格電流は公開資料で未確認のため書かない）
  links: sensorOutputLinks(['BK', 'WH', 'GY', 'GN'], undefined),
  params: [
    { ...OUTPUT_PARAM, label: '出力形式（アンプの設定）' },
    {
      key: 'analog',
      label: 'アナログ出力（アンプの設定）',
      options: [
        { value: 'V', label: '電圧（±5V / 1〜5V / 0〜5V）' },
        { value: 'I', label: '電流（4〜20mA）' },
      ],
      default: 'V',
    },
  ],
  loadCurrent: 0.077,
};

export default def;
