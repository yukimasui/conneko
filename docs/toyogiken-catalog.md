# 東洋技研（TOGI）端子台の調査と実装状況

東洋技研株式会社（TOYOGIKEN、ブランド TOGI）の端子台のうち、制御盤でよく使うコネクタ端子台（PLC の I/O 用）、
コモン端子台、レール用端子台を Conneko の機器として追加した。特に、増えているスプリングロック式（プッシュイン、フェルール対応）と
従来のネジ式の両方をそろえた。

調査は 2026-10 時点の東洋技研公式サイト（https://www.togi.co.jp/）のシリーズページと、そこからダウンロードできるカタログ PDF
（シリーズカタログ・機種ごとのカタログ・製品データシート）の寸法図・記名板・結線図による。

- 機器定義: `src/devices/catalog/toyogiken-*.ts`（1機器1ファイル。中身は下の共通部品を呼ぶだけ）
- 共通部品: `src/devices/toyogiken/`
  - `parts.ts`: 描画部品（ネジ、3.5mm / 5mm のスプリング端子、MIL / FCN コネクタ、記名板のマス、レール）
  - `connector-block.ts`: コネクタ端子台の組み立て（シリーズごとの寸法・色・結線方式）
  - `rows.ts`: 端子の並び（記名板の印字とコネクタのピンの対応。1:1、KEYENCE 対応、三菱電機対応）
  - `standard.ts` / `plc.ts` / `pcx-melsec.ts` / `vertical.ts`: 標準品（1:1）、PLC 対応品、PCX の三菱電機対応品、PCXV（縦型）
  - `com-block.ts`: コモン端子台、`rail.ts`: レール用端子台
- テスト: `src/devices/toyogiken.test.ts`

## 収録機種

### コネクタ端子台 標準品（1:1）— 22 機種

コネクタのピンと端子が 1 対 1 でつながる。端子 ID は記名板の印字（A・B 連番）。

| type | 型式 | シリーズ / 結線方式 | コネクタ | パラメータ | 外形（幅 × 奥行） |
|---|---|---|---|---|---|
| `toyogiken.pcn7-1h20` / `-1h34` / `-1h40` / `-1h50` | PCN7-1□20 / 34 / 40 / 50 | PCN7 ネジ式（M3、7mm 千鳥） | MIL 20 / 34 / 40 / 50 | `cnMaker`（H/T/J）、`crimp`（Y / R = PCN7R） | 80 / 128 / 149 / 184 × 40mm |
| `toyogiken.pcn7-4f40` | PCN7-4F40 | PCN7 ネジ式 | FCN 40 | `crimp` | 149 × 40mm |
| `toyogiken.pcx-1h20` / `-1h34` / `-1h40` / `-1h50` | PCX-1□20 / 34 / 40 / 50 | PCX スプリングロック（3.5mm、2 段がそろう） | MIL 20 / 34 / 40 / 50 | `cnMaker`（H/T/J）、`marker`（AB / M） | 49.5 / 67.5 / 75 / 92.5 × 43mm |
| `toyogiken.pcx-4f40` | PCX-4F40 | PCX スプリングロック | FCN 40 | — | 75 × 43mm |
| `toyogiken.pcxv-1h40` | PCXV-1□40 | PCXV スプリングロック（縦型） | MIL 40 | `cnMaker`（H/T）、`marker` | 43 × 75mm |
| `toyogiken.pcxv-4f40` | PCXV-4F40 | PCXV スプリングロック（縦型） | FCN 40 | — | 43 × 75mm |
| `toyogiken.pcv5-1h202` / `-1h342` / `-1h402` / `-1h502` | PCV5-1□202 / 342 / 402 / 502 | PCV5 スプリングロック（5mm、2.5mm 千鳥） | MIL 20 / 34 / 40 / 50 | `cnMaker`（H/T/J） | 57 / 92 / 107 / 132 × 43mm |
| `toyogiken.pcv5-4f402` | PCV5-4F402 | PCV5 スプリングロック | FCN 40 | — | 107 × 43mm |
| `toyogiken.pcw-1h20` / `-1h34` / `-1h40` / `-1h50` | PCW-1□20 / 34 / 40 / 50 | PCW スプリングロック（5mm、2.5㎟ 対応） | MIL 20 / 34 / 40 / 50 | `cnMaker`（H/T） | 57 / 92 / 107 / 132 × 43mm |
| `toyogiken.pcw-4f40` | PCW-4F40 | PCW スプリングロック | FCN 40 | — | 107 × 43mm |

