import type { DeviceDefinition, ParamValues } from '../types';
import { proxBody, sensorCable } from '../keyence/sensor-parts';

/**
 * KEYENCE 近接センサ EV シリーズ（DC 2線式、N.O.、シールドタイプ、ケーブル 2m）。
 * サイズは params の size で M8 / M12 / M18 / M30（EV-108M / EV-112M / EV-118M / EV-130M）を選ぶ。
 * 線色（KEYENCE 入出力回路図より）: 茶・青の 2 線。PLC の入力端子と COM の間に直列に入れる
 * （COM が 0V のときは 茶 = +24V 側・青 = 入力、COM が +24V のときは 茶 = 入力・青 = 0V。図の 2 通りの接続例のとおり）。
 * 2線式なので OFF 時も 1mA 以下のもれ電流があり、ON 時は 3.6V 以下の残留電圧がある。
 * 出典: https://www.keyence.co.jp/products/sensor/proximity/ev/models/ev-112m/io-circuit/
 *       https://www.keyence.co.jp/products/sensor/proximity/ev/specs/
 */

const W = 60;
const H = 196;

const SIZES: Record<number, { dia: number; len: number; dist: string; cur: string }> = {
  8: { dia: 16, len: 50, dist: '1.5mm', cur: '5〜80mA' },
  12: { dia: 24, len: 62, dist: '2.5mm', cur: '5〜200mA' },
  18: { dia: 32, len: 68, dist: '5mm', cur: '5〜200mA' },
  30: { dia: 44, len: 72, dist: '10mm', cur: '5〜200mA' },
};

const cable = sensorCable({
  cx: 30,
  y0: 100,
  yFan: 160,
  yEnd: 192,
  pitch: 12,
  vmin: 10.8,
  vmax: 26.4,
  leads: [
    { color: 'BN', label: '（2線式 +側）', role: 'out', signal: { dir: 'out', kind: '2wire' } },
    { color: 'BU', label: '（2線式 −側）', role: 'out', signal: { dir: 'out', kind: '2wire' } },
  ],
});

const svg = (p: ParamValues) => {
  const s = SIZES[Number(p.size)] ?? SIZES[12];
  const body = proxBody(30, 100 - 12 - s.len, s.dia, s.len);
  return `${cable.svg}${body.svg}
  <text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="4.6" fill="#333">EV-1${String(p.size).padStart(2, '0')}M・2線式</text>
  <text x="${30 + s.dia / 2 + 3}" y="${100 - s.len * 0.45}" font-family="sans-serif" font-size="3.4" fill="#555">M${p.size}</text>`;
};

const def: DeviceDefinition = {
  type: 'keyence.ev',
  name: '近接センサ（DC2線式）',
  model: 'EV-108M / 112M / 118M / 130M',
  maker: 'KEYENCE',
  category: 'sensor',
  description:
    'KEYENCE の近接センサ EV シリーズ（DC 2線式、N.O.、シールドタイプ、IP67、ケーブル 2m）。サイズは params の size（M8: 検出距離 1.5mm / M12: 2.5mm / M18: 5mm / M30: 10mm）。茶・青の 2 線を PLC の入力回路に直列に入れる: PLC の COM が 0V のときは 茶を +24V、青を入力へ、COM が +24V のときは 茶を入力、青を 0V へ。電源電圧 DC12〜24V、開閉容量 5〜80mA（M8）/ 5〜200mA、もれ電流 1mA 以下、残留電圧 3.6V 以下。2 線とも 2 線式センサーの信号線（信号の種類 2wire）で、検出すると茶と青の間が導通する出力として扱う。',
  labelPrefix: 'PX',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  // 検出すると茶と青の間が導通する（開閉容量 M8: 80mA、M12〜M30: 200mA。残留電圧 3.6V 以下・もれ電流 1mA 以下は表さない）
  links: (p) => [{ from: 'BN', to: 'BU', switch: 'output', ratedCurrent: Number(p.size) === 8 ? 0.08 : 0.2 }],
  params: [
    {
      key: 'size',
      label: 'サイズ（ネジ径）',
      options: [
        { value: 8, label: 'M8（EV-108M）' },
        { value: 12, label: 'M12（EV-112M）' },
        { value: 18, label: 'M18（EV-118M）' },
        { value: 30, label: 'M30（EV-130M）' },
      ],
      default: 12,
    },
  ],
};

export default def;
