# オムロン PLC（NX1P2・NX ユニット）と汎用 DIN レール端子台の調査メモ

KEYENCE・三菱電機以外の PLC として、オムロンのマシンオートメーションコントローラ NX1P2（内蔵 I/O 付きのパッケージ型）と、
その右に連結する NX ユニットを追加した。あわせて、制御盤でよく使う汎用の DIN レール端子台（フエニックス・コンタクトの
プッシュイン式・ネジ式・接地用）を追加した。網羅ではなく、よく使われる代表機種に絞っている。

- 機器定義: `src/devices/catalog/omron-nx*.ts`、`src/devices/catalog/phoenix-*.ts`（1 機器 1 ファイル。中身は下の共通部品を呼ぶだけ）
- 共通部品:
  - `src/devices/omron/nx-parts.ts`: NX シリーズの描画部品（プッシュイン端子・RJ-45・LED・ロゴ）、バスの種類 `omron-nx`、NX バスの I/O 電源の電路名
  - `src/devices/omron/nx1p2.ts`: NX1P2 CPU ユニット（`buildNx1p2`）
  - `src/devices/omron/nx-unit.ts`: NX ユニット（`buildNxId5342`・`buildNxOd5121`・`buildNxPf0630`）
  - `src/devices/phoenix/terminal.ts`: フエニックス・コンタクトの端子台（`buildPhoenixTerminal`）と渡りの指定の読み取り（`parseBridges`）
- テスト: `src/devices/omron-plc.test.ts`
- パレット: CPU は「PLC CPU（オムロン）」のファミリー（`src/devices/families.ts` の `plc-cpu-omron`）。NX ユニットは PLC エディタから足す
  （入出力ユニットは「PLC 入出力ユニット」、NX-PF0630 は「PLC 電源ユニット」のファミリーで、どちらもパレットの分類の一覧には出さない）。
  端子台は既存の「端子台」のファミリーに入る。

調査は 2026-10 時点。メーカーのサイト（オムロン・フエニックス・コンタクト）の PDF は直接取得できなかったため、
取得できたオムロンの NX1P カタログ（第三者サイトに置かれた写し）と、検索で確かめられた製品ページ・データシートの記載による。
確かめられなかった値は機器定義の `estimated` に書き、下の表に「推定」と書いた。

## 収録機種

| type | 型式 | 種類 | 主な仕様 | 推定 | 出典 |
|---|---|---|---|---|---|
| `omron.nx1p2-1140dt` | NX1P2-1140DT（パラメータ `engine` で NX1P2-1040DT） | CPU ユニット（入力 24 点・NPN 出力 16 点） | DC24V 電源 7.05W、出力 0.3A/点・1.8A/コモン、EtherNet/IP・EtherCAT ポート、NX ユニット 8 台 | 推定: 入力端子台の ⏚ の位置 | NX1P カタログ P116 |
| `omron.nx1p2-1140dt1` | NX1P2-1140DT1（パラメータ `engine` で NX1P2-1040DT1） | CPU ユニット（入力 24 点・PNP 出力 16 点） | DC24V 電源 6.85W、出力 0.3A/点（負荷短絡保護付き）・1.8A/コモン | 推定: 入力端子台の ⏚ の位置 | NX1P カタログ P116 |
| `omron.nx1p2-9024dt` | NX1P2-9024DT | CPU ユニット（入力 14 点・NPN 出力 10 点、モーション制御軸なし） | DC24V 電源 6.70W、出力 0.3A/点・2.4A/コモン、オプションボード 1 スロット | 推定: 入力端子台の ⏚ の位置 | NX1P カタログ P116 |
| `omron.nx-pf0630` | NX-PF0630 | 増設 I/O 電源ユニット | I/O 電源 DC5〜24V、供給 4A まで、IOV 4 端子・IOG 4 端子 | 推定: 端子台の A・B 列の配列 | NX1P カタログ・システムユニット データシート |
| `omron.nx-id5342` | NX-ID5342 | DC 入力ユニット 16 点（NPN 用） | DC24V、16 端子（入力だけ。コモンは NX バスの I/O 電源） | 推定: 端子台の A・B 列と入力番号の対応 | NX1P カタログ・デジタル I/O ユニット データシート |
| `omron.nx-od5121` | NX-OD5121 | トランジスタ出力ユニット 16 点（NPN） | DC12〜24V、0.5A/点・4A/ユニット、16 端子（出力だけ） | 推定: 端子台の A・B 列と出力番号の対応 | NX1P カタログ・デジタル I/O ユニット データシート |
| `phoenix.pt-2.5` | PT 2,5（3209510）/ PT 2,5 BU（3209523） | 中継端子台（プッシュイン） | 幅 5.2mm、24A・800V、0.14〜4㎟、極数 4〜20・色・渡りはパラメータ | なし | フエニックス・コンタクト 製品ページ |
| `phoenix.ut-2.5` | UT 2,5（3044076） | 中継端子台（ネジ式 M3） | 幅 5.2mm、24A、0.14〜4㎟、0.5〜0.6N・m、極数・渡りはパラメータ | なし | フエニックス・コンタクト 製品ページ |
| `phoenix.pt-2.5-pe` | PT 2,5-PE（3209536） | 接地端子台（プッシュイン、緑黄） | 幅 5.2mm、0.14〜4㎟、DIN レールに導通 | 推定: 1 極の長さ・終端カバー | 販売店の製品情報 |

