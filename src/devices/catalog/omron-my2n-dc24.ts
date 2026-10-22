import { buildMy } from '../generic/omron-my';

/** オムロン 汎用リレー MY2N（コイル DC24V）＋ソケット。作りは src/devices/generic/omron-my.ts */
export default buildMy(2, 'dc24');
