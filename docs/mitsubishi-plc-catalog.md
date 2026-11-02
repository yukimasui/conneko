# 三菱電機 MELSEC 機器定義の調査メモ

`src/devices/catalog/mitsubishi-*.ts` に追加した MELSEC（iQ-R / iQ-F）の機器定義について、
選んだ型式とその理由、端子配列・仕様値の出典をまとめる。網羅ではなく、よく使われる代表機種に絞っている。

## 実装した機器

| type | 型式 | 種類 | 外部接続 |
|---|---|---|---|
| `mitsubishi.r61p` | R61P | iQ-R 電源ユニット（AC 入力、DC5V 6.5A） | M4 ネジ端子 6 点 |
| `mitsubishi.r62p` | R62P | iQ-R 電源ユニット（AC 入力、DC5V 3.5A + DC24V 0.6A） | M4 ネジ端子 6 点 + M3.5 2 点 |
| `mitsubishi.r64p` | R64P | iQ-R 電源ユニット（AC 入力、DC5V 9A） | M4 ネジ端子 6 点 |
| `mitsubishi.r35b` / `r38b` / `r312b` | R35B / R38B / R312B | iQ-R 主ベースユニット（入出力スロット 5 / 8 / 12） | なし（ユニットを装着する親） |
| `mitsubishi.rg60` | RG60 | iQ-R ブランクカバー（空きスロット用） | なし |
| `mitsubishi.r04cpu` | R04CPU（R08/R16/R32/R120CPU をパラメータで選択） | iQ-R CPU ユニット | Ethernet（RJ45） |
| `mitsubishi.rx40c7` | RX40C7 | iQ-R DC 入力 16 点 | 18 点ネジ端子台 |
| `mitsubishi.ry10r2` | RY10R2 | iQ-R 接点（リレー）出力 16 点 | 18 点ネジ端子台 |
| `mitsubishi.ry40nt5p` | RY40NT5P | iQ-R トランジスタ出力 16 点（シンク） | 18 点ネジ端子台 |
| `mitsubishi.rx41c4` | RX41C4 | iQ-R DC 入力 32 点 | 40 ピンコネクタ（kind `FCN40`） |
| `mitsubishi.ry41nt2p` | RY41NT2P | iQ-R トランジスタ出力 32 点（シンク） | 40 ピンコネクタ（kind `FCN40`） |
| `mitsubishi.fx5u-32mr-es` | FX5U-32MR/ES | iQ-F CPU（AC 電源、入力 16 / リレー出力 16） | 端子台（M3）、Ethernet |
| `mitsubishi.fx5u-32mt-es` | FX5U-32MT/ES | iQ-F CPU（AC 電源、入力 16 / トランジスタ出力 16 シンク） | 端子台（M3）、Ethernet |
| `mitsubishi.fx5-16ex-es` | FX5-16EX/ES | iQ-F 増設入力 16 点 | 端子台（M3） |
| `mitsubishi.fx5-16eyr-es` | FX5-16EYR/ES | iQ-F 増設リレー出力 16 点 | 端子台（M3） |
| `mitsubishi.fx5-16eyt-es` | FX5-16EYT/ES | iQ-F 増設トランジスタ出力 16 点（シンク） | 端子台（M3） |

共通部分は生成関数にまとめ、型式ごとのファイルから呼んでいる（既存の MIL 変換端子台と同じ方式）。

- `buildR18PointModule`（`mitsubishi-rx40c7.ts`）: iQ-R 18 点ネジ端子台ユニット
- `buildR40PinModule`（`mitsubishi-rx41c4.ts`）: iQ-R 40 ピンコネクタユニット
- `buildRPowerSupply`（`mitsubishi-r61p.ts`）: iQ-R 電源ユニット
- `buildRBase`（`mitsubishi-r35b.ts`）: iQ-R 主ベースユニット
- `buildFx5u32m`（`mitsubishi-fx5u-32mr-es.ts`）: FX5U-32M
- `buildFx5Ext16`（`mitsubishi-fx5-16ex-es.ts`）: FX5 の 16 点増設ユニット
- バスの種類（`melsec-iq-r` / `melsec-fx5`）、先頭番号からのラベル作成（`ioLabel`）、リレー出力コモンの受電条件（`relayCommonAccepts`）は
  `src/devices/mitsubishi/melsec.ts` にまとめている。構造のテストは `src/devices/mitsubishi.test.ts`。

## 選定理由

- **iQ-R**: 現行の主力モジュール型。ベース → 電源 → CPU → I/O の基本構成が組めるよう、主ベース 3 種（5 / 8 / 12 スロット）と空きスロット用のブランクカバー、
  AC 電源 3 種（DC24V 出力の有無、DC5V 大容量の R64P）、標準 CPU、I/O は「16 点ネジ端子台」と「32 点 40 ピンコネクタ」の入力・出力を選んだ。
  - 入力は DC24V の標準品 RX40C7 / RX41C4（プラス/マイナスコモン共用で用途が広い）。
  - 出力は AC 負荷にも使えるリレー RY10R2、DC 負荷向けのシンクトランジスタ RY40NT5P / RY41NT2P（国内で一般的なシンク）。
  - CPU は R04CPU を代表にし、外観・接続が同じ R08/R16/R32/R120CPU をパラメータで選べるようにした。
  - 18 点端子台・40 ピンコネクタのユニットは Q シリーズ（QX40・QY10・QY40P・QX41・QY41P 等）と端子配列互換（I/O マニュアル Appendix 2）。
