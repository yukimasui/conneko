import { buildEx } from '../sensor/panasonic-ex';

/**
 * パナソニック 超小型ビームセンサ（アンプ内蔵）EX-10 / EX-20 シリーズ Ver.2 の透過型の投光器（EX-11EA・EX-21A・EX-23 の投光器）。種類は params の model で選ぶ。
 * 見た目・端子・配線の根拠は src/devices/sensor/panasonic-ex.ts を参照。
 */
export default buildEx('emitter');