- 搭載コネクタ `cnMaker`: H = ヒロセ電機 HIF3BA-□PA-2.54DSA、T = オムロン XG4A-□31、J = 日本航空電子工業 PS-□PE-D4T1-LP1（見た目は共通、型式だけ変わる）。
- 出典: PCN7 https://www.togi.co.jp/series/interface/204/ 、PCX / PCXV https://www.togi.co.jp/series/interface/210/ ・ /213/ 、
  PCV5 https://www.togi.co.jp/series/interface/208/ 、PCW https://www.togi.co.jp/series/interface/577/
- PCX-1□20 の幅（49.5mm）と PCW の幅（PCV5 と同じ）はカタログの寸法図・寸法表による。PCV5 / PCW の FCN 版の幅は寸法図の 107mm。

### PLC 対応コネクタ端子台 — 12 機種

記名板と回路が PLC 各社のピン配置に合わせてあり、空きピンは端子台から省かれている。端子 ID は記名板の印字
（同じ印字の分岐端子は `-1`〜`-4` を付ける）。

| type | 型式 | 対応 PLC | 結線方式 / コネクタ | 端子 | パラメータ |
|---|---|---|---|---|---|
| `toyogiken.pcn7-1h34-tb34-k1` | PCN7-1H34-TB34-K1 | KEYENCE（KV-C32XC など MIL 34 極） | ネジ式 / MIL 34 | 000〜015・COM0、100〜115・COM1 | `crimp` |
| `toyogiken.pcx-1h34-tb34-k1` | PCX-1H34-TB34-K1 | KEYENCE | スプリングロック / MIL 34 | 同上 | — |
| `toyogiken.pcx-1h34-tb40-k1` | PCX-1H34-TB40-K1 | KEYENCE | スプリングロック / MIL 34 | 上記 + COM0-1〜4、COM1-1〜4（分岐） | — |
| `toyogiken.pcx-1h34-tb40-k2` | PCX-1H34-TB40-K2 | KEYENCE | スプリングロック / MIL 34 | 上記 + COM-1〜4（COM0・COM1 共通）、SV-1〜4（Service COM） | — |
| `toyogiken.pcw-1h34-d` | PCW-1H34-D | KEYENCE | スプリングロック 2.5㎟ / MIL 34 | 000〜015・C1-1〜4、100〜115・C2-1〜4 | — |
| `toyogiken.pcn7-4f40-tb34-m1` | PCN7-4F40-TB34-M1 / M2 | 三菱電機（RX41C4、RY41NT2P など） | ネジ式 / FCN 40 | 00〜0F、10〜1F、+V、0V | `wiring`（M1 / M2）、`marker`（出力用 / 入力用）、`crimp` |
| `toyogiken.pcn7-1h40-tb34-m1` | PCN7-1H40-TB34-M1 / M2 | 三菱電機 | ネジ式 / MIL 40 | 同上 | 同上 |
| `toyogiken.pcx-4f40-tb34-m2-x` | PCX-4F40-TB34-M2-X | 三菱電機 入力 | スプリングロック / FCN 40 | 00〜1F、COM、NC | — |
| `toyogiken.pcx-4f40-tb34-m2-y` | PCX-4F40-TB34-M2-Y | 三菱電機 出力 | スプリングロック / FCN 40 | 00〜1F、+V、0V | — |
| `toyogiken.pcx-4f40-tb40-m2-x` | PCX-4F40-TB40-M2-X | 三菱電機 入力 | スプリングロック / FCN 40 | 00〜1F、COM-1〜4、SV-1〜4 | — |
| `toyogiken.pcx-4f40-tb40-m2-y` | PCX-4F40-TB40-M2-Y | 三菱電機 出力 | スプリングロック / FCN 40 | 00〜1F、+V-1〜4、0V-1〜4 | — |
| `toyogiken.pcw-1h40-c` | PCW-1H40-C | 三菱電機（入力 / 出力） | スプリングロック 2.5㎟ / MIL 40 | 00〜1F、C1-1〜4（B01・B02）、C2-1〜4（A01・A02） | — |

- 出典: PCN7 https://www.togi.co.jp/series/interface/205/ （機種別カタログ PCN7-1H34-TB34-K1、PCN7-□40-TB34-□）、
  PCX https://www.togi.co.jp/series/interface/211/ ・ /212/ 、PCW https://www.togi.co.jp/series/interface/579/
