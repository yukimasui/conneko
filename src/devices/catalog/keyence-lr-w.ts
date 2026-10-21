import { buildLrw } from '../keyence/lr-wtx';

/**
 * KEYENCE ホワイトスポット光電センサ LR-W シリーズ（LR-W500 / W70 / WF10、ケーブル 2m）。
 * 見た目・端子・配線の根拠は src/devices/keyence/lr-wtx.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-w/specs/
 */

export default buildLrw('cable');
