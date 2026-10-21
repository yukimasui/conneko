import type { DeviceDefinition } from '../types';
import { buildRBase } from './mitsubishi-r35b';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 主ベースユニット R312B（入出力スロット 12）。
 * 外形 W439 × H101 × D32.5 mm（1mm ≒ 2px）。見た目・装着の約束は R35B と共通（buildRBase）。
 */

const def: DeviceDefinition = buildRBase({ type: 'mitsubishi.r312b', model: 'R312B', ioSlots: 12, widthMm: 439, load5V: 0.88 });

export default def;