- 000・100、00・10 などの印字はユニット内の番号。実際の番号はつないだユニットの先頭番号から数える（I/O 割付はユニットのピン側で決まり、
  端子台はそれを電線をつなぐ端子として中継する）。

### コモン端子台・レール用端子台 — 5 機種

| type | 型式 | 内容 | パラメータ |
|---|---|---|---|
| `toyogiken.pcx-com22` / `pcx-com36` | PCX-COM22 / COM36 | スプリングロック式コモン端子台（3.5mm、2 段）。標準は奥段 TB2 が +COM、手前段 TB1 が −COM。10A | `polarity`（PN / P = 全極 +COM / N = 全極 −COM） |
| `toyogiken.pcxv-com16` | PCXV-COM16□ | 縦型カラーコモン端子台。入力 IN1・IN2（5mm、2.5㎟、渡り用）+ 分岐 1〜16（3.5mm）。10A | `color`（R / B / BR / BL = 1 系統、RB / BRBL = 8 点ずつ 2 系統） |
| `toyogiken.vtx-2.5-2.10p` | VTX-2.5/2 ×10 | ボタン付きプッシュイン中継端子台（5.2mm 幅、24A）を 10 極並べたもの。端子 `na`・`nb` | `color`（灰 / 青 / 赤 / 橙 / 黒） |
| `toyogiken.ptul2-10-10p` | PTUL2-10-10P | ネジアップ式（M3）の組端子台 10 極（PTU-10、1.25㎟ 15A）。端子 `na`・`nb` | — |

- 出典: PCX-COM https://www.togi.co.jp/series/interface/222/ 、PCXV-COM16 https://www.togi.co.jp/series/interface/605/ （製品データシート）、
  VTX https://www.togi.co.jp/series/terminalblock/511/ 、PTU https://www.togi.co.jp/series/terminalblock/101/

合計 39 機種（1:1 が 22、PLC 対応が 12、コモン・レール用が 5）。

## ピン番号と端子の対応

### MIL コネクタ（1:1）

東洋技研の記名板は A・B 連番で、A 列が▲（ピン 1）側。MIL 規格の千鳥番号との対応は

- `A_k` ↔ MIL ピン `2k−1`（手前段）、`B_k` ↔ MIL ピン `2k`（奥段）
- 記名板「-M」（PCX・PCXV）は 1〜数字連番で、印字が MIL ピン番号そのもの（`A3` の印字は `5`）。端子 ID は A・B のまま変えない

カタログの結線図（コネクタの▲が A1、端子台 TB1 = A 列、TB2 = B 列）による。カタログの既存の MIL 変換端子台（`generic.mil-terminal-block.*`）と同じく、
コネクタのピン ID は `CN#<MIL ピン番号>`。

### FCN 40 ピン（1:1・三菱電機対応）

FCN 40 ピンのピン ID は、三菱電機の I/O ユニット（`mitsubishi.rx41c4` など）と同じ規則（`fcnPinNo`。三菱の B_k → `CN#(41−2k)`、A_k → `CN#(42−2k)`）にした。
FCN⇔FCN のストレートケーブルでは同じ番号のピンどうしがつながるため、`FCN40` どうしをケーブルでつなぐと三菱のピン番号どおりに導通する。
東洋技研の FCN 端子台の印字 A1〜A20 / B1〜B20 は三菱のピン番号 A01〜A20 / B01〜B20 と同じ（PCX-4F40-TB34-M2 の結線図で 00 = B20 を確認）。

### KEYENCE 対応品

KEYENCE の I/O ユニットのピン No.k（1〜34、正面左列が 1〜17）は MIL ピン `keyenceToStd(k)`（k ≤ 17 → 2k−1、k ≥ 18 → 2(k−17)）。
記名板は 000〜015 = No.1〜16、COM0 = No.17、100〜115 = No.18〜33、COM1 = No.34（PCN7-1H34-TB34-K1 / PCX-1H34-TB□-K1 の記名板・結線図）。

### 三菱電機対応品

32 点ユニットの 40 ピンコネクタ: 00〜0F = B20〜B05、10〜1F = A20〜A05、B01・B02 = 出力の +V（入力の COM）、A01・A02 = 出力の 0V（入力では空き）。
A03・A04・B03・B04（空き）は端子台に出ない。PCN7 の M1 は電源部が左端（奥段 +V・00〜0F、手前段 0V・10〜1F）、M2 は右端（奥段 10〜1F・+V、手前段 00〜0F・0V）。

