import { buildKvEthUnit } from '../keyence/kv-eth';

/**
 * KEYENCE KV-X/KV-8000 シリーズ データ活用ユニット KV-XD02。
 * 外形 W48.2 × H92.5 × D115 mm（1mm ≒ 2px）。上部に表示部、左側にメモリカード（CARD）スロットのカバー、
 * 右側に RJ-45 ポートが縦に 2 個（上が PORT1、下が PORT2、10/100/1000 Mbps）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xd02/
 */

export default buildKvEthUnit({
  type: 'keyence.kv-xd02',
  model: 'KV-XD02',
  name: 'PLC データ活用ユニット',
  labelPrefix: 'DU',
  width: 96,
  extra: `
  <rect x="5" y="40" width="26" height="128" rx="1.2" fill="#2a2c30" stroke="#0a0a0b" stroke-width="0.7"/>
  <rect x="8" y="46" width="20" height="3" rx="1.2" fill="#121315" stroke="#3a3c40" stroke-width="0.4"/>
  <text x="18" y="58" text-anchor="middle" font-family="sans-serif" font-size="2.8" fill="#b9bcc1">CARD</text>`,
  description:
    'KEYENCE KV-X/KV-8000 シリーズのデータ活用ユニット（Ethernet RJ-45 × 2 ポート、100/1000 Mbps、1 システムに 1 台）。PLC のデータを収集・ロギングし、設備の稼働分析などに使う（KV STUDIO のデータ活用機能と組み合わせる）。内部消費電流 500mA（CPU から供給）。',
});
