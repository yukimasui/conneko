# IAI（アイエイアイ）機器の調査と実装状況

IAI のロボシリンダー・単軸ロボット用コントローラーと、その配線に使うケーブル・電源、コントローラーにつなぐアクチュエーター本体の調査結果と Conneko での実装状況をまとめる。
調査は 2026-10 時点の IAI 公式サイトで公開されている総合カタログ（CJ9005。アクチュエーターは 2026 年版の CJ9006 第 3・4・8 巻）と各製品の取扱説明書（PDF）による。
資料で確かめられなかった点は「推定」と書いた。

- 機器定義: `src/devices/catalog/iai-*.ts`（1 機器 1 ファイル）と `generic-mil-terminal-block-50p.ts`
- IAI 機器の共通部品: `src/devices/iai/`
  - `parts.ts` 描画部品（パネル・コネクター・プラグ・LED など）、DC24V の受電条件、`stopLoop`（非常停止ループの安全チャンネル）
  - `pio.ts` PIO のピン定義（NPN / PNP）と出力の内部経路、ポジショナーの PIO パターン、SEL コントローラーの入出力ポート
  - `fieldbus.ts` I/O 種類の記号とフィールドネットワークのコネクター
  - `cb-series.ts` PCON/ACON/DCON-CB・CFB・CA・CFA の共通の作り
  - `cyb-series.ts` PCON/ACON/DCON-CYB・PLB・POB の共通の作り
  - `rcon.ts`・`rcon-gw.ts` R-unit（RCON・REC）の連結ユニット
  - `xsel.ts`・`xsel-front.ts` XSEL のシステム I/O・PIO ボードと正面の作り
  - `psel.ts` PSEL / ASEL の共通の作り
  - `pio-cable.ts` 片側バラ線の PIO ケーブル（IAI の 10 色＋ドットマーク）
  - `psa24.ts` 電源 PSA-24
  - `actuator.ts` アクチュエーター本体の描画部品（スライダー・ロッド・ケーブルジョイントコネクター）、コネクターの種類の対応、
    AC サーボのエンコーダーコネクター（26 ピン）のピン定義（コントローラー側・アクチュエーター側）
  - `ec.ts` エレシリンダーの電源・I/O コネクター（12 ピン）のピン・出力の内部経路と CB-EC-PWBIO の線色
- 整合性・電気チェックのテスト: `src/devices/iai.test.ts`

## 実装済みの機器（IAI 45 定義＋汎用 1）