- **iQ-F**: 小規模設備で最も使われる FX5U の 32 点 AC 電源タイプ（リレー出力 / シンクトランジスタ出力）と、
  それに続けてつなぐ増設ケーブルタイプの 16 点 I/O（入力・リレー出力・トランジスタ出力）。
- **MELSEC-Q**: 今回は見送り（外観色・電源/CPU の端子配列を一次資料で確認できなかったため）。
  I/O の端子・ピン配列は iQ-R と互換なので、外観を確認できれば `buildR18PointModule` / `buildR40PinModule` の色違いで追加できる。

## 電気的な表現の方針

- 電源入力（L / N）は `input` + `accepts`（AC85〜264V）、`distinctGroups: [['L', 'N']]`。FG / LG / ⏚ は `ground`。
- DC24V サービス電源（R62P の +24V / 24G、FX5U の 24V / 0V）は `supply`（limitCurrent は定格出力電流）。
- iQ-R 電源ユニットの ERR 接点（ERR1-ERR2）は、システム正常時（動作中）に閉じるので `switch: 'NO'`、`ratedCurrent: 0.5`（DC24V 0.5A）。
- 電磁接触器 S-T10: 主接点 3 極と補助接点 13-14 は `switch: 'NO'`（主接点は AC-3 の定格使用電流 11A を `ratedCurrent`）。
  サーマルリレー TH-T18: 95-96 は `switch: 'NC'`、97-98 は `switch: 'NO'`、主回路は `protects`。ブレーカー類は常時導通のまま。
  操作コイルの電流（`loadCurrent`）は一次資料で確認できていないので付けていない。
- **入力**: 入力点は `role: 'signal'` + `signal: { dir: 'in', kind: 'dc', common }`。common は iQ-R が `COM`（RX41C4 は B01 のピン `CN1#39`）、
  FX5 が `S/S`。コモン端子は DC24V の + でも − でも受ける `input`（conductors: ['+', '-']）なので、
  + につなげばプラスコモン（NPN・接点用、FX5 ではシンク入力）、− につなげばマイナスコモン（PNP 用、ソース入力）と判定される。
- **出力**: 出力点からコモンへ `{ from: 出力点, to: コモン, switch: 'output', ratedCurrent }`、コモンごとの上限は `commonLimits`。
  出力点には `signal: { dir: 'out', kind }`（リレーは `contact`、シンクトランジスタは `npn`）も付けた。

  | 機種 | 1 点の定格 | コモンあたり |
  |---|---|---|
  | RY10R2（リレー） | 2A | 8A / 16 点 1 コモン |
  | RY40NT5P（トランジスタ・シンク） | 0.5A | 5A / 16 点 1 コモン |
  | RY41NT2P（トランジスタ・シンク） | 0.2A | 2A / 32 点 1 コモン |
  | FX5U-32MR/ES（リレー） | 2A | 8A / 4 点 1 コモン |
  | FX5U-32MT/ES（トランジスタ・シンク） | 0.5A | 0.8A / 4 点 1 コモン |
  | FX5-16EYR/ES（リレー） | 2A | 8A / 8 点 1 コモン |
  | FX5-16EYT/ES（トランジスタ・シンク） | 0.5A | 1.6A / 8 点 1 コモン |

- リレー出力のコモンは AC・DC のどちらも入るので `role: 'input'` + `accepts` を配列にした
  （RY10R2: AC5〜264V / DC5〜125V（最大開閉電圧）、FX5: AC5〜240V / DC5〜30V。下限は最小開閉負荷 DC5V）。
- トランジスタ出力（シンク）のコモンは負荷電源の 0V を受ける `input`（conductors: ['-']）、RY40NT5P / RY41NT2P の +V は `+`。
- 同じ COM が複数ピンある場合（B01/B02 など）は常時導通の `links`。
- 端子ID は信号名（X00、Y0F、COM、+V など）で、iQ-R の入出力ユニット・FX5 の増設ユニットはユニット内の相対番号のまま変えない。
  装着で決まる先頭番号（`ioIn` / `ioOut`）を足した実際の入出力番号を `label` に出す（`ioName` の 16 進 / 8 進）。
  ネジ端子の端子番号（端子台 1番 など）とユニット内の信号名は `note`。40 ピンコネクタのピンは AI 用の一覧に label だけが出るため、
  `X20 (B20)` のように実際の番号と三菱のピン番号を label に並べ、ユニット内の信号名を note にした。
- ネジ端子台の電線の出る向き: iQ-R の 2 列千鳥端子台は右列 = `right`、左列 = `left`。
  電源ユニットの主端子は `right`（左側に表示・DC24V 端子があるため）、R62P の +24V/24G は `left`。FX5U は上側端子台 = `top`、下側 = `bottom`。
- Ethernet ポート（R04CPU・FX5U）は `facing: 'front'`（正面から差す RJ-45）と `protocols: ['ethernet', 'slmp', 'cc-link-ie-field-basic']`。

## 装着（バス）と入出力番号の割付け

### iQ-R（バスの種類 `melsec-iq-r`）

