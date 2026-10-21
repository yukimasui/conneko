# 安全機器・安全コントローラーの調査と実装一覧

生産設備で使われる安全関連機器（安全コントローラー、セーフティリレー、非常停止、安全ドアスイッチ、
ライトカーテン、レーザスキャナ、イネーブルスイッチ、強制ガイドリレー、ミラー接点付き電磁接触器など）について、
公式カタログ・取扱説明書・外形図・端子配列図を調べ、`src/devices/catalog/` に機器定義として実装した。
安全回路の型とチェックは `docs/device-authoring.md`（安全機器）を参照。まだ表せない点は `docs/known-limitations.md`。

## 1. 端子の電気的定義の方針

書き方の仕様は `docs/device-authoring.md` の「接点と出力」「信号の種類」「安全機器」。安全機器では次のように定義した。

| 端子の種類 | role | 機能・チャンネルなど |
|---|---|---|
| 安全コントローラー・セーフティリレー・センサーの電源（A1/A2、V1/G1、+24V/0V、V+/V−、茶/青） | `input` + `accepts`（DC、`+` / `-`） | 電圧範囲は各機種の許容範囲。消費電流は `loadCurrent` |
| FG / PE / FE | `ground` | ライトカーテンの FE は未配線でも警告しないよう `optional` |
| テスト出力（To0、T0、T11、S11、X1 など） | `supply`（DC24V `+`、`kind: 'test'`） | `function: 'test-output'`、`channel`。電流の上限が分かる機種は `limitCurrent` |
| 安全出力 OSSD（So0、Q1、Y0、S14、ライトカーテンの OSSD1/OSSD2 など） | `supply`（DC24V `+`、`kind: 'ossd'`、`limitCurrent`） | `function: 'ossd'`、`channel`。電源とみなすので接触器のコイルを直接駆動できる |
| 安全入力（Si0、T12、S12、I1、X0、GS の安全入力 1/2 など） | `signal` | `function: 'safety-input'`、`channel` |
| 安全出力のリレー接点（13-14 など） | `signal` + `links`（`switch: 'NO'`） | `function: 'safety-contact'` |
| リセット・EDM（フィードバック）・ミューティング・補助出力 | `signal` | `function: 'reset'` / `'edm'` / `'muting'` / `'aux-output'`。PNP の補助出力には `signal: { dir: 'out', kind: 'pnp' }` |
| スイッチの接点（非常停止・ドアスイッチ・リミットスイッチ） | `signal` + `links` | b 接点は `switch: 'NC'` + `directOpening: true`（⊕）、a 接点は `switch: 'NO'` |
| 電磁接触器の接点 | `line` / `load`・`signal` + `links` | 主接点・補助 a 接点は `switch: 'NO'`、補助 b 接点は `switch: 'NC'` + `linked: 'mirror'` |
| 強制ガイドリレーの接点 | `signal` + `links` | すべての接点に `linked: 'force-guided'` |
| 電磁接触器・強制ガイドリレーのコイル | `input` + `accepts` | DC コイルは極性あり（A1/1 が +） |
| 電磁ロックのソレノイド | `input` + `accepts` | スプリングロック式（通電で解錠）は + 側だけに `function: 'unlock-solenoid'` |
| ケーブル引出しの機器 | 芯線の先端ごとに端子 | id は機能名（`+24V`、`OSSD1` など）、`label` と SVG に線色を書く |

- 2 チャンネルの組は `safetyChannels` に書いた。入力の組は「テスト出力（source）→ 接点 → 安全入力（input）」で、
  セーフティリレーは端子の決まった組（T11→T12 / T21→T22 など）、設定で入力を割り付ける安全コントローラー（GC、G9SP、MELSEC-WS、FS1B）は
  データシートの配線例に沿った既定の組（偶数・奇数の入力と、組ごとのテスト出力）を書き、`configurable: true`（使い方は設定・プログラムで決まるので、片側配線などは注意にとどめる）、
  `mode: ['nc-nc', 'ossd']`（b 接点 2 回路とライトカーテンなどの OSSD のどちらも受ける）にした。G9SE も OSSD を直接受けられるので `['nc-nc', 'ossd']`。
  HR6S-AF は FUNCTION スイッチで入力の種類が変わるため、`safetyChannels` をパラメータの関数にした（1〜3: テストパルス付きの接点、4〜6: PNP 出力・OSSD）。