## 結線方式と適合電線

各機器の `description` に結線方式と適合電線を、各端子の `note` の末尾に要約（［…］）を書いた。

| シリーズ | 結線方式 | 適合電線 |
|---|---|---|
| PCN7 | ネジ式 M3（Y 形圧着端子用セルフアップ、脱落防止）。R タイプ（PCN7R）は丸形圧着端子用 | 1.25㎟ 以下、1.2N・m |
| PCX / PCXV / PCX-COM | スプリングロック式 3.5mm。フェルール・単線はプッシュイン、より線はボタンを押して挿入 | フェルール 0.14〜0.75㎟（DIN46228-4、長さ 8〜12mm）、単線 φ0.3〜1.3、より線 0.08〜1.5㎟、被覆外径 φ3.2 未満 |
| PCV5 | スプリングロック式 5mm（2 段）。より線は開閉口にドライバを差して挿入 | フェルール 0.25〜1㎟、単線 φ0.5〜1.6、より線 0.08〜1.25㎟、被覆外径 φ3.6 未満 |
| PCW | スプリングロック式 5mm（2.5㎟ 対応） | フェルール 0.14〜2.5㎟（0.14〜0.34㎟ は長さ 12mm、0.5〜2.5㎟ は 10mm）、単線 φ0.3〜1.6、より線 0.08〜2.5㎟、被覆外径 φ4.7 以下 |
| PCXV-COM16 入力 | スプリングロック式 5mm | フェルール 0.14〜2.5㎟、より線 0.08〜2.5㎟、単線 φ0.3〜1.6 |
| VTX-2.5 | ボタン付きプッシュイン | フェルール 0.25〜2.5㎟（2 本接続用 0.5㎟）、単線 φ0.5〜2.0、より線 0.14〜2.5㎟、被覆外径 φ4.8 以下、24A |
| PTU-10 | ネジアップ式 M3 | 0.75㎟ 11A / 1.25㎟ 15A、圧着端子（幅 6mm 以下） |

## 見た目

1mm ≒ 2px。コネクタ端子台は上から見た形（奥側にコネクタ、手前に端子 2 段）。

- PCN7: グレーの本体、両端に橙色のレール用ツメ（LOCK）と直付け用の穴、M3 の十字ネジが 7mm ピッチの千鳥 2 段。記名板は奥段の上・手前段の下に印字
- PCX: アイボリーのケース、グレーの端子台 2 段、各端子に橙色の開閉ボタンと丸い電線挿入孔、段ごとに記名板、下に黄色のレールロックボタン
- PCV5 / PCW: グレー / 黒の本体、段差のある 2 段の端子（開閉口 + 角形の挿入孔、2.5mm 千鳥）、コネクタと端子の間に 2 行の記名板
- 記名板の目印: A・B 連番は 5 番ごとに黒地、PLC 対応品は 4 点ごとに黄、コモンは青（+V は赤）
- MIL コネクタは両端にロックレバー付きのボックスヘッダ、FCN は台形の金属シェルと固定ネジ

## 追加していないもの

- インターフェイス: PCA7（ネジアップ式の新型、PLC 対応品多数）、PCN（7.62mm ネジ式）、PCI（ネジ式、入力機器電源コモン付き）、
  PCIV（3 段スプリング、三菱 FX・オムロン 20 ピン用）、MIL 26 極、MR・D-sub・セントロニクス・ハーフピッチのコネクタ品、
  PCV5 / PCXV の PLC 対応品、オムロン・横河・日立対応品（O1〜O4）、KEYENCE の 20 極（K2）・40 極（K3・K4・K-CPU）・K-Nano、
  PCX の分岐端子付き KEYENCE（PCX-1H34-TB40-K-Nano）、PCX-1H20-TB20-M-XY（FX 用）
- リレーターミナル（PCRY・PCRP・PCRX）: コイルを PLC の出力ピンで駆動する内部構造（コイルの両端の電位差）を、
  端子・ピンと links だけでは表せないため見送った（下記の提案を参照）
- コモン端子台: PCN7-COM / PCN-COM / PCA7-COM（ネジ式）、PCV5-COM、PCW-COM、PCXV-COM20 / 40、PCXV-COM32
- レール用端子台: VTX の 2.5 以外のサイズ・3 点 / 4 点品・PE（アース）、VTXW（2 段）、VTXC（連結コモン）、VTZ、VT-5M、PT、CMN など