| type | 型式 | 分類（category） | 主な出典 |
|---|---|---|---|
| **ポジショナー（CB 世代）** | | | |
| `iai.pcon-cb` | PCON-CB/CGB | control | CJ9005「PCON-CB」、MJ0342 |
| `iai.pcon-cfb` | PCON-CFB/CGFB | control | CJ9005、MJ0342 |
| `iai.acon-cb` | ACON-CB/CGB | control | CJ9005「ACON-CB」、MJ0343 |
| `iai.dcon-cb` | DCON-CB/CGB | control | CJ9005「DCON-CB」、MJ0343 |
| **ポジショナー（CA 世代、旧製品）** | | | |
| `iai.pcon-ca` | PCON-CA | control | MJ0289 |
| `iai.pcon-cfa` | PCON-CFA | control | MJ0289 |
| `iai.acon-ca` | ACON-CA | control | MJ0326 |
| `iai.dcon-ca` | DCON-CA | control | MJ0326 |
| **ポジショナー（小型 CYB）** | | | |
| `iai.pcon-cyb` | PCON-CYB/PLB/POB | control | CJ9005、MJ0353 |
| `iai.acon-cyb` | ACON-CYB/PLB/POB | control | CJ9005、MJ0354 |
| `iai.dcon-cyb` | DCON-CYB/PLB/POB | control | CJ9005、MJ0354 |
| **ポジショナー（AC サーボ）** | | | |
| `iai.scon-cb` | SCON-CB/CGB | control | CJ9005「SCON-CB」、MJ0340 |
| `iai.scon2` | SCON2-CG | control | CJ9005「SCON2」、MJ0458 |
| **多軸ポジショナー** | | | |
| `iai.mcon-c` | MCON-C/CG | control | MJ0341 |
| **R-unit（RCON・REC）** | | | |
| `iai.rcon-gw` | RCON-GW/GWG | control | CJ9005「RCON」、MJ0384 |
| `iai.rec-gw` | REC-GW | control | MJ0394 |
| `iai.rcon-pc` | RCON-PC-2/PC-1/PCF-1 | control | MJ0384 |
| `iai.rcon-ac` | RCON-AC | control | MJ0384 |
| `iai.rcon-dc` | RCON-DC | control | MJ0384 |
| `iai.rcon-ec` | RCON-EC-4 | control | MJ0384 |
| `iai.rcon-np` | RCON-NP/PN | control | MJ0384 |
| `iai.rcon-ps2` | RCON-PS2-3 | control | MJ0384 |
| `iai.rcon-sc` | RCON-SC-1 | control | MJ0384 |
| `iai.rcon-tr` | RCON-GW-TR（ターミナルユニット） | control | MJ0384 |
| `iai.rsel` | RSEL-G | plc | CJ9005「RSEL」、MJ0392 |
| **プログラムコントローラー** | | | |
| `iai.msel` | MSEL | plc | CJ9005「MSEL」、MJ0336 |
| `iai.xsel-ra` | XSEL-RA/SA/RAX/SAX | plc | CJ9005「XSEL-RA/SA」、MJ0359 |
| `iai.xsel-p` | XSEL-P/Q（旧製品） | plc | MJ0148 |
| `iai.xsel2` | XSEL2-TS/TSX | plc | CJ9005「XSEL2」、MJ0478 |
| `iai.psel` | PSEL-C/CS（旧製品） | plc | MJ0172 |
| `iai.asel` | ASEL-C/CS（旧製品） | plc | MJ0165 |
| **電源** | | | |
| `iai.psa-24` | PSA-24 | power-supply | MJ0379 |
| `iai.psa-24l` | PSA-24L（ファン付き） | power-supply | MJ0379 |
| **ケーブル** | | | |
| `iai.cb-pac-pio` | CB-PAC-PIO（40 極 HIF6、片側バラ線） | terminal | MJ0342 |
| `iai.cb-pad-pio` | CB-PAD-PIO（CYB 用 20 極、片側バラ線） | terminal | MJ0353 |
| `iai.cb-x-pio` | CB-X-PIO（MIL 50 極、片側バラ線） | terminal | MJ0359 |
| `iai.cb-ds-pio` | CB-DS-PIO（PSEL/ASEL 用 34 極、片側バラ線） | terminal | MJ0172 |
| `iai.cb-sc-sto` | CB-SC-STO（SCON-CB の STO 用） | terminal | MJ0340 |
| `iai.cb-ec-pwbio` | CB-EC-PWBIO（エレシリンダーの電源・I/O、片側バラ線） | terminal | MJ3816 |
| **アクチュエーター（ロボシリンダー）** | | | |
| `iai.rcp6-sa` | RCP6-SA4C/SA6C/SA7C/SA8C（スライダー、パルスモーター） | load | CJ9006 第 3 巻、MJ3749 |
| `iai.rcp6-ra` | RCP6-RA4C/RA6C/RA7C/RA8C（ロッド、パルスモーター） | load | CJ9006 第 4 巻、MJ3751 |
| `iai.rca2-rn` | RCA2-RN3NA/RN4NA（細小型ロッド、24V AC サーボ） | load | CJ9006 第 4 巻、MJ3671 |
| `iai.rcd-ra1da` | RCD-RA1DA（ミニシリンダー、DC ブラシレス） | load | CJ9006 第 4 巻、MJ3721 |
| `iai.rcs4-sa` | RCS4-SA4C/SA6C/SA7C/SA8C（スライダー、200V AC サーボ） | load | CJ9006 第 3 巻、MJ3769 |
| **エレシリンダー（コントローラー内蔵）** | | | |
| `iai.ec-s6` | EC-S6/S7（スライダー、パルスモーター） | load | MJ3793、MJ3816 |
| **汎用** | | | |
| `generic.mil-terminal-block.50p` | MIL 50 極 変換端子台 | terminal | XSEL の PIO ボード用 |

