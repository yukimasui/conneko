import { buildVt5 } from '../keyence/vt5';

/**
 * KEYENCE タッチパネルディスプレイ VT5-X12（12型 TFT カラー、1024×768）。
 * 外形 W312.3 × H245.3 mm、有効表示面積 245.8 × 184.3 mm、DC24V 1.4A 以下。描画は 1mm ≒ 1px。
 * 出典: https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-x12/
 *       https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-x12/dimensions/
 */

export default buildVt5({
  model: 'VT5-X12',
  w: 312.3,
  h: 245.3,
  sw: 245.8,
  sh: 184.3,
  dots: '1024×768',
  size: '12型',
  current: 1.4,
  usb: 'left',
  video: true,
});
