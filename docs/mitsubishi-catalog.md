# 三菱電機 機器定義の一覧（PLC 以外）

`src/devices/catalog/mitsubishi-*.ts` のうち、PLC（MELSEC）以外の三菱電機の機器 — ブレーカー（ノーヒューズ遮断器・漏電遮断器・
サーキットプロテクタ）、開閉器（電磁接触器・電磁継電器・サーマルリレー）、インバーター — の一覧と、型式の選び方・出典・推定の内容をまとめる。
PLC は [mitsubishi-plc-catalog.md](mitsubishi-plc-catalog.md)、安全コントローラー MELSEC-WS とミラー接点の扱いは [safety-catalog.md](safety-catalog.md) を参照。

## 1. 一覧

### ブレーカー

| type | 型式 | 種類 | 外形（W×H mm） | 定格電流（パラメータ） | 端子 | 出典 |
|---|---|---|---|---|---|---|
| `mitsubishi.nf32-sv.2p` | NF32-SV 2P | ノーヒューズ遮断器 WS-V 汎用品 32AF | 50×130 | 3〜32A | 1/3・2/4 | [B1] p.22 |
| `mitsubishi.nf32-sv.3p` | NF32-SV 3P | 同上 | 75×130 | 3〜32A | 1/3/5・2/4/6 | [B1] p.22 |
| `mitsubishi.nf63-cv.2p` | NF63-CV 2P | ノーヒューズ遮断器 WS-V 経済品 50AF（60・63A は 60/63AF） | 50×130 | 3〜63A | 1/3・2/4 | [B1] p.22、[B2] p.18 |
| `mitsubishi.nf63-cv.3p` | NF63-CV 3P | 同上 | 75×130 | 3〜63A | 1/3/5・2/4/6 | [B1] p.22、[B2] p.18 |
| `mitsubishi.nf125-sv.3p` | NF125-SV 3P | ノーヒューズ遮断器 WS-V 汎用品 100AF（125A は 125AF） | 90×130 | 15〜125A | 1/3/5・2/4/6（M8） | [B1] p.26、[B2] p.21 |
| `mitsubishi.nv32-sv.3p` | NV32-SV 3P | 漏電遮断器 WS-V 汎用品 32AF | 75×130 | 5〜32A、感度 15/30/100・200・500mA | 1/3/5・2/4/6 | [B1] p.24 |
| `mitsubishi.nv63-cv.3p` | NV63-CV 3P | 漏電遮断器 WS-V 経済品 50AF | 75×130 | 5〜63A、感度 30 / 100・200・500mA 切換 | 1/3/5・2/4/6 | [B1] p.24、[B2] p.28 |
| `mitsubishi.nf30-fa.2p` | NF30-FA 2P | 制御盤用ノーヒューズ遮断器（FA シリーズ）30AF、AC/DC 共用 | 40×72 | 5〜30A | 1/3・2/4（推定） | [B3] p.7・p.11 |
| `mitsubishi.nf30-fa.3p` | NF30-FA 3P | 同上 | 60×72 | 5〜30A | 1/3/5・2/4/6 | [B3] p.3・p.7・p.11 |
| `mitsubishi.nv30-fa.2p` | NV30-FA 2P | 制御盤用漏電遮断器（FA シリーズ）30AF、1φ2W | 40×72 | 5〜30A、感度 15/30mA | 1/3・2/4（推定） | [B3] p.7・p.11 |
| `mitsubishi.nv30-fa.3p` | NV30-FA 3P | 同上、3φ3W・1φ2W・1φ3W | 60×72 | 5〜30A、感度 15/30mA | 1/3/5・2/4/6 | [B3] p.7・p.11 |
| `mitsubishi.cp30-ba.1p` | CP30-BA 1P | サーキットプロテクタ（AC/DC） | 17.5×73 | 0.1〜30A、動作特性 I/M/S/F | 1・2 | [B4] p.4・p.8 |
| `mitsubishi.cp30-ba.2p` | CP30-BA 2P | 同上（AC/DC） | 35×73 | 同上 | 1/3・2/4 | [B4] p.4・p.8 |
| `mitsubishi.cp30-ba.3p` | CP30-BA 3P | 同上（AC 専用） | 52.5×73 | 同上 | 1/3/5・2/4/6（推定） | [B4] p.4・p.8 |

