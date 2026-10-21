import type { DeviceDefinition } from '../types';
import { PROTO, kvBody2, kvDefs, kvUnitBus, rj45, rj45Connector, screw, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 位置決め・モーションユニット KV-XH16EC（EtherCAT、16 軸）。
 * 外形 W42 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に LINK/ACT・CONNECT・STATUS LED、
 * 正面下部に EtherCAT ポート（RJ-45）、その右に FG 端子（ネジ）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xh16ec/
 */

const W = 84;
const H = 185;
const PORT = { x: 32, y: 148 };
const FG = { x: 58, y: 160 };

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-XH16EC', {
    headerH: 32,
    leds: [
      { x: 14, y: 16, label: 'LINK/ACT' },
      { x: 32, y: 16, label: 'CONNECT' },
      { x: 50, y: 16, label: 'STATUS' },
    ],
  })}
  ${text(PORT.x, PORT.y - 15, 'EtherCAT', 3, '#d0d3d6')}
  ${rj45(PORT.x, PORT.y)}
  <rect x="${FG.x - 7}" y="${FG.y - 7}" width="14" height="14" rx="1" fill="#141516" stroke="#3a3c40" stroke-width="0.5"/>
  ${screw(FG.x, FG.y, 4)}
  ${text(FG.x, FG.y - 9.5, 'FG', 3, '#d0d3d6')}
  <path d="M${FG.x + 10} ${FG.y - 3} v3 M${FG.x + 7.5} ${FG.y} h5 M${FG.x + 8.3} ${FG.y + 1.2} h3.4 M${FG.x + 9.1} ${FG.y + 2.4} h1.8" stroke="#d0d3d6" stroke-width="0.6"/>
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-xh16ec',
  name: 'PLC モーションユニット（EtherCAT）',
  model: 'KV-XH16EC',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの位置決め・モーションユニット（EtherCAT マスタ、最大 16 軸、制御周期 125µs〜）。EtherCAT 対応サーボアンプ（KEYENCE SV2 シリーズなど）や EtherCAT I/O を STP ケーブル（カテゴリ 5e、二重シールド推奨）でデイジーチェーン接続する。FG 端子は盤の接地へ。位置・速度・トルク制御、直線/円弧/ヘリカル補間、電子カム。内部消費電流 160mA。',
  labelPrefix: 'MC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'PORT', label: 'EtherCAT (RJ45)', x: PORT.x, y: PORT.y, side: 'bottom', role: 'connector', connector: rj45Connector(PROTO.ethercat), optional: true },
    { id: 'FG', label: 'FG', x: FG.x, y: FG.y, side: 'bottom', role: 'ground' },
  ],
  bus: kvUnitBus(160),
};

export default def;
