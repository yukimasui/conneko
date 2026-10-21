import { buildVt5 } from '../keyence/vt5';

/**
 * KEYENCE タッチパネルディスプレイ VT5-W10（10型ワイド TFT カラー、1024×600）。
 * 外形 W283.6 × H197.4 mm、有効表示面積 222.7 × 125.3 mm、DC24V 0.9A 以下。描画は 1mm ≒ 1px。
 * 出典: https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-w10/
 *       https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-w10/dimensions/
 */

export default buildVt5({
  model: 'VT5-W10',
  w: 283.6,
  h: 197.4,
  sw: 222.7,
  sh: 125.3,
  dots: '1024×600',
  size: '10型ワイド',
  current: 0.9,
  usb: 'bottom',
  video: false,
});
