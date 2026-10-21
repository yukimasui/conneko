import { buildVt5 } from '../keyence/vt5';

/**
 * KEYENCE タッチパネルディスプレイ VT5-X15（15型 TFT カラー、1024×768）。
 * 外形 W394.1 × H293.1 mm、有効表示面積 304.1 × 228.1 mm、DC24V 1.5A 以下。描画は 1mm ≒ 1px。
 * 出典: https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-x15/
 *       https://www.keyence.co.jp/products/controls/hmi/vt5/models/vt5-x15/dimensions/
 */

export default buildVt5({
  model: 'VT5-X15',
  w: 394.1,
  h: 293.1,
  sw: 304.1,
  sh: 228.1,
  dots: '1024×768',
  size: '15型',
  current: 1.5,
  usb: 'left',
  video: true,
});
