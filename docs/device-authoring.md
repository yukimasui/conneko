# 機器定義の追加ガイド

Conneko の機器（ノード）は `src/devices/catalog/` に1機器1ファイルの TypeScript で定義する。
ファイルを置くだけで `src/devices/registry.ts` が自動で読み込むため、登録作業は不要。

型の詳細は `src/devices/types.ts` のコメントを参照。お手本は `src/devices/catalog/power-source-3p200v.ts`。

## ファイル名・type

- ファイル名: `<メーカー>-<型式>.ts`（例: `mitsubishi-nv32-sv-3p.ts`）。汎用品は `generic-<名称>.ts`。
- `type`: `<メーカー>.<型式>.<バリエーション>` の小文字（例: `mitsubishi.nv32-sv.3p`）。JSON の交換データに使うので、一度決めたら変えない。

## 見た目（SVG）

- 実物の写真・外形図に寄せた、初心者でも一目で何の機器か分かる見た目にする。
  - 本体色、ハンドル・ボタンの形と色、銘板の文字、端子ネジ、端子番号の印字などを再現する。
  - グラデーションや影で立体感を出してよいが、線は細すぎず、縮小表示でも潰れないこと。
- 縮尺の目安は 1mm ≒ 2px（盤内機器）。盤外の大型機器（モーターなど）は見やすさ優先で縮小してよい。
- `svg` は `<svg>` タグの内側だけを書く。viewBox は `0 0 width height`。
- `id` 属性には必ず `{{uid}}` を含める（例: `id="body-{{uid}}"`、参照は `url(#body-{{uid}})`）。
- 外部画像・外部フォント・`<script>`・`<foreignObject>` は使わない。フォントは `sans-serif` 指定。

## 端子

- `x, y` は端子ネジの中心。`side` はそこから電線が出ていく向き（上の端子なら `top`）。
- `id` はなるべく実機の端子印字に合わせる（JSON で AI が参照するため、分かりやすく安定した名前にする）。
- `role` と電気的仕様:
  - 電源の出力: `role: 'supply'` + `supply`
  - 電力を受け取る端子（コイル、モーター、電源ユニット入力など）: `role: 'input'` + `accepts`
  - 保護機器・開閉器の一次側/二次側: `line` / `load`
  - 端子台など向きのない中継: `pass`
  - 接地: `ground`
  - 接点・信号: `signal`（電源の有無はチェックしない。未接続警告を出さないよう `optional: true` にすることが多い）
- `label` は端子の印字、`note` はその意味（例: 端子台の `17` の note に `COM0`）。両方あると AI 用の端子一覧が分かりやすくなる。
- AC と DC のどちらも受けられる端子（リレー出力のコモンなど）は `accepts` を配列にする（いずれかを満たせばよい）。
  入力モードの切換などで電圧範囲が変わる場合は `minVoltage: { param: 'キー' }` のようにパラメータを参照できる。
- 内部で導通する経路は `links` に書く。
  - 保護機器の極は `{ from: 一次側, to: 二次側, directed: true, protects: true }` とし、`protectionCurrent` に定格電流を指定する。
  - 開閉する経路には `switch` を付ける（下の「接点と出力」）。付けない経路は常に導通とみなす。
- 三相負荷・単相入力など、異なる相で給電されるべき端子は `distinctGroups` に書く。
- 定格電流など機種によって変わる値は `params` で選択肢にし、`{ param: 'キー' }` で参照する。

## パラメータで見た目を変える

`svg` は文字列のほか、パラメータを受け取って文字列を返す関数にもできる。銘板の定格表示やレンズの色など、
選んだパラメータが見た目に表れる部分は関数にして反映する。引数には既定値が補完されたパラメータが渡される。

```ts
svg: (p) => `...<text ...>${p.ratedCurrent}A</text>...`,
```

確認は `npm run render-device -- <file> <out.png> --param ratedCurrent=30` のようにパラメータを指定して描画する。

## 接点と出力（`InternalLink.switch`）

| 種類 | 書き方 | 例 |
|---|---|---|
| a 接点 | `{ from, to, switch: 'NO' }` | 電磁接触器の主接点・補助 a 接点、押しボタンの a 接点、サーマルリレーの 97-98 |
| b 接点 | `{ from, to, switch: 'NC' }` | 補助 b 接点、非常停止、サーマルリレーの 95-96 |
| 出力 | `{ from: 出力点, to: コモン, switch: 'output' }` | PLC のトランジスタ・リレー出力、センサーの出力線 |

- 出力は **from に出力点、to にコモン（出力素子の基準側）** を書く。NPN 出力のセンサーなら `{ from: 'OUT', to: '0V', switch: 'output' }`、
  PNP 出力なら `{ from: 'OUT', to: '+V', switch: 'output' }`。