- 出力の組は、安全コントローラーは So0/So1 のような 2 点 1 組、セーフティリレーは接触器 2 台を駆動する 13-14・23-24（33-34 以降は増設・状態入力用として組に入れず、
  使わなくても警告しない。G9SE-221-T05 はオフディレー 37-38・47-48 を別の組）。
- リセットとフィードバックを兼ねる端子（PNOZ の S34、F3SG-SR の黄線 RESET/EDM）は `function: ['reset', 'edm']`。
  G9SA-301 の A・B は短絡すると自動リセットになるので `reset-auto`。
- 安全性能は `safety` に書いた。非常停止・ドアスイッチ・リミットスイッチ・接触器・強制ガイドリレーは単体では PL が決まらない
  （B10d と回路の構成で決まる）ため、準拠規格（`standards`）だけを書いた。
- 電源チェックでは、接点はすべて閉じた状態（動作中）で電源が届くかを見るため、`+24V → 13-14 → 接触器コイル A1` や `OSSD1 → コイル A1` と配線すればコイルに電源が届いたと判定される。
- 代表的な安全回路を組んだときに誤検出しないこと、上の項目がそろっていることを `src/check/safetyDevices.test.ts` で確認している。

### 1.1 機器ごとの対応

| 機器 | テスト出力 → 安全入力（組） | 安全出力（組） | EDM / リセット ほか | 安全性能 |
|---|---|---|---|---|
| `keyence.gc-1000` | To0/To1・To2/To3 → Si0/Si1 … Si14/Si15（8 組、組ごとに交互。configurable、b 接点・OSSD） | So0/So1・So2/So3・So4/So5（OSSD 500mA） | Ao0〜3 は aux-output。EDM は任意の Si | PL e / Cat.4 / SIL3 |
| `keyence.gc-1000r` | 同上（Si0〜Si13、7 組） | So0/So1・So2/So3、SRo 13/23（接点） | 同上 | PL e / Cat.4 / SIL3 |
| `keyence.gc-s84` | To0/To1 → Si0/Si1 … Si6/Si7（4 組） | So0/So1・So2/So3 | | PL e / Cat.4 / SIL3 |
| `omron.g9sp-n10s` | T0/T1・T2/T3 → Si0/Si1 … Si8/Si9（5 組） | So0/So1・So2/So3（0.8A） | O0〜3 は aux-output（PNP）。テスト出力 T0/T1 60mA、T2 30mA、T3 300mA | PL e / Cat.4 / SIL3 |
| `mitsubishi.ws0-cpu0-xtio` | X1/X2 → I1/I2 … I7/I8（4 組） | Q1/Q2・Q3/Q4（2A） | テスト出力 120mA | PL e / Cat.4 / SIL3 |
| `idec.fs1b-c31s` | Tn → Xn（X0/X1 … X14/X15、7 組） | Y0/Y1・Y2/Y3（500mA） | X16/X17 は reset、Y4〜Y16 は aux-output | PL e / Cat.4 / SIL3 |
| `omron.g9se-201` / `-401` / `-221-t05` | T11 → T12 / T21 → T22 | 13・23、221-T05 はオフディレー 37・47 を別の組 | T31 edm、T32/T33 reset（手動・自動は配線で決まる）、X1 aux-output。入力は b 接点・OSSD の両方 | PL e / Cat.4 / SIL3 |
| `omron.g9sa-301` | T11 → T12 / T21 → T22 | 13・23 | T31 edm、T32 reset、A・B reset-auto、41-42 は b 接点の aux-output | PL e / Cat.4 |
| `omron.g9sa-th301` | 押ボタンごとに `nc-no`（T12 → T11 b 接点 / T12 → T13 a 接点、T22 → T21 / T22 → T23） | 13・23 | T31/T32 edm | PL e / Cat.4（タイプ IIIC） |
| `pilz.pnoz-x2-8p` / `pilz.pnoz-s4` | S11 → S12 / S21 → S22 | 13・23 | S34 reset + edm（スタート回路とフィードバック）、41-42・Y32 は aux-output | PL e / Cat.4 / SIL3 |
| `idec.hr6s-af` | FUNCTION 1〜3: S11 → S12 / S21 → S22、4〜6: S12・S22 に PNP 出力・OSSD | 13・23 | Y1 edm、Y2 reset、Z1 aux-output | PL e / Cat.4 / SIL3 |
| `omron.g9sx-ns202-rt` | D1 → D40A（直列）→ D2（1 組） | S14/S24（OSSD 0.8A） | T31 edm、T32/T33 reset、X1/X2 aux-output | PL e / Cat.4（D40A と組み合わせると PL d / Cat.3） |
| `keyence.gl-r.receiver` | | OSSD1/OSSD2（500mA） | RESET reset、EDM edm、AUX aux-output | タイプ4 / PL e / Cat.4 / SIL3 |
| `omron.f3sg-sr.receiver` | | OSSD1/OSSD2（300mA） | RESET/EDM 兼用線は reset + edm、MUTE A/B muting、AUX aux-output | タイプ4 / PL e / Cat.4 / SIL3 |
| `keyence.sz-v32` | | OSSD1/OSSD2（500mA、PNP 設定時） | 入力1 reset、入力2 edm、AUX1/2 aux-output | タイプ3 / PL d / Cat.3 / SIL2 |
| `keyence.gs-11p5` | 安全入力 1/2（`mode: 'ossd'`。前段の OSSD または +24V） | OSSD1/OSSD2（150mA） | AUX aux-output | PL e / Cat.4 / SIL3 |
| `omron.d40a-1c5` | 白 → 黒を半導体出力（`switch: 'output'`）として G9SX-NS のループをたどる | | 黄 aux-output | PL d / Cat.3（G9SX-NS と組み合わせ） |
| `idec.xw1e-*`、`idec.hs5d-02rn`、`omron.d4n-4c20`、`omron.er6022-021m`、`idec.hs5e-a4403-g` | b 接点は NC・直接開路、a 接点は NO | | HS5E の A2(+) は unlock-solenoid | 準拠規格のみ |
| `idec.he1g-l21sm` | イネーブル接点 1-2・3-4 は NO（ポジション 2 で閉）+ 直接開路、モニタ 5-6 は NC・直接開路 | | | 準拠規格のみ |
| `mitsubishi.sd-t12.dc24v`・`sd-t21.dc24v`・`s-t12.ac200v` | 主接点・a 接点 NO、b 接点 NC・ミラー接点 | | | 準拠規格のみ |
| `omron.g7sa-3a1b`、`idec.rf1v-2a2bl-d24` | 全接点 強制ガイド | | | 準拠規格のみ |