- 主ベースユニット R35B / R38B / R312B がバスの親。電源ユニット・CPU・入出力ユニット・ブランクカバーを `mount` で装着する。
- **装着位置の約束**: 位置 1 = 電源ユニット、位置 2 = CPU ユニット、位置 3 以降 = 入出力スロット 0, 1, …（位置 n が入出力スロット n−3）。
  装着したユニットは、ベースに描いた各スロットの位置（`host.slotX`。電源スロットは幅 109px（54.6mm）、CPU・入出力スロットは 56px（27.8mm））に並ぶ。
  位置 1・2 は `host.slotRoles: { 1: 'power', 2: 'cpu' }` で電源ユニット・CPU 専用とし、電源ユニット（`bus.role: 'power'`）・CPU（`bus.role: 'cpu'`）を
  ほかの位置に装着したり、専用の位置にほかのユニットを装着したりすると警告する。
  ユニット（高さ 106mm）はベース（高さ 101mm）より上下に 2.5mm ずつはみ出すので origin.y は −5px。
- `slots` は「入出力スロット数 + 2」（電源ユニットと CPU も装着するユニットとして数えるため）: R35B 7、R38B 10、R312B 14。
- **入出力番号**: `numbering: { mode: 'shared', unit: 16, start: { input: 0 }, emptySlot: 16 }`。入出力ユニットに位置の順で X0（= Y0）から割り付ける。
  空きスロット（位置を飛ばしたところ）は初期設定どおり 16 点を占有する。
  電源ユニット・CPU は `io` を持たないので番号を占有しない。16 点ユニットは 16 点、32 点ユニットは 32 点を占有する（`bus.io` の点数）。
  これは iQ-R の自動割付け（入出力スロット 0 が X0/Y0、ユニットの点数ずつ 16 点単位で続く）と同じ。
- **DC5V の収支**: 電源ユニットの `bus.supply['5V']`（R61P 6.5A、R62P 3.5A、R64P 9A）と、ベース・CPU・入出力ユニットの `bus.load['5V']` を合計する。
  ベースユニット自体も DC5V を消費する（R35B 0.58A、R38B 0.71A、R312B 0.88A）。

  | ユニット | DC5V 消費 |
  |---|---|
  | R04CPU | 0.67A |
  | RX40C7 / RX41C4 | 0.12A / 0.15A |
  | RY10R2 / RY40NT5P / RY41NT2P | 0.45A / 0.14A / 0.18A |

- **制限**:
  - 空きスロットの占有点数を PLC パラメータで変えた場合（0 点など）は表せない。ブランクカバー RG60 は入力 16 点として数える。
  - 増設ベース（R65B など）・マルチ CPU・GX Works3 での割付けの変更（先頭番号の指定）は扱わない（図面で `ioIn` / `ioOut` を直接指定すれば上書きできる）。
  - 64 点ユニット・インテリジェント機能ユニットは未作成（`bus.io` の点数を書けば同じ仕組みで割り付けられる）。

### iQ-F（バスの種類 `melsec-fx5`）

- FX5U-32MR/ES・FX5U-32MT/ES の CPU ユニットがバスの親で、増設ユニット（FX5-16EX/ES など）を `mount` の位置 1, 2, … の順に右隣へ並べる（`origin` 省略 = 右隣）。
  `slots: 16`（FX5U に増設できるユニットは 16 台まで。拡張ボード・拡張アダプタは除く）。
- **入出力番号**: `numbering: { mode: 'separate', unit: 8 }`。入力 X と出力 Y を別々に 8 進で数え、CPU 本体の `io`（入力 16 / 出力 16）の後ろ、
  X20 / Y20 から 8 点単位で割り付ける（FX5U-32M の右隣の FX5-16EX/ES は X20〜X37、次の FX5-16EYR/ES は Y20〜Y37）。
- **内部電源**: CPU の `bus.supply` は DC5V 0.9A・DC24V 0.4A。増設ユニットの `bus.load` は FX5-16EX/ES が 5V 0.1A・24V 0.085A、
  FX5-16EYR/ES・FX5-16EYT/ES が 5V 0.1A・24V 0.125A。
- **制限**:
  - FX5U の DC24V はサービス電源（24V / 0V 端子）と共用で、増設ユニットの消費分を引いた残りが外部に使える。
    現在の型では端子の `supply.limitCurrent`（0.4A）とバスの `supply['24V']`（0.4A）を別々に書くしかなく、両方の合計で 0.4A を超えることは検出できない。
  - FX5-16EX/ES の 24V 消費（85mA）は入力回路の電流で、入力に外部の DC24V を使う場合は CPU の 24V を消費しない。配線によらず常に計上している（安全側）。
  - 電源内蔵の増設ユニット（FX5-32ER など）・増設電源ユニット・バス変換ユニット（FX5-CNV-BUS）は未作成。

## 40 ピンコネクタ（A6CON）と MIL 規格

- iQ-R / Q / L の 32 点ユニットの「40 ピンコネクタ」は富士通 FCN-360 系互換のコネクタで、相手側は A6CON1（はんだ付け）・A6CON2（圧着）・
  A6CON3（圧接、1.27mm ピッチフラットケーブル）・A6CON4。MIL 規格（ボックスヘッダ、XG4M などのソケット）とは嵌合しない
  （Q シリーズの I/O 取付説明書にも「40 ピンコネクタは D-sub ではない」旨の注記がある）。
  市販の中継端子台は FCN40P−MIL40P 変換ケーブル（例: ミスミ PTHAS-F40-M40「PLC 側 FCN40 芯メス / 端子台側 MIL40 芯メス」）で MIL 端子台につなぐ。
- そのため kind は `'MIL40'` にせず `'FCN40'` とし、変換ケーブルがあることを `mates: ['MIL40']` で表した。
  これで CN1 を MIL 40 極の変換端子台（`generic.mil-terminal-block.40p` など）へケーブルでつなげ、同じ番号のピンどうしが導通する。
