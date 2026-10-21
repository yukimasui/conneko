# KEYENCE 機器の調査と実装状況

KEYENCE の PLC（KV-X / KV-8000 / KV-7000 / KV Nano）と、それにつながる機器の調査結果と Conneko での実装状況をまとめる。
調査は 2026-10 時点の KEYENCE 公式サイト（keyence.co.jp）の「仕様」「入出力回路図」「外形寸法図」ページと製品写真による。
ユーザーズマニュアル（PDF）はログインが必要で参照できなかったため、マニュアルにしか載っていない情報（一部の端子配列など）は「推定」と明記した。

- 機器定義: `src/devices/catalog/keyence-*.ts`（1機器1ファイル）
- KEYENCE 機器の共通部品: `src/devices/keyence/`（KV ユニットの本体・MIL コネクタ・端子台、センサーのケーブル、アンプ、VT5 など）
- 整合性テスト: `src/devices/keyence/keyence.test.ts`

## 共通の方針

### 装着（bus）とリレー番号の自動割付

拡張ユニットは `bus` を持ち、図面の機器に `mount: { device: 'PLC1', slot: 1 }` を書くと CPU の右に並び、
入出力の先頭番号（`params.ioIn` / `ioOut`）が決まる（`src/model/bus.ts`）。共通部品は `src/devices/keyence/kv-parts.ts` の `kvUnitBus`。

| 親 | bus.kind | 受け入れるユニット | 台数 | 番号の割付 | 内部電源（DC24V） |
|---|---|---|---|---|---|
| KV-8000 CPU | `kv-8000` | `kv-8000`（KV-8000/7000 用の拡張ユニット） | 16 | `shared`、16 点単位、R000 から | 供給 3.2A、CPU 自身 0.4A |
| KV-X550/X530/X520/X500 | `kv-x` | `kv-x`、`kv-8000` | 16 | 同上 | 供給 3.4A、CPU 自身 0.6A |
| KV-EC01 | `kv-ec01` | `kv-nano`（KV-NC 系） | 指定なし（未確認） | 同上（連結順の相対番号） | 供給 1.8A、自身 0.12A |

- **台数**: KV-8000 / KV-X とも「KV-8000/7000 シリーズ拡張ユニットのみで 16 台、KV-EB1 を使い KV-5000/3000 用を含めると 48 台」
  （[KV-8000 仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/specs/)・[KV-X 仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/)）。
  KV-EB1 経由の構成は対象外とし 16 台にした。
- **内部電源**: 仕様の「内部消費電流 400mA 以下（KV-X は 600mA 以下）、拡張ユニット使用時は最大 3.2A（3.4A）」を、
  CPU の DC24V 電源端子から流れる電流の上限と解釈し、レール名 `DC24V` の `supply` を 3.2A（3.4A）、CPU 自身を `load` 0.4A（0.6A）とした。
  拡張ユニットの `load` はカタログの「内部消費電流」（KV-8000 仕様ページの一覧と各型式のページ）。KV-EC01 は「拡張ユニットを含めた消費電流の制限 1.8A」。
  以前の手動パラメータ（`consumption`）は廃止し、CPU・KV-EC01 の `loadCurrent` は単体の値にした。
- **割付**: KV STUDIO の自動割付（CPU の右隣のユニットから順に、R000 から 16 点 = 1 チャネル単位）に合わせ、
  `numbering: { mode: 'shared', unit: 16, start: { input: 0, output: 0 } }`。入力と出力を持つユニットは入力のチャネルの次が出力
  （KV-B8XTD なら入力 R000〜R007、出力 R100〜R107。従来のマニュアルの相対番号 IN 000 / OUT 100 と同じ並び）。
  自動割付の規則は公開ページで確認できなかったため、従来の機器説明（R000 から・16 点単位）と KV STUDIO の一般的な動作による**推定**。
- **リレーを占有しないユニット**: アナログ・温調・カウンタ・通信ユニットは `io` を持たない（後ろのユニットの番号をずらさない）と仮定した。
  公開仕様で占有点数が書かれているのは位置決めユニットだけで、KV-XH04ML は「リレー 576 点（36 ch）」なので `io: { inputs: 576 }` とした
  （入出力の内訳は不明）。実機の割付と違う場合は図面で先頭番号を指定する。
- **KV-EC01**: リモート I/O の実際のデバイスは EtherCAT の PDO 割付で決まる。連結したユニットのラベルは連結順の相対番号（R000 から）。
  KV-EC01 に連結できるユニット（KV-NC 系）と台数は公開ページで確認できず、従来どおり KV-NC□□ を連結する前提にした。

### ピン・端子のラベル（リレー番号）

I/O ユニットの入出力点のラベルは、先頭番号（`ioIn` / `ioOut`）から `ioName('kv', …)` で作るリレー番号。
MIL コネクタは KEYENCE のピン番号を残して `R000 (No.1)`、ネジ端子台は `R000`（端子台の印字は note に書く）。
装着していないユニットは先頭 R000（出力は入力のチャネルの次）で、インスペクタで先頭番号を指定できる。
ピンID・端子ID は変えていない（MIL のピンIDは MIL 標準番号、端子台は印字どおり）。

### MIL コネクタのピン番号

ピンID は MIL 標準の千鳥番号（▲側の端が 1・2、極性キーの切欠き側の列が奇数、もう片方の列が偶数）。
既存の `generic-mil-terminal-block-40p.ts` と同じ。connector.kind は `MIL20` / `MIL34` / `MIL40`。

- KV-8000/7000 の 32点・64点ユニット（KV-C32XC 系、MIL 34極）はマニュアルが「横並び番号」（正面から見て左列が上から 1〜17、右列が 18〜34。
  左列に極性キーの切欠き）なので、KEYENCE の k 番 → `#(2k−1)`、17+k 番 → `#2k` に変換し、ラベルに `(No.k)` を残した。