## 2. 実装した機器（34 種）

### 2.1 安全コントローラー

| type | 型式 | 要点 | 主な出典 |
|---|---|---|---|
| `keyence.gc-1000` | KEYENCE GC-1000 | Si0〜15、To0〜3、So0〜5（PNP 500mA）、Ao0〜3、+24V/0V、Ethernet（RJ45）。黒い筐体に黄色の帯、カラー液晶、プッシュイン 2 列×8 段×2 | [K1][K2][K3] |
| `keyence.gc-1000r` | KEYENCE GC-1000R | GC-1000 の Si14/15・So4/5 が N.C.、安全リレー出力 SRo 13/23/33-14/24/34（上から 13 23 33 14 24 34）。幅 85mm | [K2] |
| `keyence.gc-s84` | KEYENCE GC-S84 | GC の安全入出力増設ユニット（幅22.2mm）。Si0〜7、To0/To1、So0〜3、+24V/0V（2 列 × 8 段） | [K2] |
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
| `omron.g9sx-ns202-rt` | オムロン G9SX-NS202-RT | 非接触ドアスイッチ（D40A/D40Z）専用コントローラ。T31 T32 T33 D3 / D1 D2 X1 A1 / T41 T42 X2 A2 / S14 S24 L1 D4。D3/D4 は A1/A2 と内部導通（スイッチ用電源）として定義 | [O10] |

