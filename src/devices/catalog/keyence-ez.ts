import type { DeviceDefinition, ParamValues } from '../types';
import { proxBody, sensorCable } from '../keyence/sensor-parts';

/**
 * KEYENCE 近接センサ EZ シリーズ（DC 3線式 NPN、N.O./N.C. 両出力、シールドタイプ、ケーブル 2m）。
 * サイズは params の size で M8 / M12 / M18 / M30（EZ-8M / EZ-12M / EZ-18M / EZ-30M）を選ぶ。
 * 線色（KEYENCE 入出力回路図より）: 茶 = DC12〜24V、黒 = 出力1（N.O.）、白 = 出力2（N.C.）、青 = 0V。
 * 見た目は検出面を上にしたネジ型（M18・M30 は見やすさのため縮小して描く）。
 * 出典: https://www.keyence.co.jp/products/sensor/proximity/ez/models/ez-8m/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/proximity/ez/specs/
 */

const W = 70;
const H = 196;

const SIZES: Record<number, { dia: number; len: number; dist: string; freq: string }> = {
  8: { dia: 16, len: 50, dist: '1.5mm', freq: '800Hz' },
  12: { dia: 24, len: 62, dist: '2.5mm', freq: '600Hz' },
  18: { dia: 32, len: 68, dist: '5mm', freq: '350Hz' },
  30: { dia: 44, len: 72, dist: '10mm', freq: '250Hz' },
};

const cable = sensorCable({
  cx: 35,
  y0: 100,
  yFan: 160,
  yEnd: 192,
  pitch: 11,
  vmin: 10.8,
  vmax: 26.4,
  leads: [
    { color: 'BN', label: '+V（DC12〜24V）', role: 'plus' },
    { color: 'BK', label: '出力1 N.O.（NPN）', role: 'out', signal: { dir: 'out', kind: 'npn' } },
    { color: 'WH', label: '出力2 N.C.（NPN）', role: 'out', signal: { dir: 'out', kind: 'npn' } },
    { color: 'BU', label: '0V', role: 'minus' },
  ],
});

const svg = (p: ParamValues) => {
  const s = SIZES[Number(p.size)] ?? SIZES[12];
  const body = proxBody(35, 100 - 12 - s.len, s.dia, s.len);
  return `${cable.svg}${body.svg}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">EZ-${p.size}M・検出 ${s.dist}</text>
  <text x="${35 + s.dia / 2 + 3}" y="${100 - s.len * 0.45}" font-family="sans-serif" font-size="3.4" fill="#555">M${p.size}</text>`;
};

const def: DeviceDefinition = {
  type: 'keyence.ez',
  name: '近接センサ（DC3線式）',
  model: 'EZ-8M / 12M / 18M / 30M',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE の近接センサ EZ シリーズ（DC 3線式・NPN オープンコレクタ 100mA、N.O. と N.C. の 2 出力、シールドタイプ、IP67、ケーブル 2m）。サイズは params の size（M8: 検出距離 1.5mm / M12: 2.5mm / M18: 5mm / M30: 10mm）。茶を +24V、青を 0V、黒（出力1 N.O.）または白（出力2 N.C.）を PLC の入力につなぐ（NPN 出力なので PLC 入力の COM は +24V 側にする）。電源 DC12〜24V ±10%、消費電流 13mA 以下。',
  labelPrefix: 'PX',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  // NPN オープンコレクタ 100mA。N.C. 出力も「動作（検出）で切り換わる出力」として output で表す
  links: [
    { from: 'BK', to: 'BU', switch: 'output', ratedCurrent: 0.1 },
    { from: 'WH', to: 'BU', switch: 'output', ratedCurrent: 0.1 },
  ],
  params: [
    {
      key: 'size',
      label: 'サイズ（ネジ径）',
      options: [
        { value: 8, label: 'M8（EZ-8M）' },
        { value: 12, label: 'M12（EZ-12M）' },
        { value: 18, label: 'M18（EZ-18M）' },
        { value: 30, label: 'M30（EZ-30M）' },
      ],
      default: 12,
    },
  ],
  loadCurrent: 0.013,
};

export default def;
