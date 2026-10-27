import { buildCx400 } from '../sensor/panasonic-cx400';

/**
 * パナソニック 小型ビームセンサ（アンプ内蔵）CX-400 シリーズ ケーブル 2m の透過型（CX-411）の受光器。
 * 見た目・端子・配線の根拠は src/devices/sensor/panasonic-cx400.ts を参照。
 * 出典: https://industry.panasonic.com/global/en/products/fasys/sensor/photoelectric/cx-400
 */
export default buildCx400('receiver');
