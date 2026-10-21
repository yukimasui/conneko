import { buildKvXCpu } from '../keyence/kv-x-cpu';

/**
 * KEYENCE KV-X シリーズ CPU ユニット KV-X550（最上位、内蔵モーション 256 軸）。
 * 見た目・端子は src/devices/keyence/kv-x-cpu.ts を参照。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-x550/dimensions/
 *       https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/
 */

export default buildKvXCpu({ model: 'KV-X550', axes: 256 });