- 切換接点（c 接点）は、共通端子から b 接点側と a 接点側への 2 本を書く（例: `{ from: '11', to: '12', switch: 'NC' }` と `{ from: '11', to: '14', switch: 'NO' }`）。
- チェックでの扱い:
  - 電源が届くか・電圧や極性が合うかは、すべての接点・出力が閉じた状態（動作中）で確認する。
  - 短絡は、常時の状態、通常時（b 接点だけが閉）、機器ごとに 1 台ずつ動作させた状態（その機器の a 接点・出力が閉、b 接点が開）で確認する。
    出力に +24V を直結する誤りや、正逆転回路でインタロックがない誤りがここで見つかる。
  - 線番の重複は、常時導通の経路だけでつながった範囲ごとに確認する（出力点ごとに別の線番にできる）。
- 定格: 出力 1 点の定格電流は `ratedCurrent`（出力点につないだ負荷の `loadCurrent` の合計と比較）、
  コモンあたりの上限は `commonLimits: [{ common: 'COM0', current: 8 }]`（`to` がそのコモンの出力の負荷電流を合計）。
- 安全用の接点: 直接開路動作（⊕）の b 接点は `directOpening: true`、ミラー接点・強制ガイド接点は `linked: 'mirror' | 'force-guided'`。

## 信号の種類（`signal`）

`role: 'signal'` の端子・ピンに `signal: { dir, kind }` を付けると、つないだ相手との相性をチェックする。

- 出力側（`dir: 'out'`）: `npn` / `pnp` / `contact`（無電圧接点）/ `2wire`（2線式センサー。2 本とも）/ `analog-v` / `analog-i` / `line-driver`
- 入力側（`dir: 'in'`）: `dc`（DC 入力）/ `dry`（無電圧接点入力）/ `analog-v` / `analog-i` / `line-driver`
- DC 入力には、その入力点のコモン端子を `common` に書く（例: `{ dir: 'in', kind: 'dc', common: 'CN1#17' }`）。
  コモンが +V ならプラスコモン（NPN・接点を +V 側でなく 0V 側に入れる）、0V ならマイナスコモン（PNP）と判定する。
  コモン端子がなく極性が決まっている入力は `commonPolarity: '+' | '-'`。
- 検出する誤り: NPN をマイナスコモンへ / PNP をプラスコモンへ、アナログとデジタルの混在、電圧と電流の取り違え、
  無電圧入力に電圧をかける、入力とコモンが同じ極、2線式センサーのもう一端が電源に届いていない、など。
- NPN/PNP をパラメータで切り換える機器は、`terminals` を関数にして `signal.kind` と出力の `links` を切り換える。

## 安全機器

- 安全出力（OSSD）は `role: 'supply'`、`supply: { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 定格 }`、
  `function: 'ossd'`、`channel: 1 | 2` にする。電源とみなすのでコイルを直接駆動でき、OSSD どうしや電源と同じ電位になると短絡として検出する。
- テスト出力は `role: 'supply'`、`supply: { ..., kind: 'test' }`、`function: 'test-output'`、`channel`。
- 安全入力は `role: 'signal'`、`function: 'safety-input'`、`channel`。リセット・EDM なども `function` を付ける
  （`reset` / `reset-auto` / `start` / `muting` / `edm` / `safety-contact` / `aux-output` / `unlock-solenoid` / `lock-solenoid`）。
  1 つの端子が複数の機能を持つ場合は配列にする（例: リセットと EDM を兼ねる端子は `['reset', 'edm']`）。
  `reset-auto` は配線すると自動リセットになる端子（G9SA の A-B 間の短絡など）。
- 2 チャンネルの組は `safetyChannels` に書く。

  ```ts
  safetyChannels: [
    { id: 'IN', kind: 'input', mode: 'nc-nc', channels: [{ source: 'T11', input: 'T12' }, { source: 'T21', input: 'T22' }] },
    { id: 'OUT', kind: 'output', channels: [{ output: '13' }, { output: '23' }] },
  ],
  ```

  `mode` は `nc-nc`（等価。既定）/ `nc-no`（非等価。channels[0] が b 接点、[1] が a 接点）/ `ossd`（OSSD 出力機器を直接つなぐ）。
  どちらも受けられる入力は配列にする（`['nc-nc', 'ossd']`）。安全コントローラーの汎用入力のように使い方をプログラムで決める組は
  `configurable: true` にする（片側だけの配線などを注意にとどめる）。機器の設定スイッチで組が変わる場合は `safetyChannels` を関数にする。
- 強制開離するイネーブルスイッチの a 接点は `{ switch: 'NO', directOpening: true }` にすると安全入力に使える。
- 安全性能は `safety: { pl: 'e', category: '4', sil: 3, esType: 4 }`（スイッチ・接触器は `b10d` も書ける）。図面の「要求PL」を下回る機器を警告する。
- 主な安全チェック: 2 チャンネルの片側だけの配線、チャンネル間のクロス、OSSD の短絡、安全入力に a 接点、直接開路動作でない接点、
  EDM の未配線・EDM ループにミラー接点がない、冗長化されていない出力、自動リセット、スプリングロックの常時通電、0V の不一致。

## 増設ユニットの連結・ベースユニットへの装着（`bus`）

CPU の右に連結する増設ユニットや、ベースユニットに装着するユニットは `bus` を書く。図面の機器に `mount: { device: 親, slot: 位置 }` を書くと、
親の横（または `host.origin` の位置）に順に並べて描き、内部電源の収支と入出力の先頭番号を求める。

