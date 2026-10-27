import { buildE5cc } from '../generic/omron-e5cc';

/** オムロン 温度調節器 E5CC-QX2DSM-800（制御出力 SSR 駆動用電圧、AC/DC24V）。作りは src/devices/generic/omron-e5cc.ts */
export default buildE5cc('voltage');
