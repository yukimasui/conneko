# 提案: 安全機器・安全回路のための型とチェック

安全機器（安全コントローラー、セーフティリレー、非常停止、ドアスイッチ、ライトカーテンなど）を
`src/devices/catalog/` に追加するにあたり、現在の型（`src/devices/types.ts`）と電気チェック
（`src/check/checkDiagram.ts`）では表しきれない概念を整理し、追加したい型とチェックのルールを提案する。

現状は、これらの概念を `description`・端子の `label`・SVG の印字・`params` で表現している
（型やアプリ本体は変更していない）。

## 1. 現状の表現と限界

| 概念 | 現在の表現 | 限界 |
|---|---|---|
| 2 チャンネル入力のペア（CH1/CH2） | 端子 ID（`T11`/`T12`・`T21`/`T22`、`Si0`/`Si1` など）と `description` | どの端子どうしがペアか機械的に分からない。片側だけの配線を検出できない |
| テスト出力（テストパルス） | `role: 'signal'`、`label` に「テスト出力」 | どのテスト出力をどの入力に戻すべきか（T0→Si0 など）を表せない |
| OSSD（安全出力、半導体 PNP 出力） | `role: 'signal'` | 電圧を出す端子だが `supply` にすると OSSD1/OSSD2 の並列やコイルへの給電が「電源の並列」と誤判定される。逆に `signal` だと OSSD からコイルへ給電していることがチェックに伝わらず、コイルが「電源が来ていません」になる |
| 接点の a/b（NO/NC） | `links`（常に「閉」とみなす）と `label`（「NC1」など） | b 接点か a 接点かを区別できない。非常停止の a 接点を安全入力に使う誤りを検出できない |
| 直接開路動作（⊕マーク） | SVG のマークと `description` | 安全入力に直接開路動作でない接点を使う誤りを検出できない |
| 強制ガイド接点・ミラー接点 | `description` | EDM（外部機器監視）の帰還に使える接点かどうかを判定できない |
| EDM 入力 | `role: 'signal'`、`label` | EDM 未配線、EDM ループに接触器の b 接点が入っていない、を検出できない |
| 安全性能（PL / カテゴリ / SIL / タイプ） | `description` と銘板 | 図面全体で最も低い性能の機器を示すなどができない |
| ソレノイドロックの施錠方式（スプリングロック/ソレノイドロック） | `params` の表示と `description` | 施錠の電源が安全出力からかどうか（スプリングロックは停電で施錠維持）を判定できない |
| 安全機器のカテゴリ | `DeviceCategory` の `control` / `sensor` / `contactor` | パレットで安全機器だけをまとめて探せない |

## 2. 追加したい型（案）

### 2.1 端子の「機能」 `TerminalDef.function`

`role` は電源チェックのための分類なので、それとは独立に端子の機能を表す任意の項目を追加する。

```ts
export type TerminalFunction =
  | 'safety-input'      // 安全入力（Si0, S12, T12 など）
  | 'test-output'       // テスト出力（テストパルス。T0, S11, T11 など）
  | 'ossd'              // 安全出力（OSSD、半導体出力）
  | 'safety-contact'    // 安全出力のリレー接点（13-14 など）
  | 'aux-output'        // 補助出力（非安全。L1、41-42、Y1 など）
  | 'edm'               // 外部機器監視（EDM）入力・フィードバックループ
  | 'reset'             // リセット入力（手動／自動）
  | 'start'
  | 'muting'
  | 'lock-solenoid'     // 電磁ロックのソレノイド
  | 'contact';          // スイッチの接点（下の InternalLink.contact と組み合わせる）

interface TerminalDef {
  // ...既存
  function?: TerminalFunction;
  /** 2 チャンネルのどちらか（1 / 2）。安全入力・テスト出力・OSSD に付ける */
  channel?: 1 | 2;
}
```

### 2.2 チャンネルペア `DeviceDefinition.safetyChannels`