- KV-SIR32XT / KV-SH04PL / KV-SSC02（MIL 40極）と KV-NC 系（MIL 20/34極）はマニュアル自体が MIL 標準の千鳥番号（左列 = 奇数）なので、そのまま使う。
  KV-NC32EX（標準番号の奇数 1〜31 = 000〜015）と KV-C32XC（KEYENCE 番号 1〜16 = 000〜015 = 標準 #1〜#31 の奇数）は物理的に同じ並びになり、変換が整合していることを確認した。
- I/O ユニットの MIL コネクタは正面に差すので `facing: 'front'`。プラグを正面から見た大きさは幅 20px（10mm）× 長さ「段数 × 2.54mm + 7.5mm」（34極 101px、40極 117px）。

### 入出力ユニットの電気的な注記

| 端子 | role | 注記 |
|---|---|---|
| 入力点 | `signal` | `signal: { dir: 'in', kind: 'dc', common: <その点の COM> }` |
| DC 入力の COM（双方向フォトカプラ） | `input` | DC24V モード 19〜26.4V（最小 ON 電圧〜入力最大電圧）、DC5V モード 4.5〜5.5V（仮定）、`+` / `-` どちらでも可 |
| 出力点 | `signal` | `signal: { dir: 'out', kind }`（シンク = `npn`、ソース = `pnp`、リレー = `contact`） |
| シンク出力（NPN / N-ch MOSFET）の COM | `input` | DC 5〜30V、`-`（負荷電源の 0V） |
| ソース出力（PNP / P-ch）の COM | `input` | DC 5〜30V、`+`（負荷電源の +V） |
| リレー出力の COM | `input` | AC 24〜250V または DC 5〜30V（`accepts` を配列にして両方） |

- 出力は `links` に `{ from: 出力点, to: COM, switch: 'output', ratedCurrent }`。内部で共通の COM どうしは向きなしの常時導通の `links`。
- 入力モード切替スイッチ（DC24V / DC5V）は `params.inputMode`（`INPUT_MODE_PARAM`）。入力 COM の受電条件を切り換える
  （KV-B16XC / KV-C32XC / KV-B8XTD / KV-C16XTD / KV-NC16EX / KV-NC16EXE。KV-SIR32XT は DC5V モードが IN100〜115 側だけなので COM1 側だけ切り換える）。
  `{ param }` は 1 つの値しか参照できないため、受電条件は端子・ピンを返す関数の中で決めている。
- コモンあたりの上限（`commonLimits`）は仕様で確認できたものだけ: KV-B16RC 8A/コモン、KV-SIR32XT 1.6A/コモン、KV-NC32ET 1.6A/コモン端子
  （KV-NC32ETP も同じと仮定。出力の奇数ピンを COM0、偶数ピンを COM1 に振り分けて合計する）。KV-NC16ETE は 3.2A/端子で 16 点 × 0.2A を超えないので書いていない。
  KV-B16TD / KV-C32TD / KV-C64TD などは公開ページにコモンあたりの上限がない。
- 1 点の定格電流: トランジスタ出力 0.2A（KV-B16TD / KV-B8XTD は 0.3A）、リレー出力 2A、KV-TF40 の制御・警報出力 0.1A、
  KV-SSC02 の一致出力 0.2A、KV-SH04PL の ALMRES/SVON/CLR は 0.1A（**仮定**）。

### 信号の種類（特殊ユニット）

- アナログ入出力（KV-AM40V / KV-SAD04 / KV-SDA04 / KV-TP40）: 電圧の + 端子に `analog-v`、電流の + 端子に `analog-i`。GND・COM 側には付けない。
- KV-TF40: 制御出力・警報出力は `npn`（出力コモン Cn へ `switch: 'output'`）。熱電対・測温抵抗体・CT 入力は専用の入力なので種類なし。
- KV-SH04PL: リミット・原点・停止・サーボ系の入力と FSTOP は `dc`（内部で +COM から給電され、−COM へ落として ON = プラスコモン。入出力回路図より）、
  Z 相は `line-driver` 入力、パルス出力 FP±/RP± は `line-driver` 出力、ALMRES/SVON/CLR は `npn`（−COM へ `switch: 'output'`）。
- KV-SSC02: キャプチャ入力は `dc`（コモン 39）、一致出力は `npn`。A/B/Z 相はエンコーダの出力形式で配線が変わるため種類なし。

### 通信ポート（`protocols`）と正面向き

| ポート | protocols |
|---|---|
| KV-8000 Ethernet、KV-X PORT1/PORT2 | `ethernet`、`ethernet-ip` |
| KV-X PORT3、KV-XH16EC、KV-EC01 IN/OUT | `ethercat` |
| KV-XLE02 PORT1/2 | `ethernet`、`ethernet-ip`、`profinet`、`ethercat`、`cc-link-ie-field`、`modbus-tcp` |
| KV-XCM02、KV-XD02、VT5 の LAN | `ethernet` |
| KV-XH04ML | `mechatrolink-iii`（kind も `MECHATROLINK3`） |

RJ-45 ポートは `facing: 'front'`（差込口の向きに合わせ、ケーブルが上下に出るポートは幅 22 × 長さ 19、左右に出るポートは幅 19 × 長さ 22）。
汎用 Ethernet のポートは `ethernet` を共通にして、EtherCAT 専用ポートとの取り違えだけを警告させる。

### センサー

- 電源線（茶 = `+`、青 = `-`）は role `input` + accepts、出力線・外部入力線・アナログ線は role `signal`。
  端子ID は IEC 60757 の色略号（BN, BU, BK, WH, GY, PK, VT, GN, OG, YE, RD, SH, PKVT=桃/紫）。