- コネクタは正面に差す A6CON なので `facing: 'front'`、`length: 108`（シェルの高さ約 54mm）、ケーブルは下（`side: 'bottom'`）へ出す。
- ピン番号: 三菱は A01〜A20 / B01〜B20（正面から見て左列 B、右列 A、上端が 20）。
  FCN 圧接コネクタ（FCN-367J040-AU/F）と MIL 圧接ソケット（XG4M-4030-T）をフラットケーブルで結ぶ一般的な変換ケーブルでは
  A_k ↔ MIL(42−2k)、B_k ↔ MIL(41−2k)（B20 = 1、A20 = 2、…、B01 = 39、A01 = 40）となる（ミスミ 機器対応ハーネス カタログの結線図）。
  ピンID はこの番号にそろえ（`CN1#n`）、三菱のピン番号と信号名を label に残した（例: `CN1#1` = `X00 (B20)`）。
  物理位置も MIL の千鳥番号（▲側の端が 1・2、片方の列が奇数・もう片方が偶数）と一致するので、`mates` によるケーブル接続で
  同じ番号どうしの導通のまま MIL 変換端子台に展開できる（例: RX41C4 の X00 = B20 = `CN1#1` → 変換端子台の 1 番）。

## 端子配列・仕様値（出典）

### iQ-R 電源ユニット（R61P / R62P / R64P）

- 外形 W54.6 × H106 × D110mm。端子（上から）: ERR・ERR（ERR 接点）、FG、LG、N、L（INPUT）。R62P のみ +24V・24G（M3.5）。
- 入力 AC100〜240V（85〜264V）、最大入力皮相電力 R61P 130VA / R62P 120VA、突入電流 20A 8ms 以下。
- 出力 DC5V: R61P 6.5A、R62P 3.5A。R62P の DC24V 0.6A（過電流保護 0.66A 以上）。
- ERR 接点 DC24V 0.5A。システム正常時に ON（閉）、電源断・CPU 停止エラー（リセット含む）・ヒューズ断で OFF。
- FG・LG は個別に接地抵抗 100Ω 以下で接地。LG は AC 入力時に入力電圧の 1/2 の電位。
- 外観: 上部が黒（ロゴ・POWER LED・定格表示）、下部が赤い端子カバー。
- 出典: MELSEC iQ-R Module Configuration Manual SH(NA)-081262（3.1 Power Supply Module、4.2 Performance Specifications、Appendix 9）
  - http://www.atronika.com/Mitsubishi/PLC/MITSUBISHI_manual_plc_iq-r_config.pdf （第三者サイトに掲載された写し）
  - 製品写真: https://www.mitsubishielectric.co.jp/fa/products/cnt/plcr/pmerit/sysconfig/base.html

- R64P: 入力 AC100〜240V、最大入力皮相電力 160VA、出力 DC5V 9A（過電流保護 10.0A 以上）。三菱電機 製品ページ・iQ-R セレクションガイド（2019 年 4 月版）による。
  - https://emea.mitsubishielectric.com/fa/products/cnt/plc/plcr/power_supply/power-supply/r64p.html

### iQ-R 主ベースユニット（R35B / R38B / R312B）・ブランクカバー（RG60）

- 入出力スロット 5 / 8 / 12、外形 W245 / 328 / 439 × H101 × D32.5mm。内部消費電流 DC5V 0.58A / 0.71A / 0.88A。
  幅の差から入出力スロットのピッチは約 27.7mm（ユニット幅 27.8mm と同じとして描いた）。電源スロット + CPU スロット + 入出力スロットの幅を引いた
  左右の余白（取付穴・増設コネクタ）は合計約 23mm。
- 出典:
  - 基本システム構成（幅・スロット数）: https://www.mitsubishielectric.co.jp/fa/products/cnt/plcr/pmerit/sysconfig/base.html
  - 高さ・奥行・R35B / R38B の消費電流: ミスミ 商品ページ https://jp.misumi-ec.com/vona2/detail/222005982437/
  - R312B の消費電流: iQ-R セレクションガイド（2019 年 4 月版）の主ベースユニット表（R33B 0.46A / R35B 0.58A / R38B 0.71A / R312B 0.88A）
- 入出力番号の割付け（入出力スロット 0 から X0/Y0、ユニットの点数ずつ。空きスロットは初期設定で 16 点）は
  MELSEC iQ-R CPU ユニット ユーザーズマニュアル（応用編）の「入出力番号の割付け」による（Q シリーズと同じ規則）。
- RG60 はブランクカバーユニット（空きスロット用）。外形は I/O ユニットと同じ W27.8 × H106mm として描いた。

### iQ-R CPU ユニット（R04CPU 他）

- 外形 W27.8 × H106 × D110mm。LED: READY / ERROR / PROGRAM RUN / USER / BATTERY / CARD READY / CARD ACCESS / FUNCTION。
  USB（miniB）、Ethernet（SPEED・SD/RD LED、CC-Link IE フィールドネットワーク Basic 対応）。
- プログラム容量 R04CPU 40K / R08CPU 80K / R16CPU 160K / R32CPU 320K / R120CPU 1200K ステップ。内部消費電流 DC5V 0.67A。
- 出典: MELSEC iQ-R CPU Module User's Manual (Startup) SH-081263ENG
  - https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh081263eng/sh081263engac.pdf （1.1 Part Names、Performance Specifications、Appendix 1）
  - 製品写真: https://www.mitsubishielectric.co.jp/fa/products/cnt/plcr/pmerit/cpu/cpu.html