```ts
interface SafetyChannelGroup {
  /** 例: 'ESTOP'、'IN0-1'、'OSSD' */
  id: string;
  label?: string;
  kind: 'input' | 'output';
  /** チャンネルごとの端子 ID。入力ならテスト出力と入力の組を書く */
  channels: { source?: string; input: string }[] | { output: string }[];
  /** 入力の想定: 'nc-nc'（等価）/ 'nc-no'（非等価）/ 'ossd'（OSSD 入力、テストパルスなし） */
  mode?: 'nc-nc' | 'nc-no' | 'ossd';
}
```

例（オムロン G9SE-201）:

```ts
safetyChannels: [
  { id: 'IN', kind: 'input', mode: 'nc-nc', channels: [{ source: 'T11', input: 'T12' }, { source: 'T21', input: 'T22' }] },
  { id: 'OUT', kind: 'output', channels: [{ output: '13' }, { output: '23' }] },
],
```

### 2.3 接点の種類 `InternalLink.contact`

```ts
interface InternalLink {
  // ...既存
  /** 接点の種類。'NO' は a 接点、'NC' は b 接点。省略時は従来どおり単なる導通 */
  contact?: 'NO' | 'NC';
  /** 直接開路動作（IEC 60947-5-1 附属書 K、⊕ マーク） */
  directOpening?: boolean;
  /** 強制ガイド（IEC 61810-3）・ミラー接点（IEC 60947-4-1 附属書 F） */
  linked?: 'force-guided' | 'mirror';
  /** 何で動く接点か（'coil'、'actuator'、'button' など）。将来の状態シミュレーション用 */
  actuatedBy?: string;
}
```

あわせて、電源チェックでの接点の扱いを選べるようにする（現在は全て「閉」）。
b 接点は「閉」、a 接点は「開」とみなすモードを用意すると、非常停止を押していない通常状態の電位を
正しく計算できる。

### 2.4 OSSD・テスト出力の電源仕様 `SupplySpec.kind`

OSSD は DC24V を出す端子だが、電源ユニットの出力とは性質が違う（2 本は別チャンネル、テストパルスで短絡を検出する、
負荷電流が小さい）。`role: 'supply'` に `kind` を加え、チェックの扱いを変える。

```ts
interface SupplySpec {
  // ...既存
  /** 'power'（既定）: 電源。'ossd': 安全出力。'test': テスト出力（パルス） */
  kind?: 'power' | 'ossd' | 'test';
  /** 同じ機器の中で互いにつないではいけない出力のグループ名（例: OSSD1 と OSSD2） */
  channel?: string;
}
```

- `kind: 'ossd'` の出力どうしの並列は「電源の並列」警告ではなく「OSSD の短絡」エラーにする。
- `kind: 'ossd'` から接触器・リレーのコイル（`role: 'input'`）へ給電できるようにする（現在は `signal` のため、
  コイルが「電源が来ていません」と警告される）。`limitCurrent` に OSSD の定格（例: 0.3A / 0.5A）を入れれば
  負荷電流の超過も既存の過負荷チェックで検出できる。

### 2.5 機器の安全性能 `DeviceDefinition.safety`

```ts
interface SafetyRating {
  /** ISO 13849-1 のパフォーマンスレベル（最大） */
  pl?: 'a' | 'b' | 'c' | 'd' | 'e';
  /** ISO 13849-1 のカテゴリ（最大） */
  category?: 'B' | '1' | '2' | '3' | '4';
  /** IEC 62061 / IEC 61508 の SIL（SIL CL） */
  sil?: 1 | 2 | 3;
  /** IEC 61496 のタイプ（ライトカーテン・レーザスキャナ） */
  esType?: 2 | 3 | 4;
  /** 準拠規格（表示用） */
  standards?: string[];
}
interface DeviceDefinition {
  // ...既存
  safety?: SafetyRating;
}
```

### 2.6 カテゴリ `'safety'`

`DeviceCategory` に `'safety'`（パレット表示名「安全機器」）を追加し、安全コントローラー・セーフティリレー・
非常停止・ドアスイッチ・ライトカーテンなどをまとめる。現状は `control`（コントローラー・スイッチ類）と
`sensor`（ライトカーテン・スキャナ・非接触スイッチ）、`contactor`（電磁接触器・強制ガイドリレー）に分散している。