### 2.3 入力側の安全機器

| type | 型式 | 要点 | 主な出典 |
|---|---|---|---|
| `idec.xw1e-bv402mr` | IDEC XW1E-BV402MR | Φ40 キノコ形 非常停止、2b（21-22・41-42、直接開路）。黄色の非常停止銘板付きで描く | [I6][I7] |
| `idec.xw1e-lv402q4mr` | IDEC XW1E-LV402Q4MR | 上の照光形。LED X1(+)/X2(−) DC24V 15mA | [I6][I7] |
| `idec.hs5d-02rn` | IDEC HS5D-02RN | 小形インタロックスイッチ（舌片式）。主回路 11-12・モニタ 21-22 ともに直接開路の b 接点 | [I8] |
| `idec.hs5e-a4403-g` | IDEC HS5E-A4403-G | 電磁ロック式（スプリングロック）、表示灯付き、ケーブル 8 芯。A2(+)白/A1(−)黒、主回路 11(青)-42(青白)、扉モニタ 23-24、ロックモニタ 53-54 | [I8][I9] |
| `idec.he1g-l21sm` | IDEC HE1G-L21SM | グリップ形イネーブルスイッチ。3 ポジション接点 1-2・3-4、モニタ 5-6 | [I10] |
| `omron.er6022-021m` | オムロン ER6022-021M | ロープ式非常停止（黄色）。11-12・21-22（b）、33-34（a）、青いリセットボタン | [O5] |
| `omron.d40a-1c5` | オムロン D40A-1C5 | 非接触ドアスイッチ（黒い樹脂、表示灯 赤/黄）。茶 + (D3)、青 − (D4)、白 入力 (D1)、黒 出力 (D2)、黄 補助出力。G9SX-NS と組み合わせる | [O10] |
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
| `mitsubishi.s-t12.ac200v` | 三菱電機 S-T12 AC200V 1a1b | 交流操作。端子配列は SD-T12 と同じ（コイル A2・A1 は極性なし）。21-22 はミラー接点。リレー出力の安全リレー（G9SA、PNOZ、GC-1000R）で AC200V のコイルを開閉する用途 | [M2][M4] |
| `omron.g7sa-3a1b` | オムロン G7SA-3A1B DC24V + P7SA-10F-ND | 強制ガイド式リレー（EN 61810-3）。上段 44 33 34、左列 43 24 23 12、下段 11 A2(−) A1(+) | [O8] |
| `idec.rf1v-2a2bl-d24` | IDEC RF1V-2A2BL-D24 + SF1V-4-07L | フォースガイドリレー（EN 50205）。通し番号 1(+) 2(−) コイル、3-4・5-6 b 接点、7-8・9-10 a 接点 | [I11] |

## 3. 調査したが実装していないもの

