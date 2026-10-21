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
  - 接点・信号: `signal`（電源チェック対象外。未接続警告を出さないよう `optional: true` にすることが多い）
- 内部で導通する経路は `links` に書く（接点は「閉」とみなす）。
  - 保護機器の極は `{ from: 一次側, to: 二次側, directed: true, protects: true }` とし、`protectionCurrent` に定格電流を指定する。
- 三相負荷・単相入力など、異なる相で給電されるべき端子は `distinctGroups` に書く。
- 定格電流など機種によって変わる値は `params` で選択肢にし、`{ param: 'キー' }` で参照する。

## 確認方法

```sh
npm run render-device -- src/devices/catalog/<file>.ts <出力先>.png
```

端子位置に赤丸と端子IDを重ねた PNG（3倍拡大）を出力し、定義の整合性も検査する。
出力した PNG を目で見て、端子が実際のネジ位置にあるか、実物らしく見えるかを確認する。
`npm run typecheck` で型エラーがないことも確認する。
