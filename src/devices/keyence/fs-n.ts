/**
 * KEYENCE デジタルファイバセンサ FS-N40 シリーズ（アンプ）の共通部品。
 *
 * 親機（FS-N41 / FS-N43）は電源線を持ち、子機（FS-N42 / FS-N44）は親機の横に連結して親機から電源をもらう
 * （子機のケーブルは出力・外部入力の線だけ）。子機は最大 16 台（2 出力タイプは 2 台分）連結できる。
 * Conneko では親機に bus.host（kind 'fs-n40'、16 台）を書き、子機は mount で親機に装着する。
 *
 * 子機のケーブル（KEYENCE 外形寸法図より）: FS-N42 は ø2.6 1芯（黒）、FS-N44 は ø3.9 3芯（黒・白・桃）。
 * 黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力（FS-N40 シリーズ ユーザーズマニュアル p.3 の入出力回路図）。
 * 出典: https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/specs/
 *       https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n42n/dimensions/
 *       FS-N40 ユーザーズマニュアル（第三者の転載）: https://www.autodev.com/uploads/resources/220779_8830-sensor-instructions.pdf
 */
import type { BusSpec, DeviceDefinition } from '../types';
import { ampBody, ampDefs } from './amp';
import { OUTPUT_PARAM, outName, sensorCable, sensorInput, switchedOut, type Lead } from './sensor-parts';

/** 親機の bus（子機を 16 台まで連結） */
export const FSN_HOST_BUS: BusSpec = { kind: 'fs-n40', host: { slots: 16 } };
/** 子機の bus */
export const FSN_UNIT_BUS: BusSpec = { kind: 'fs-n40' };

/** 左端から出るファイバ（投光・受光の 2 本）。BX, BY, BH はアンプ本体の位置と高さ */
export const fsnFibers = (BX: number, BY: number, BH: number) => `
  <path d="M${BX + 1} ${BY + BH * 0.42 + 6} C${BX - 8} ${BY + 40} -4 ${BY + 70} 4 ${BY + 104}" fill="none" stroke="#2f3236" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M${BX + 1} ${BY + BH * 0.42 + 13} C${BX - 4} ${BY + 50} 2 ${BY + 75} 10 ${BY + 104}" fill="none" stroke="#2f3236" stroke-width="2.2" stroke-linecap="round"/>
  <text x="8" y="${BY + 112}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">ファイバ</text>`;

/** 子機（FS-N42: 1 出力、FS-N44: 2 出力 + 外部入力） */
export function buildFsnExpansion(series: 'FS-N42' | 'FS-N44'): DeviceDefinition {
  const two = series === 'FS-N44';
  const W = 176;
  const H = 150;
  const BX = 14;
  const BY = 22;
  const BW = 154;
  const BH = 61;
  const leads: Lead[] = two
    ? [
        { color: 'BK', label: '制御出力1', role: 'out', signal: switchedOut },
        { color: 'WH', label: '制御出力2', role: 'out', signal: switchedOut },
        { color: 'PK', label: '外部入力', role: 'in', signal: sensorInput },
      ]
    : [{ color: 'BK', label: '制御出力（NPN/PNP は出力形式による）', role: 'out', signal: switchedOut }];
  const cable = sensorCable({
    cx: BX + BW - 8,
    y0: BY + BH - 2,
    yFan: 116,
    yEnd: 146,
    pitch: 11,
    centerX: BX + BW - (two ? 18 : 8),
    vmin: 10,
    vmax: 30,
    leads,
  });
  return {
    type: `keyence.${series.toLowerCase()}`,
    name: 'ファイバアンプ（子機）',
    model: `${series}N / ${series}P`,
    maker: 'KEYENCE',
    category: 'sensor',
    description:
      `KEYENCE のデジタルファイバセンサ アンプ ${series}（FS-N40 シリーズ、ケーブルタイプ子機、${two ? '2 出力 + 外部入力 1' : '1 出力'}、DIN レール取付）。` +
      '親機（FS-N41 / FS-N43）の横に連結して使い、電源は親機から供給される（子機のケーブルに電源線はない）。図面では mount で親機に装着する（最大 16 台、2 出力タイプは 2 台分）。' +
      `出力形式は params の output で NPN（${series}N）/PNP（${series}P）を選ぶ。` +
      (two
        ? 'ケーブルは 3 芯で、黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力（チューニング・投光停止など）。NPN タイプの外部入力は 0V、PNP タイプは +V と短絡で ON。'
        : 'ケーブルは 1 芯（黒 = 制御出力）。') +
      '制御出力はオープンコレクタ 30V 以下、増設時は 1 台あたり 20mA 以下。電源線がないため、出力に負荷を直接つないでも電源の経路はチェックされない（PLC の入力につなぐ）。',
    labelPrefix: 'FS',
    width: W,
    height: H,
    svg: (p) => `${ampDefs}${cable.svg}${fsnFibers(BX, BY, BH)}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: `${series}${p.output === 'P' ? 'P' : 'N'}`, top: '9999', bottom: '9999', left: 'fiber', accent: '#d8262a', series: 'FS-N40 子機' })}
  <text x="${W / 2}" y="9" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">ファイバアンプ 子機 ${two ? '2出力+外部入力' : '1出力'}・${outName(p)}</text>`,
    terminals: cable.terminals,
    params: [OUTPUT_PARAM],
    bus: FSN_UNIT_BUS,
  };
}
