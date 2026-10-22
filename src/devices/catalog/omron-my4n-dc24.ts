import { buildMy } from '../generic/omron-my';

/** オムロン 汎用リレー MY4N（コイル DC24V）＋ソケット。作りは src/devices/generic/omron-my.ts */
export default buildMy(4, 'dc24');
