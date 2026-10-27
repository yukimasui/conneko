import { buildE6b2 } from '../sensor/omron-e6b2';

/** オムロン ロータリエンコーダ E6B2-CWZ1X（インクリメンタル形 φ40、ラインドライバ出力、A・B・Z 相と反転出力）。作りは src/devices/sensor/omron-e6b2.ts */
export default buildE6b2('line-driver');