- 出力線は `signal: { dir: 'out', kind: 'npn' | 'pnp' }`（出力形式のパラメータ `output` で切換）と、
  出力 ON の内部経路 `{ from: 出力線, to: 0V（NPN）/ +V（PNP）, switch: 'output', ratedCurrent }`（`sensorOutputLinks`）。
- 外部入力線（チューニング・リセットなど）は `signal: { dir: 'in', kind: 'dc', commonPolarity }`。NPN タイプは 0V と短絡して ON
  （内部で +V に引き上げ = プラスコモン相当）、PNP タイプは +V と短絡して ON（マイナスコモン相当）。
- EV（DC 2 線式）は 2 線とも `2wire`。検出で茶と青の間が導通する（`switch: 'output'`、M8 は 80mA、ほかは 200mA）。
- アナログ出力: GP-M の出力2（`params.out2 = 'analog'`）と FD-Q の ch.2（`params.ch2 = 'analog'`）は `analog-i`、IL-1000 はアンプの設定（`params.analog`）で `analog-v` / `analog-i`。
- 出力形式がアンプ・センサーの設定で決まる機器（IL-1000、GP-M、FD-Q）も `output` パラメータで NPN / PNP を選ぶ。

### M12 / M8 コネクタとセンサーケーブル

- GP-M・FD-Q・LR-Z は、従来の「ケーブルを差した姿」（芯線の色ごとの端子）に加え、センサー単体の姿（コネクタ `CN` が端子）を追加した。
  共通の描画は `src/devices/keyence/gp-m.ts` / `fd-q.ts` / `lr-z.ts`。
- コネクタは `kind: 'M12-4'` / `'M8-4'`、`style: 'round'`、`pinColors: { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black' }`（IEC 60947-5-2 の標準線色）。
  GP-M・FD-Q は正面（上面）にコネクタがあるので `facing: 'front'`、LR-Z は底面から下向き。
- 片側バラ線のケーブルは汎用品 `generic.m12-4p-cable` / `generic.m8-4p-cable`（ストレートのメス + 茶・白・青・黒のバラ線、ピン n と同じ色の芯線が導通）。

### MIL 変換端子台・ハーネス

- XC-T34B1 / XC-T40B1 の端子は label = 端子台の印字（番号）、note = つながるコネクタの MIL 標準ピン（XC-T34B1 は KEYENCE の I/O ユニットのピン No. と同じ番号）。
  コネクタは上から差すので `facing: 'front'`。
- XC-H34D / XC-H40D（MIL - バラ線のハーネス）は、MIL メスコネクタ `CN` と芯線ごとの端子（ID は MIL 標準のピン番号）を持つ機器。芯線の色・マークは**未確認**。

## 実装済み

### PLC 本体・拡張ユニット

