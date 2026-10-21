import type { DeviceDefinition } from '../types';
import { kvBody2, kvDefs, rj45, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ Ethernet ユニット KV-XLE02。
 * 外形 W36 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に PORT1/PORT2 の LINK/ACT・STATUS LED、
 * 正面に RJ-45 ポートが縦に 2 個（上が PORT1、下が PORT2）。
 * EtherNet/IP・PROFINET・EtherCAT・CC-Link IE Field・PLC リンク・Modbus サーバ・MC プロトコル/SLMP などに対応。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xle02/
 */

const W = 72;
const H = 185;
const P1 = { x: 40, y: 104 };
const P2 = { x: 40, y: 144 };

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-XLE02', {
    headerH: 32,
    leds: [
      { x: 10, y: 15, label: 'LINK/ACT' },
      { x: 24, y: 15, label: 'STATUS' },
      { x: 42, y: 15, label: 'LINK/ACT', c: 'off' },
      { x: 56, y: 15, label: 'STATUS' },
    ],
  })}
  ${text(17, 28, 'PORT1', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${text(49, 28, 'PORT2', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${text(6, P1.y - 13, 'PORT1', 3, '#d0d3d6', 'start')}
  ${rj45(P1.x, P1.y)}
  ${text(6, P2.y - 13, 'PORT2', 3, '#d0d3d6', 'start')}
  ${rj45(P2.x, P2.y)}
  ${text(40, 166, '10/100/1000', 2.6, '#9a9da2', 'middle', 'normal')}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-xle02',
  name: 'PLC Ethernet ユニット',
  model: 'KV-XLE02',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの Ethernet ユニット（RJ-45 × 2 ポート、10/100/1000 Mbps）。EtherNet/IP、PROFINET、EtherCAT（100 Mbps 固定）、CC-Link IE Field（1000 Mbps 固定）、PLC リンク、Modbus サーバ、MC プロトコル/SLMP、KV ソケット通信などに対応し、タッチパネル・ロボット・他社 PLC・リモート I/O などと LAN ケーブルでつなぐ。内部消費電流 200mA（CPU から供給）。',
  labelPrefix: 'ETH',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'PORT1', label: 'PORT1 (RJ45)', x: P1.x, y: P1.y, side: 'bottom', role: 'connector', connector: { kind: 'RJ45', pins: 0, width: 22 }, optional: true },
    { id: 'PORT2', label: 'PORT2 (RJ45)', x: P2.x, y: P2.y, side: 'bottom', role: 'connector', connector: { kind: 'RJ45', pins: 0, width: 22 }, optional: true },
  ],
};

export default def;
