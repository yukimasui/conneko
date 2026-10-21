import type { DeviceDefinition } from '../types';
import { buildRBase } from './mitsubishi-r35b';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 主ベースユニット R38B（入出力スロット 8）。
 * 外形 W328 × H101 × D32.5 mm（1mm ≒ 2px）。見た目・装着の約束は R35B と共通（buildRBase）。
 */

const def: DeviceDefinition = buildRBase({ type: 'mitsubishi.r38b', model: 'R38B', ioSlots: 8, widthMm: 328, load5V: 0.71 });

export default def;
