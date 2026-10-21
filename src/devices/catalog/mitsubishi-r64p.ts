import type { DeviceDefinition } from '../types';
import { buildRPowerSupply } from './mitsubishi-r61p';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 電源ユニット R64P（AC100〜240V 入力、DC5V 9A 出力）。
 * 外形 W54.6 × H106 × D110 mm（1mm ≒ 2px）。外形・端子台は R61P と共通（buildRPowerSupply）で、
 * DC5V の出力が大きく、ユニットを多く装着する R38B / R312B などで使う。
 */

const def: DeviceDefinition = buildRPowerSupply({
  type: 'mitsubishi.r64p',
  model: 'R64P',
  ratingLines: ['INPUT 100-240VAC 50/60Hz 160VA', 'OUTPUT 5VDC 9A'],
  maxVA: 160,
  output5V: 9,
  description:
    '三菱電機 MELSEC iQ-R シリーズの電源ユニット（AC 入力、大容量）。入力 AC100〜240V（85〜264V）50/60Hz、最大入力皮相電力 160VA。出力 DC5V 9A（ベースユニット経由で CPU・I/O ユニットへ供給するため外部端子はない）。端子台（M4、上から）: ERR・ERR（ERR 接点 DC24V 0.5A、システム正常時に閉）、FG、LG、N・L（INPUT）。FG・LG はそれぞれ接地抵抗 100Ω 以下で接地する。ベースユニットの一番左（電源スロット、図面の装着位置 1）に装着する。',
});

export default def;