### iQ-R I/O ユニット

出典: MELSEC iQ-R I/O Module User's Manual SH-081247ENG
https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh081247eng/sh081247engk.pdf
（3.1 Performance Specifications の各ユニット、6.2 Wiring、Appendix 2 互換性、Appendix 3 External Dimensions）。
製品写真: https://www.mitsubishielectric.co.jp/fa/products/cnt/plcr/pmerit/io/index.html

- 共通: 外形 W27.8 × H106 × D110mm（18 点端子台付きは奥行 131mm）。18 点ネジ端子台は M3、端子台取付ネジ M3.5。40 ピンコネクタ固定ネジ M2.6。
- 18 点端子台の端子番号: 正面から見て右列（上に半ピッチずれる）が奇数、左列が偶数（「Terminal connection」図）。
- RX40C7: DC24V（20.4〜28.8V）7.0mA、ON 15V/4mA 以上、OFF 8V/2mA 以下、16 点 1 コモン（TB17）、プラス/マイナスコモン共用。
  端子 1〜16 = X00〜X0F、17 = COM、18 = 空き。内部消費電流 DC5V 120mA。
- RY10R2: DC24V 2A / AC240V 2A（抵抗負荷）/点、8A/コモン、最小 DC5V 1mA、16 点 1 コモン（TB17）。端子 1〜16 = Y00〜Y0F、17 = COM、18 = 空き。DC5V 450mA。
- RY40NT5P: DC12/24V（10.2〜28.8V）0.5A/点・5A/コモン、シンク。端子 1〜16 = Y00〜Y0F、17 = +V（12/24VDC）、18 = COM。外部供給電源 4mA TYP.。DC5V 140mA。
- RX41C4: DC24V 4.0mA、ON 19V/3mA 以上、OFF 6V/1.0mA 以下、32 点 1 コモン。B20〜B05 = X00〜X0F、A20〜A05 = X10〜X1F、B01・B02 = COM、
  A01〜A04・B03・B04 = 空き。DC5V 150mA。
- RY41NT2P: DC12/24V 0.2A/点・2A/コモン、シンク。B20〜B05 = Y00〜Y0F、A20〜A05 = Y10〜Y1F、B01・B02 = 12/24VDC、A01・A02 = COM、
  A03・A04・B03・B04 = 空き。外部供給電源 16mA TYP.。DC5V 180mA。
- 40 ピンコネクタの適合コネクタ: A6CON1 / A6CON2 / A6CON3（1.27mm ピッチフラットケーブル）/ A6CON4。

### FCN40 ↔ MIL40 の対応

- ミスミ ケーブル対応機種一覧（PLC 側 FCN40 芯、RX41C4・RY41NT2P 等が対象。PTHAS-F40-M40: FCN40 芯メス ↔ MIL40 芯メス）
  https://jp.misumi-ec.com/pdf/vona/el/MSM1/cable_Model_list_mitsubishiQ.pdf
- ミスミ 機器対応ハーネス カタログ（FCN-367J040-AU-F ↔ XG4M-4030-T の結線図: A1→40, A2→38, …, A20→2, B1→39, …, B20→1）
  https://jp.misumi-ec.com/pdf/el/1034_1498_1499.pdf
- 東洋技研 KB40Y（FCN360 40 ピン ↔ MIL20 ピン×2 の中継分岐ケーブル。RY41NT2P 等が適合機種）
  https://www.togi.co.jp/file/download/?type=series&path=%2Ffiles%2Fseries%2F4%2Ftogi_269_KB40Y.pdf
- MELSEC System Q Installation Manual for Digital Input and Output Modules（40 ピンコネクタは D-sub ではない旨、A6CON2/3/4）
  https://baoanjsc.com.vn/TaiLieu/Digital-input-modules-MITSUBISHI-MELSEC-Q-series-MANUAL-6449.pdf （第三者サイトに掲載された写し）

### iQ-F FX5U-32MR/ES・FX5U-32MT/ES

出典: MELSEC iQ-F FX5S/FX5UJ/FX5U/FX5UC User's Manual (Hardware) SH-082452ENG
https://dl.mitsubishielectric.com/dl/fa/document/manual/plcf/sh082452eng/sh082452engq.pdf
（3.1 Part Names、5 CPU Module Performance Specifications、5.9 Terminal Layout、5.10 External Dimensions）。
製品写真: https://www.mitsubishielectric.co.jp/fa/products/cnt/plcf/pmerit/cpu/index.html

- 外形 W150 × H90 × D83mm（取付穴ピッチ 123mm）、質量約 0.7kg、外装色 マンセル 0.6B7.6/0.2。
- 電源 AC100〜240V（−15%/+10%）50/60Hz、消費電力 30W、突入電流 25A 5ms 以下/AC100V・50A/AC200V、電源ヒューズ 250V 3.15A。
- DC24V サービス電源: 400mA（CPU の入力回路に使う場合。外部電源で入力回路を賄う場合 480mA）。DC5V 内部電源 900mA。
- 入力 X0〜X17: DC24V +20%/−15%、5.3mA、シンク/ソース（S/S の接続先で切替）。
- 出力: リレー 2A/点、4 点 1 コモン 8A 以下、AC240V/DC30V 以下、最小負荷 DC5V 2mA。トランジスタ（シンク）DC5〜30V 0.5A/点、4 点 1 コモン 0.8A 以下。
- 端子配列（AC 電源、32M）:
  - 上側端子台: `⏚ S/S 0V X0 2 4 6 X10 12 14 16 •` / `L N • 24V 1 3 5 7 11 13 15 17`
  - 下側端子台: `Y0 2 • Y4 6 • Y10 12 • Y14 16 •` / `COM0 1 3 COM1 5 7 COM2 11 13 COM3 15 17`
  - COM0 = Y0〜Y3、COM1 = Y4〜Y7、COM2 = Y10〜Y13、COM3 = Y14〜Y17。ソースタイプ（/ESS）は COM が +V0〜+V3。