## NX1P2 CPU ユニット

### 端子配列（カタログ「Input Terminal Block」「Output Terminal Block」の配列図）

入力端子台・出力端子台はどちらも上段・下段の 2 段のスクリューレス・クランプ端子台（プッシュイン、着脱式）。左から:

| 機種 | 端子台 | 上段 | 下段 |
|---|---|---|---|
| 1□40DT / 1□40DT1 | 入力 | + − COM 01 03 05 … 21 ⏚ | + − 00 02 04 … 22 23 |
| 9024DT | 入力 | + − COM 01 03 … 13 ⏚ | + − 00 02 … 12 NC NC |
| 1□40DT | 出力 | NC NC 00 02 04 06 NC 08 10 12 14 | C0(0V) 01 03 05 07 C1(0V) 09 11 13 15 NC |
| 1□40DT1 | 出力 | NC C0(+V) 00 02 04 06 C1(+V) 08 10 12 14 | 0V0 01 03 05 07 0V1 09 11 13 15 NC |
| 9024DT | 出力 | NC NC 00 02 04 06 08 NC NC NC NC | C0(0V) 01 03 05 07 09 NC NC NC NC NC |

- ⏚（機能接地）は配列図の文字としては出ず、文字の並びから上段の右端（下段より 1 つ少ない位置）にあると読んだ（推定）。
- 端子 ID: 入力 `IN00`〜`IN23`、出力 `OUT00`〜`OUT15`（印字は 00〜23 で入力と出力に同じ数字があるため、ID とラベルに IN / OUT を付けた）。
  ユニット電源は上段 `+`・`-`、下段 `+2`・`-2`（内部で接続。下段は渡り配線用で未接続でも指摘しない）。⏚ は `FG`。
  出力のコモンは `C0`・`C1`（ラベル `C0(0V)` / `C0(+V)`）、PNP 出力の駆動回路の 0V は `0V0`・`0V1`。NC は端子にしない。
- 電線の出る向き: 入力端子台（上側）は上、出力端子台（下側）は下。

### 電気的な表現

- ユニット電源 `+` / `-`: `input`、DC20.4〜28.8V。`loadCurrent` は消費電力 / 24V（40DT 0.29A、DT1 0.29A、9024DT 0.28A。NX ユニットへの NX バス電源の供給分は含まない）。
- 入力: `signal: { dir: 'in', kind: 'dc', common: 'COM', onVoltage: 15, offCurrent: 1 }`。COM は DC15〜28.8V の + でも − でも受ける `input`
  （+24V につなぐとプラスコモン = NPN 用、0V につなぐとマイナスコモン = PNP 用）。2 線式センサー可（カタログの「接続できるセンサー」）。
  00〜15 は汎用入力 A（5.8mA、応答 2.5µs）、16〜23 は汎用入力 B（5.3mA、応答 1ms）。
