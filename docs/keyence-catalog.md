# KEYENCE 機器の調査と実装状況

KEYENCE の PLC（KV-X / KV-8000 / KV-7000 / KV Nano）と、それにつながる機器の調査結果と Conneko での実装状況をまとめる。
調査は 2026-10 時点の KEYENCE 公式サイト（keyence.co.jp）の「仕様」「入出力回路図」「外形寸法図」ページと製品写真による。
ユーザーズマニュアル（PDF）はログインが必要で参照できなかったため、マニュアルにしか載っていない情報（一部の端子配列など）は「推定」と明記した。

- 機器定義: `src/devices/catalog/keyence-*.ts`（1機器1ファイル）
- KEYENCE 機器の共通部品: `src/devices/keyence/`（KV ユニットの本体・MIL コネクタ・端子台、センサーのケーブル、アンプ、VT5 など）
- 整合性テスト: `src/devices/keyence/keyence.test.ts`

## 共通の方針

### デバイス番号（信号名）

I/O ユニットの入出力点のラベルは、マニュアルの信号名（ユニットの先頭リレー番号からの相対番号）で書く。
例: `IN 000 (No.1)`、`OUT 115 (No.33)`。実際のリレー番号は KV STUDIO の割付（装着位置）で決まる
（例: 先頭が R1000 なら IN 000 → R1000、IN 115 → R1115）。

### MIL コネクタのピン番号

ピンID は MIL 標準の千鳥番号（▲側の端が 1・2、極性キーの切欠き側の列が奇数、もう片方の列が偶数）。
既存の `generic-mil-terminal-block-40p.ts` と同じ。connector.kind は `MIL20` / `MIL34` / `MIL40`。

- KV-8000/7000 の 32点・64点ユニット（KV-C32XC 系、MIL 34極）はマニュアルが「横並び番号」（正面から見て左列が上から 1〜17、右列が 18〜34。
  左列に極性キーの切欠き）なので、KEYENCE の k 番 → `#(2k−1)`、17+k 番 → `#2k` に変換し、ラベルに `(No.k)` を残した。
- KV-SIR32XT / KV-SH04PL / KV-SSC02（MIL 40極）と KV-NC 系（MIL 20/34極）はマニュアル自体が MIL 標準の千鳥番号（左列 = 奇数）なので、そのまま使う。
  KV-NC32EX（標準番号の奇数 1〜31 = 000〜015）と KV-C32XC（KEYENCE 番号 1〜16 = 000〜015 = 標準 #1〜#31 の奇数）は物理的に同じ並びになり、変換が整合していることを確認した。

### 入出力ユニットの電気チェック上の扱い

| 端子 | role | accepts |
|---|---|---|
| 入力点・出力点 | `signal`（optional） | — |
| DC 入力の COM（双方向フォトカプラ） | `input`（optional） | DC 4.5〜26.4V、`+` / `-` どちらでも可 |
| シンク出力（NPN / N-ch MOSFET）の COM | `input`（optional） | DC 5〜30V、`-`（負荷電源の 0V） |
| ソース出力（PNP / P-ch）の COM | `input`（optional） | DC 5〜30V、`+`（負荷電源の +V） |
| リレー出力の COM | `pass`（optional） | — |

- 内部で共通の COM は `links`（向きなし）でつなぐ。
- 出力点と COM も `links` でつなぐ（「接点は閉とみなす」既存ルールに合わせ、**出力 ON とみなす**）。
  これにより、シンク出力に負荷（表示灯の X2 など）をつなぐと負荷の − 側に 0V が届き、`no-power` の警告が出ない。
  出力を電源の反対極に直接つなぐなどの誤配線は短絡・極性エラーとして検出される。
- センサーの電源線（茶 = `+`、青 = `-`）は role `input` + accepts、出力線・外部入力線・アナログ線は role `signal`。
  端子ID は IEC 60757 の色略号（BN, BU, BK, WH, GY, PK, VT, GN, OG, YE, RD, SH, PKVT=桃/紫）。

## 実装済み

### PLC 本体・拡張ユニット

| type | 型式 | 要点 | ピン配置・端子配列の出典 |
|---|---|---|---|
| `keyence.kv-x550` / `kv-x530` / `kv-x520` / `kv-x500` | KV-X550/X530/X520/X500 | KV-X CPU。DC24V（20.4〜28.8V）、Ethernet PORT1/2、EtherCAT PORT3（X500 はなし）。消費電流は params | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/)、[外形](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-x550/dimensions/)。電源端子の並び（+・−・FG）は推定 |
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
| `keyence.kv-ec01` | KV-EC01 | EtherCAT カプラ（リモート I/O の親）。電源端子の並びは推定 | [仕様](https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/)、[外形](https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-ec01/dimensions/) |
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

