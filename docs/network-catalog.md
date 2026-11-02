# 通信機器（IO-Link マスタ・EtherNet/IP ユニット）の調査メモ

PLC の通信まわりの機器のうち、KEYENCE の IO-Link マスタと EtherNet/IP ユニットを追加した（issue #75）。
KEYENCE のほかの機器は [keyence-catalog.md](keyence-catalog.md)、三菱電機の通信ユニット（RJ71EN71・RJ71GF11-T2）は
[mitsubishi-plc-catalog.md](mitsubishi-plc-catalog.md) を参照。調査は 2026-11 時点。KEYENCE のサイトは直接取得できなかったため、検索で確かめられた製品ページの記載による。

## 収録機種

| type | 型式 | 種類 | 主な仕様 | 推定 |
|---|---|---|---|---|
| `keyence.nq-ep4l` | NQ-EP4L | 4 ポート EtherNet/IP 対応 IO-Link マスタ | EtherNet/IP・Modbus/TCP（M8 4 ピン メス × 2）、IO-Link ポート 4（M12 5 ピン メス、Class A）、DC18〜30V、V1・V2 各 4A まで | 推定: 電源コネクタのピンの割付け、ポートのセンサー電源の系統（V2）、外形 |
| `keyence.kv-ep21v` | KV-EP21V | KV-8000/7000/5000/3000 用 EtherNet/IP ユニット（生産終了、後継 KV-XLE02） | 内部消費電流 100mA 以下、CPU の右に連結 | 推定: 外形とポート数（RJ-45 × 1） |

## NQ-EP4L（IO-Link マスタ）

- 分類は `plc`、一般名称は「IO-Link マスタ」（パレットに 1 つのファミリーとして出る）。I/O 表には、各ポートの C/Q・DI が入力点として出る。
- **IO-Link ポート**（`X1`〜`X4`）: コネクタ `{ kind: 'M12-5', pins: 5, mates: ['M12-4'], protocols: ['io-link'] }`。M12 4 ピンのセンサー（kind `M12-4`）・
  センサー用ケーブル（`generic.m12-4p-cable`）とケーブルでつなげ、ピン 1〜4 が同じ番号どうしで導通する。
  ピン（IO-Link の Class A の標準）: 1 L+（センサー電源 +24V）・2 DI・3 L−（0V）・4 C/Q・5 NC。
  - C/Q・DI は DC 入力（PNP 用、`commonPolarity: '-'`）。NPN 出力のセンサーをつなぐと `signal-polarity` で指摘する。
  - L+・L− は向きのない中継（`pass`）として、電源コネクタの V2（ピン 2・4）と常時導通にした。センサーの +V・0V まで電源が届くかを、上流の DC24V 電源からチェックできる。
- **電源**: IN（M8 4 ピン オス）と OUT（M8 4 ピン メス）。ピンは 1 V1+・2 V2+・3 V1−・4 V2−（推定）で、`input`（DC18〜30V）。
  IN と OUT の同じ番号のピンは常時導通（渡り配線）。IN は `required`（つながっていなければ指摘する）。片側バラ線の M8 4 ピン ケーブル（`generic.m8-4p-cable`）で電源につなぐ。
- **Ethernet**: P1・P2 は `{ kind: 'M8-ETH', pins: 0, mates: ['RJ45'], protocols: ['ethernet', 'ethernet-ip', 'modbus-tcp'] }`（LAN ポートとして扱い、ネットワークの候補が出る）。
- 消費電流 `loadCurrent` は V1 110mA + V2 115mA（センサーへの供給分は含まない）。
- 出典: KEYENCE 製品ページ・仕様（EtherNet/IP・Modbus/TCP、10/100Mbps、M8 4 ピン メス A コード、IO-Link ポート 4・Class A、M12 5 ピン メス A コード、
  DC18〜30V（IO-Link 通信中 20.4〜28.8V）、V1・V2 の許容電流 各 4A、消費電流 V1 110mA・V2 115mA、センサーへの供給 ポート 1〜4 の合計 4A、プロセスデータ 入出力 各 32 バイト、DI モードの入力 最大 8 点 PNP）
  - https://www.keyence.com/products/sensor/network-communication/nq/models/nq-ep4l/
  - https://www.keyence.com/products/sensor/network-communication/nq/specs/

## KV-EP21V（EtherNet/IP ユニット）

- KV-8000 などの CPU の右に連結する拡張ユニット（`bus: kvUnitBus(100)`、内部消費電流 100mA）。分類は `plc`、一般名称は「PLC 通信ユニット（EtherNet/IP）」（PLC エディタから足す）。
- ポートは RJ-45 × 1（`protocols: ['ethernet', 'ethernet-ip']`）として描いた（推定）。既設の設備の図面を描くために収録し、新しい設計では KV-XLE02 を使う。
- 当初は「EtherNet/IP カプラ（リモート I/O の親）」として調べたが、KV-EP21V は CPU に連結するスキャナ・アダプタのユニットで、増設ユニットを連結する親ではない。
  KV-Nano 用には別の型式（KV-NC1EP）がある。
- 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-ep21v/ （接続できる CPU、内部消費電流 100mA 以下、生産終了・推奨代替 KV-XLE02）

## 確かめられなかったこと・見送ったもの

- NQ-EP4L の電源コネクタのピンの割付けと、ポートの L+/L− が V1・V2 のどちらから出るか。外形寸法（W32 × H150mm として描いた）。
- KV-X シリーズの残りのユニットは、ほかの担当（docs/keyence-catalog.md）と重なるため今回は足していない。
- IO-Link のプロセスデータ・デバイスのパラメータは扱わない（配線とコネクタの相性、DI モードの入力の極性まで）。
