# 安全機器・安全コントローラーの調査と実装一覧

生産設備で使われる安全関連機器（安全コントローラー、セーフティリレー、非常停止、安全ドアスイッチ、
ライトカーテン、レーザスキャナ、イネーブルスイッチ、強制ガイドリレー、ミラー接点付き電磁接触器など）について、
公式カタログ・取扱説明書・外形図・端子配列図を調べ、`src/devices/catalog/` に機器定義として実装した。
型・チェックの拡張案は `docs/proposals/safety.md` を参照。

## 1. 端子の電気的定義の方針

| 端子の種類 | role | 補足 |
|---|---|---|
| 安全コントローラー・セーフティリレーの電源（A1/A2、V1/G1、+24V/0V、V+/V−） | `input` + `accepts`（DC、`+` / `-`） | 電圧範囲は各機種の許容範囲。消費電流は `loadCurrent` |
| FG / PE / FE | `ground` | ライトカーテンの FE は未配線でも警告しないよう `optional` |
| 安全入力・テスト出力・OSSD・リセット・EDM・ミューティング・補助出力 | `signal`（`optional`） | 機能は `label`（例: `T11（テスト出力 CH1）`）と `description` に書く |
| リレー接点・スイッチ接点（13-14、11-12 など） | `signal` + `links`（向きなし） | ガイドどおり「接点は閉」とみなす。b 接点か a 接点か、直接開路か、ミラー接点かは `label` に書く |
| 電磁接触器・強制ガイドリレー・ソレノイドロックのコイル | `input` + `accepts` | DC コイルは極性あり（A1/1 が +） |
| ケーブル引出しの機器 | 芯線の先端ごとに端子 | id は機能名（`+24V`、`OSSD1` など）、`label` と SVG に線色を書く |

- 安全リレーの出力接点は `links` で表すので、`+24V → 13-14 → 接触器コイル A1` と配線すれば、コイルに電源が届いたと判定される。
- OSSD（半導体の安全出力）は `signal` なので、OSSD で接触器のコイルを直接駆動するとコイルが「電源が来ていません」と警告される。
  これは現在の型の限界で、`docs/proposals/safety.md` の 2.4（`SupplySpec.kind: 'ossd'`）で解消する案を出した。
- 2 チャンネル入力のペア、テストパルス、EDM、安全性能（PL・カテゴリ・SIL・タイプ）は `description` と `label` に書いた。
- 代表的な安全回路を組んだときに誤検出しないことを `src/check/safetyDevices.test.ts` で確認している。

## 2. 実装した機器（30 種）

### 2.1 安全コントローラー

| type | 型式 | 要点 | 主な出典 |
|---|---|---|---|
| `keyence.gc-1000` | KEYENCE GC-1000 | Si0〜15、To0〜3、So0〜5（PNP 500mA）、Ao0〜3、+24V/0V、Ethernet（RJ45）。黒い筐体に黄色の帯、カラー液晶、プッシュイン 2 列×8 段×2 | [K1][K2][K3] |
| `keyence.gc-1000r` | KEYENCE GC-1000R | GC-1000 の Si14/15・So4/5 が N.C.、安全リレー出力 SRo 13/23/33-14/24/34（上から 13 23 33 14 24 34）。幅 85mm | [K2] |
| `omron.g9sp-n10s` | オムロン G9SP-N10S | V1/G1（内部・入力）、V2/G2（出力）、Si0〜9、T0〜3、So0〜3、O0〜3。千鳥 2 段の M3 ネジ端子台が上下 | [O1][O2] |
| `mitsubishi.ws0-cpu0-xtio` | 三菱電機 MELSEC-WS WS0-CPU0 + WS0-XTIO | CPU 単体は I/O なしのため最小構成を 1 ノードに。メモリプラグ A1/A2（CPU-A1/CPU-A2）、XTIO の X1/X2、A1/A2（出力用）、I1〜I8、Q1〜Q4 | [M1] |
| `idec.fs1b-c31s` | IDEC SafetyOne FS1B-C31S | ロジック選択式。入力コネクタ T0〜T15/X0〜X15・X16/X17、出力コネクタ Y0〜Y20、V+/V−。FS1A-C11S/C21S（生産終了）の後継 | [I1][I2][I3] |

### 2.2 セーフティリレー（安全リレーユニット）