## 気づいたこと・提案

### FCN 40 ピン ↔ MIL 40 極の変換ケーブルのピン対応

Conneko の三菱電機の I/O ユニット（`mitsubishi.rx41c4` など）は「一般的な変換ケーブル（三菱 B20 ↔ MIL 1）」を前提に、
FCN40 を `mates: ['MIL40']` で MIL 40 極へつなぐ（B20 = `CN1#1`）。一方、東洋技研の PCW-1H40-C の結線図（FCN⇔MIL ケーブル KB40N-4F1H 使用）では
**三菱の B20（X00）が MIL ピン 40、B01・B02 が MIL ピン 2・4、A01・A02 が MIL ピン 1・3**（B_k → 2k、A_k → 2k−1）で、逆向きになっている。
東洋技研の FCN 端子台の結線図でも FCN の▲は A1 側にある。

このため、東洋技研の MIL 40 極の三菱対応品（`pcn7-1h40-tb34-m1`、`pcw-1h40-c`）のピン ID は、物理的な MIL ピン番号ではなく
Conneko の対応（`fcnPinNo`）にそろえ、RX41C4 とケーブルでつないだときに 00 = X00 になるようにした（説明文に注記あり）。
一般の 1:1 の MIL 40 極端子台（`pcx-1h40` など）を RX41C4 に FCN40−MIL40 でつなぐと、Conneko では X00 が A1（MIL ピン 1）に出るが、
東洋技研のケーブルでは B20（MIL ピン 40）に出る。三菱の FCN40 のピン ID を物理位置（B_k → `CN1#2k`、A_k → `CN1#(2k−1)`）に変えるか、
`mates` にピンの対応（例: `mates: [{ kind: 'MIL40', pinMap: 'reverse' }]`）を書けるようにすることを提案する
（三菱側を直す場合は `src/devices/toyogiken/rows.ts` が `fcnPinNo` を使っているので自動で追従する）。

### 表せなかったこと（コアへの提案）

1. **電線の端末処理**（フェルール / 丸形・Y 形圧着端子 / 裸線）: 電線の属性にないため、端子の `note` と `description` に書くだけになった。
   提案: `DiagramWire` に `termination?: 'ferrule' | 'ring' | 'fork' | 'bare' | 'pin'`（両端別なら `fromTermination` / `toTermination`）を加え、
   端子に `accepts`（`TerminalDef.wire?: { methods: ('ferrule' | 'ring' | 'fork' | 'bare')[]; minSq; maxSq; maxInsulationMm? }`）を書けるようにして、
   プッシュイン端子に丸形圧着端子、ネジ式（Y 形専用）に裸線、2.5㎟ を PCX（0.75㎟ まで）に、のような組み合わせを警告する。
2. **端子の適合電線サイズ・定格電流**: 中継端子（`role: 'pass'`）に定格電流や電線サイズの上限がなく、
   太すぎる電線（PCX に 2㎟）や分岐端子の電流超過（10A）をチェックできない。上記の `wire.maxSq` と、`pass` 端子の `ratedCurrent` を提案する。
3. **パラメータで幅が変わる機器**: `width` / `height` がパラメータで変えられないため、極数の違う端子台は別ファイルにした
   （1:1 は MIL 20 / 34 / 40 / 50 で 4 ファイルずつ、レール用端子台は 10 極に固定）。`width` / `height` を `ParamDependent<number>` にできると、
   「VTX-2.5/2 を n 極」「PCX-1□n」を 1 ファイルにまとめられる（端子 ID は極数を増やしても既存のものは変わらない）。
4. **リレーターミナル**: コイルを「2 端子の負荷」として内部に持つ部品（`internalLoads: [{ a: '+V', b: 'CN#1', accepts: DC24V, drives: [{ from: '1a', to: '1b', switch: 'NO' }] }]`
   のように、コイルの通電で開閉する接点）を書けると、PCRY（出力用リレーターミナル）や PLC の出力 → リレー → AC 負荷の回路をチェックできる。
5. **I/O 割付の「変換端子台を追加」**: 合うコネクタの最初の端子台（名前順で汎用品）が選ばれる。メーカーを選べると、
   東洋技研の PLC 対応品（記名板が I/O 番号どおり）を I/O 割付から直接置ける。