### 開閉器

| type | 型式 | 種類 | 外形（W×H mm） | 端子 | 出典 |
|---|---|---|---|---|---|
| `mitsubishi.s-t10.ac200v` | S-T10 AC200V 1a | 電磁接触器（AC-3 11A） | 36×75 | 1/L1 3/L2 5/L3 13NO / 2/T1 4/T2 6/T3 14NO、A1・A2 | [K1] |
| `mitsubishi.s-t12.ac200v` | S-T12 AC200V 1a1b | 電磁接触器（AC-3 13A）。21-22 はミラー接点 | 44×75 | 13NO 1/L1 3/L2 5/L3 21NC / 14NO 2/T1 4/T2 6/T3 22NC、A2・A1 | [K1] p.18・p.57 |
| `mitsubishi.s-t20.ac200v` | S-T20 AC200V 1a1b | 電磁接触器（AC-3 18A）。S-T12 と同じ外形 | 44×75 | S-T12 と同じ | [K1] p.18・p.57 |
| `mitsubishi.s-t21.ac200v` | S-T21 AC200V 2a2b | 電磁接触器（AC-3 25A） | 63×81 | 主回路は中央、補助は左 13・21 / 22・14、右 43・31 / 32・44 | [K1] p.18・p.58 |
| `mitsubishi.s-t25.ac200v` | S-T25 AC200V 2a2b | 電磁接触器（AC-3 30A）。S-T21 と同じ外形 | 63×81 | S-T21 と同じ | [K1] p.19・p.58 |
| `mitsubishi.s-t32.ac200v` | S-T32 AC200V | 電磁接触器（AC-3 32A）。補助接点なし | 43×81 | 1/L1 3/L2 5/L3 / 2/T1 4/T2 6/T3、A2・A1 | [K1] p.19・p.59 |
| `mitsubishi.sd-t12.dc24v` | SD-T12 DC24V 1a1b | 直流操作形電磁接触器 | 44×75 | S-T12 と同じ、A1(+)・A2(−) | [K1]（safety-catalog.md） |
| `mitsubishi.sd-t20.dc24v` | SD-T20 DC24V 1a1b | 直流操作形電磁接触器（AC-3 18A、コイル 2.2W） | 44×75 | S-T20 と同じ、A1(+)・A2(−) | [K1] p.20・p.23・p.63 |
| `mitsubishi.sd-t21.dc24v` | SD-T21 DC24V 2a2b | 直流操作形電磁接触器 | 63×81 | S-T21 と同じ、A1(+)・A2(−) | [K1]（safety-catalog.md） |
| `mitsubishi.sr-t5.5a.ac200v` | SR-T5 AC200V 5a | 電磁継電器（コンタクタリレー） | 44×75 | 13 23 33 43 53 / 14 24 34 44 54 | [K1] p.34・p.35・p.69 |
| `mitsubishi.sr-t5.4a1b.ac200v` | SR-T5 AC200V 4a1b | 同上 | 44×75 | 13 23 33 43 51 / 14 24 34 44 52 | 同上 |
| `mitsubishi.sr-t5.3a2b.ac200v` | SR-T5 AC200V 3a2b | 同上 | 44×75 | 11 23 33 43 51 / 12 24 34 44 52 | 同上 |
| `mitsubishi.srd-t5.4a1b.dc24v` | SRD-T5 DC24V 4a1b | 直流操作形電磁継電器（コイル 2.2W） | 44×75 | SR-T5 4a1b と同じ、A1(+)・A2(−) | [K1] p.23・p.34・p.69 |
| `mitsubishi.th-t18` | TH-T18 | サーマルリレー（S-T10/T12/T20 用、ヒーター 0.12〜15A） | 45×55 | 上部ピン 1/L1 3/L2 5/L3、下 2/T1 4/T2 6/T3、95-96(b)・97-98(a) | [K1] p.70 |
| `mitsubishi.th-t25` | TH-T25 | サーマルリレー（S-T21/T25 用、ヒーター 0.24〜22A） | 63×53 | 上 1/L1 3/L2 5/L3、下 2/T1 4/T2 6/T3、96・95 / 98・97 | [K1] p.33・p.70 |