系列ごとの数: CB 世代ポジショナー 4、CA 世代 4、CYB 3、AC サーボポジショナー 2、多軸ポジショナー 1、R-unit 11（RSEL を含む）、
プログラムコントローラー 6、電源 2、ケーブル 6、アクチュエーター 5、エレシリンダー 1、汎用 1。

## 共通の方針

### 分類（category）

- **ポジショナー（PCON/ACON/DCON/SCON・MCON・R-unit のユニット）は `control`**。PLC の I/O から見ると「PLC につながる現場側の機器」で、
  PLC の I/O 割付けツール（`plc` は現場側の機器から外れる）で PIO の入出力を相手として選べるようにするため。
- **プログラムコントローラー（MSEL・XSEL・PSEL・ASEL・RSEL）は `plc`**。自分の入出力ポート（入力 000〜、出力 300〜）を持ち、
  センサー・電磁弁を直接つなぐ「小さな PLC」として使われるため。ピンのラベルは `IN000（5A）`・`OUT300（1B）` のようにポート番号を先に書く。
- ケーブル・変換端子台は `terminal`、PSA-24 は `power-supply`。
- **アクチュエーター本体（ロボシリンダー）・エレシリンダーは `load`**（モーターと同じ現場側の負荷）。

### PIO（パラレル I/O）

- コントローラーの入力は `signal: { dir: 'in', kind: 'dc', common }`。common は NPN 仕様なら P24（+24V）ピン、PNP 仕様なら N（0V）ピン。
- 出力は `signal: { dir: 'out', kind: 'npn' | 'pnp' }` と、出力 → 基準（NPN は N、PNP は P24）への `switch: 'output'` の内部経路
  （定格はポジショナー 50mA/点、MSEL・PSEL の標準 I/O 100mA/点）。
- P24・N ピンは DC24V の受電端子（`role: 'input'`）。NPN / PNP は I/O 種類のパラメーター（`io`）で切り替える。
- これで「PLC の出力（NPN）→ PNP 仕様のポジショナーの入力」のような組み合わせは `signal-polarity` として指摘される（テストあり）。
- ピン番号: IAI の PIO コネクター（HIF6 ハーフピッチ 40 極など）は 1A〜20A・1B〜20B と書く。Conneko のピンID は 2 列コネクターの物理的な並びに合わせ
  `nA → CN#(2n−1)`、`nB → CN#2n` とした（MIL 標準の千鳥番号と同じ考え方）。XSEL の PIO ボードは MIL 50 極で 1〜50 のまま。
- PCON/ACON/DCON-CB の PIO は、PIO パターン（0〜7）のパラメーターで信号名（PC1・CSTR・PEND など）を変える。

### PIO の接続（ケーブル）

- IAI の 40 極 PIO コネクターはハーフピッチ（HIF6）で、汎用の MIL 変換端子台とは直接つながらない。IAI 純正の片側バラ線ケーブル
  （CB-PAC-PIO など）をコネクターの相手として定義し、芯線を端子（1A〜20B）として出した。線色は IAI の 10 色（茶・赤・橙・黄・緑・青・紫・灰・白・黒）
  とドットマークの数（芯線の印字の「-1」「-2」…）で描く。
- XSEL の PIO ボードは MIL 50 極なので、CB-X-PIO のほか汎用の MIL 50 極変換端子台（`generic.mil-terminal-block.50p`）を追加した。
- PSEL / ASEL の 34 極 I/O コネクターは形式を資料で確かめられなかったため、専用の種類（`IAI-DS-IO34`）にして付属ケーブル CB-DS-PIO とだけつながるようにした（推定）。

### フィールドネットワーク

