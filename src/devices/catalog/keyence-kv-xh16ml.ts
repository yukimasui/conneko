import type { DeviceDefinition } from '../types';
import { kvBody2, kvDefs, kvUnitBus, screw, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X シリーズ 位置決め・モーションユニット KV-XH16ML（MECHATROLINK-III、16 軸）。
 * 見た目は 4 軸の KV-XH04ML と同じ作り（外形 W42 × H92.5 mm として描いた。1mm ≒ 2px）。上部の表示部に LINK・CONNECT・STATUS LED、
 * 正面下部に MECHATROLINK-III コネクタ、その右に FG 端子（ネジ）。
 * MECHATROLINK-III のコネクタは Ethernet の RJ-45 と互換ではないため、connector.kind は 'MECHATROLINK3' とする。
 * 仕様（KEYENCE の製品ページ）: 制御軸数 16 軸（仮想軸を含む）、接続できる CPU は KV-X シリーズ・KV-8000A、CPU 1 台に 7 台まで、
 * 内部消費電流 400mA 以下、占有デバイス リレー 2112 点（132 チャネル）・データメモリ 4 ワード、質量 約 280g。
 * 出典: https://www.keyence.com/products/controls/plc-building-block-type/kv-x/models/kv-xh16ml
 *       https://www.keyence.co.in/products/controls/plc-building-block-type/kv-x/models/kv-xh16ml/
 */

const W = 84;
const H = 185;
const PORT = { x: 32, y: 148 };
const FG = { x: 58, y: 160 };

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-XH16ML', {
    headerH: 32,
    leds: [
      { x: 14, y: 16, label: 'LINK' },
      { x: 32, y: 16, label: 'CONNECT' },
      { x: 50, y: 16, label: 'STATUS' },
    ],
  })}
  ${text(W / 2 - 2, 52, '16 AXES', 4, '#e6e7e9')}
  ${text(W / 2 - 2, 60, 'MOTION', 3.2, '#9a9da2', 'middle', 'normal')}
  ${text(PORT.x, PORT.y - 15, 'MECHATROLINK-III', 2.8, '#d0d3d6')}
  <rect x="${PORT.x - 11}" y="${PORT.y - 10}" width="22" height="20" rx="1" fill="url(#kvshield-{{uid}})" stroke="#5d6166" stroke-width="0.6"/>
  <path d="M${PORT.x - 8} ${PORT.y - 7} H${PORT.x + 8} V${PORT.y + 4} H${PORT.x + 3} V${PORT.y + 7} H${PORT.x - 3} V${PORT.y + 4} H${PORT.x - 8} Z" fill="#0b0c0d"/>
  ${Array.from({ length: 4 }, (_, i) => `<rect x="${PORT.x - 4.5 + i * 3}" y="${PORT.y - 6}" width="1.2" height="4" fill="#c9a43a"/>`).join('')}
  <rect x="${FG.x - 7}" y="${FG.y - 7}" width="14" height="14" rx="1" fill="#141516" stroke="#3a3c40" stroke-width="0.5"/>
  ${screw(FG.x, FG.y, 4)}
  ${text(FG.x, FG.y - 9.5, 'FG', 3, '#d0d3d6')}
`;

const def: DeviceDefinition = {
  type: 'keyence.kv-xh16ml',
  name: 'PLC モーションユニット（MECHATROLINK-III）',
  model: 'KV-XH16ML',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X シリーズの位置決め・モーションユニット（MECHATROLINK-III マスタ、16 軸。仮想軸を含む）。KV-X の CPU（と KV-8000A）の右に連結し、CPU 1 台に 7 台まで。MECHATROLINK-III 対応サーボアンプ（安川電機 Σ-7 など）を専用ケーブルでデイジーチェーン接続する（コネクタは RJ-45 と非互換のため connector.kind は MECHATROLINK3）。FG 端子は盤の接地へ。内部消費電流 400mA 以下。リレーを 2112 点（132 チャネル）とデータメモリ 4 ワードを占有するので、後ろに装着したユニットの先頭番号はその分ずれる。外形は 4 軸の KV-XH04ML と同じとして描いた（推定）。',
  estimated: '外形寸法（KV-XH04ML と同じ W42 × H92.5mm として描いた）',
  labelPrefix: 'MC',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'PORT', label: 'MECHATROLINK-III', x: PORT.x, y: PORT.y, side: 'bottom', role: 'connector', connector: { kind: 'MECHATROLINK3', pins: 0, width: 22, protocols: ['mechatrolink-iii'] }, optional: true },
    { id: 'FG', label: 'FG', hint: '機能接地', x: FG.x, y: FG.y, side: 'bottom', role: 'ground' },
  ],
  // 占有デバイス: リレー 2112 点（132 チャネル）。入出力ではなく占有するだけの点数（reserve）として数える
  // 接続できる CPU は KV-X シリーズ（と KV-8000A）だけなので、KV-X の CPU のバスの種類 'kv-x' にする（KV-8000 の CPU には装着できない）
  bus: kvUnitBus(400, { reserve: 2112 }, 'kv-x'),
};

export default def;
