import { buildSpd } from '../generic/spd';

/** 三相（3 線 AC200V 系）の電源用サージ保護デバイス（SPD、クラス II、3 モジュール。汎用品。作りは src/devices/generic/spd.ts） */
export default buildSpd({ phases: 3, lines: ['L1', 'L2', 'L3'], minVoltage: 200, maxVoltage: 240, uc: 275 });