## 3. あると良い安全チェック（ルール案）

いずれも上の型が入った機器だけを対象にし、型のない既存機器には影響させない。重大度は案。

| # | ルール ID | 内容 | 重大度 | 必要な型 |
|---|---|---|---|---|
| 1 | `safety-channel-partial` | 2 チャンネル入力の片側だけが配線されている（例: T11-T12 はつないだが T21-T22 が未配線） | error | 2.2 |
| 2 | `safety-channel-cross` | 入力チャンネルに別チャンネルのテスト出力が戻っている（T11 → T22 など）。または 2 チャンネルが同じスイッチの同じ接点を共有している（1 つの b 接点を 2 入力に渡り配線） | error | 2.1, 2.2 |
| 3 | `ossd-short` | OSSD1 と OSSD2 が同じネットにつながっている／OSSD が +24V や 0V に直結している | error | 2.4 |
| 4 | `ossd-to-ossd-input` | OSSD 出力機器（ライトカーテンなど）の OSSD をテスト出力付きの入力（`mode: 'nc-nc'`）につないだ。テストパルスを返さないため入力側の設定が必要 | warning | 2.1, 2.2 |
| 5 | `estop-not-nc` | `function: 'safety-input'` のネットに、非常停止・ドアスイッチの a 接点（`contact: 'NO'`）が入っている | error | 2.3 |
| 6 | `not-direct-opening` | 安全入力に入る接点が直接開路動作でない（`directOpening` が false の汎用スイッチ） | warning | 2.3 |
| 7 | `edm-missing` | 安全出力（OSSD・安全接点）で接触器のコイルを駆動しているのに、その機器の EDM 入力（またはフィードバックループ）が未配線 | warning | 2.1 |
| 8 | `edm-not-linked` | EDM ループに入っているのが、駆動している接触器のミラー接点／強制ガイドリレーの b 接点ではない（または a 接点） | warning | 2.1, 2.3 |
| 9 | `single-channel-output` | カテゴリ 3/4 の機器の安全出力で 1 台の接触器だけを駆動している（冗長化されていない） | info | 2.5, 2.1 |
| 10 | `reset-auto` | 手動リセット端子が未配線または自動リセットに短絡されているのに、ライトカーテンなど人が通過できる保護に使っている | info | 2.1 |
| 11 | `safety-rating-mismatch` | 入力機器・論理部・出力機器の PL/カテゴリの最小値を表示し、要求 PL（図面の設定）を下回る機器を示す | info | 2.5 |
| 12 | `lock-power-source` | スプリングロック式ドアスイッチのソレノイドが安全出力ではなく常時電源から給電されている（常時解錠になる） | warning | 2.1 |
| 13 | `common-0v` | 安全コントローラーの 0V と、OSSD 出力機器・接触器コイルの 0V が別の電源の 0V になっている（OSSD の基準が違う） | warning | 2.4 |

### チェックの手順の案

1. 現在の同電位グループ（UnionFind）を、`contact` の種類を考慮して作り直す（b 接点は閉、a 接点は開）。
2. `safetyChannels` を持つ機器ごとに、各チャンネルの `source`（テスト出力）と `input` が同じネットに属するかを確認する
   （属さない＝配線されていない、別チャンネルの source と同じネット＝クロス）。
3. `kind: 'ossd'` の supply どうしが同じネットに入っていないか（3）、PE や電源の supply と同じネットでないか（3）。
4. OSSD・安全接点からたどった先に接触器の `input`（コイル）があるかを調べ、あれば同じ機器の `function: 'edm'` 端子の
   配線（7）と、その EDM ネットに含まれる接点が駆動先の接触器の `linked` 付き `NC` 接点か（8）を確認する。

## 4. 該当する機器（今回追加したもの）

