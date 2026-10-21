import { buildVt5 } from '../keyence/vt5';

/**
 * KEYENCE タッチパネルディスプレイ VT5-X10（10.4型 TFT カラー、1024×768）。
 * 外形 W299.8 × H210.8 mm、有効表示面積 211.2 × 158.4 mm、DC24V 1.3A 以下。描画は 1mm ≒ 1px。
 * 出典: https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-x10/
 *       https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-x10/dimensions/
 */

export default buildVt5({
  model: 'VT5-X10',
  w: 299.8,
  h: 210.8,
  sw: 211.2,
  sh: 158.4,
  dots: '1024×768',
  size: '10型',
  current: 1.3,
  usb: 'left',
  video: true,
});