| 機器 | 理由 |
|---|---|
| オムロン NX-SL3300 / NX-SIH400 / NX-SOD400 など | NX バスのユニット構成（CPU・カプラ・I/O ユニット）で単独では動かず、1 ノードで表しにくい。I/O ユニットは T0/T1・Si0〜・So0〜/IOG の端子名まで確認済み [O9] |
| Pilz PNOZmulti 2（PNOZ m B0） | 前面の端子の物理的な並びを確認できなかった [P2] |
| IDEC FS1A-C11S / C21S | 生産終了。端子名・配列は FS1B-C31S と同じなので FS1B で代表させた [I2][I12] |
| KEYENCE GC-S16 / GC-A16 / GC-S1R（GC 増設ユニット） | 端子配列は確認済み（カタログ p.21: GC-S16 は Si0〜15・To0〜3、GC-A16 は Ao0〜15、GC-S1R は SRo 13/23/33/14/24/34）。代表として GC-S84 を実装 [K2] |
| KEYENCE GL-V、GS-M、GS-51/71（ロック付き） | GL-V の M12 5 ピンの割付、GS-M・GS ロックタイプの外形が公開資料で確認できなかった [K12][K5] |
| オムロン D40Z（非接触ドアスイッチ、PL e） | D40A と同じく G9SX-NS 専用。補助出力が黄・灰の 2 本（PNP/NPN 両対応）。2024 年に生産終了予定とされているため D40A を実装 [O11] |
| オムロン OS32C（レーザスキャナ） | 線色は確認済み（白 +24V・茶 0V と一般と逆、赤/黄 OSSD A/B、茶白 EDM など）。外形・表示部の見た目の資料が不足 [O12] |
| パナソニック SF4D / IDEC SE4D（ライトカーテン） | 線色は確認済み（茶 +V、青 0V、黒/白 OSSD、水色 極性設定、薄紫 EDM など）。優先度を下げた [X1][X2] |
| オムロン A22E-M-02 / A22NE（非常停止） | A22E は接点ブロックごとに 1-2 の同じ番号で端子 ID が重複する。A22NE 系の 11-12/21-22 品は外形の確認が不足 [O14] |
| IDEC XA1E（Φ16 非常停止） | はんだ・PCB 端子のみで盤配線の作図対象になりにくい [I7] |
| オムロン D4NS / D4SL-N / D4NL、IDEC HS6B / HS5L | 接点番号・線色は確認済み（D4SL-N: E1(+)=9・E2(−)=10、10 ピンケーブルの線色、HS5L: A2/A1・11-12・41-42 など）。代表として IDEC HS5D・HS5E を実装 [O15][O16][O17][I13][I14] |
| IDEC HE5B / HE2B（パネル取付イネーブル） | HE5B ははんだ端子（NO1/C1/NC1・NO2/C2/NC2）。HE2B の端子番号が未確認 [I10][I15] |
| 両手操作押ボタンボックス | 国内メーカーの具体的な製品の端子資料が見つからなかった。コントローラ G9SA-TH301 は実装済み |
| セーフティマット（オムロン UMA ほか） | 4 線式の線色とピン機能を確認できなかった [O18] |
| 三菱電機 補助接点ユニット UT-AX2/AX4 | 端子配列は確認済み（UT-AX4 2a2b は 63・71・81・93 / 64・72・82・94、NC 側はミラー接点）。接触器の前面に取り付ける付属品で、単独ノードにしにくい [M2] |
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
- **G9SX-NS の D3/D4**: データシートの「内部電源回路は非絶縁」との記載と配線例から、D3/D4 を A1/A2 と内部導通する端子（スイッチ用電源）として定義した。
- **FS1B-C31S の EDM**: ロジックによって使う入力が変わる（FS1A カタログの例では T14 → 接触器 b 接点 → X14）。
- **入力回路の電源側の極性**: G9SA の T21、PNOZ の S21 など CH2 側の電源端子は、実機では CH1 と違う電位のことがある（横絡検出のため）。
  図ではどちらも DC24V `+` のテスト出力として定義した（接点を通って戻す配線であれば判定は変わらない）。
- **G9SA-TH301 の押ボタン入力**: 共通側 T12/T22 をテスト出力、b 接点側・a 接点側（T11・T13 / T21・T23）を安全入力とした。内部の向きは未確認。
- **安全コントローラーの入力の組**: GC・G9SP・MELSEC-WS・FS1B は設定で入力の組・種類・テスト出力を変えられる。`safetyChannels` は配線例に沿った既定の組で、
  `configurable` にしてあるので、既定と違う使い方の指摘は注意（info）にとどまる。
