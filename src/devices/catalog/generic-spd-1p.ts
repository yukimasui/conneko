import { buildSpd } from '../generic/spd';

/** 単相の電源用サージ保護デバイス（SPD、クラス II、L・N の 2 モジュール。汎用品。作りは src/devices/generic/spd.ts） */
export default buildSpd({ phases: 1, lines: ['L', 'N'], minVoltage: 100, maxVoltage: 240, uc: 275 });