| type | 型式 | 要点 | ピン配置・端子配列の出典 |
|---|---|---|---|
| `keyence.kv-8000.cpu` | KV-8000 | KV-8000 CPU。DC24V、Ethernet（EtherNet/IP）。拡張ユニットの親（bus、16 台、内部電源 3.2A） | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/specs/) |
| `keyence.kv-c32xc.input` | KV-C32XC | 入力 32点 MIL34、24V/5V 切替 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32xc/) |
| `keyence.kv-c32tc.output` | KV-C32TC | トランジスタ（NPN）出力 32点 MIL34 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32tc/) |
| `keyence.kv-x550` / `kv-x530` / `kv-x520` / `kv-x500` | KV-X550/X530/X520/X500 | KV-X CPU。DC24V（20.4〜28.8V）、Ethernet PORT1/2、EtherCAT PORT3（X500 はなし）。拡張ユニットの親（bus、16 台、内部電源 3.4A） | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/)、[外形](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-x550/dimensions/)。電源端子の並び（+・−・FG）は推定 |
| `keyence.kv-b16xc` | KV-B16XC | 入力 16点 ネジ端子台、24V/5V、COM 2端子共通 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16xc/io-circuit/) |
| `keyence.kv-c64xc` | KV-C64XC | 入力 64点 MIL34×2（L/H）、L・H で COM 独立 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c64xc/io-circuit/) |
| `keyence.kv-b16td` | KV-B16TD | MOSFET シンク出力 16点 ネジ端子台 0.3A | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16td/io-circuit/) |
| `keyence.kv-b16tcp` | KV-B16TCP | トランジスタ ソース出力 16点 ネジ端子台 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16tcp/io-circuit/) |
| `keyence.kv-c32td` | KV-C32TD | MOSFET シンク出力 32点 MIL34 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32td/io-circuit/) |
| `keyence.kv-c32tcp` | KV-C32TCP | ソース出力 32点 MIL34 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32tcp/io-circuit/) |
| `keyence.kv-c64td` | KV-C64TD | MOSFET シンク出力 64点 MIL34×2、COM 4端子すべて共通 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c64td/io-circuit/) |
| `keyence.kv-c64tcp` | KV-C64TCP | ソース出力 64点 MIL34×2 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c64tcp/io-circuit/) |
| `keyence.kv-b16rc` | KV-B16RC | リレー出力 16点、8点1コモン×2（独立） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b16rc/io-circuit/) |
| `keyence.kv-b8rc` | KV-B8RC | リレー出力 8点 独立コモン | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b8rc/io-circuit/) |
| `keyence.kv-b8xtd` | KV-B8XTD | 入力 8 + シンク出力 8、ネジ端子台 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-b8xtd/io-circuit/) |
| `keyence.kv-c16xtd` | KV-C16XTD | 入力 16 + シンク出力 16、MIL34（左列入力・右列出力） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c16xtd/io-circuit/) |
| `keyence.kv-c32xtd` | KV-C32XTD | 入力 32 + シンク出力 32、MIL34×2（IN/OUT） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-c32xtd/io-circuit/) |
| `keyence.kv-sir32xt` | KV-SIR32XT | 高速入出力 32+32、MIL40×2（標準番号）、COM0〜3 独立 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sir32xt/io-circuit/) |
| `keyence.kv-sad04` | KV-SAD04 | 高速アナログ入力 4ch、16極プッシュイン | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sad04/io-circuit/) |
| `keyence.kv-sda04` | KV-SDA04 | 高速アナログ出力 4ch、16極プッシュイン | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sda04/io-circuit/) |
| `keyence.kv-am40v` | KV-AM40V | A/D 2ch + D/A 2ch、18端子ネジ端子台 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-am40v/io-circuit/) |
| `keyence.kv-tp40` | KV-TP40 | 温度・アナログ マルチ入力 4ch | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-tp40/io-circuit/) |
| `keyence.kv-tf40` | KV-TF40 | 温度調節 4ch、端子台 2個、制御/警報出力はシンク | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-tf40/io-circuit/) |
| `keyence.kv-sh04pl` | KV-SH04PL | 4軸パルス位置決め、MIL40×2、+COM/−COM/+5V_OUT | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sh04pl/io-circuit/) |
| `keyence.kv-ssc02` | KV-SSC02 | 高速カウンタ 2ch、MIL40 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-ssc02/io-circuit/) |
| `keyence.kv-xh16ec` | KV-XH16EC | EtherCAT モーション 16軸（RJ45 + FG） | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xh16ec/) |
| `keyence.kv-xh04ml` | KV-XH04ML | MECHATROLINK-III モーション 4軸（kind `MECHATROLINK3`） | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xh04ml/) |
| `keyence.kv-xle02` | KV-XLE02 | Ethernet ユニット RJ45×2 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xle02/) |
| `keyence.kv-xcm02` | KV-XCM02 | データベース連携ユニット RJ45×2 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xcm02/) |
| `keyence.kv-xd02` | KV-XD02 | データ活用ユニット RJ45×2 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xd02/) |
| `keyence.kv-xl202` | KV-XL202 | RS-232C ×2（7極ヨーロピアン端子台） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xl202/io-circuit/) |
| `keyence.kv-xl402` | KV-XL402 | RS-422A/485 ×2（5極ヨーロピアン端子台、終端 SW） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xl402/io-circuit/) |
| `keyence.kv-dn20` | KV-DN20 | DeviceNet（5極コネクタ、FG） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-dn20/io-circuit/) |
| `keyence.kv-ec01` | KV-EC01 | EtherCAT カプラ（KV-NC 系ユニットの親、bus、内部電源 1.8A）。電源端子の並びは推定 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/)、[外形](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-ec01/dimensions/) |
| `keyence.kv-nc16exe` | KV-NC16EXE | 入力 16点 プッシュイン（各段 入力+COM） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc16exe/io-circuit/) |
| `keyence.kv-nc16ete` | KV-NC16ETE | シンク出力 16点 プッシュイン | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc16ete/io-circuit/) |
| `keyence.kv-nc16etpe` | KV-NC16ETPE | ソース出力 16点 プッシュイン | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc16etpe/io-circuit/) |
| `keyence.kv-nc32exe` | KV-NC32EXE | 入力 32点 プッシュイン（16+18極） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc32ex/io-circuit/) |
| `keyence.kv-nc8er` | KV-NC8ER | リレー出力 8点、4点1コモン×2 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc8er/io-circuit/) |
| `keyence.kv-nc16ex` | KV-NC16EX | 入力 16点 MIL20 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc16ex/io-circuit/) |
| `keyence.kv-nc16et` / `kv-nc16etp` | KV-NC16ET / ETP | シンク / ソース出力 16点 MIL20 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc16et/io-circuit/) |
| `keyence.kv-nc32ex` | KV-NC32EX | 入力 32点 MIL34（標準番号） | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc32ex/io-circuit/) |
| `keyence.kv-nc32et` / `kv-nc32etp` | KV-NC32ET / ETP | シンク / ソース出力 32点 MIL34 | [io-circuit](https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-nc32et/io-circuit/) |

外形寸法（1mm ≒ 2px）は各型式の「外形寸法図」ページによる: KV-C32 系 W23、KV-B16 系・C64 系・AM40V W29、TP40 W35、TF40 W58、
SAD04/SDA04 W22.6、XL202/XLE02/XCM02 W36、SH04PL/XH16EC/XH04ML W42、SSC02 W22.6、SIR32XT W36、XD02 W48.2、DN20 W35、KV-NC 系 W22.2、
EC01 W26.7、KV-X550 W77.9（高さはいずれも 90〜92.5mm）。

### MIL 変換端子台

| type | 型式 | 要点 |
|---|---|---|
| `keyence.xc-t34b1` | XC-T34B1 | MIL34 → M3 ネジ 34極（124.5mm、ピッチ 7mm、2段）。端子番号は奥段 1〜17・手前段 18〜34 で KEYENCE のピン番号と同じと**推定** |
| `keyence.xc-t40b1` | XC-T40B1 | MIL40 → M3 ネジ 40極（145.5mm）。端子番号は奥段 奇数・手前段 偶数（MIL 標準番号と同じ）と**推定** |
| `keyence.xc-h34d` | XC-H34D | MIL34（メス）- バラ線のハーネス。芯線 ID は MIL 標準のピン番号、線色は**未確認** |
| `keyence.xc-h40d` | XC-H40D | MIL40（メス）- バラ線のハーネス。同上 |