- **G9SE のリセット**: インストラクションシートでは、手動リセットは T31 → リセットスイッチ → 接触器の b 接点 → T32・T33 を +24V、
  自動リセットは T31 → 接触器の b 接点 → T33・T32 を +24V。どちらの端子も配線するため `reset-auto` は使わず、T32・T33 とも `reset` にした
  （リセット入力のループに押しボタンの a 接点がなければ自動リセットと判定される）。G9SX-NS も同じ。
- **HE1G のイネーブル接点**: a 接点だが、ポジション 3 への握り込みで強制的に開く（IEC 60947-5-8）ため `directOpening: true` を付けた。
- **SZ-V32 の OSSD**: PNP / NPN を設定で選ぶ機種で、図は PNP（`+` を出す）として定義した。
- **G9SP のテスト出力の電流**: データシート F42I-E-05 は「0.3A max. per output（詳細はユーザーマニュアル）」とし、オムロンの仕様ページは T0/T1 60mA・T2 30mA・T3 300mA としている。小さいほうの値を使った [O1][O21]。
- **FS1B のテスト出力の電流**: 確認できなかったため `limitCurrent` を書いていない。
- **G9SE-221-T05 のオフディレー時間**: インストラクションシートの 16 段階（0、0.1〜0.8、1、1.5、2、2.5、3、4、5 秒。工場出荷時は 0）を `params.offDelay` の選択肢にした。既定値は従来どおり 1 秒。
- **B10d**: 非常停止・ドアスイッチ・接触器・強制ガイドリレーのデータシート（[I8][I10][O6][O8][I11][M2]）に B10d の記載が見つからなかったため、`safety.b10d` は書いていない。

## 5. 出典

### KEYENCE
- [K1] GC シリーズ メインコントローラ 取扱説明書 96M16567（第三者サイトの写し） https://dentechindustrial.com/wp-content/uploads/2025/10/Keyence-MainController.pdf
- [K2] GC シリーズ カタログ（端子配列 p.21） https://5.imimg.com/data5/SELLER/Doc/2025/7/530204158/CC/TD/RS/94356387/keyence-gc-1000-safety-controller.pdf
- [K3] GC シリーズ 仕様（テスト出力 100mA、安全出力 500mA、PL e / Cat.4 / SIL3） https://www.keyence.com/products/safety/safety-controller/gc/specs/
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
- [O21] G9SP 仕様（テスト出力の定格電流） https://www.ia.omron.com/products/family/2937/specification.html
- [O22] G9SE インストラクションシート（オフディレー時間の段階、安全性能） https://files.omron.eu/downloads/latest/manual/en/4022078_g9se-201_g9se-221-t_instruction_sheet_en.pdf

### 三菱電機
- [M1] 安全コントローラ ユーザーズマニュアル SH-080855ENG https://www.mitsubishielectric.com/dl/fa/document/manual/plc/sh080855eng/sh080855engm.pdf
- [M2] MS-T シリーズ カタログ L(NA)02030ENG-K https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l02030/L(NA)02030ENG-K.pdf （SD-T12 p.20/23/63、SD-T21 p.20/64、S-T12 p.18/57、UT-AX p.36/37/73）
- [M3] SD-T シリーズ 発売案内 L02030-D https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l002030/L02030D.PDF
- [M4] MS-T 技術資料 L(NA)02031ENG（ミラー接点の TÜV 認証 p.282） https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/lvsw/l02031eng/L(NA)02031ENG-L_21B.pdf
- [M5] MELSEC-WS セレクションガイド（テスト出力 120mA） https://mx.mitsubishielectric.com/fa/es/~/media/e00bcacb905b44049242adcadcfaab06.pdf

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
