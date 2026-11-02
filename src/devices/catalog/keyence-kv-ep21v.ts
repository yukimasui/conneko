import type { DeviceDefinition } from '../types';
import { PROTO, kvBody2, kvDefs, kvUnitBus, rj45, rj45Connector, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-8000/KV-7000/KV-5000/KV-3000 シリーズ用 EtherNet/IP ユニット KV-EP21V（生産終了。後継は KV-XLE02）。
 * CPU ユニットの右側に連結する拡張ユニットで、EtherNet/IP のスキャナ（オリジネータ）・アダプタとして、
 * リモート I/O・ロボット・他社 PLC・IO-Link マスタ（NQ-EP4L など）と LAN ケーブルでつなぐ。
 * 正面に RJ-45 ポートが 1 個（10/100 Mbps）。
 * 外形（W36 × H90 mm として描いた）とポート数（1）は推定。内部消費電流 100mA 以下は KEYENCE の製品ページによる。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-ep21v/
 */

const W = 72;
const H = 185;
const PORT = { x: W - 32, y: 120 };

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-EP21V', {
    headerH: 32,
    leds: [
      { x: 10, y: 15, label: 'RUN' },
      { x: 24, y: 15, label: 'ERR', c: 'off' },
      { x: W - 30, y: 15, label: 'MS' },
      { x: W - 16, y: 15, label: 'NS' },
    ],
  })}
  ${text(W / 2 - 2, 52, 'EtherNet/IP', 5, '#e6e7e9')}
  ${text(W / 2 - 2, 60, 'UNIT', 3.2, '#9a9da2', 'middle', 'normal')}
  ${text(PORT.x - 26, PORT.y - 13, 'PORT', 3, '#d0d3d6', 'start')}
  ${rj45(PORT.x, PORT.y)}
  ${text(PORT.x, 146, '10/100', 2.6, '#9a9da2', 'middle', 'normal')}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-ep21v',
  name: 'PLC 通信ユニット（EtherNet/IP）',
  model: 'KV-EP21V',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE の EtherNet/IP ユニット KV-EP21V（KV-8000・KV-7500・KV-7300・KV-5500・KV-5000・KV-3000 用。生産終了で、後継は KV-XLE02）。CPU ユニットの右側に連結し、EtherNet/IP のスキャナ・アダプタとして、リモート I/O・ロボット・他社 PLC・IO-Link マスタなどとサイクリック通信（タグ・データリンク）・メッセージ通信を行う。既設の設備の図面を描くときに使う。内部消費電流 100mA 以下（CPU から供給）。外形とポート数（RJ-45 × 1）は推定。',
  estimated: '外形寸法とポート数（RJ-45 × 1）',
  labelPrefix: 'EIP',
  width: W,
  height: H,
  svg,
  terminals: [{ id: 'PORT', label: 'EtherNet/IP (RJ45)', x: PORT.x, y: PORT.y, side: 'bottom', role: 'connector', connector: rj45Connector(PROTO.ethernetIp), optional: true }],
  bus: kvUnitBus(100),
};

export default def;