- 出力（DT、NPN シンク）: `{ from: 出力点, to: C0/C1, switch: 'output', ratedCurrent: 0.3 }`、`commonLimits` は 1.8A/コモン（9024DT は 2.4A/コモン）。
  C0・C1 は負荷電源の 0V を受ける `input`（DC10.2〜28.8V、conductors: ['-']）。
- 出力（DT1、PNP ソース）: 出力点から C0(+V)・C1(+V) へ `switch: 'output'`。C0・C1 は +24V（DC15〜28.8V、conductors: ['+']）、0V0・0V1 は 0V を受ける `input`。
- Ethernet ポート: PORT1 は `protocols: ['ethernet', 'ethernet-ip']`、PORT2 は `['ethercat']`（正面に差す RJ-45、`facing: 'front'`）。

### 連結（バスの種類 `omron-nx`）と I/O 電源

- NX1P2 がバスの親（`host: { slots: 8 }`）。NX ユニットは `mount` の位置 1, 2, … の順に右隣へ並ぶ。8 台にはシステムユニット（NX-PF0630 など）も含む（カタログ）。
- 入出力番号の割付けはしない（`numbering` なし）。NX1P2 の内蔵 I/O・NX ユニットの I/O は Sysmac Studio のデバイス変数で扱い、
  CIO のような固定の番号を持たないため。I/O 表の番号はユニット内の名前（`IN00`、`IN0` など）になる。
- **NX バスの I/O 電源**: NX1P2 は NX ユニットへ I/O 電源を供給しない（カタログ「I/O Power Supply to NX Units: Not provided」）。
  NX バスから I/O 電源を受ける NX-ID5342・NX-OD5121 の前に、増設 I/O 電源ユニット NX-PF0630 を連結して IOV・IOG に DC24V を入れる。
  - NX-ID5342・NX-OD5121 は端子台に I/O 電源の端子がない。そこで上端に NX バスコネクタの端子 `BUS`（`kind: 'NX-BUS'`、ケーブルはつながない）を置き、
    そのピン `BUS#1`（IOV）・`BUS#2`（IOG）に `busNet` を書いた。NX-PF0630 の IOV・IOG 端子も同じ `busNet` なので、同じ CPU に連結すると導通する。
  - NX-ID5342 の入力は `common: 'BUS#1'`（IOV。NPN 用のプラスコモン）、NX-OD5121 の出力は `to: 'BUS#2'`（IOG）。
    NX-PF0630 に +24V を入れると入力のコモンの極性が決まり、PNP 出力のセンサーをつなぐと `signal-polarity` で指摘する（テストで確認）。
  - 制限: I/O 電源の区切り（NX-PF0630 より前のユニットには届かない、複数の NX-PF0630 で区切る）は扱わない（同じ CPU に連結したユニットは連結の順によらず同じ電位とみなす）。
    NX バス電源（NX ユニットの電源、10W 以下）の収支と、I/O 電源の供給 4A の上限も扱わない。

## NX ユニット

- 外形 W12 × H100 × D71mm（幅 24px）。上部に TS と入出力の表示 LED、その下に着脱式のスクリューレス・クランプ端子台（左列 A、右列 B）。
- NX-ID5342: 16 端子に入力 IN0〜IN15。A1〜A8 = IN0〜IN7、B1〜B8 = IN8〜IN15 と推定（データシートの端子接続図を確認できなかった）。
- NX-OD5121: 16 端子に出力 OUT0〜OUT15（同じ並びと推定）。0.5A/点（`ratedCurrent`）、ユニット合計 4A（`commonLimits` の `outputs`）。
- NX-PF0630: 8 端子に IOV 4 個・IOG 4 個（製品ページ）。並びは A1・B1・A2・B2 = IOV、A3・B3・A4・B4 = IOG と推定（W523 の結線例に「外部電源を A1 と A3 につなぐ」旨の記述があるため）。
  IOV どうし・IOG どうしは内部で導通（`links`）。余った端子は渡り・センサー電源の取り出しに使う。
- 端子 ID: `IN0`〜`IN15`、`OUT0`〜`OUT15`、`IOV1`〜`IOV4`・`IOG1`〜`IOG4`（端子台の位置は note に書いた）。

