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

## シーメンス S7-1200・KTP700 Basic と MOXA のシリアル変換器・PoE スイッチングハブ（issue #75 の残り）

KEYENCE・三菱電機・オムロン以外の PLC として、シーメンスの S7-1200（コンパクト CPU）とその HMI、産業用の通信機器（RS-232C ⇔ RS-422/485 の変換器、
PoE 給電のスイッチングハブ）を追加した。調査は 2026-11 時点で、メーカーのサイトは直接取得できなかったため、検索で確かめられたデータシートの写し・製品ページの記載による。
テストは `src/devices/plc-units3.test.ts`。

| type | 型式 | 種類 | 主な仕様 | 推定 |
|---|---|---|---|---|
| `siemens.cpu1214c.dc-dc-dc` | CPU 1214C DC/DC/DC（6ES7214-1AG40-0XB0） | S7-1200 CPU（DI 14・DQ 10（ソース 0.5A）・AI 2） | DC24V（20.4〜28.8V）約 0.5A、センサー電源 400mA、PROFINET × 1、W110 × H100 × D75mm | 推定: センサー電源出力の L+・M の位置（下の端子台の左端とした） |
| `siemens.ktp700-basic-pn` | KTP700 Basic PN（6AV2123-2GB03-0AX0） | 7 型ワイド HMI（タッチ + F1〜F8） | DC24V（19.2〜28.8V）230mA、PROFINET × 1、前面 214 × 158mm | 推定: 背面の並び（概念図）と機能接地の位置 |
| `moxa.tcc-100` | TCC-100 | シリアル変換器 RS-232 ⇔ RS-422/485 | DC12〜48V 47mA 以下、RS-232 は D-sub 9 ピン メス、RS-422/485 は端子台 | 推定: 外形、端子台の並び、電源の端子台の FG |
| `moxa.eds-g205a-4poe` | EDS-G205A-4PoE | アンマネージ スイッチングハブ 5 ポート（4 ポート PoE+） | DC12/24/48V（12〜57V）冗長入力、PoE 合計 62W（12V）/ 120W（24V）/ 144W（48V）、1 ポート最大 36W | 推定: 外形、端子台・ポートの並び、本体の消費電流（約 0.3A） |

### S7-1200 CPU 1214C DC/DC/DC

- 端子 ID は既定のアドレス（`I0.0`〜`I1.5`、`Q0.0`〜`Q1.1`、アナログは `AI0`・`AI1`）、ラベルは「`I0.0 (DIa.0)`」「`IW64 (AI0)`」。I/O 表の番号の欄はラベルの先頭の語（I0.0・Q0.0・IW64）。
  シグナルモジュールの増設（バス）は扱わない（シーメンスの CPU は `bus` を持たない）。
- 入力は `{ dir: 'in', kind: 'dc', common: '1M' }`（1M は +/− 共用。0V につなぐと PNP 用、+24V につなぐと NPN 用）、アナログ入力は `analog-v`（基準 2M）、
  出力はソースのトランジスタで、出力点から 3L+ への `switch: 'output'`（0.5A）と `signal.kind: 'pnp'`。
- 下の端子台の左端の L+・M はセンサー電源出力（400mA まで）。CPU の電源から出るので、CPU の L+・M と常時導通の `pass` の端子にした（電源のチェックでセンサーまで電源が届く。テストで確認）。
  400mA の上限は説明に書いただけで、チェックしない。
- 端子の並び（上: L+ M ⏚ 1M DIa.0〜.7 DIb.0〜.5 ／ 2M AI0 AI1、下: L+ M 3L+ 3M DQa.0〜.7 DQb.0〜.1）は、シーメンスのシステムマニュアルのピン表の写しと第三者の資料による。
  センサー電源出力が上下どちらの端子台にあるかは資料で食い違ったため、機器定義では推定と書いた。