### iQ-F 増設 I/O（FX5-16EX/ES・FX5-16EYR/ES・FX5-16EYT/ES）

出典: 同上 SH-082452ENG（3.2 Part Names、6.1 Input Module、6.2 Output Module、6.6 External Dimensions）。

- 外形 W40 × H90 × D83mm、増設ケーブルタイプ、端子台 M3、外装色 マンセル 0.6B7.6/0.2。
- FX5-16EX/ES: DC24V +20%/−15%、4.0mA、シンク/ソース共用。消費電流 DC5V 100mA・DC24V 85mA。
  端子（上から）左列 `S/S 1 3 5 6 7 X0 1 3 5 7`、右列 `X0 2 4 （空白 4 段）2 4 6 •`。
- FX5-16EYR/ES: リレー AC240V/DC30V 以下 2A/点、8 点 1 コモン 8A 以下。DC5V 100mA・DC24V 125mA。
  左列 `COM0 1 3 5 6 7 Y0 1 3 5 7`、右列 `Y0 2 4 （空白 4 段）2 4 6 COM1`。
- FX5-16EYT/ES: トランジスタ（シンク）DC5〜30V 0.5A/点、8 点 1 コモン 1.6A 以下。端子配列は EYR と同じ。

## 不確かな点

- 端子・LED の細部の位置は外形図と製品写真から目測（1mm ≒ 2px）。端子ピッチ・行位置は ±1〜2mm 程度の誤差がありうる。
- ベースユニットの外観（スロット表示・ベースコネクタ・フック穴・増設コネクタの位置）は製品写真からの概略。R312B の消費電流 0.88A は
  セレクションガイドの表からの読み取りで、マニュアル本文では確認できていない。
- 空きスロットの初期点数（16 点）はマニュアルの記述の記憶による（Q シリーズと同じ）。GX Works3 のバージョン・設定で変わりうる。
- iQ-R I/O 上部右端の識別表示、RUN 表示の点灯色などは省略・簡略化している。
- iQ-R 18 点端子台は実機では 1 列に見える 2 段（奥・手前）の千鳥配置で、図では左右 2 列にずらして描いている。
- FX5U の入力電流（loadCurrent 0.5A）は消費電力 30W と力率からの概算。iQ-R 電源ユニットは最大入力皮相電力 ÷ 電圧の目安（パラメータで 100V/200V を選択）。
- iQ-R 電源ユニットの規格値は第三者サイトに掲載された Module Configuration Manual の写しによる（三菱の公式ダウンロード URL を特定できなかった）。
- FCN40↔MIL40 のピン対応はミスミの圧接フラットケーブル品の結線図による。メーカー・製品によっては異なる結線のケーブルもある。

## 追加: インテリジェント機能ユニット・ネットワークユニット・コネクタ式 CPU・GOT（issue #75）

生産技術の図面でよく使う iQ-R のユニット（Ethernet・CC-Link IE フィールド・アナログ入出力・高速カウンタ・位置決め）、
iQ-F のアナログ入力ユニットとコネクタ式の CPU、タッチパネル GOT2000 を追加した。調査は 2026-11 時点。
メーカーのサイト・PDF は直接取得できなかったため、検索で確かめられた製品ページ・マニュアルの記載と、Q シリーズとの互換の並びによる。
確かめられなかった値は機器定義の `estimated` に書き、下の表の「推定」の列に書いた。

| type | 型式 | 種類 | 主な仕様 | 推定 |
|---|---|---|---|---|
| `mitsubishi.rj71en71` | RJ71EN71 | iQ-R Ethernet インタフェースユニット | RJ-45 × 2（P1・P2、1000BASE-T）、32 点占有、DC5V 0.82A | なし |
| `mitsubishi.rj71gf11-t2` | RJ71GF11-T2 | iQ-R CC-Link IE フィールド マスタ・ローカルユニット | RJ-45 × 2（P1・P2）、32 点占有、DC5V 0.82A | なし |
| `mitsubishi.r60ad4` | R60AD4 | iQ-R アナログ入力 4ch | DC−10〜10V / 0〜20mA、18 点ネジ端子台（V+・V−・I+・SLD × 4、A.G.、FG）、16 点占有 | 推定: DC5V 0.23A |
| `mitsubishi.r60da4` | R60DA4 | iQ-R アナログ出力 4ch | DC−10〜10V / 0〜20mA、外部供給 DC24V 0.14A、DC5V 0.16A、16 点占有 | 推定: 端子台の並び |
| `mitsubishi.rd62p2` | RD62P2 | iQ-R 高速カウンタ 2ch（DC 入力・シンク出力） | 200kpps、40 ピンコネクタ、DC5V 0.11A、16 点占有 | 推定: ピン配置（QD62 互換の並び）、一致出力 0.5A/点 |
| `mitsubishi.rd75p4` | RD75P4 | iQ-R 位置決め 4 軸（オープンコレクタ） | 40 ピンコネクタ × 2（軸 1・2 / 軸 3・4）、32 点占有 | 推定: ピンの 01〜11 番の並び、DC5V 0.6A |
| `mitsubishi.fx5-4ad` | FX5-4AD | iQ-F アナログ入力 4ch（増設ケーブルタイプ） | DC−10〜10V / −20〜20mA、80µs/ch、DC5V 100mA・DC24V 40mA、X/Y は割り付けない | 推定: 端子台の上での並び |
| `mitsubishi.fx5uc-32mt-d` | FX5UC-32MT/D | iQ-F コネクタ式 CPU（DC 電源、入力 16・シンク出力 16） | MIL 20 極 × 2、Y0〜Y3 0.3A・Y4〜 0.1A、Ethernet | 推定: コネクタのピン配置、8 点ごとの合計 0.8A、内部電源の容量、消費電流 |
| `mitsubishi.gt2510-vtbd` | GT2510-VTBD | GOT2000 GT25 10.4 型タッチパネル | DC24V（+25%/−20%）約 12W、Ethernet・RS-232・RS-422/485・USB | なし（背面のインタフェースの並びは概念図） |