## 汎用の DIN レール端子台（フエニックス・コンタクト）

- 1 極の幅 5.2mm（10.4px）。極数分を並べ、右端に終端カバー、両端にエンドクランプ（CLIPFIX 35）を付けた状態を描く。
  部品表には付属品として終端カバー（PT: D-ST 2,5、UT: D-UT 2,5/10）とエンドクランプ 2 個を載せる。
- 端子 ID は汎用の端子台・東洋技研のレール用端子台と同じく `na`（上側）・`nb`（下側）。極数（`poles`: 4・6・8・10・12・16・20）はパラメータで、
  極数を変えても共通の極の ID は変わらない（幅は `size` で変わる）。
- **渡り（同電位）**: パラメータ `bridge` に「1-4, 7-8」のように極の範囲を書くと、その範囲の極を `links` でつなぎ、絵に赤い差込式ブリッジを描き、
  部品表に FBS □-5 を載せる（2・3・4・5・10・20 極。ほかの極数は長いものを切って使う旨を仕様欄に書く）。範囲の外・1 極だけ・重なりの指定は捨てる。
- 適合電線は `wire: { methods: ['ferrule', 'bare'], minSq: 0.14, maxSq: 4 }`（丸形・Y 形の圧着端子は不可）。中継端子台の定格電流は `ratedCurrent: 24`。
- 接地端子台 PT 2,5-PE は端子を `role: 'ground'` にし、全極を `links` でつないだ（足の金具が DIN レールに導通するため）。機器の FG・PE をまとめて受け、
  電源の PE までつながっていなければ `ground-floating` で指摘される。
- 出典:
  - PT 2,5: https://www.phoenixcontact.com/en-pc/products/feed-through-terminal-block-pt-25-3209510 （幅 5.2mm、高さ 35.3mm、長さ 48.6mm、24A、0.14〜4㎟）
  - UT 2,5: https://www.phoenixcontact.com/en-us/products/feed-through-terminal-block-ut-25-3044076 （幅 5.2mm、24A、M3、0.5〜0.6N・m、むき長さ 9mm）
  - PT 2,5 BU（3209523）・PT 2,5-PE（3209536、緑黄、幅 5.2mm、0.14〜4㎟）: 販売店の製品情報

## 出典（オムロン）

- NX1P カタログ（Machine Automation Controller NX1P Compact package-type、Cat. No. P116-E1）:
  https://ramcoi.s3.us-east-2.amazonaws.com/Omron/NX1P/omron_nx1p_data_sheet.pdf （第三者サイトに置かれた写し）
  - Ordering Information（NX1P2 の型式の見方、NX ユニットの一覧: NX-ID5342 = 16 点 NPN DC24V、NX-OD5121 = 16 点 NPN DC12〜24V、NX-PF0630 = I/O 電源 4A）
  - Electrical and Mechanical Specifications（外形・消費電力・突入電流・NX バス電源 10W・NX ユニットへの I/O 電源なし・接続できる NX ユニット 8 台）
  - Input Terminal Block / Input Specifications / Output Terminal Block / Output Specifications（端子配列・入出力の仕様）
  - Part Names and Functions（正面の配置）
- 製品ページ（検索で確認）: https://www.ia.omron.com/products/family/3650/ （NX1P2）、https://www.ia.omron.com/products/family/3185/ （デジタル I/O ユニット）、
  https://industrial.omron.eu/en/products/NX-PF0630 （IOV 4・IOG 4 端子）

## 見送ったもの

- **CP2E-N（N30DT-D など）と CP1W 増設 I/O**: 仕様（入力 18 点・トランジスタ出力 12 点、0.3A/点・0.9A/コモン、W130×H90×D80mm）は確かめられたが、
  端子台の配列とコモンの分け方を一次資料で確認できなかったため見送った。入出力番号（CIO 0.00〜1.05、100.00〜101.03、増設は CIO 2・102 から）は
  チャネル.ビットの表記なので、追加するときは `IoFormat` にオムロンの表記を足して `numbering: { mode: 'separate', unit: 16 }` で割り付けられる。
- NX ユニットの NX バス電源の収支、I/O 電源の区切り（上の「制限」）。
