import { buildKvEthUnit } from '../keyence/kv-eth';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ Ethernet ユニット KV-XLE02。
 * 外形 W36 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に PORT1/PORT2 の LINK/ACT・STATUS LED、
 * 正面に RJ-45 ポートが縦に 2 個（上が PORT1、下が PORT2）。
 * EtherNet/IP・PROFINET・EtherCAT・CC-Link IE Field・PLC リンク・Modbus サーバ・MC プロトコル/SLMP などに対応。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xle02/
 */

export default buildKvEthUnit({
  type: 'keyence.kv-xle02',
  model: 'KV-XLE02',
  name: 'PLC Ethernet ユニット',
  labelPrefix: 'ETH',
  width: 72,
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの Ethernet ユニット（RJ-45 × 2 ポート、10/100/1000 Mbps）。EtherNet/IP、PROFINET、EtherCAT（100 Mbps 固定）、CC-Link IE Field（1000 Mbps 固定）、PLC リンク、Modbus サーバ、MC プロトコル/SLMP、KV ソケット通信などに対応し、タッチパネル・ロボット・他社 PLC・リモート I/O などと LAN ケーブルでつなぐ。内部消費電流 200mA（CPU から供給）。',
});