- I/O 種類の記号は型式どおり（DV・CC・CIE・PR・CN・ML・ML3・EC・EP・PRT）。ポートの端子ID は I/O 種類を変えても `NET1`・`NET2` にそろえ、
  印字（IN / OUT、P1 / P2 など）はラベルに書く。EtherCAT は NET1 = IN、NET2 = OUT。
- RJ-45 などの通信ポートには `connector.protocols` を書くので、EtherCAT のポジショナーを KV-8000 の Ethernet（EtherNet/IP）につなぐと `protocol-mismatch`（テストあり）。
- DeviceNet・CC-Link は 5 極の差込みプラグを個別の端子（V+・CAN_H・SHIELD・CAN_L・V−、FG・SLD・DG・DB・DA）として描く。DeviceNet の V+・V− は DC11〜25V の受電端子。

### 非常停止・安全

- PCON/ACON/DCON-CB の `EMG-` は「+24V を加えると運転可」の DC24V 受電端子（`function: 'safety-input'`）。
- ティーチングボックスの非常停止接点（S1-S2、EMG1+/EMG1− など）は、TB 未接続時に内部で短絡（またはダミープラグ）されるため、Conneko では**常に閉の導通**として扱った。
  外側に入れた非常停止スイッチの接点の種類（b 接点か）をチェックできるようにするため。
- 内蔵 24V から非常停止スイッチを通して戻す停止入力（XSEL の EMGin・ENBin、MSEL の EMGIN・ENBIN、PSEL の EMG−・ENB− など）は、内蔵 24V 出力を
  `supply.kind: 'test'`、戻りの入力を `role: 'signal'`＋`function: 'safety-input'` にし、`stopLoop()`（mode `nc-nc`、configurable）の安全チャンネルを付けた。
  ループに a 接点（例: 電磁接触器の 13-14）を入れると `estop-not-nc` の注意になる（テストあり）。
- SCON-CB の STO 仕様・SCON2・RCON-SC の STO（/SRI1+・/SRI2+）は 2 チャンネルの安全入力。CB-SC-STO を通して安全コントローラーの OSSD 2 本をつなぐとエラーなし、片側だけだと `safety-channel-partial`（テストあり）。

### アクチュエーターとコントローラーの接続

- アクチュエーターは、モーター側から出るコネクター（RCP6 は端面のコネクター、RCA2・RCD・RCS4 はケーブルの先のケーブルジョイントコネクター）を
  コネクター端子（`role: 'connector'`）にし、コントローラーの MPG（RCS4 は MOT と PG）とケーブルでつなぐ。専用ケーブル（CB-CAN-MPA など）は機器にせず、
  ケーブル（電線）の種類として扱う（両端のコネクターの形は違うが、Conneko では「専用ケーブルでつながる組み合わせ」を connector.kind で表す）。
- どのコントローラーにつながるかは、アクチュエーターの型式の「適応コントローラー」の記号で決まる。パラメーター `ctrl` で選び、connector.kind を切り替える。

