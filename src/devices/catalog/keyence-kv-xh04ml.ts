import type { DeviceDefinition } from '../types';
import { kvBody2, kvDefs, kvUnitBus, screw, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 位置決め・モーションユニット KV-XH04ML（MECHATROLINK-III、4 軸）。
 * 外形 W42 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に LINK・CONNECT・STATUS LED、
 * 正面下部に MECHATROLINK-III コネクタ、その右に FG 端子（ネジ）。
 * MECHATROLINK-III のコネクタは Ethernet の RJ-45 と互換ではないため、connector.kind は 'MECHATROLINK3' とする。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xh04ml/
 */

const W = 84;
const H = 185;
const PORT = { x: 32, y: 148 };
const FG = { x: 58, y: 160 };

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-XH04ML', {
    headerH: 32,
    leds: [
      { x: 14, y: 16, label: 'LINK' },
      { x: 32, y: 16, label: 'CONNECT' },
      { x: 50, y: 16, label: 'STATUS' },
    ],
  })}
  ${text(PORT.x, PORT.y - 15, 'MECHATROLINK-III', 2.8, '#d0d3d6')}
  <rect x="${PORT.x - 11}" y="${PORT.y - 10}" width="22" height="20" rx="1" fill="url(#kvshield-{{uid}})" stroke="#5d6166" stroke-width="0.6"/>
  <path d="M${PORT.x - 8} ${PORT.y - 7} H${PORT.x + 8} V${PORT.y + 4} H${PORT.x + 3} V${PORT.y + 7} H${PORT.x - 3} V${PORT.y + 4} H${PORT.x - 8} Z" fill="#0b0c0d"/>
  ${Array.from({ length: 4 }, (_, i) => `<rect x="${PORT.x - 4.5 + i * 3}" y="${PORT.y - 6}" width="1.2" height="4" fill="#c9a43a"/>`).join('')}
  <rect x="${FG.x - 7}" y="${FG.y - 7}" width="14" height="14" rx="1" fill="#141516" stroke="#3a3c40" stroke-width="0.5"/>
  ${screw(FG.x, FG.y, 4)}
  ${text(FG.x, FG.y - 9.5, 'FG', 3, '#d0d3d6')}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-xh04ml',
  name: 'PLC モーションユニット（MECHATROLINK-III）',
  model: 'KV-XH04ML',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの位置決め・モーションユニット（MECHATROLINK-III マスタ、4 軸、制御周期 500µs〜）。MECHATROLINK-III 対応サーボアンプ（安川電機 Σ-7 など）を専用ケーブルでデイジーチェーン接続する（コネクタは RJ-45 と非互換のため connector.kind は MECHATROLINK3）。FG 端子は盤の接地へ。内部消費電流 160mA。リレーを 576 点（36 チャネル）占有するので、後ろに装着したユニットの先頭番号はその分ずれる。',
  labelPrefix: 'MC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'PORT', label: 'MECHATROLINK-III', x: PORT.x, y: PORT.y, side: 'bottom', role: 'connector', connector: { kind: 'MECHATROLINK3', pins: 0, width: 22, protocols: ['mechatrolink-iii'] }, optional: true },
    { id: 'FG', label: 'FG', hint: '機能接地', x: FG.x, y: FG.y, side: 'bottom', role: 'ground' },
  ],
  // 占有デバイス: リレー 576 点（36 チャネル）。入出力の内訳は公開資料にないため入力として数える
  bus: kvUnitBus(160, { inputs: 576 }),
};

export default def;