- PROFINET ポートは `['ethernet', 'profinet', 'modbus-tcp', 'opc-ua']`。パレットには新しいファミリー「PLC CPU（シーメンス）」（`families.ts` の `plc-cpu-siemens`）で出る。

### KTP700 Basic PN

- 正面図（画面の下にファンクションキー F1〜F8）と背面のインタフェースの概念図（電源コネクタ X80 の +24V・M、機能接地、PROFINET X1、USB X61）。
  分類 `control`、一般名称「タッチパネルディスプレイ」でパレットの「タッチパネル」に入る。PROFINET ポートは `['ethernet', 'profinet']`
  （S7-1200 の PROFINET とはつながり、EtherCAT のポートとつなぐと `protocol-mismatch`）。

### MOXA TCC-100（シリアル変換器）

- RS-232 側はコネクタ（`kind: 'DSUB9'`、`protocols: ['rs-232c']`）。GOT・NB の RS-232 ポートとケーブルでつなげ、RS-422/485 のポートとつなぐと `protocol-mismatch`。
- RS-422/485 側の端子 Tx+・Tx−・Rx+・Rx− に `port: 'RS-422/485'`・`protocols: ['rs-422', 'rs-485', 'modbus-rtu']` を書いた。変換器は中身のプロトコルを変えずに通すので、
  RS-485 の上の Modbus RTU（電力計 EMU4 など）とつないでも指摘しない。DeviceNet・CC-Link の通信線とつなぐと指摘する（テストで確認）。
- 分類は `network`、一般名称「シリアル変換器（RS-232C ⇔ RS-422/485）」（どのルールにも当たらないので、一般名称ごとのファミリーになる）。

### MOXA EDS-G205A-4PoE（PoE スイッチングハブ）

- 一般名称「スイッチングハブ（PoE 給電）」で、既存の「スイッチングハブ」のファミリーに入る。ポートは汎用のスイッチングハブと同じ `SWITCHABLE_PROTOCOLS`
  （CC-Link IE フィールド・EtherCAT の機器をつなぐと `protocol-mismatch`。テストで確認）。
- PoE で給電する先の機器の電力はケーブルの先の機器として表せないため、パラメータ「PoE 給電の合計」[W] を足した。電源から見た消費電流は
  24V 入力として「本体 約 0.3A + PoE 給電 ÷ 24V ÷ 0.9」（`loadCurrent` の関数）。上流の保護・電源の容量のチェックに入る。

### 出典

- CPU 1214C DC/DC/DC: 6ES7214-1AG40-0XB0 のデータシート（第三者のサイトの写し、例 https://www.all4sps.com/mediafiles/Sonstiges/6ES7214-1AG40-0XB0.pdf ）、
  S7-1200 システムマニュアルのピン表の写し・第三者の解説（端子の並び、センサー電源 400mA）
- KTP700 Basic PN: 6AV2123-2GB03-0AX0 のデータシート（定格入力電流 230mA、19.2〜28.8V、5.5W、前面 214 × 158mm）
- TCC-100: https://www.moxa.com/en/products/industrial-edge-connectivity/serial-converters/serial-to-serial-converters/tcc-100-100i-series/tcc-100 とデータシート v1.5、TCC-100I の取扱説明書（端子の名前）
- EDS-G205A-4PoE: https://www.moxa.com/en/products/industrial-network-infrastructure/ethernet-switches/poe-switches/eds-g205a-series/eds-g205a-4poe とデータシート

### 確かめられなかったこと・簡略化

- 上の表の推定の列のとおり。S7-1200 のシグナルモジュール・通信モジュールの増設、センサー電源の 400mA の上限のチェック、KTP700 の F1〜F8 の割付けは扱わない。
- PoE の給電はケーブルの先の機器の受電として表せない（パラメータで消費電流を見込むだけ）。TCC-100 の 2 線式/4 線式・終端抵抗の DIP スイッチはパラメータにしていない。