```ts
// 親（CPU・ベースユニット）
bus: { kind: 'kv-8000', host: { slots: 16, numbering: { mode: 'shared', unit: 16 } }, supply: { '5V': 3.2 } },
// 増設ユニット
bus: { kind: 'kv-8000', load: { '5V': 0.06 }, io: { inputs: 32, format: 'kv' } },
```

- `host.numbering`: `shared`（入力と出力で同じ番号の並び。KV・iQ-R）/ `separate`（入力 X と出力 Y を別に数える。FX5）。
  `unit` は 1 ユニットが占有する点数の単位、`start` は最初のユニットの先頭番号（省略時は親自身の `io` の後ろから）。
- 装着したユニットには、先頭番号（点数）が `params.ioIn` / `params.ioOut` として渡る（装着していなければ 0、または図面で指定した値）。
  ラベルに反映するには `pins` / `terminals` を関数にし、`ioName(format, 'in', p.ioIn + i)`（`src/devices/resolve.ts`）で番号を作る。
- `host.accepts` で、親が受け入れるユニットのバスの種類を複数にできる。
- ベースユニットのようにスロットの位置が決まっている親は `host.slotX`（位置ごとの x 座標）、専用の位置は `host.slotRoles: { 1: 'power', 2: 'cpu' }`
  とユニット側の `bus.role` で表す。空きスロットが番号を占有する場合は `numbering.emptySlot` に点数を書く。

## パラメータで変わる端子・ピン・内部経路

`terminals` / `pins` / `links` はパラメータを受け取って配列を返す関数にもできる（引数は既定値と `ioIn` / `ioOut` を補完済み）。
定義を読む側は `resolveDevice(def, params)`（`src/devices/resolve.ts`）を通して読む。端子 ID はパラメータで変えない（配線が外れるため）。

```ts
pins: (p) => Array.from({ length: 16 }, (_, i) => ({ id: `CN1#${i + 1}`, label: ioName('kv', 'in', Number(p.ioIn) + i), role: 'signal' })),
```

## コネクタとピン（MIL コネクタ・LAN ポートなど）

- コネクタは `role: 'connector'` の端子にし、`connector: { kind, pins, width }` を指定する。
  - `kind`: コネクタの種類。同じ種類どうしだけケーブルでつなげる（MIL 40極は `'MIL40'`、LAN は `'RJ45'`）。
  - `pins`: ピン数。ケーブルでつなぐと両端の同じ番号のピンどうしが導通する。通信用で電気的なピンを扱わない場合は 0。
  - `width`: コネクタの幅[px]（side に直交する方向）。ケーブルの芯線をこの幅に広げて描く。
  - `x, y` はコネクタの差込口の中心、`side` はケーブルが出ていく向き。
- 各ピンの名称・役割は `pins` に `{ id: 'CN1#1', label: 'R000', role: 'signal', optional: true }` のように書く
  （id は `<コネクタ端子ID>#<ピン番号>`）。ピンは画面上の端子としては表示しない。
- ピンは `links` から参照できる（例: MIL 変換端子台のピン `CN#1` とネジ端子 `1` を向きなしでつなぐ）。
- 外部から電源を供給するピン（出力ユニットの +V / COM など）は `role: 'input'` と `accepts` を指定すると、極性・電圧がチェックされる。
- 種類の違うコネクタでも変換ケーブルがあるものは `mates` に相手の kind を書く（三菱 FCN40 → `mates: ['MIL40']`）。ピンは同じ番号どうしが導通する。
- 通信ポートは `protocols`（例: `['ethernet', 'ethernet-ip']`、`['ethercat']`）を書くと、共通のプロトコルがない相手とつないだときに警告する。
- 機器の正面に差すコネクタ（MIL・RJ-45 など）は `facing: 'front'` と `length`（side 方向のプラグの長さ）を書くと、
  プラグを正面から見た形で描き、ケーブルはプラグの端から side の向きに出る。
- M8 / M12 などの丸形コネクタは `style: 'round'`、芯線の色は `pinColors: { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black' }`。
  片側がバラ線のケーブル（センサー用コネクタケーブル、MIL の片側バラ線ハーネス）は、コネクタ端子と線色ごとの端子を持つ機器として定義し、
  ピンと端子を `links` でつなぐ。

## 推定の値

メーカーの資料で確認できなかった値（端子の並び、消費電流など）は、`estimated` にその内容を書くか、説明・端子の説明に「推定」と書く。
画面の機器の情報・部品表・チェック結果に「推定を含む」と表示し、利用者が確かめるべき機器を示す。

## 確認方法

```sh
npm run render-device -- src/devices/catalog/<file>.ts <出力先>.png
```

端子位置に赤丸と端子IDを重ねた PNG（3倍拡大）を出力し、定義の整合性も検査する（`src/devices/validate.ts`。
`npm test` の `src/devices/catalog.test.ts` でも全機器・全パラメータについて同じ検査を行う）。
出力した PNG を目で見て、端子が実際のネジ位置にあるか、実物らしく見えるかを確認する。
`npm run typecheck` で型エラーがないことも確認する。