### インバーター

| type | 型式 | 種類 | 外形（W×H mm） | 端子 | 出典 |
|---|---|---|---|---|---|
| `mitsubishi.fr-e820-0.75k` | FR-E820-0.75K-1 | FR-E800 標準品 三相 200V 0.75kW（FM 出力タイプ） | 68×128 | 主回路 R/L1 S/L2 T/L3 U V W・N/- P1 P/+ PR・接地、制御回路 25 点 | [V1] 2.4・2.5・2.6・4.4 |

## 2. 型式の選び方

- **WS-V の 50A フレーム（NF63-CV / NV63-CV）**: 制御盤の主幹で最もよく使う経済品。外形・端子位置は NF32-SV / NV32-SV と同じ（[B1] の同じ外形図に載っている）ので、
  見た目は共通部品 `buildWsvBreaker`（`src/devices/mitsubishi/wsv-breaker.ts`）で NF32-SV と同じ描き方にした。
- **NF125-SV 3P**: 容量の大きい盤の主幹用。極間ピッチ 30mm・W90。主端子は M8 ねじ。
- **FA 用の小形のブレーカー**: 三菱電機の「制御盤用遮断器 FA シリーズ」（NF30-FA / NV30-FA）を選んだ。高さ 72mm と WS-V の半分ほどで、IEC 35mm レールに付き、
  制御盤内の制御電源・DC24V 回路の主幹・分岐に使う。NF30-FA は AC/DC 共用（DC65V 1.5kA）、NV30-FA は AC100〜200V の漏電遮断器。
  共通部品 `buildFaBreaker`（`src/devices/mitsubishi/fa-breaker.ts`）。同じ外形の 50A フレーム（NF50-FA / NV50-FA）と海外規格品（-FAU）は未収録。
- **サーキットプロテクタ**: CP30-BA の 3 極品を追加（AC 専用）。
- **電磁接触器**: 盤でよく使う T20・T21・T25・T32 フレームを追加（AC200V コイル）。T20 は T12 と、T25 は T21 と外形・端子配列が同じなので、
  `buildMsT20Frame`（`mitsubishi-s-t20.ts`）・`buildMsT21Frame`（`mitsubishi-s-t21.ts`）で作る。直流操作品は SD-T20 DC24V を追加（SD-T12・SD-T21 は収録済み）。
  共通の描画部品・コイルの受電条件は `src/devices/mitsubishi/ms-t.ts`。
- **補助継電器**: 電磁継電器 SR-T5 の 3 種類の接点配列（5a / 4a1b / 3a2b）と、PLC のトランジスタ出力で直接駆動できる直流操作形 SRD-T5 4a1b DC24V。
  接点配列で端子番号が変わる（a 接点 13-14 と b 接点 11-12 など）ので、配列ごとに別の type にした（`buildSrT5`）。
- **サーマルリレー**: S-T21 / S-T25 と組み合わせる TH-T25 を追加。
- **インバーター**: 小形の汎用インバーターの代表として FR-E800 の三相 200V 0.75kW 標準品（国内向けの FM 出力タイプ -1）。

## 3. 電気的な表現

- **ブレーカー**: 各極を `{ from: 一次側, to: 二次側, directed: true, protects: true }`、`protectionCurrent: { param: 'ratedCurrent' }`。
  定格電流（と漏電遮断器の定格感度電流、サーキットプロテクタの動作特性）はパラメータで選び、銘板の表示に反映する。漏電遮断器は `schematic: { earthLeakage: true }`。