一覧と出典は `docs/safety-catalog.md`。端子の機能・チャンネルは、現時点では各定義ファイルの `label` と
`description` に書いてあるので、型が入ったらそこから機械的に移せる。主な対応は次のとおり。

| 型・チェック | 該当する機器（type）と端子 |
|---|---|
| 2.2 `safetyChannels`（入力・テスト出力の組） | `omron.g9se-*`: T11→T12 / T21→T22、`omron.g9sa-301`: T11-T12 / T21-T22、`pilz.pnoz-x2-8p`・`pilz.pnoz-s4`: S11-S12 / S21-S22、`idec.hr6s-af`: S11-S12 / S21-S22、`omron.g9sp-n10s`: T0→Si0 / T1→Si1 …、`keyence.gc-1000(r)`: To0→Si0 / To1→Si1 …、`idec.fs1b-c31s`: T0→X0 / T1→X1 …、`mitsubishi.ws0-cpu0-xtio`: X1→I1 / X2→I2 … |
| 2.2 出力の組 | `keyence.gc-1000`: So0/So1 …、`omron.g9sp-n10s`: So0/So1、`idec.fs1b-c31s`: Y0/Y1・Y2/Y3、`mitsubishi.ws0-cpu0-xtio`: Q1/Q2 …、セーフティリレーの 13-14 / 23-24 |
| 2.1 `function: 'ossd'` / 2.4 `kind: 'ossd'` | `keyence.gl-r.receiver`・`omron.f3sg-sr.receiver`・`keyence.sz-v32`・`keyence.gs-11p5`: OSSD1/OSSD2。`keyence.gc-1000`: So0〜So5、`omron.g9sp-n10s`: So0〜So3、`idec.fs1b-c31s`: Y0〜Y3、`mitsubishi.ws0-cpu0-xtio`: Q1〜Q4 |
| 2.1 `function: 'edm'` | `keyence.gl-r.receiver`: EDM（赤/黒）、`keyence.sz-v32`: IN2（赤）、`omron.f3sg-sr.receiver`: RESET（RESET/EDM 兼用）、セーフティリレーのフィードバック T31-T32（G9SE/G9SA）・S12-S34（PNOZ）・Y1-Y2（HR6S） |
| 2.3 `contact: 'NC'` + `directOpening` | `idec.xw1e-*`: 21-22・41-42、`idec.hs5d-02rn`: 11-12・21-22、`omron.d4n-4c20`: 11-12・21-22、`omron.er6022-021m`: 11-12・21-22、`idec.hs5e-a4403-g`: 11-42、`idec.he1g-l21sm`: 5-6 |
| 2.3 `contact: 'NO'`（安全入力に使ってはいけない接点） | `omron.d4n-4c20`: 33-34、`omron.er6022-021m`: 33-34、`idec.hs5e-a4403-g`: 23-24・53-54、`mitsubishi.sd-t12.dc24v`: 13-14 |
| 2.3 `linked: 'mirror'` / `'force-guided'` | `mitsubishi.sd-t12.dc24v`: 21-22、`mitsubishi.sd-t21.dc24v`: 21-22・31-32、`omron.g7sa-3a1b`: 11-12、`idec.rf1v-2a2bl-d24`: 3-4・5-6 |
| 2.1 `function: 'lock-solenoid'`（チェック 12） | `idec.hs5e-a4403-g`: A2(+)/A1(−)（スプリングロック） |
| 2.5 `safety` | 全機種（PL e / カテゴリ4 が多い。`keyence.sz-v32` はタイプ3 / PL d / カテゴリ3、`omron.g9se-221-t05` のオフディレー出力は停止カテゴリ1） |

## 5. 作業中に気づいた開発環境の注意

- vitest の変換キャッシュ（`node_modules/.vitest-cache`）が `src/devices/registry.ts` の `import.meta.glob` の結果を保持するため、
  `catalog` に機器ファイルを追加しても `registry.ts` 自体が変わらない限り、テストから新しい機器が見えないことがあった。
  機器を追加したらキャッシュを消してからテストする（または vitest の設定でキャッシュを無効にする）とよい。