| アクチュエーター | 適応コントローラー（記号） | connector.kind（mates） | 専用ケーブル |
|---|---|---|---|
| RCP6（35P/42P/56P） | P3: PCON-CB/CGB・PCON-CYB・MSEL・MCON | `IAI-RCP-MPG`（`IAI-MCON-MOT`） | CB-CAN-MPA |
| RCP6（35P/42P/56P） | P5: RCON・RSEL（RCON-PC） | `IAI-RCON-MPG` | CB-ADPC-MPA |
| RCP6 高推力（SA8C 56SP・RA8C 60P） | P4: PCON-CFB/CGFB・MSEL-PCF/PGF | `IAI-RCP-MPG-CFB` | CB-CFA3-MPA |
| RCP6 高推力 | P6: RCON-PCF・RSEL | `IAI-RCON-MPG-PCF` | CB-ADPC-MPA＋変換ケーブル CB-CAN-AJ002 |
| RCA2-RN | A3/A5: ACON-CYB・ACON-CB/CGB（ACON-CA・MCON） | `IAI-RCA-MPG`（`IAI-MCON-MOT`） | CB-APSEP-MPA（CNS 仕様は CB-CAN-MPA） |
| RCA2-RN | A6: RCON・RSEL（RCON-AC） | `IAI-RCON-MPG-AC` | CB-RCAPC-MPA（CNS 仕様は CB-ADPC-MPA） |
| RCD-RA1DA | D5: DCON-CB/CGB・DCON-CYB（DCON-CA・MCON） | `IAI-RCD-MPG`（`IAI-MCON-MOT`） | CB-CAN-MPA |
| RCD-RA1DA | D6: RCON・RSEL（RCON-DC） | `IAI-RCON-MPG-DC` | CB-ADPC-MPA |
| RCS4 モーター | T2: SCON-CB・XSEL-RA/SA・XSEL-P/Q（MSCON・SSEL） | `IAI-SCON-MOT`（`IAI-XSEL-MOT`） | CB-RCC-MA |
| RCS4 モーター | T4: SCON2・RCON（RCON-SC）・RSEL・XSEL2 | `IAI-SCON2-MOT`（`IAI-XSEL2-MOT`） | CB-RCC1-MA |
| RCS4 エンコーダー | T2・T4 共通 | `IAI-SCON-PG`（`IAI-XSEL-PG`）、26 ピン | CB-X1-PA |
| EC-S6/S7 | PIO（NPN / PNP） | `IAI-EC-PWRIO`、12 ピン（CB-EC-PWBIO とだけつながる） | CB-EC-PWBIO |
| EC-S6/S7 | ACR: RCON-EC | `IAI-EC13` | CB-REC-PWBIO |

- 合わせて変えたコントローラー（端子ID は変えていない）:
  - MSEL の MPG1〜4 は、PCF/PGF タイプ（高推力モーター対応）のとき `IAI-RCP-MPG-CFB`（PCON-CFB と同じ。P4）にした。
  - RCON-PC の RCON-PCF-1 の MPG1 を `IAI-RCON-MPG-PCF`（P6）にした（`Rcon24Spec.models[].motorKind`）。
  - SCON-CB・SCON2・XSEL-RA/SA・XSEL-P/Q・XSEL2 のエンコーダーコネクター（PG、PG1〜）を 26 ピンにし（`style: 'lan'` で描き方は従来どおり）、
    ピン 21 BK+・20 BK− をブレーキ電源の端子（SCON-CB は BK+・PWR−、ほかは BK+・BK−）から内部経路でつないだ
    （各取扱説明書の「エンコーダーコネクター」: 20 BK− ブレーキ開放出力信号−（全軸共通）、21 BK+ ブレーキ開放出力信号+）。
- **ブレーキ**: パルスモーター・24V サーボ（RCP6・RCA2）のブレーキは一体型ケーブルを通してコントローラーが駆動するので、ブレーキ付き（オプション B）でも配線は変わらない（パラメーター `brake` は銘板の表示だけ）。
  200V AC サーボ（RCS4）のブレーキ付きは、エンコーダーケーブルのピン 21・20 をブレーキの受電にしたので、コントローラーのブレーキ電源を配線し忘れると `no-power`（テストあり）。
  RCON-SC はブレーキ電源が連結で供給されるため、PG のピンを持たせず、チェックの対象外。
- **エレシリンダー**: 電源・I/O コネクターのピン（A1 0V・B1 24V・B3 ST0・B4 ST1・B5 RES・A3 LS0・A4 LS1・A5 *ALM・B2 BKRLS）を PIO と同じ考え方で定義し
  （入力は NPN 仕様でプラスコモン＝B1、PNP 仕様でマイナスコモン＝A1。出力は NPN が A1 へ、PNP が B1 から、50mA/点）、
  片側バラ線の CB-EC-PWBIO で PLC の入出力へつなぐ。PLC の NPN 出力で PNP 仕様の EC を駆動すると `signal-polarity`（テストあり）。

### 電源