| type | 型式 | 要点 | 主な出典 |
|---|---|---|---|
| `omron.g9se-201` | オムロン G9SE-201 | 幅17.5mm、Push-In Plus。A1/A2、T11-T12・T21-T22（CH1/CH2）、T31/T32/T33（リセット・フィードバック）、X1、13-14/23-24 | [O3] |
| `omron.g9se-401` | オムロン G9SE-401 | 幅22.5mm、安全出力 4a（13-14〜43-44） | [O3] |
| `omron.g9se-221-t05` | オムロン G9SE-221-T05 | 瞬時 2a + オフディレー 2a（37-38、47-48）。`params.offDelay`（0〜5 秒）でロータリスイッチの表示が変わる | [O3] |
| `omron.g9sa-301` | オムロン G9SA-301 | 幅45mm、M3 ネジ 4 段。A-B でリセット方式選択、PE、補助 b 接点 41-42 | [O4] |
| `omron.g9sa-th301` | オムロン G9SA-TH301 | 両手操作コントローラ。押ボタン 2 個（各 1a1b）を T11/T12/T13・T21/T22/T23 に | [O4][O13] |
| `idec.hr6s-af` | IDEC HR6S-AF | 幅22.5mm、着脱式端子台。A1 13 23 33 / Y1 Y2 S11 S12 / B2 Z1 S21 S22 / A2 14 24 34。START・FUNCTION ロータリスイッチを `params` で表示 | [I4][I5] |
| `pilz.pnoz-x2-8p` | Pilz PNOZ X2.8P（777301） | A1 13 23 33 / S52 S34 41 42 / S11 S12 S21 S22 / A2 14 24 34。横絡検出は S11-S52 短絡 | [P1] |
| `pilz.pnoz-s4` | Pilz PNOZ s4（750104） | X1: A1 13 23 33 / X3: S12 S22 S34 41 / X2: S11 S21 Y32 42 / X4: A2 14 24 34 | [P1] |

### 2.3 入力側の安全機器

| type | 型式 | 要点 | 主な出典 |
|---|---|---|---|
| `idec.xw1e-bv402mr` | IDEC XW1E-BV402MR | Φ40 キノコ形 非常停止、2b（21-22・41-42、直接開路）。黄色の非常停止銘板付きで描く | [I6][I7] |
| `idec.xw1e-lv402q4mr` | IDEC XW1E-LV402Q4MR | 上の照光形。LED X1(+)/X2(−) DC24V 15mA | [I6][I7] |
| `idec.hs5d-02rn` | IDEC HS5D-02RN | 小形インタロックスイッチ（舌片式）。主回路 11-12・モニタ 21-22 ともに直接開路の b 接点 | [I8] |
| `idec.hs5e-a4403-g` | IDEC HS5E-A4403-G | 電磁ロック式（スプリングロック）、表示灯付き、ケーブル 8 芯。A2(+)白/A1(−)黒、主回路 11(青)-42(青白)、扉モニタ 23-24、ロックモニタ 53-54 | [I8][I9] |
| `idec.he1g-l21sm` | IDEC HE1G-L21SM | グリップ形イネーブルスイッチ。3 ポジション接点 1-2・3-4、モニタ 5-6 | [I10] |
| `omron.er6022-021m` | オムロン ER6022-021M | ロープ式非常停止（黄色）。11-12・21-22（b）、33-34（a）、青いリセットボタン | [O5] |
| `omron.d4n-4c20` | オムロン D4N-4C20 | 安全リミットスイッチ（ローラレバー）。11-12・21-22（直接開路 b）、33-34（a） | [O6] |
| `keyence.gs-11p5` | KEYENCE GS-11P5 | 非接触式インタロック。ケーブル 8 芯: 茶 +24V、青 0V、黒 OSSD1、白 OSSD2、赤黒/赤白 安全入力 1/2、灰 AUX、水色 未使用 | [K4][K5] |
| `keyence.gl-r.receiver` | KEYENCE GL-R 受光器 + GL-RP□PM（11 芯 PNP） | 茶 +24V、青 0V、黒 OSSD1、白 OSSD2、灰 FE、黄 リセット、ピンク インターロック選択、赤黒 EDM、赤 AUX、橙/橙黒 同期 | [K6][K7][K8] |
| `keyence.gl-r.emitter` | KEYENCE GL-R 送光器 + GL-RP□P（5 芯） | 茶 +24V、青 0V、灰 FE（白・黒は未使用として絶縁キャップで描く） | [K6][K8] |
| `keyence.sz-v32` | KEYENCE SZ-V32 + SZ-VP□（18 芯） | セーフティレーザスキャナ（タイプ3 / PL d）。OSSD1/2、AUX1/2、入力 1〜12（リセット、EDM、バンク切替） | [K9][K10][K11] |
| `omron.f3sg-sr.receiver` | オムロン F3SG-4SRA□-14 受光器 + F39-JG□C-D | 黄 RESET/EDM、茶 +24V、灰 MUTE A、ピンク MUTE B、黒 OSSD1、白 OSSD2、青 0V、赤 AUX（PNP 使用時） | [O7] |
| `omron.f3sg-sr.emitter` | オムロン F3SG-4SRA□-14 送光器 + F39-JG□C-L | 茶 +24V、黒 TEST、青 0V、白 COM(+)、黄 距離切替/COM(−) | [O7] |