- **電磁接触器**: 主接点は `line` → `load` の `switch: 'NO'`（`ratedCurrent` は AC-3 AC220〜240V の定格使用電流）、補助 a 接点は `switch: 'NO'`、
  補助 b 接点は `switch: 'NC'` + `linked: 'mirror'`（MS-T シリーズの b 接点はミラー接点。[K2]）。
  交流操作コイルは AC200V 品の定格 200〜240V（[K1] p.8 のコイル呼び）、`distinctGroups: [['A1', 'A2']]`。
  直流操作コイルは DC24V の 85〜110%（20.4〜26.4V）で、A1 が +・A2 が −（[K1] p.23 の注記）。
  `loadCurrent` はコイルの保持電流（AC は保持 VA ÷ 200V、DC は消費電力 ÷ 24V）。
- **電磁継電器 SR-T5**: 接点は `signal` + `switch: 'NO'` / `'NC'`（強制ガイドの指定はしていない）。接点定格は AC-15 AC240V 3A・DC-13 DC24V 3A。
- **サーマルリレー**: 主回路は `protects: true`（`protectionCurrent` はヒーター呼び）、95-96 は `switch: 'NC'`、97-98 は `switch: 'NO'`。
- **インバーター**（category は `load`）:
  - R/L1・S/L2・T/L3 は `input`（AC170〜264V、`distinctGroups`）、`loadCurrent` は定格入力電流 7.0A（DC リアクトルなし・ND）。
  - U・V・W は `supply`（AC200V、R/S/T、`limitCurrent` は定格出力電流 5.0A）。モーターの端子をつなぐと電源が届くとみなす。
  - STF・STR・RH・RM・RL・MRS・RES は無電圧接点入力（`signal: { dir: 'in', kind: 'dry' }`。出荷時のシンクロジック）。PC は DC24V（0.1A）の `supply` `+`、SD は `-`。
  - RUN・FU・SO はオープンコレクタ（NPN）出力で、`{ from: 出力, to: SE / SOC, switch: 'output', ratedCurrent: 0.1 }`。
  - A-B-C は異常出力の切換接点（C-A が a 接点、C-B が b 接点。AC240V 2A）。
  - 10 は周波数設定用電源（DC5V 10mA）の `supply`、2 はアナログ電圧入力、4 はアナログ電流入力、5 はその共通（`signal`）。
  - S1・S2（安全停止入力）は通常の `signal`（安全入力の `function` は付けていない）。P1・P/+・PR・N/- は `signal`（任意）。

## 4. 推定を含む機器

| type | 推定の内容 |
|---|---|
| `mitsubishi.nf30-fa.2p` / `mitsubishi.nv30-fa.2p` | 2 極品の端子記号（1/3・2/4）。3 極品の写真（[B3] p.3 の NF50-FAU、上 1・3・5、下 2・4・6）から推定 |
| `mitsubishi.cp30-ba.3p` | 端子記号（1/3/5・2/4/6）。収録済みの 1P（1・2）・2P（1/3・2/4）の定義にそろえた |
| `mitsubishi.th-t25` | 補助接点 98・97 の位置（96・95 の下側）。外形図の引出線から推定 |
| `mitsubishi.fr-e820-0.75k` | 制御回路端子の位置。実機はカバー内のばね式端子台（[V1] 2.6.5）だが、図面で配線しやすいよう左右の縁に並べた。SD は 3 か所を 2 つ（SD・SD2）にまとめた |

外形・端子の位置は外形図から 1mm = 2px で読み取った（読み取りの誤差は ±1px 程度）。

## 5. 表せなかったもの・収録しなかったもの