出典（外形・定格）: [XC-T34B1](https://www.keyence.co.jp/products/controls/other-controls/xc/models/xc-t34b1/)、[XC-T40B1](https://www.keyence.co.jp/products/controls/other-controls/xc/models/xc-t40b1/)、[XC-H34D-05](https://www.keyence.com/products/controls/other-controls/xc/models/xc-h34d-05/)、[XC-H40D-05](https://www.keyence.com/products/controls/other-controls/xc/models/xc-h40d-05/)。
端子台の印字（端子番号とピンの対応）は公開ページで確認できなかった。

### タッチパネル（HMI）

| type | 型式 | 要点 |
|---|---|---|
| `keyence.vt5-w07`（既存） | VT5-W07 | 7型ワイド |
| `keyence.vt5-w10` | VT5-W10 | 10型ワイド 1024×600、283.6×197.4mm、0.9A |
| `keyence.vt5-x10` | VT5-X10 | 10型 XGA、299.8×210.8mm、1.3A、RGB 入力・DVI 出力 |
| `keyence.vt5-x12` | VT5-X12 | 12型 XGA、312.3×245.3mm、1.4A |
| `keyence.vt5-x15` | VT5-X15 | 15型 XGA、394.1×293.1mm、1.5A |

出典: [VT5 仕様](https://www.keyence.co.jp/products/controls/hmi/vt5/specs/)、各型式の dimensions ページ。
背面の端子部は VT5-W07 の図にそろえた**概念図**（実機の配置は未確認）。縮尺は大型のため 1mm ≒ 1px。

### センサー・入力機器

| type | 型式 | 線色と機能 | 出典 |
|---|---|---|---|
| `keyence.pz-g51` | PZ-G51N/P（透過型） | 投光器 茶/青、受光器 茶/青/黒（出力）。params output = NPN/PNP | [io-circuit](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g51n/io-circuit/)、外形図の芯線表記 |
| `keyence.pz-g41` | PZ-G41N/P（拡散反射） | 茶/青/黒 | [io-circuit](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41n/io-circuit/) |
| `keyence.pz-g61` | PZ-G61N/P（回帰反射） | 茶/青/黒 | [io-circuit](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g61n/io-circuit/) |
| `keyence.ez` | EZ-8M/12M/18M/30M（近接 DC3線） | 茶/黒（N.O.）/白（N.C.）/青。params size | [io-circuit](https://www.keyence.co.jp/products/sensor/proximity/ez/models/ez-8m/io-circuit/) |
| `keyence.ev` | EV-108M/112M/118M/130M（近接 DC2線） | 茶/青（2線とも signal 扱い） | [io-circuit](https://www.keyence.co.jp/products/sensor/proximity/ev/models/ev-112m/io-circuit/) |
| `keyence.em-030` | EM-030（近接 アンプ内蔵 ø3） | 茶/黒（出力 NPN 200mA）/青 | [io-circuit](https://www.keyence.co.jp/products/sensor/proximity/em/models/em-030/io-circuit/) |
| `keyence.fs-n41` | FS-N41N/P（ファイバアンプ 1出力） | 茶/青/黒 | [外形図（3芯 茶/青/黒）](https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n41n/dimensions/) |
| `keyence.fs-n43` | FS-N43N/P（ファイバアンプ 2出力+外部入力） | 茶/青/黒 出力1/白 出力2/桃 外部入力 | 同上（5芯）、[FS-N40 ユーザーズマニュアル p.3（転載）](https://www.autodev.com/uploads/resources/220779_8830-sensor-instructions.pdf) |
| `keyence.lv-n11` | LV-N11N/P（レーザアンプ 2出力+外部入力） | 茶/青/黒 出力1/白 出力2/桃 外部入力 | [外形図](https://www.keyence.co.jp/products/sensor/laser/lv-n/models/lv-n11n/dimensions/)、[LV-N10 取扱説明書 p.7〜8（転載）](https://www.manualsdir.com/manuals/657909/keyence-lv-n10-series.html) |
| `keyence.il-1000` | IL-1000（変位アンプ） | 茶/青/黒 HIGH/白 LOW/灰 GO/緑 ALM/橙・シールド アナログ/桃・黄・桃紫・紫 外部入力 | [io-circuit](https://www.keyence.co.jp/products/sensor/laser/il/models/il-1000/io-circuit/) |
| `keyence.gt2-71` | GT2-71N/P（接触式アンプ） | 茶/青/橙 HH/黒 HI/灰 GO/白 LO/緑 LL/桃・紫・桃紫・黄・赤 入力 | [io-circuit](https://www.keyence.co.jp/products/sensor/contact/gt2/models/gt2-71n/io-circuit/) |
| `keyence.gp-m` | GP-M001〜M400（圧力） | M12 4ピン: 茶/白 出力2・アナログ/青/黒 出力1（ピン割り当ては M12 標準による**推定**） | [仕様](https://www.keyence.co.jp/products/process/pressure/gp-m/models/gp-m010/) |
| `keyence.fd-q` | FD-Q10C〜Q50C（クランプオン流量） | M12 4ピン: 茶/白 ch.2/青/黒 ch.1（**推定**） | [仕様](https://www.keyence.co.jp/products/process/flow/fd-q/models/fd-q20c/) |
| `keyence.lr-zb250c` | LR-ZB250CN/CP（CMOS レーザ） | M8 4ピン: 茶/白 外部入力/青/黒 出力 | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/)、[LR-ZB 取扱説明書 96M11812（転載）](https://www.manualsdir.com/manuals/657872/keyence-lr-zbxn_p-series.html) |
| `keyence.gp-m.m12` / `keyence.fd-q.m12` / `keyence.lr-zb250c.m8` | 上の 3 機種のセンサー単体 | コネクタ `CN`（M12 / M8 4ピン、ピン 1〜4）が端子。センサーケーブルとつなぐ | 同上 |

### 光電センサ（2026-10 追加）

シリーズごとに 1 つの組み立て関数（`src/devices/keyence/` の pz-g.ts / pr-g.ts / pz-vm.ts / pr-mf.ts / lr-z.ts / lr-wtx.ts / amp-series.ts）で作り、
種類（検出方式・検出距離）は `params.model`、NPN / PNP は `params.output` で選ぶ。見た目がほぼ同じものはパラメータにまとめ、
次のものは別の機器にした。

- 透過型の**投光器と受光器**（向かい合わせに置き、それぞれ配線するため）。投光器は電源（と投光停止入力）だけで出力を持たない。
- **接続形態**（ケーブル / M8 / M12 / ケーブル付 M12・M8）。端子 ID が変わる（ケーブルは芯線の色、コネクタは `CN` とピン `CN#1〜4`）ため。
  コネクタタイプは汎用のセンサーケーブル（`generic.m8-4p-cable` / `generic.m12-4p-cable`）とつなぐ。
- アンプの**親機と子機**。子機は `mount` で親機に装着する（`bus.kind` はシリーズごと: `fs-n40` / `ps-n` / `lv-n` / `lr-xn` / `cz-v20`）。

共通部品: `photo.ts`（`buildPhoto`: 本体の絵にケーブル・コネクタを付け、芯線の信号の種類から出力の内部経路を作る）、
`din-amp.ts`（DIN レール取付アンプ）、`sensor-parts.ts` に本体のオスコネクタ（`roundMale`）・ケーブル付コネクタ（`pigtailMale`）、
未使用ピン（`role: 'nc'`）、+V / 0V のどちらかにつなぐ線（`role: 'select'`）を追加。

| type | 型式（params） | 配線（ケーブルの芯線 / コネクタのピン） | 出典 |
|---|---|---|---|
| `keyence.pz-g.reflective` / `.m8` / `.m12` | PZ-G41/42/101/102/61/62 角型 N/P（ケーブル / CN・CP / EN・EP） | 茶 +V・青 0V・黒 出力（ピン 1/3/4、2 未使用） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/specs/)、[io-circuit（CN）](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41cn/io-circuit/)、各 dimensions |
| `keyence.pz-g.emitter` / `.m8` / `.m12` | PZ-G51/52 角型 投光器 | 茶・青（ピン 1/3） | [io-circuit](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g51cn/io-circuit/) |
| `keyence.pz-g.receiver` / `.m8` / `.m12` | PZ-G51/52 角型 受光器 N/P | 反射型と同じ | 同上 |
| `keyence.pz-g.nut.reflective` / `.m12` | PZ-G□B / □CB ナット型（Bipolar） | 茶・青・黒 PNP 出力（ピン 4）・白 NPN 出力（ピン 2） | [io-circuit（B）](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41b/io-circuit/)、[dimensions（CB）](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g41cb/dimensions/) |
| `keyence.pz-g.nut.emitter` / `.m12`、`keyence.pz-g.nut.receiver` / `.m12` | PZ-G51B/52B・CB の投光器 / 受光器 | 投光器 茶・青、受光器は Bipolar | [dimensions（PZ-G51B）](https://www.keyence.co.jp/products/sensor/photoelectric/pz-g/models/pz-g51b/dimensions/) |
| `keyence.pr-g.reflective` / `.m8` | PR-G41/42/61 N/P（ステンレス、背面に 7 セグ） | 茶 +V・黒 出力1・白 出力2・青 0V（ピン 1/4/2/3） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/pr-g/specs/)、[取扱説明書 96M17817（転載）](https://ventionavatars.s3.amazonaws.com/uploads/part_document/file/760/PR-G_Instruction_Manual.pdf) |
| `keyence.pr-g.emitter` / `.m8`、`keyence.pr-g.receiver` / `.m8` | PR-G51/56 投光器 / 受光器 | 投光器 茶・青・黒 投光停止入力（0V と短絡で停止） | 同上 |
| `keyence.pz-m.reflective` / `.m12` / `.m8` | PZ-M11/M31/M71/M61、PZ-V11/V31/V71（N/P、ケーブル / ケーブル付 M12 0.3m / M8 0.13m） | 茶 +V・黒 出力・桃 出力動作の切換（+V で遮光時 ON、0V で入光時 ON）・青 0V（ピン 1/4/2/3） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/specs/)、[io-circuit（P）](https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/models/pz-m11p/io-circuit/) |
| `keyence.pz-m.emitter` / `.m12` / `.m8`、`keyence.pz-m.receiver` / `.m12` / `.m8` | PZ-M51（52/53）投光器 / 受光器 | 投光器 茶・青 | [io-circuit](https://www.keyence.co.jp/products/sensor/photoelectric/pz-v_m/models/pz-m51/io-circuit/) |
| `keyence.pr-mf.reflective` / `.m8` | PR-MB15/MB30/FB15/FB30（BGS 反射、N/P） | 茶 +V・黒 出力1・白 出力2・青 0V、出力 50mA | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/pr-m_f/specs/)、[カタログ（転載）](https://www.plc-sensors.com/wp-content/uploads/2020/08/Keyence-Photoelectric-Sensor-PR-M-Datasheet.pdf) |
| `keyence.pr-mf.emitter` / `.m8`、`keyence.pr-mf.receiver` / `.m8` | PR-M51 / PR-F51 投光器 / 受光器 | 投光器 茶・青（投光停止入力なし） | 同上 |
| `keyence.lr-z` / `keyence.lr-z.m8` | LR-ZB100/ZB250(A)/ZH500 N/P | 茶 +V・白 外部入力・青 0V・黒 出力（ピン 1/2/3/4） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/specs/)、[取扱説明書 96M11812（転載）](https://www.manualsdir.com/manuals/657872/keyence-lr-zbxn_p-series.html) |
| `keyence.lr-w` / `keyence.lr-w.m12` | LR-W500/W70/WF10（C）、NPN/PNP は初期設定 | 茶 +V・黒 出力・白 外部入力・青 0V | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/lr-w/specs/)、[LR-W70 取扱説明書（転載）](https://www.afmeng.com/PDFFiles/AS_77442_LR-W70_IM_96M13827_GB_WW_1125-1.pdf) |
| `keyence.lr-t` / `keyence.lr-t.m12` | LR-TB2000/TB5000（C）、params io・analog | 茶 +V（20〜30V）・青 0V・黒/白は初期設定（出力1+出力2 / 入力+出力1 / 白 アナログ） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/lr-t/specs/)、[LR-TB2000 取扱説明書（転載）](https://www.nexinstrument.com/assets/images/pdf/LR-TB2000%20Series_All-Purpose%20Laser%20Sensor.pdf) |
| `keyence.lr-x` / `keyence.lr-x.m8` | LR-X50/X100/X250（C）、params pin2 | 茶 +V（16〜30V）・黒 出力1・白 出力2 / 外部入力・青 0V | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/lr-x/specs/)、[LR-X カタログ（転載）](https://5.imimg.com/data5/SELLER/Doc/2022/9/EF/PO/AN/29295296/laser-sensor-lr-x100.pdf) |
| `keyence.lr-xn11` / `keyence.lr-xn12` / `keyence.lr-xn11.m8` | LR-XN11（親機）/ LR-XN12（子機、最大 8 台）/ LR-XN11C | 親機 茶・青・黒・白・桃、子機 黒・白・桃 | 同上 |
| `keyence.fs-n42` / `keyence.fs-n44` | FS-N42 / FS-N44（ファイバアンプ子機） | 黒（FS-N42）、黒・白・桃（FS-N44） | [仕様](https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/specs/)、[dimensions](https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n42n/dimensions/) |
| `keyence.ps-n11` / `.m8`、`keyence.ps-n12` / `.m8` | PS-N11 / PS-N12（アンプ分離型光電の親機 / 子機） | 親機 茶・青・黒 出力・桃 外部入力、子機 黒だけ。M8 はピン 4 出力・2 外部入力（**推定**） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/ps-n/specs/)、[PS-N10 取扱説明書（転載）](https://www.manualsdir.com/manuals/657880/keyence-ps-n10-series.html) |
| `keyence.lv-n12` / `keyence.lv-n11.m8` | LV-N12（子機）/ LV-N11C（M8 親機） | 子機 黒・白・桃。M8 はピン 4 出力・2 外部入力（**推定**） | [LV-N10 取扱説明書（転載）](https://www.manualsdir.com/manuals/657909/keyence-lv-n10-series.html) |
| `keyence.px-10` | PX-10 / PX-10P（耐油・防水型 PX のアンプ） | 茶 +V・青 0V・黒 検出出力・白 アラーム出力・桃 外部入力 | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/px/specs/)、[取扱説明書（転載）](https://www.manualsdir.com/manuals/657881/keyence-px-10.html) |
| `keyence.cz-v21a` / `keyence.cz-v22a` | CZ-V21A(P) 親機 / CZ-V22A(P) 子機（RGB、4 出力） | 親機 茶・青・黒/白/灰/橙 出力1〜4・桃 チューニング・紫 バンク切換、子機は茶・青・桃なし | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/cz-v20/specs/)、[取扱説明書（転載）](https://www.manualsdir.com/manuals/657886/keyence-cz-v22ap-cz-v21ap.html) |

既存機器の変更: `keyence.fs-n41` / `keyence.fs-n43` / `keyence.lv-n11` に子機の連結（`bus.host`）を追加。PZ-G41/61 のヘッドの 3 行目を「受光器」から種類名に変更。
外部入力の極性はどのシリーズも「NPN タイプは 0V、PNP タイプは +V と短絡で ON」（`signal: { dir: 'in', kind: 'dc', commonPolarity }`）。
「転載」は KEYENCE の取扱説明書・カタログを第三者のサイトで参照したもの（KEYENCE のサイトの入出力回路図が非公開のシリーズ）。

### センサーケーブル（汎用品）

| type | 型式 | 要点 |
|---|---|---|
| `generic.m12-4p-cable` | M12 4ピン ストレート | メスコネクタ `CN` + 茶（BN）・白（WH）・青（BU）・黒（BK）のバラ線。ピン n と同じ色の芯線が導通 |
| `generic.m8-4p-cable` | M8 4ピン ストレート | 同上（M8） |

## 未実装と理由

| 型式 | 理由 |
|---|---|
| KV-PU1（AC 電源ユニット） | 端子台（8端子: AC 入力・LG/FG・サービス電源・エラー出力）の並びが公開ページで確認できず、AC 電源の誤配線につながるため未実装 |
| KV-7000/KV-5000 系の旧機種（KV-7500、KV-5500 など）、KV Nano CPU（KV-N24/N40/N60/NC32T など） | 現行の KV-X/KV-8000 を優先。KV Nano は keyence.co.jp の商品一覧に見当たらず（海外サイトのみ: https://www.keyence.com.ph/products/controls/plc-terminal-block-type/kv_nano/specs/ ）、CPU の端子配列は未調査。拡張ユニット（KV-NC 系）は KV-EC01 のリモート I/O としても使うため実装した |
| KV-NC32ETE / KV-NC16EXTE | 公式ページに入出力回路図がない（端子配列未確認） |
| KV-CA02（カメラ入力）+ KV-CA1H など | 専用ケーブル（USB 形状のカメラポート）で電気配線の対象が少ないため後回し |
| KV-EB1（増設ユニット）、KV-N1/KV-NC1（変換ユニット）、KV-B1（電池） | 配線がない／専用ケーブルのみ |
| XC-T20B1 / XC-T34E1 / XC-T40E1 / XC-T40P / XC-T26B など他の変換端子台 | 端子番号の割り当てが未確認。B1 型 2 種のみ実装 |
| XC-H34 / XC-H40 などの MIL - MIL ハーネスケーブル | ケーブルはアプリのケーブル描画で表現するので機器定義は不要（片側バラ線の XC-H34D / XC-H40D は実装済み） |
| VT5-W07M（モノクロ） | VT5-W07 と外形・端子が同じ。必要なら VT5-W07 にパラメータを追加 |
| SR-X / SR-1000 / SR-2000（コードリーダ）、IV3 / IV4（画像判別センサ） | 電源・I/O ケーブルの芯線割り当てが公開ページになく未確認 |
| LV-N・LR-X・PS・PX のセンサヘッド、FU / CZ-H シリーズのファイバユニット | 電気配線がない（アンプに差し込むだけ）ため機器にしない。アンプの左端にヘッド・ファイバを小さく描いている |
| PR-G のネジ型（PR-G51CBD など、M12 Bipolar）、PR-G の M8 3ピン（…C3PD）、PR-M/F の M8 3ピン（…C3PL/PD） | 日本の仕様表に載っていない・出力が 1 点だけの派生品。必要なら既存の機器にパラメータを足す |
| PX-10C / PX-10CP（PX アンプのコネクタタイプ） | コネクタの形状を確認できなかった（ピンの機能は 1 茶・2 白 アラーム・3 青・4 黒 検出、外部入力なし） |
| FS-N41C、ゼロライン子機（FS-N40 / PS-N10 / LV-N10 / LR-XN10） | ゼロライン子機は配線がない（通信ユニット経由）。FS-N41C は未実装 |
| LR-ZH…B（IO-Link M12 タイプ） | NPN/PNP でピン 2・4 の役割が入れ替わる別仕様。未実装 |
| PZ-101、PQ、PG、AI、MU-N、PZ2、AP-V80、旧シリーズ（PK・PM・PS・PS-T・PW・PZ、生産終了） | 現行の主力シリーズを優先。PJ-V（エリアセンサ）は生産終了で、現行の非安全エリアセンサは見つからなかった |
| セーフティライトカーテン（GL-R / GL-S / GL-V）、セーフティレーザスキャナ（SZ-V）、セーフティコントローラ（GC）、安全ドアスイッチ・非常停止 | **安全機器担当に移管** |

## 機器定義では表せていないこと

- CPU・KV-EC01 の電源端子の `loadCurrent` は単体の値で、装着したユニットの内部消費電流は含まない（bus の収支は別にチェックされる）。
  電源ユニット・電線の容量の確認には、bus の合計を親の電源端子の負荷に足す仕組みが要る。
- 装着していない入出力ユニットの先頭出力番号は、ラベルでは「入力のチャネルの次」としている（KV-B8XTD なら R100）が、
  インスペクタの先頭番号の表示は ioOut 未指定を 0 として扱う。
- 入力モード（DC24V / DC5V）で COM の電圧範囲を変えるのに `{ param }` では最小・最大の 2 つの値を出せないため、端子・ピンを返す関数の中で受電条件を選んでいる。
- コモンあたりの上限（`commonLimits`）はパラメータで変えられないため、NPN / PNP で基準側が変わるセンサーの「2 出力合計 100mA」は書いていない。
- アンプの子機（FS-N42/N44、PS-N12、LV-N12、LR-XN12、CZ-V22A）は電源を親機から連結部でもらうが、その導通は表せない。子機には電源線がないので出力の内部経路（`switch: 'output'`）を書けず、子機の出力に負荷（リレーなど）を直接つないでも電源の経路はチェックされない（PLC の入力につなぐ場合の NPN/PNP の相性はチェックされる）。
- 子機の台数の上限は `bus.host.slots`（台数）で表しているため、「2 出力タイプは 2 台分」（FS-N40）の数え方はできない。親機の消費電流に子機の分は含まない。
- 初期設定で決まる入出力（LR-W/LR-X/LR-T の NPN/PNP、白線の機能など）はパラメータで表している。図面の値と実機の設定が一致しているかは確認できない。
- PZ-M の桃（出力動作の切換）は「+V か 0V のどちらかにつなぐ」端子として `role: 'input'`（極性 '+' / '-' 両方可）にした。未接続は電源なしとして指摘される。
- 透過型の投光器と受光器の組（向かい合わせて使うこと）は機器定義では表せない（別々の機器として置き、説明文で案内している）。
- 種類（model）と出力形式・接続形態の組み合わせには実在しない型式もある（例: PR-G の NPN M8 は PR-G51CN だけ）。組み合わせの制約はパラメータで表せない。
- 2 線式センサーのもれ電流・残留電圧と、入力ユニットごとの 2 線式センサーの可否（KV-C64XC は EV シリーズ不可）は表せない。
- アナログの + 端子と GND（−）端子の組（同じ ch の − へ戻すこと）は表せない。
- 特殊ユニットの占有リレー（KV-XH04ML の 576 点など）は `io.inputs` として数えているため、インスペクタには入力の範囲として表示される。

## 調査で使った主なページ

- KV-8000 仕様（全拡張ユニットの一覧）: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/specs/
- KV-X 仕様: https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/
- 各型式の入出力回路図: `https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/<型式>/io-circuit/`
- 各型式の外形寸法図: `https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/<型式>/dimensions/`
- XC シリーズ（変換端子台）: https://www.keyence.co.jp/products/controls/other-controls/xc/
- VT5 シリーズ: https://www.keyence.co.jp/products/controls/hmi/vt5/specs/
- センサー各シリーズ: `https://www.keyence.co.jp/products/sensor/<分類>/<シリーズ>/models/<型式>/`（io-circuit / dimensions）、`…/<シリーズ>/specs/`（全型式の仕様表）
- 光電センサの取扱説明書・カタログ（KEYENCE の入出力回路図が非公開のもの）は「光電センサ」の表の出典欄を参照