### 共通部品

- `src/devices/mitsubishi/iqr-parts.ts`: iQ-R のユニットの描画部品（本体と LED 表示部 `iqrBody`、18 点ネジ端子台 `tb18` / `tb18Svg`、
  40 ピンコネクタ `fcn40Svg`、RJ-45 `rj45Svg`、三菱のピン番号からピンID `fcnPin`）。18 点ネジ端子台・40 ピンコネクタの寸法と番号は
  既存の入出力ユニット（RX40C7・RX41C4）にそろえた（40 ピンのピンID は FCN40↔MIL40 変換ケーブルの千鳥番号、上の「FCN40 ↔ MIL40 の対応」）。
- `buildIqrNetworkUnit`（`mitsubishi-rj71en71.ts`）: RJ-45 を 2 個持つ iQ-R のネットワークユニット。

### 入出力番号の占有（インテリジェント機能ユニット・ネットワークユニット）

- iQ-R のインテリジェント機能ユニット・ネットワークユニットは、外部端子が X/Y ではないが入出力番号を占有する（ユニットの X/Y はユニットレディなどの内部の信号）。
  そこで `bus.io` を `{ reserve: 点数, format: 'hex' }` にした（R60AD4・R60DA4・RD62P2 は 16 点、RJ71EN71・RJ71GF11-T2・RD75P4 は 32 点）。
  後ろのユニットの先頭番号は、この点数のぶんずれる（テストで確認: RX40C7・R60AD4・RJ71EN71・RD75P4・RX40C7 の順なら最後の RX40C7 は X60）。
- iQ-F（FX5）のインテリジェント機能ユニットは X/Y の番号を割り付けない（占有点数 8 点は入出力点数の上限の計算にだけ数える）ので、FX5-4AD は `bus.io` を持たない。
  増設ケーブルでつなぐユニットとして DC5V・DC24V の内部電源の消費（`bus.load`）だけを書いた。
- FX5UC-32MT/D は FX5U と同じく増設ユニットの親（`numbering: { mode: 'separate', unit: 8 }`）。実機では FX5-C 形の増設ユニットを直接、
  増設ケーブルタイプ（FX5-16EX/ES など）はコネクタ変換ユニット FX5-CNV-IFC を介してつなぐが、変換ユニットは描かない（説明に書いた）。

### 電気的な表現

- **アナログ入力**（R60AD4・FX5-4AD）: 電圧の + 端子（V+）に `signal: { dir: 'in', kind: 'analog-v', ref: 'CHnV-' }`、電流の + 端子（I+）に
  `analog-i`。`ref` は信号の基準（R60AD4 は V−、FX5-4AD は COM）。基準が未配線・出力の基準とつながっていなければ `analog-return`、
  電圧と電流の取り違えは `signal-kind` で指摘する（テストで確認）。電流入力のときに V+ と I+ を短絡する配線は、利用者が電線で描く。
- **アナログ出力**（R60DA4）: V+ に `{ dir: 'out', kind: 'analog-v', ref: 'CHnCOM' }`、I+ に `analog-i`。外部供給電源 +24V・24G は `input`。
- I/O 表（`src/model/io.ts`）は、これまで「開閉する出力（`switch: 'output'`）」だけを出力点にしていたが、アナログ出力（`signal.dir: 'out'` で `analog-v` / `analog-i`）も
  出力点として出すようにした（KEYENCE の KV-SDA04・KV-AM40V の出力も出るようになる）。
- **高速カウンタ**（RD62P2）: パルス入力・プリセット・ファンクションスタートは 24V・12V・5V の 3 ピンから入力電圧に合うものを使う。
  I/O 表・展開図の入力点（`signal`）は 24V のピンだけに付け、12V・5V のピンは信号の種類なしの `signal` 端子にした。コモン ABCOM・CTRLCOM は +/− 共用の `input`。
  一致出力 EQU1・EQU2 はシンクのトランジスタ出力（`switch: 'output'`、0V へ）、外部供給電源 12/24V・0V は `input`。ラベルは `CH1-ΦA 24V (B20)` のように
  チャネル・信号・三菱のピン番号（I/O 表の番号の欄は `CH1-ΦA`）。
