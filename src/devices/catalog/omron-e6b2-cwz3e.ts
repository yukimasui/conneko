import { buildE6b2 } from '../sensor/omron-e6b2';

/** オムロン ロータリエンコーダ E6B2-CWZ3E（インクリメンタル形 φ40、電圧出力、A・B・Z 相）。作りは src/devices/sensor/omron-e6b2.ts */
export default buildE6b2('voltage');
