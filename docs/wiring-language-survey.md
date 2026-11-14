# 配線を記述する言語の先行調査

調査日: 2026-11-14（Web 検索とページの取得による。確認できなかった点は末尾にまとめた）

問い: 制御盤の実配線（機器・端子・電線の線番・色・太さ・種類）を人が文字で書けて、コンパイラのように誤りを返す言語は、すでにあるか。

## 結論

**確立したものは見つからなかった。** 近いものは 4 系統あり、どれも一部しか満たさない。

1. **対象が同じもの**: 2025〜2026 年に出た小規模な OSS（sepia、PanelCAD、LAZY Electrical、uniwire）。どれも JSON / YAML のデータ形式に検査を足したもので、
   始まったばかり。線番・色・太さ・電線の種類・端子をそろえて持ち、AC/DC・電圧・保護との整合まで調べるものはない。
2. **チェックの考え方が近いもの**: 基板向けの「回路をコードで書く」系（KiCad ERC、SKiDL、atopile、edg、JITX）。盤の配線に使った例は見つからなかった。
3. **物理配線の記述として近いもの**: ハーネス向け（WireViz、loome、Splice）。電気的な検査はない。
4. **産業用 ECAD と交換規格**: EPLAN・E3.series・AutoCAD Electrical は検査が豊富だが、原本は GUI とデータベース。
   SCL・KBL/VEC・AutomationML はツールが出力する XML で、人が書く言語ではない。

独自の構文を持ち、線番・色・sq・電線の種類・端子を一級に扱い、電圧や保護協調まで調べる言語は空いている、というのが調査の範囲での結論。

## 比較

| 名称 | 記述する対象 | 人が文字で書けるか | チェック | 制御盤の配線とのずれ |
|---|---|---|---|---|
| WireViz / Filare | ケーブル・ハーネス・コネクタのピン配置 | 書ける（YAML） | 並列接続のピン数、未参照の部品の警告 | 電気的な検査なし。機器の定格・電位の概念がない |
| loome | 航空機のハーネス | 書ける（Python、`>>` で接続） | 束の経路と線長 | 太さと保護の照合は記載なし |
| Splice（splice-py） | ハーネス | 一部（Python で生成） | 設計の検証（詳細は不明） | ハーネス専用 |
| sepia | 制御盤（機器・電線・シート・盤配置） | 書ける（JSON） | ない端子・線番の重複・片端だけの電線・電源の過負荷などを設計書に挙げる（実装済みの範囲は未記載） | ごく初期。米国の様式が先。AC/DC・電圧の整合は挙がっていない |
| PanelCAD | 制御盤（回路図・I/O・盤配置） | 書ける（YAML） | From-To の接続、コイルと接点の相互参照 | 太さ・色・電線の種類がない |
| LAZY Electrical | 配線図・制御盤 | 一部（JSON、GUI 主体） | 短絡、コイルのない接点、タグの重複、浮いた電線。AI の返答を検査して直させる | 形式の仕様が未公開 |
| uniwire | 電気設備（電源 → 保護機器 → 負荷） | 書ける（JSON / Python） | 規格ごとの規則の組、PLC の整合。エラーで終了コード 1 | 中心は配電系統。端子・線番を持つ制御回路は将来の計画 |
| schematic.txt | 電子工作の配線（`MCU.3V3 -> Sensor.VIN`） | 書ける（独自構文） | 電気的な検査なし | 趣味・組込み向け |
| SKiDL | 基板の回路（Python） | 書ける | 未接続のピン、駆動の衝突、電源の誤り | 基板専用。電線の属性がない |
| atopile | 基板の回路（モジュール・単位・公差・assert） | 書ける | 制約を解いて検査 | 基板専用 |
| edg / PolymorphicBlocks | 基板の回路（Python） | 書ける | ポートに電圧・電流の上限を持たせ、伝えて検査 | 基板専用。考え方は移しやすい |
| JITX | 基板の回路 | 書ける | `check` 文（電源ピン、電圧レールなど） | 商用。基板専用 |
| KiCad ERC | 回路図（GUI） | 事実上 GUI | ピンの種別どうしの表（問題なし / 警告 / エラー）、未接続、駆動の衝突 | ピンの種別が論理 IC 向け。接点・コイル・電源の種別がない |
| EPLAN Electric P8 | 制御盤の回路図・盤 | 書けない（データベース。書き出しと API はある） | チェックラン（端子・接続・機器・PLC など） | 原本が文字でない。商用 |
| Zuken E3.series | 回路図・盤・ハーネス | 書けない | 実時間の設計規則、ヒューズと電線の太さ | 同上 |
| AutoCAD Electrical | 回路図（DWG） | 書けない | 線番の欠落・重複、タグの重複、未接続 | 同上 |
| QElectroTech | 回路図（XML。導体に番号・太さ・色） | XML だが手書き向きでない | 電気的な検査は確認できず | 検査がない |
| IEC 61850 SCL | 変電所（一次系統、IED、通信） | 書けない（ツールが出す XML） | スキーマと、ツールによる規則 | 対象が変電所。電線の属性がない |
| KBL / VEC（VDA 4964 / 4968） | 自動車のハーネス | 書けない（XML） | スキーマ | 自動車専用 |
| AutomationML（IEC 62714） | プラント設備のデータ交換 | 書けない（XML） | 形式は検査を定めない | 汎用の入れ物 |
| Modelica | 物理系のモデル | 書ける | 接続の型、節点の電流の和、シミュレーション | 線番・色・太さの概念がない |
| SysML v2 | システムの構造（ポート・接続） | 書ける | 型と向きの整合 | 電気の規則は自作 |

