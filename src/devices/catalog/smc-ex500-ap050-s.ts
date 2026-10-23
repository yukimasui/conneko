import type { DeviceDefinition, InternalLink, PinDef } from '../types';
import { cablePlug, sensorCable, WIRE_HEX, type WireColor } from '../keyence/sensor-parts';

/**
 * SMC 電源ケーブル EX500-AP050-S（SI ユニット用、片側 M12 ソケット・片側バラ線、ストレート、5m）。
 * SI ユニット EX260 の電源コネクタ（M12 A コードのプラグ）に差し、反対側の芯線を DC24V 電源へつなぐ。
 *
 * 出典: SMC EX260 シリーズ カタログ（static.smc.eu の EX260-C_EU.pdf「CAT.EU02-25C」p.18「Power Supply Cable (For SI unit)」）
 *   型式: EX500-AP + ケーブル長（010 = 1m、050 = 5m）+ コネクタ（S = ストレート、A = アングル）。ソケット 5 ピン A コード、外径 φ6、芯線 0.3mm²
 *   芯線（EtherCAT・PROFINET・PROFIBUS DP 用の SI ユニット）: 1 茶 = 電磁弁用 24V、2 白 = 電磁弁用 0V、3 青 = 制御用 24V、4 黒 = 制御用 0V、5 灰 = 未接続
 *   芯線（EtherNet/IP 用）: 1 茶 = 制御用 24V、2 白 = 電磁弁用 24V、3 青 = 制御用 0V、4 黒 = 電磁弁用 0V
 * 図はコネクタを上にした姿で、ケーブルが下へ伸びて先端で芯線に分かれる（generic.m12-4p-cable と同じ描き方）。
 * EtherNet/IP の SI ユニットの電源コネクタ（M12 4 ピンのプラグ）にも、このケーブルを差す（ピン 1〜4 を使う）。
 */

const W = 70;
const H = 150;
const CX = 35;
const TOP = 6;
const COLORS: WireColor[] = ['BN', 'WH', 'BU', 'BK', 'GY'];
const plug = cablePlug(CX, TOP, 'M12');
const cable = sensorCable({
  cx: CX,
  y0: plug.y1,
  yFan: 112,
  yEnd: 146,
  pitch: 11,
  vmin: 0,
  vmax: 30,
  leads: COLORS.map((color, i) => ({ color, label: `（M12 ピン${i + 1}）`, role: 'pass' as const })),
});
const pins: PinDef[] = COLORS.map((c, i) => ({ id: `CN#${i + 1}`, label: `${i + 1} ${WIRE_HEX[c].name}`, role: 'pass', optional: true }));
const links: InternalLink[] = COLORS.map((c, i) => ({ from: `CN#${i + 1}`, to: c }));

const def: DeviceDefinition = {
  type: 'smc.ex500-ap050-s',
  name: '電源ケーブル（SI ユニット用・片側バラ線）',
  model: 'EX500-AP050-S',
  maker: 'SMC',
  category: 'valve',
  cable: true,
  description:
    'SMC の SI ユニット（EX260 など）用の電源ケーブル。片側は M12 5 ピン A コードのストレート型ソケット（CN）、もう片側はバラ線（5m）。' +
    'SI ユニットの電源コネクタ（PWR）とケーブルでつなぎ、芯線を DC24V 電源へつなぐ。EtherCAT・PROFINET の SI ユニットでは 1 茶 = 電磁弁用 +24V、2 白 = 電磁弁用 0V、' +
    '3 青 = 制御用 +24V、4 黒 = 制御用 0V（5 灰は未接続）。EtherNet/IP の SI ユニットでは 1 茶 = 制御用 +24V、2 白 = 電磁弁用 +24V、3 青 = 制御用 0V、4 黒 = 電磁弁用 0V。' +
    '電磁弁用と制御用は別の電源にするのがよい（同じ電源でもよい）。コネクタのピン n と同じ色の芯線が導通する。',
  labelPrefix: 'CBL',
  width: W,
  height: H,
  svg: `${plug.svg}${cable.svg}
  <text x="${CX + 9}" y="${TOP + 14}" font-family="sans-serif" font-size="3.4" fill="#444">M12</text>`,
  terminals: (p) => [
    {
      id: 'CN',
      label: 'M12 5ピン コネクタ（メス）',
      x: CX,
      y: TOP,
      side: 'top',
      role: 'connector',
      connector: { kind: 'M12-5', pins: 5, width: 20, style: 'round', pinColors: { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black', 5: 'gray' } },
    },
    ...cable.terminals(p),
  ],
  pins,
  links,
};

export default def;