### 2.4 出力側（強制ガイド・ミラー接点）

| type | 型式 | 要点 | 主な出典 |
|---|---|---|---|
| `mitsubishi.sd-t12.dc24v` | 三菱電機 SD-T12 DC24V 1a1b | 直流操作。上段 13NO 1/L1 3/L2 5/L3 21NC、下段 14NO 2/T1 4/T2 6/T3 22NC、コイル A2(−)/A1(+)。21-22 はミラー接点 | [M2][M3][M4] |
| `mitsubishi.sd-t21.dc24v` | 三菱電機 SD-T21 DC24V 2a2b | 補助接点が左右の縁に縦配置（左 13・21/22・14、右 43・31/32・44）。21-22・31-32 がミラー接点 | [M2][M4] |
| `omron.g7sa-3a1b` | オムロン G7SA-3A1B DC24V + P7SA-10F-ND | 強制ガイド式リレー（EN 61810-3）。上段 44 33 34、左列 43 24 23 12、下段 11 A2(−) A1(+) | [O8] |
| `idec.rf1v-2a2bl-d24` | IDEC RF1V-2A2BL-D24 + SF1V-4-07L | フォースガイドリレー（EN 50205）。通し番号 1(+) 2(−) コイル、3-4・5-6 b 接点、7-8・9-10 a 接点 | [I11] |

## 3. 調査したが実装していないもの

| 機器 | 理由 |
|---|---|
| オムロン NX-SL3300 / NX-SIH400 / NX-SOD400 など | NX バスのユニット構成（CPU・カプラ・I/O ユニット）で単独では動かず、1 ノードで表しにくい。I/O ユニットは T0/T1・Si0〜・So0〜/IOG の端子名まで確認済み [O9] |
| Pilz PNOZmulti 2（PNOZ m B0） | 前面の端子の物理的な並びを確認できなかった [P2] |
| IDEC FS1A-C11S / C21S | 生産終了。端子名・配列は FS1B-C31S と同じなので FS1B で代表させた [I2][I12] |
| KEYENCE GC-S84 / GC-S16 / GC-A16 / GC-S1R（GC 増設ユニット） | 端子配列は確認済み（カタログ p.21）。メインコントローラの側面に連結する増設ユニットで、単独ノードの意味が薄いので今回は見送り [K2] |
| KEYENCE GL-V、GS-M、GS-51/71（ロック付き） | GL-V の M12 5 ピンの割付、GS-M・GS ロックタイプの外形が公開資料で確認できなかった [K12][K5] |
| オムロン D40A / D40Z（非接触ドアスイッチ） | OSSD 出力ではなく専用コントローラ G9SX-NS（または G9SP）が必須で、G9SX-NS の端子配列を調べきれていない。線色は確認済み（茶 +、白 入力 D1、青 −、黒 出力 D2、黄 補助）[O10][O11] |
| オムロン OS32C（レーザスキャナ） | 線色は確認済み（白 +24V・茶 0V と一般と逆、赤/黄 OSSD A/B、茶白 EDM など）。外形・表示部の見た目の資料が不足 [O12] |
| パナソニック SF4D / IDEC SE4D（ライトカーテン） | 線色は確認済み（茶 +V、青 0V、黒/白 OSSD、水色 極性設定、薄紫 EDM など）。優先度を下げた [X1][X2] |
| オムロン A22E-M-02 / A22NE（非常停止） | A22E は接点ブロックごとに 1-2 の同じ番号で端子 ID が重複する。A22NE 系の 11-12/21-22 品は外形の確認が不足 [O14] |
| IDEC XA1E（Φ16 非常停止） | はんだ・PCB 端子のみで盤配線の作図対象になりにくい [I7] |
| オムロン D4NS / D4SL-N / D4NL、IDEC HS6B / HS5L | 接点番号・線色は確認済み（D4SL-N: E1(+)=9・E2(−)=10、10 ピンケーブルの線色、HS5L: A2/A1・11-12・41-42 など）。代表として IDEC HS5D・HS5E を実装 [O15][O16][O17][I13][I14] |
| IDEC HE5B / HE2B（パネル取付イネーブル） | HE5B ははんだ端子（NO1/C1/NC1・NO2/C2/NC2）。HE2B の端子番号が未確認 [I10][I15] |
| 両手操作押ボタンボックス | 国内メーカーの具体的な製品の端子資料が見つからなかった。コントローラ G9SA-TH301 は実装済み |
| セーフティマット（オムロン UMA ほか） | 4 線式の線色とピン機能を確認できなかった [O18] |
| 三菱電機 S-T12 AC200V 1a1b、補助接点ユニット UT-AX2/AX4 | 端子配列は確認済み（S-T12 は SD-T12 と同じ配列、UT-AX4 2a2b は 63・71・81・93 / 64・72・82・94）。直流操作の SD-T12/T21 を優先した [M2] |
| オムロン G7Z、G9SX-EX401、Schneider TeSys D | 概要のみ調査。TeSys D は NC 補助接点がミラー接点 [O19][O20][X3] |

