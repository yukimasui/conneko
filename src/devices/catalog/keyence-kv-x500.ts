import { buildKvXCpu } from '../keyence/kv-x-cpu';

/**
 * KEYENCE KV-X シリーズ CPU ユニット KV-X500（EtherCAT・モーション非内蔵。最下部の PORT3 がない）。
 * 見た目・端子は src/devices/keyence/kv-x-cpu.ts を参照。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/
 */

export default buildKvXCpu({ model: 'KV-X500', axes: 0 });