- DC24V の受電は ±10%（21.6〜26.4V）。AC 入力は SCON-CB（100V/200V のパラメーター）、SCON2、XSEL（制御電源 単相・モーター電源 三相/単相）、RCON-PS2、MSEL（単相 AC100〜230V）。
- 機器の `loadCurrent` は「モーター（負荷）電流」のパラメーターにした（静的な値か param 参照しか書けないため、軸数から自動で計算はしない）。
- MPI / MPO（モーター駆動電源ライン）: MPO は制御電源 24V（MCON は MP +24V）から内部で出ている経路（`directed` の内部経路）とし、MPI を受電端子にした。
  通常は MPI-MPO を短絡し、外部で遮断するときは間に接触器の接点を入れる。

### R-unit の連結（bus）

- ゲートウェイユニット（RCON-GW・REC-GW）と RSEL を親（`bus.kind: 'iai-rcon'`）にし、ドライバーユニット・EC 接続ユニット・PIO ユニット・200V 電源/ドライバーユニット・ターミナルユニットを連結できる。
- レールは CP（制御電源）と MP（モーター電源）。ゲートウェイの供給上限は CP 9A・MP 37.5A（RSEL は MP 30A）で、各ユニットの消費はパラメーター（`cpLoad`・`mpLoad`）。
  合計が上限を超えると `bus-overload`（テストあり）。

## 推定・簡略化したこと

- **外形**: 寸法はカタログの外形図（1mm ≒ 2px）。コネクターの細かい位置は製品写真と「各部の名称」の図から目で合わせた。
  MCON-C は製品写真を確認できず「各部の名称」の図だけで配置した。PSEL / ASEL の下面のコネクター（CP EMG ENB・MP）は正面の下端に並べて描いた。
- **SCON-CB**: 400〜750W 用は筐体の幅が広いが、幅をパラメーターで変えられないため 58mm 幅（〜400W 用）で描いた。PIO パターン 6・7 とパルス列モードの PIO は未対応。
- **XSEL**: 5〜8 軸仕様（幅 358mm）、多点 I/O ボード（N3/P3、96 点）、XSEL2-TL は描いていない。XSEL-P/Q の外形は XSEL-RA と同じとみなした。
- **RCON**: PIO ユニットの幅（22.6mm）は推定。RCON-SC の STO 端子の配置は簡略化。
- **CB-SC-STO**: 芯線の色は資料で確認できず灰色で描いた。
- **PSEL / ASEL**: I/O コネクターの形式は推定（上記）。CS タイプは TP コネクターの形式違いとして扱った。
- **アクチュエーターの外形**: 盤外の機器なので、長さ方向を縮めて描いた（ストロークは代表的な長さ、ケーブルは短く）。幅・本体径・ロッド径はカタログの値に比例させた。
  RCD-RA1DA は小さいので大きめに描いた。
- **適応コントローラーの記号**: RCA2 の A3（ACON-CYB）と A5（ACON-CB）は同じコネクターの種類として扱った（Conneko の ACON-CB・ACON-CYB は同じ `IAI-RCA-MPG`）。
  RCP6 の P3 / P5 などは 1 つのパラメーターで選び、高推力タイプ（SA8C・RA8C）では自動的に P4 / P6 になる
  （v0.6.7 から、選択肢の表示もタイプに合わせて P3 / P5 か P4 / P6 にする。`optionsFor`、#24）。
- **ケーブルのピン番号**: 専用ケーブルは両端のコネクターでピン番号が違う（CB-X1-PA はコントローラー側 21 BK+ がアクチュエーター側 9）。
  Conneko のケーブルは同じ番号のピンどうしをつなぐため、アクチュエーター側のピンもコントローラー側の番号で定義した。
- **EC の電源 2 系統仕様（TMD2）の PNP 出力**: 出力がどちらの 24V から出るかは確かめられず、B1 とした（推定。TMD2＋PNP のときだけ端子の説明に書く）。

## 未実装と理由

