import { buildLrzSeries } from '../keyence/lr-z';

/**
 * KEYENCE アンプ内蔵型 CMOS レーザセンサ LR-Z シリーズ（LR-ZB100CN/CP、LR-ZB250CN/CP、LR-ZH500CN/CP、M8 4ピン コネクタ）。
 * 種類は params の model で選ぶ。LR-ZB250C だけの既存機器 keyence.lr-zb250c.m8 と同じピン配置。
 * 出典: https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/specs/
 *       https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/dimensions/
 */

export default buildLrzSeries('M8');