- **位置決め**（RD75P4）: PULSE F・PULSE R（オープンコレクタ、50mA）と CLEAR（100mA）は PULSE COM・CLEAR COM（0V）への `switch: 'output'`（`npn`）。
  FLS・RLS・DOG・STOP・CHG・PG0（24V）・READY は DC 入力（コモンは COM・PG0 COM・RDY COM、+/− 共用）。ラベルは `AX1-PULSE F (1A15)`。
- **ネットワーク**: RJ71EN71 のポートは `['ethernet', 'slmp', 'cc-link-ie-control', 'cc-link-ie-field']`（ネットワークの種類をパラメータで切り換えるため）、
  RJ71GF11-T2 は `['cc-link-ie-field']`、GOT の Ethernet は `['ethernet', 'slmp', 'ethernet-ip', 'modbus-tcp']`、RS-232 は `rs-232c`、RS-422/485 は `rs-422`・`rs-485`
  （D-sub 9 ピン、`kind: 'DSUB9'`）。チェック結果の表示名に CC-Link IE Control・RS-422・IO-Link を足した（`src/check/model.ts`）。
- **FX5UC-32MT/D**: 入力はシンク入力（/D 形）なので、入力コネクタの COM は DC24V の + だけを受ける（`conductors: ['+']`、NPN センサー用）。
  出力はシンクのトランジスタで COM0（0V）へ。8 点ごとの合計電流は `commonLimits` の `outputs` で書いた（推定）。
- **GOT2000**: VT5 と同じく正面図と背面のインタフェースの概念図。電源端子 +24V・0V・FG。分類は `control`、一般名称を「タッチパネルディスプレイ」にして既存のファミリー（`hmi`）に入れた。

### 出典（検索で確かめた範囲）

- RJ71EN71・RJ71GF11-T2: 三菱電機 FA 製品の仕様検索（占有入出力点数 32 点、内部消費電流 DC5V 0.82A）
  - https://www.mitsubishielectric.com/fa/products/faspec/detail.page?kisyu=%2Fplcr&formNm=RJ71EN71_RJ71EN71_3359&lang=2&category=ex&id=spec
  - https://www.mitsubishielectric.com/fa/products/faspec/detail.page?kisyu=%2Fplcr&formNm=RJ71GF11-T2_RJ71GF11-T2_3360&lang=2&category=ex&id=spec
- R60AD4: MELSEC iQ-R Analog-Digital Converter Module User's Manual (Startup) SH-081232ENG（18 点端子台、SLD は 4・8・12・16 番、電流入力は V+ と I+ を短絡、A.G.・FG）
  - https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh081232eng/sh081232enge.pdf
- R60DA4: MELSEC iQ-R Digital-Analog Converter Module User's Manual (Startup) SH-081235ENG（外部供給電源 DC24V +20%/−15% 0.14A、内部消費電流 DC5V 0.16A、+24V・24G・COM）
  - https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh081235eng/sh081235engd.pdf
- RD62P2: MELSEC iQ-R High-Speed Counter Module User's Manual (Startup) SH-081239ENG（200kpps、DC5V 0.11A）
- RD75P4・QD75P: MELSEC iQ-R Positioning Module User's Manual (Startup) SH-081243ENG、Type QD75P/QD75D Positioning Module User's Manual (Hardware)
  （40 ピンコネクタ 2 個、A6CON1・2・4、1A12 RDY COM・1A13 CLEAR・1A14 CLEAR COM・1A15 PULSE F・1A16 PULSE COM・1A17 PULSE R・1A18 PULSE COM）
- FX5-4AD: FX5-4AD Hardware Manual IB(NA)-0800574（4ch、80µs/ch、DC5V 100mA・DC24V 40mA、占有 8 点）、設置マニュアル（1 チャネル V+・I+・COM・空き）
- FX5UC-32MT/D: MELSEC iQ-F FX5UC User's Manual (Hardware)（入力 DC24V 5.3mA、シンク、16 点 1 コモンの出力）
- GT2510-VTBD: 三菱電機 GOT2000 製品ページ・セレクションガイド（DC24V +25%/−20%、Ethernet・RS-232（D-sub 9 ピン オス）・RS-422/485（D-sub 9 ピン メス）・USB、外形 W303 × H218 × D52mm）

### 確かめられなかったこと・簡略化

- R60DA4 の端子台の並び（1 チャネル V+・COM・I+・空き、17・18 が外部供給電源）、R60AD4 の DC5V 消費電流 0.23A は推定。
- RD62P2 のピン配置は QD62（Q シリーズの高速カウンタ）の並びを当てはめた推定。一致出力の定格 0.5A/点も推定。
- RD75P4 のピン 01〜11 番（外部入力・零点信号・READY）の並び、手動パルサ入力（19・20 番）は推定・省略。DC5V 0.6A も推定。
- FX5-4AD の端子台の上での並び、FX5UC-32MT/D のコネクタのピン配置・内部電源・消費電流は推定。
- CC-Link IE フィールドのリモート I/O（NZ2GF 形）は、端子台の配列を確かめられなかったため見送った（RJ71GF11-T2 の相手として次の候補）。
- アナログ入出力のレンジ（4〜20mA・1〜5V など）はパラメータにせず、説明に書いた（チェックは電圧/電流の区別まで）。
- RJ71EN71 のネットワークの種類の切り換えは、ポートの `protocols` に全部を並べて表した（設定による違いは区別しない）。
