import { buildKvXCpu } from '../keyence/kv-x-cpu';

/**
 * KEYENCE KV-X シリーズ CPU ユニット KV-X520（内蔵モーション 32 軸）。
 * 見た目・端子は src/devices/keyence/kv-x-cpu.ts を参照。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/
 */

export default buildKvXCpu({ model: 'KV-X520', axes: 32 });