- **補助接点ユニット UT-AX2 / UT-AX4 / UT-AX11**（電磁接触器・電磁継電器の前面・側面に付ける）: 接点の開閉が取り付けた接触器のコイルに連動するが、
  今の仕組みでは別の機器の接点を「この機器のコイルで動く」と表せない（単独の機器にすると、短絡チェックの「1 台ずつ動作」で別の機器として扱われる）。
  S-T32 は補助接点が標準で付かないので、自己保持などの補助接点が要る図面では表しきれない。
- **コイル電圧の違い**（AC24V・AC100V・AC400V、DC12V・DC100V など）: type に AC200V / DC24V を含めた。`loadCurrent` がパラメータの関数にできないため、
  コイル電圧をパラメータにするとコイル電流を正しく書けない。必要な電圧は `buildMsT20Frame` などで type を増やせる。
- **NV32-SV 2P**: WS-V の NV32-SV は 3 極品だけ（単相 2 線も 3 極品で使う。[B2] p.30）なので作っていない。NV63-CV の 2 極品（1φ2W）は外形図を確認できず未収録。
- **可逆形（S-2×T□）・開放形電磁開閉器（MSO-T□）**: 接触器とサーマルリレーを別々に置いて表す。機械的インタロック（UT-ML）は表せない。
- **サーマルリレーと接触器の直結**: TH-T18 / TH-T25 を接触器の二次側に直結する場合も、図面では電線でつなぐ。
- **インバーターの機能**: 入力端子の機能の割付け（Pr.178〜）、シンク/ソースの切換、電圧/電流入力の切換スイッチ、安全停止（STO）の 2 チャンネル入力の安全チェックは表していない。

## 6. 出典

- [B1] ノーヒューズ遮断器・漏電遮断器 WS-V シリーズ 新旧比較資料 Y-0694 https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvcb/yn-c-0694/y06940911.pdf
  （p.22 NF32-SV / NF63-CV / NF63-SV / NF63-HV、p.24 NV32-SV / NV63-CV、p.26 NF125-CV / NF125-SV / NF125-HV の外形寸法図）
- [B2] General Catalog Molded Case Circuit Breakers and Earth Leakage Circuit Breakers Y-0720 https://www.mitsubishielectric.com.au/wp-content/uploads/2022/03/Brochure_y0720f2102.pdf
  （p.18 NF-C、p.20〜21 NF-S、p.28 NV-C、p.30 NV-S の仕様表）
- [B3] 三菱制御盤用遮断器 FA/FHU シリーズ Y-0660 https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvcb/yn-c-0660/y0660f2209.pdf
  （p.3 製品写真、p.7 仕様、p.11 外形寸法図）。NF30-FA 仕様ページ https://www.mitsubishielectric.co.jp/fa/products/faspec/detail.page?kisyu=%2Flvcb&formNm=NF-F_NF30-FA_1&category=ex&id=spec
- [B4] 三菱サーキットプロテクタ Y-0573 https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvcb/yn-c-0573/y0573k1603.pdf （p.4 仕様、p.8 外形図）
- [K1] MS-T シリーズ カタログ L(NA)02030ENG-K https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l02030/L(NA)02030ENG-K.pdf
  （p.8 コイル呼び、p.18〜20 仕様一覧、p.23 直流操作コイル、p.33 ヒーター呼び、p.34・35 電磁継電器、p.57〜59・p.63 接触器の外形図、p.69 電磁継電器の外形図、p.70 サーマルリレーの外形図）
- [K2] MS-T 技術資料 L(NA)02031ENG（ミラー接点）https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l02031eng/L(NA)02031ENG-L_21B.pdf
- [V1] FR-E800 Instruction Manual (Connection) IB-0600865ENG-C https://eu-assets.contentstack.com/v3/assets/blt5412ff9af9aef77f/blt45e2f3922a086c8e/6172b59eb04cff6af9e6a2aa/6442e518-18ed-11eb-901c-b8ca3a62a094_ib0600865engc.pdf
  （2.4 端子接続図、2.5 主回路端子、2.6 制御回路端子、4.1 定格、4.4 外形寸法図）