## ほかの言語の考え方と、配線言語での対応

| 似た考え方を持つもの | 考え方 | Conneko の配線言語では |
|---|---|---|
| Modelica の `connect` | 接続は向きのない等電位の宣言 | `--` に向きがない |
| sepia のワイヤクラス | 色・太さは電線ごとでなく区分に持たせる | `wire` ブロック |
| sepia の run、schematic.txt | 1 本の線番を端子の並びで書く | 渡り配線 `A -- B -- C`、線番 `R1:` |
| VEC / KBL | 部品の型と図面上の出現を分ける | 機器カタログ（1 機器 1 ファイル）と `名前 = 機器種別` |
| KiCad ERC、edg | 端子に種別と定格を持たせ、つないだ相手と照らす | 既存の配線チェック（端子の role・supply・accepts）を、そのまま第 2 段階に使う |
| uniwire | 閉じた語彙。知らない語はエラー | 知らない属性・端子・機器種別はエラー（近い名前を示す） |
| LAZY Electrical ほか | AI の出力を検査して、誤りを返して直させる | 行番号つきの指摘（AI との往復に使う案は「これから」） |

対応させなかったもの: IEC 81346 の参照指定（`=機能 +場所 -製品`）は、Conneko の機器名（`ELB1`）とシートで足りるため見送った。
KiCad のピン種別の表を利用者が編集する仕組みも、いまのチェックは機器定義から決まるため入れていない。

## チェックの発展の手がかり

リレー回路の検査には、スニーク回路解析（意図しない電流の経路を探す）と、リレー連動装置を接点つきの回路網にして制約ソルバで調べる研究がある。
コンパイラで扱える範囲は、接点の状態の組み合わせで起きる異電位の短絡、励磁されないコイル、同時に入ってはならない接触器のインタロックの欠落。
Conneko の短絡の状態検査（`src/check/states.ts`）は 1 台ずつの動作までで、2 台以上の同時動作は見ていない（[known-limitations.md](known-limitations.md)）。

## 確認できなかったこと

- **読めなかったサイト**: harnice.io、docs.kicad.org、forum.kicad.info、SKiDL の公式文書、Wikipedia（ネットワークの設定で名前を解決できなかった）。
  KiCad ERC は公式文書でなくソースのミラーで確かめた。ピン種別が 12 種で判定が 3 段階であることは確かだが、表の個々の値は未確認。
- **Harnice**: 「Electrical System CAD」であること以外（入力の形式、検査）は不明。
- **EPLAN・E3.series・WSCAD・SEE Electrical**: 検査の説明はベンダーの資料による。ファイルの内部形式は未確認。
- **規格の本文**（IEC 81346、61082、60204-1、61850-6、JIS C 0617、JEM）: 有料のため読んでいない。
- **日本の線番の慣例**: 権威のある出典は見つからなかった。
- **学術研究**: 制御盤の配線の言語を扱う論文は見つからなかったが、論文データベースを直接は検索していない。「ない」とは言い切れない。
- 小規模な OSS の状態（コミット数・実装の範囲）は調査日のもの。

## 出典

- WireViz: https://github.com/wireviz/WireViz/blob/master/docs/syntax.md
- Filare: https://github.com/laurierloi/filare
- loome: https://pypi.org/project/loome/
- Splice: https://hackaday.com/2025/07/07/splice-cad-cable-harness-design-tool
- sepia: https://github.com/joyautomation/sepia
- PanelCAD: https://github.com/merchantg-cmyk/panelcad
- LAZY Electrical: https://github.com/Neidhart-Romanee-Conti/LAZY-electrical
- uniwire: https://github.com/uniwire-dev/uniwire
- schematic.txt: https://github.com/FelixLttks/schematic.txt
- SKiDL: https://github.com/devbisme/skidl
- atopile: https://github.com/atopile/atopile
- edg / PolymorphicBlocks: https://arxiv.org/pdf/2011.08242
- JITX: https://docs.jitx.com/reference/statements/checkstmt/heading.html
- KiCad ERC（ソース）: https://raw.githubusercontent.com/KiCad/kicad-source-mirror/master/eeschema/erc/erc_settings.cpp
- EPLAN: https://www.eplan.help/en-us/infoportal/content/Plattform/2026/Content/htm/msgmanagementgui_k_start.htm
- E3.series: https://www.zuken.com/us/product/e3series/e3echeck/
- AutoCAD Electrical: https://help.autodesk.com/cloudhelp/2025/ENU/AutoCAD-Electrical/files/GUID-7CA879C4-035D-4475-9BD9-2299F1A11F98.htm
- QElectroTech: https://qelectrotech.org/forum/viewtopic.php?id=2752
- IEC 61850 SCL: https://cdn.standards.iteh.ai/samples/15126/dc4d3c54d345414ab0725923806cb566/IEC-61850-6-2009.pdf
- KBL / VEC: https://ecad-wiki.prostep.org/specifications/vec/guidelines/
- Modelica: https://specification.modelica.org/jenkins/connectors-and-connections.html
- スニーク回路解析（NASA）: https://www.nasa.gov/wp-content/uploads/static/history/alsj/fr/../SneakCircuitAnalysisHandbook.pdf
- リレー連動装置の検証（FMCAD 2018）: https://ieeexplore.ieee.org/document/8603007/metrics
