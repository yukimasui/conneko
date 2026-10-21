import { buildKvEthUnit } from '../keyence/kv-eth';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ データベース連携ユニット KV-XCM02。
 * 外形 W36 × H92.5 × D95 mm（1mm ≒ 2px）。正面に RJ-45 ポートが縦に 2 個（上が PORT1、下が PORT2）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xcm02/
 */

export default buildKvEthUnit({
  type: 'keyence.kv-xcm02',
  model: 'KV-XCM02',
  name: 'PLC データベース連携ユニット',
  labelPrefix: 'DB',
  width: 72,
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズのデータベース連携ユニット（Ethernet RJ-45 × 2 ポート）。PLC のデバイス値を SQL Server・MySQL・Oracle などのデータベースへ直接書き込み/読み出しする。上位 LAN（サーバ側）へ LAN ケーブルでつなぐ。内部消費電流 200mA（CPU から供給）。',
});