- **MSCON**（AC サーボ多軸ポジショナー）・**SSEL**（AC サーボ 2 軸プログラムコントローラー、旧製品）: 取扱説明書は確認したが、今回は時間の都合で見送った。
  MSCON は MCON-C と似た作り（スロット・電源・システム I/O）で、AC 入力に替えれば追加しやすい。
- **エレシリンダー**: EC-S6/S7（スライダー、パルスモーター）だけを定義した。ほかの形（ロッド EC-R・グリッパー・ロータリー、200V AC サーボの EC-S□□）、
  デジタルスピコン付き（EC-DS）、無線通信仕様、3 ポジション切替仕様（MF）、旧製品の ERC2/ERC3 は未定義。
- **アクチュエーター本体**: RCP6（スライダー・ロッド）、RCA2-RN、RCD-RA1DA、RCS4（スライダー）だけ。RCP5/RCP4/RCP3/RCP2・RCA・RCS3/RCS2・単軸ロボット（ISB・NSA など）・
  直交ロボット・ブレーキボックスが必要な機種（RCS2-RA13R など）は未定義。PSEL / ASEL（`IAI-PSEL-*`・`IAI-ASEL-*`）につながるアクチュエーターもない。
- **専用ケーブル（CB-CAN-MPA・CB-RCC-MA・CB-X1-PA など）**: 機器にはせず、コネクターどうしをつなぐケーブル（電線）として扱った。中継の延長ケーブル・変換ケーブル（CB-CAN-AJ002）も機器にはしていない。
- **ティーチングボックス・パソコンケーブル・ダミープラグ・アブソバッテリーボックス・回生抵抗ユニット**: 配線図の主題から外れるため、コネクター端子（`optional`）だけを用意した。

## 機器定義では表せていないこと（コアへの提案）

1. **幅・高さ・`loadCurrent`・`bus.load` をパラメーターの関数で書けない**。SCON-CB の容量による幅の違い、XSEL の 5〜8 軸仕様、軸数に比例する消費電流が表せない。
   提案: `width` / `height` / `loadCurrent` / `bus.load` も `ParamDependent<number>` を受け付ける（`resolveDevice` で解決）。
2. **個別の端子の組を 1 つの通信ポートとして扱えない**。DeviceNet・CC-Link の差込みプラグは端子なので `protocols` を持てず、通信方式の不一致を検出できない。
   提案: `TerminalDef` に `protocols?: string[]` と `port?: string`（同じポートの端子の組）を足し、ポート単位で protocol-mismatch を調べる。
3. **機器自身の内部経路が安全チェーンで飛ばされる**。TB の非常停止接点（b 接点）を `switch: 'NC'` の内部経路にすると安全チェーンの探索で無視されるため、常に閉の導通にした。
   提案: 安全チェーンの探索で、機器自身の内部経路も「接点」として経路に含めるオプション（`InternalLink.safetyContact?: true`）。
4. **安全リレーの a 接点を停止ループに入れる構成が `estop-not-nc` になる**。そのため `stopLoop` を configurable にして注意にとどめた。
   提案: 安全接点（安全リレー・安全コントローラーの出力接点）に `function: 'safety-output-contact'` のような印を付け、b 接点と同等に扱う。
5. **8 点ごとのコモン電流の上限（例: MSEL・PSEL の出力 400mA/8 点）が書けない**。`commonLimits` は端子単位で、同じ N ピンを共有する出力の組ごとの上限を表せない。
   提案: `commonLimits` に「出力ピンの組 → 上限電流」の形を足す。
6. **bus のレールで電位（24V の有無）を伝えられない**。R-unit のドライバーの MPO は連結バスで来るモーター電源だが、バスは電流の合計しか扱わないため、MPO を独立の供給端子として描いた。
   提案: bus のレールに `supply` 相当の電位情報を持たせ、連結したユニットの端子にネットとして渡す。