出典（外形・定格）: [XC-T34B1](https://www.keyence.co.jp/products/controls/other-controls/xc/models/xc-t34b1/)、[XC-T40B1](https://www.keyence.co.jp/products/controls/other-controls/xc/models/xc-t40b1/)。
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
| `keyence.fs-n41` | FS-N41N/P（ファイバアンプ 1出力） | 茶/青/黒 | [外形図（3芯 茶/青/黒）](https://www.keyence.co.jp/products/sensor/fiber-optic/fs-n40/models/fs-n41n/dimensions/) |
| `keyence.fs-n43` | FS-N43N/P（ファイバアンプ 2出力+外部入力） | 茶/青/黒/白/桃（黒・白・桃の機能は**推定**） | 同上（5芯 茶/青/黒/白/桃） |
| `keyence.lv-n11` | LV-N11N/P（レーザアンプ 2出力+外部入力） | 茶/青/黒/白/桃（黒・白・桃の機能は**推定**） | [外形図](https://www.keyence.co.jp/products/sensor/laser/lv-n/models/lv-n11n/dimensions/) |
| `keyence.il-1000` | IL-1000（変位アンプ） | 茶/青/黒 HIGH/白 LOW/灰 GO/緑 ALM/橙・シールド アナログ/桃・黄・桃紫・紫 外部入力 | [io-circuit](https://www.keyence.co.jp/products/sensor/laser/il/models/il-1000/io-circuit/) |
| `keyence.gt2-71` | GT2-71N/P（接触式アンプ） | 茶/青/橙 HH/黒 HI/灰 GO/白 LO/緑 LL/桃・紫・桃紫・黄・赤 入力 | [io-circuit](https://www.keyence.co.jp/products/sensor/contact/gt2/models/gt2-71n/io-circuit/) |
| `keyence.gp-m` | GP-M001〜M400（圧力） | M12 4ピン: 茶/白 出力2・アナログ/青/黒 出力1（ピン割り当ては M12 標準による**推定**） | [仕様](https://www.keyence.co.jp/products/process/pressure/gp-m/models/gp-m010/) |
| `keyence.fd-q` | FD-Q10C〜Q50C（クランプオン流量） | M12 4ピン: 茶/白 ch.2/青/黒 ch.1（**推定**） | [仕様](https://www.keyence.co.jp/products/process/flow/fd-q/models/fd-q20c/) |
| `keyence.lr-zb250c` | LR-ZB250CN/CP（CMOS レーザ） | M8 4ピン: 茶/白 外部入力/青/黒 出力（**推定**） | [仕様](https://www.keyence.co.jp/products/sensor/photoelectric/lr-z/models/lr-zb250cn/) |

## 未実装と理由

| 型式 | 理由 |
|---|---|
| KV-8000 CPU、KV-C32XC、KV-C32TC | 別担当が作成（指示により作らない） |
| KV-PU1（AC 電源ユニット） | 端子台（8端子: AC 入力・LG/FG・サービス電源・エラー出力）の並びが公開ページで確認できず、AC 電源の誤配線につながるため未実装 |
| KV-7000/KV-5000 系の旧機種（KV-7500、KV-5500 など）、KV Nano CPU（KV-N24/N40/N60/NC32T など） | 現行の KV-X/KV-8000 を優先。KV Nano CPU は端子配列の調査が未着手 |
| KV-NC32ETE / KV-NC16EXTE | 公式ページに入出力回路図がない（端子配列未確認） |
| KV-CA02（カメラ入力）+ KV-CA1H など | 専用ケーブル（USB 形状のカメラポート）で電気配線の対象が少ないため後回し |
| KV-EB1（増設ユニット）、KV-N1/KV-NC1（変換ユニット）、KV-B1（電池） | 配線がない／専用ケーブルのみ |
| XC-T20B1 / XC-T34E1 / XC-T40E1 / XC-T40P / XC-T26B など他の変換端子台 | 端子番号の割り当てが未確認。B1 型 2 種のみ実装 |
| XC-H34 / XC-H40 などのハーネスケーブル | ケーブルはアプリのケーブル描画で表現するので機器定義は不要 |
| VT5-W07M（モノクロ） | VT5-W07 と外形・端子が同じ。必要なら VT5-W07 にパラメータを追加 |
| SR-X / SR-1000 / SR-2000（コードリーダ）、IV3 / IV4（画像判別センサ） | 電源・I/O ケーブルの芯線割り当てが公開ページになく未確認 |
| PR-G（光電センサ）、LR-X、LR-T、LV-N のヘッド、EM（近接アンプ内蔵）、AP-V80 など | 調査済みの一部（PR-G51 は受光器 4芯 茶/青/黒/白、投光器 3芯 茶/青/黒）。出力の割り当てが未確認のものは後回し |
| セーフティライトカーテン（GL-R / GL-S / GL-V）、セーフティレーザスキャナ（SZ-V）、セーフティコントローラ（GC）、安全ドアスイッチ・非常停止 | **安全機器担当に移管** |

## 調査で使った主なページ

- KV-8000 仕様（全拡張ユニットの一覧）: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/specs/
- KV-X 仕様: https://www.keyence.co.jp/products/controls/plc-building/kv-x/specs/
- 各型式の入出力回路図: `https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/<型式>/io-circuit/`
- 各型式の外形寸法図: `https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/<型式>/dimensions/`
- XC シリーズ（変換端子台）: https://www.keyence.co.jp/products/controls/other-controls/xc/
- VT5 シリーズ: https://www.keyence.co.jp/products/controls/hmi/vt5/specs/
- センサー各シリーズ: `https://www.keyence.co.jp/products/sensor/<分類>/<シリーズ>/models/<型式>/`（io-circuit / dimensions）
