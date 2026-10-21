import { buildLrw } from '../keyence/lr-wtx';

/**
 * KEYENCE ホワイトスポット光電センサ LR-W シリーズ（LR-W500C / W70C / WF10C、M12 4ピン コネクタ）。
 * 見た目・端子・配線の根拠は src/devices/keyence/lr-wtx.ts を参照。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-w/specs/
 */

export default buildLrw('M12');