## 4. 不確かな点・推定を含む点

- **IDEC XW1E の 2b 品の端子番号（21-22・41-42）**: カタログの接点配置図から「1 桁目 = 位置（上 1・左 2・下 3・右 4）」の規則で読み取った。実機の印字での確認を推奨。
  照光形の X1/X2 は実機では接点ブロックの下側にあるが、図では 3 つ目のブロックとして描いた。
- **MELSEC-WS WS0-XTIO のプラグの内側／外側**: マニュアルの図から、上側の内側が X1 X2 A1 A2、外側が I1〜I4、下側の内側が Q1〜Q4、外側が I5〜I8 と推定した。
- **色**: G9SE の筐体色（赤）と IN/OUT LED の色、Pilz の LED 色、F3SG-SR の筐体色（グレースケール写真から銀色と推定）、SZ-V・GS の細部は写真・資料からの推定。
  KEYENCE GS-11P5 は外形寸法・表示灯の配置を確認できず、見た目は概略。
- **電源電圧範囲**: 24VAC/DC 兼用の機種（G9SA-301、PNOZ X2.8P、HR6S-AF）は DC24V として定義した。
- **ライトカーテン・スキャナの長さ**: 盤外機器のため長さ方向を大きく縮小し、代表的な長さで描いた（保護高さは `description` 参照）。
- **GC-1000 の EDM**: 専用端子はなく、任意の Si を設定ソフトで EDM に割り付ける。どの Si を使うかはプログラム次第。
- **FS1B-C31S の EDM**: ロジックによって使う入力が変わる（FS1A カタログの例では T14 → 接触器 b 接点 → X14）。

## 5. 出典

