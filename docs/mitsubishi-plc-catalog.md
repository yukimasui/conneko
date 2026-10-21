# 三菱電機 MELSEC 機器定義の調査メモ

`src/devices/catalog/mitsubishi-*.ts` に追加した MELSEC（iQ-R / iQ-F）の機器定義について、
選んだ型式とその理由、端子配列・仕様値の出典をまとめる。網羅ではなく、よく使われる代表機種に絞っている。

## 実装した機器

| type | 型式 | 種類 | 外部接続 |
|---|---|---|---|
| `mitsubishi.r61p` | R61P | iQ-R 電源ユニット（AC 入力、DC5V 6.5A） | M4 ネジ端子 6 点 |
| `mitsubishi.r62p` | R62P | iQ-R 電源ユニット（AC 入力、DC5V 3.5A + DC24V 0.6A） | M4 ネジ端子 6 点 + M3.5 2 点 |
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
- `buildFx5u32m`（`mitsubishi-fx5u-32mr-es.ts`）: FX5U-32M
- `buildFx5Ext16`（`mitsubishi-fx5-16ex-es.ts`）: FX5 の 16 点増設ユニット

## 選定理由

- **iQ-R**: 現行の主力モジュール型。電源 → CPU → I/O の基本構成が組めるよう、AC 電源 2 種（DC24V 出力の有無）、
  標準 CPU、I/O は「16 点ネジ端子台」と「32 点 40 ピンコネクタ」の入力・出力を選んだ。
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
- 入力ユニットのコモン（COM / S/S）は DC24V の + でも − でも受けるので `input` + `accepts`（conductors: ['+', '-']）。
- トランジスタ出力（シンク）の外部電源端子は +V（`+`）/ COM（`-`）を `input` + `accepts`。
- リレー出力のコモンは AC/DC どちらも入るため `signal`（AcceptSpec で AC/DC 両方を表せないため。提案参照）。
- **出力は ON とみなす**: 既存の「接点は閉とみなす」の考え方に合わせ、出力端子とそのコモンを `links` でつないだ。
  これにより、コモンに入れた電源がチェック上は出力端子の先の負荷まで届き、負荷の電圧・極性（例: 表示灯の X2 が 0V 側か）が検査される。
- 同じ COM が複数ピンある場合（B01/B02 など）は `links` で導通。
- 端子ID は信号名（X00、Y0F、COM、+V など）。iQ-R・FX5 増設ユニットはユニット内の相対番号で、
  実際のデバイス番号は先頭入出力番号を加えたもの（説明文に明記）。ネジ端子の label には端子番号（TB1 など）を残した。
- ネジ端子台の電線の出る向き: iQ-R の 2 列千鳥端子台は右列 = `right`、左列 = `left`。
  電源ユニットの主端子は `right`（左側に表示・DC24V 端子があるため）、R62P の +24V/24G は `left`。FX5U は上側端子台 = `top`、下側 = `bottom`。

## 40 ピンコネクタ（A6CON）と MIL 規格

- iQ-R / Q / L の 32 点ユニットの「40 ピンコネクタ」は富士通 FCN-360 系互換のコネクタで、相手側は A6CON1（はんだ付け）・A6CON2（圧着）・
  A6CON3（圧接、1.27mm ピッチフラットケーブル）・A6CON4。MIL 規格（ボックスヘッダ、XG4M などのソケット）とは嵌合しない
  （Q シリーズの I/O 取付説明書にも「40 ピンコネクタは D-sub ではない」旨の注記がある）。
  市販の中継端子台は FCN40P−MIL40P 変換ケーブル（例: ミスミ PTHAS-F40-M40「PLC 側 FCN40 芯メス / 端子台側 MIL40 芯メス」）で MIL 端子台につなぐ。
- そのため kind は `'MIL40'` にせず `'FCN40'` とした（現状のアプリでは MIL 変換端子台と直接ケーブルでつなげない）。
- ピン番号: 三菱は A01〜A20 / B01〜B20（正面から見て左列 B、右列 A、上端が 20）。
  FCN 圧接コネクタ（FCN-367J040-AU/F）と MIL 圧接ソケット（XG4M-4030-T）をフラットケーブルで結ぶ一般的な変換ケーブルでは
  A_k ↔ MIL(42−2k)、B_k ↔ MIL(41−2k)（B20 = 1、A20 = 2、…、B01 = 39、A01 = 40）となる（ミスミ 機器対応ハーネス カタログの結線図）。
  ピンID はこの番号にそろえ（`CN1#n`）、三菱のピン番号と信号名を label に残した（例: `CN1#1` = `X00 (B20)`）。
  物理位置も MIL の千鳥番号（▲側の端が 1・2、片方の列が奇数・もう片方が偶数）と一致するので、将来 FCN40↔MIL40 の変換ケーブルを
  扱えるようになれば、同じ番号どうしの導通でそのまま MIL 変換端子台に展開できる（提案 `docs/proposals/mitsubishi-plc.md`）。

## 端子配列・仕様値（出典）

### iQ-R 電源ユニット（R61P / R62P）

- 外形 W54.6 × H106 × D110mm。端子（上から）: ERR・ERR（ERR 接点）、FG、LG、N、L（INPUT）。R62P のみ +24V・24G（M3.5）。
- 入力 AC100〜240V（85〜264V）、最大入力皮相電力 R61P 130VA / R62P 120VA、突入電流 20A 8ms 以下。
- 出力 DC5V: R61P 6.5A、R62P 3.5A。R62P の DC24V 0.6A（過電流保護 0.66A 以上）。
- ERR 接点 DC24V 0.5A。システム正常時に ON（閉）、電源断・CPU 停止エラー（リセット含む）・ヒューズ断で OFF。
- FG・LG は個別に接地抵抗 100Ω 以下で接地。LG は AC 入力時に入力電圧の 1/2 の電位。
- 外観: 上部が黒（ロゴ・POWER LED・定格表示）、下部が赤い端子カバー。
- 出典: MELSEC iQ-R Module Configuration Manual SH(NA)-081262（3.1 Power Supply Module、4.2 Performance Specifications、Appendix 9）
  - http://www.atronika.com/Mitsubishi/PLC/MITSUBISHI_manual_plc_iq-r_config.pdf （第三者サイトに掲載された写し）
  - 製品写真: https://www.mitsubishielectric.co.jp/fa/products/cnt/plcr/pmerit/sysconfig/base.html

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
- iQ-R I/O 上部右端の識別表示、RUN 表示の点灯色などは省略・簡略化している。
- iQ-R 18 点端子台は実機では 1 列に見える 2 段（奥・手前）の千鳥配置で、図では左右 2 列にずらして描いている。
- FX5U の入力電流（loadCurrent 0.5A）は消費電力 30W と力率からの概算。iQ-R 電源ユニットは最大入力皮相電力 ÷ 電圧の目安（パラメータで 100V/200V を選択）。
- iQ-R 電源ユニットの規格値は第三者サイトに掲載された Module Configuration Manual の写しによる（三菱の公式ダウンロード URL を特定できなかった）。
- FCN40↔MIL40 のピン対応はミスミの圧接フラットケーブル品の結線図による。メーカー・製品によっては異なる結線のケーブルもある。