7. **コネクター端子の未接続を警告できない**。未接続の検査（`checkUnconnected`）は `role: 'connector'` を飛ばすため、アクチュエーターのモーター・エンコーダーコネクターを
   コントローラーにつなぎ忘れても指摘されない（ピンの受電端子を `optional: false` にすると、ピン数の違うコネクターや RCON-EC のようなピンのない相手で誤った指摘になる）。
   提案: `ConnectorSpec.required?: true` を足し、ケーブルがつながっていなければ `unconnected` を出す。
   → v0.6.2 で対応（#23）。アクチュエーターのモーター・エンコーダー（`actuatorConnector`・`encoder26Connector`）と、1 軸コントローラー
   （PCON/ACON/DCON-CB・CYB、SCON-CB・SCON2）の MPG / MOT / PG に `required: true` を書き、未接続なら `connector-unconnected` の警告を出す。
   多軸のコントローラー（MSEL・PSEL・XSEL）の M□ / PG□ は、使わない軸があるため対象外。
8. **ケーブルの両端でピン番号が違うことを書けない**。専用ケーブルはコントローラー側とアクチュエーター側でピン番号が違う（CB-X1-PA は 21 → 9 など）。
   提案: 両端のコネクターの kind の組ごとのピンの対応表（`cableMaps: { [kindA|kindB]: { 21: 9, ... } }`）か、ケーブルを機器にしたときにコネクター 2 つを内部経路でつなぐ書き方の例を用意する。
9. **パラメーターの選択肢を別のパラメーターで変えられない**。RCP6 の適応コントローラーは、標準タイプが P3/P5、高推力タイプが P4/P6 だが、選択肢を型式（タイプ）で切り替えられないため、1 つの選択肢にまとめた。

## 調査で使った主な資料

- IAI 総合カタログ CJ9005（コントローラー編: PCON-CB・ACON-CB・DCON-CB・SCON-CB・SCON2・RCON・RSEL・MSEL・XSEL-RA/SA・XSEL2・PCON-CYB など）
- 取扱説明書: MJ0342（PCON-CB/CFB）、MJ0343（ACON-CB/DCON-CB）、MJ0289（PCON-CA/CFA）、MJ0326（ACON-CA/DCON-CA）、MJ0353（PCON-CYB/PLB/POB）、
  MJ0354（ACON/DCON-CYB/PLB/POB）、MJ0340（SCON-CB/CGB）、MJ0458（SCON2）、MJ0341（MCON-C/CG）、MJ0384（RCON）、MJ0394（REC）、MJ0392（RSEL）、
  MJ0336（MSEL）、MJ0359（XSEL-RA/SA/RAX/SAX）、MJ0148（XSEL-P/Q）、MJ0478（XSEL2）、MJ0172（PSEL）、MJ0165（ASEL）、MJ0379（PSA-24）
- アクチュエーター: 総合カタログ CJ9006（2026 年版）第 3 巻「スライダー」（RCP6-SA・RCS4-SA）・第 4 巻「ロッド」（RCP6-RA・RCA2-RN・RCD-RA1DA）・
  第 8 巻「コントローラー」の各コントローラーの「メンテナンス部品（ケーブル）」（ケーブル対応表）。
  取扱説明書: MJ3749（RCP6 スライダー）、MJ3751（RCP6 ロッド）、MJ3769（RCS4 スライダー）、MJ3671（RCA2 細小型ロッド）、MJ3721（RCD ミニシリンダー）、
  MJ3793（エレシリンダー スライダー）、MJ3816（エレシリンダー 電気編）。エンコーダーコネクターのピン: MJ0340（SCON-CB）、MJ0458（SCON2）、MJ0359（XSEL-RA/SA）、MJ0148（XSEL-P/Q）、MJ0478（XSEL2）
- フィールドネットワーク取扱説明書: MJ0254（CC-Link）、MJ0389（CC-Link IE Field）、MJ0256（DeviceNet）、MJ0258（PROFIBUS-DP）、MJ0220（CompoNet）、
  MJ0221（MECHATROLINK）、MJ0317（MECHATROLINK-Ⅲ）、MJ0273（EtherCAT）、MJ0278（EtherNet/IP）、MJ0333（PROFINET IO）