### KEYENCE
- [K1] GC シリーズ メインコントローラ 取扱説明書 96M16567（第三者サイトの写し） https://dentechindustrial.com/wp-content/uploads/2025/10/Keyence-MainController.pdf
- [K2] GC シリーズ カタログ（端子配列 p.21） https://5.imimg.com/data5/SELLER/Doc/2025/7/530204158/CC/TD/RS/94356387/keyence-gc-1000-safety-controller.pdf
- [K3] GC シリーズ 仕様 https://www.keyence.com/products/safety/safety-controller/gc/specs/
- [K4] GS シリーズ 仕様 https://www.keyence.com/products/safety/safety-interlock-switches/gs/specs/ 、GS-11P5 https://www.keyence.com/products/safety/safety-interlock-switches/gs/models/gs-11p5
- [K5] GS 配線ナビ（GS-11P*） https://www.keyence.com/support/user/safety/wiring_navi/gs/wiring/20.jsp 、説明 https://keyence.com/support/user/safety/wiring_navi/gs/explanation 、GS-M https://keyence.com/products/safety/safety-interlock-switches/gs-m/specs
- [K6] GL-R/GL-S カタログ https://rockfordsystems.com/wp-content/uploads/Keyence-Light-Curtains-GLR_GLS-Series.pdf
- [K7] GL-R 仕様 https://www.keyence.com/products/safety/light-curtain/gl-r/specs/
- [K8] GL-R 配線ナビ https://www.keyence.com/support/user/safety/wiring_navi/gl-r/wiring/01.jsp （02/03/08/21/24.jsp も参照）、ケーブル選定 https://www.keyence.com/support/user/safety/wiring_navi/gl-r/wiring_selection/
- [K9] SZ-V 仕様 https://www.keyence.com/products/safety/laser-scanner/sz-v/specs/
- [K10] SZ-V 取扱説明書 96M13938 https://ventionavatars.s3.amazonaws.com/uploads/part_document/file/239/SZ-V_-_Instruction_Manual.pdf
- [K11] SZ-V ユーザーズマニュアル https://ventionavatars.s3.amazonaws.com/uploads/part_document/file/234/SZ-V_-_User_Manual.pdf
- [K12] GL-V 仕様 https://www.keyence.com/products/safety/light-curtain/gl-v/specs/

### オムロン
- [O1] G9SP データシート F42I-E-05 https://assets.omron.com/m/388aaee440133edf/original/G9SP-Safety-Controller-Datasheet.pdf
- [O2] G9SP 操作マニュアル Z922 https://files.omron.eu/downloads/latest/manual/en/z922_g9sp_series_safety_controller_operation_manual_en.pdf
- [O3] G9SE データシート J198 https://www.farnell.com/datasheets/2993683.pdf 、https://files.omron.eu/downloads/latest/datasheet/es/j198_g9se_safety_relay_unit_datasheet_es.pdf （日本語カタログ https://www.fa.omron.co.jp/data_pdf/cat/g9se_sgfm-066_4_10.pdf ）
- [O4] G9SA データシート https://static.chipdip.ru/lib/234/DOC011234543.pdf 、https://www.fa.omron.co.jp/data_pdf/cat/g9sa_ds_j_11_18.pdf
- [O5] ER6022 データシート https://docs.rs-online.com/211f/A700000014067917.pdf
- [O6] D4N データシート https://files.omron.eu/downloads/latest/datasheet/en/d4n_safety_limit_switch_datasheet_en.pdf
- [O7] F3SG-SR/PG データシート F117 https://files.omron.eu/downloads/latest/datasheet/en/f117_f3sg-sr_pg_safety_light_curtain_safety_multi-light_beam_datasheet_en.pdf
- [O8] G7SA データシート J120 https://files.omron.eu/downloads/latest/datasheet/en/j120_g7sa_relays_with_forcibly_guided_contacts_datasheet_en.pdf
- [O9] NX セーフティユニット データシート https://assets.omron.com/m/07a8aa86133551e8/original/NX-Series-Safety-Control-Units-NX-SL-NX-SI-NX-SO-Datasheet.pdf
- [O10] D40A / G9SX-NS データシート https://assets.omron.com/m/6a37cdba2c7cdad5/original/D40A-G9SX-NS-Series-Datasheet.pdf
- [O11] D40Z データシート https://files.omron.eu/downloads/latest/datasheet/en/c145_d40z_datasheet_en.pdf
- [O12] OS32C クイックリファレンス https://files.omron.eu/downloads/latest/manual/en/99863-0020_os32c_quick_reference_guide_instruction_sheet_en.pdf
- [O13] G9SA（両手操作 G9SA-TH301 の配線図） https://files.omron.eu/downloads/latest/datasheet/en/g9sa_safety_relay_unit_datasheet_en.pdf
- [O14] A22E データシート https://assets.omron.com/m/2308f6a01e7c8efc/original/A22E_A263-E1_20_2-pdf.pdf
- [O15] D4NS https://docs.rs-online.com/78a4/0900766b810108ee.pdf
- [O16] D4SL-N https://assets.omron.com/m/74c716dd4c74ffae/original/D4SL-N-Series-Datasheet.pdf
- [O17] D4NL https://files.omron.eu/downloads/latest/datasheet/en/d4nl_guard_lock_safety-door_switch_datasheet_en.pdf
- [O18] UMA セーフティマット https://proax.ca/en/product/1102469/omrumma050018001
- [O19] G7Z https://files.omron.eu/downloads/latest/datasheet/en/j160_g7z_power_relays_datasheet_en.pdf
- [O20] G9SX https://files.omron.eu/downloads/latest/datasheet/en/j150_g9sx-ad_bc_ex_datasheet_en.pdf

### 三菱電機
- [M1] 安全コントローラ ユーザーズマニュアル SH-080855ENG https://www.mitsubishielectric.com/dl/fa/document/manual/plc/sh080855eng/sh080855engm.pdf
- [M2] MS-T シリーズ カタログ L(NA)02030ENG-K https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l02030/L(NA)02030ENG-K.pdf （SD-T12 p.20/23/63、SD-T21 p.20/64、S-T12 p.18/57、UT-AX p.36/37/73）
- [M3] SD-T シリーズ 発売案内 L02030-D https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l002030/L02030D.PDF
- [M4] MS-T 技術資料 L(NA)02031ENG（ミラー接点の TÜV 認証 p.282） https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l02031eng/L(NA)02031ENG-L_21B.pdf

### IDEC
- [I1] FS1A カタログ https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/45/FS1A_Cat.pdf
- [I2] FS1A 生産終了 https://www.idec.com/en-apac/safety-explosion-protection/safety-components/safety-controller/fs1a-series 、FS1A-C21S https://www.idec.com/ja-jp/safety-explosion-protection/safety-components/safety-controller/fs1a-series/fs1a-c21s
- [I3] FS1B 取扱説明書 B-2244 https://product.idec.com/PDF/B-2244-0-FS1B-C31S-MAN-E-01.pdf
- [I4] HR6S カタログ https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/8393/EP17960HR6S.pdf
- [I5] HR6S-AF 取扱説明書 HR9Z-B2192 https://www.farnell.com/datasheets/3204342.pdf
- [I6] XW カタログ（写し） https://static.chipdip.ru/lib/530/DOC014530132.pdf
- [I7] IDEC 制御用操作スイッチ カタログ（XW / XA / 銘板） https://docs.rs-online.com/9827/A700000008625032.pdf
- [I8] セーフティインタロックスイッチ カタログ HS9Y-B100-0 https://www.wolfautomation.com/content/idec-safety-interlockswitches-catalog.pdf
- [I9] HS5E 取扱説明書 https://media.onlinecomponents.com/productfiles/mf-id/hs5e-d7y401-g.pdf
- [I10] HE1G-L データシート https://media.onlinecomponents.com/productfiles/mf-id/id-he1gl21sm.pdf
- [I11] RF1V / SF1V カタログ EP1260-0 https://www.farnell.com/datasheets/1475128.pdf
- [I12] KGNW 操作ボックス https://baoanjsc.com.vn/TaiLieu/Control-stations-IDEC-KGNW-series-CATALOG-5571.pdf
- [I13] HS6B https://www.farnell.com/datasheets/2049062.pdf
- [I14] HS5L https://www.waysafe.co.uk/wp-content/uploads/2024/05/SD00232_Rev-0_-IDEC-HS5L-Series-Interlock-Technical-Data-Sheet.pdf
- [I15] HE5B https://docs.rs-online.com/72e8/0900766b812dc69e.pdf

### Pilz ほか
- [P1] Pilz 技術カタログ PNOZ X / PNOZsigma 1002173-EN-06 https://www.farnell.com/datasheets/3763993.pdf （X2.8P p.88〜、X3P p.126〜、s3 p.573〜、s4 p.588〜）
- [P2] PNOZ m B0 マニュアル https://www.manualsdir.com/manuals/745226/pilz-pnoz-m-b0.html
- [X1] パナソニック SF4D カタログ https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/8440/sf4d_e_cata.pdf
- [X2] IDEC SE4D https://www.crossco.com/wp-content/uploads/2024/05/IDEC-safety-light-curtains-catalog.pdf
- [X3] Schneider TeSys D ミラー接点 https://www.se.com/ca/en/faqs/FA126437
- Phoenix Contact PSR-SCP-24UC/ESAM4/3X1/1X2/B https://static.chipdip.ru/lib/177/DOC029177907.pdf
