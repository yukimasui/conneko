# 図面データ（JSON）の形式

Conneko の図面は次の形式の JSON で保存・読み込みする。生成AIに編集させることを想定し、単純で自己記述的な構造にしている。
型定義は `src/model/diagram.ts`。

```json
{
  "format": "conneko-diagram",
  "version": 1,
  "devices": [
    { "id": "PS1", "type": "generic.power-source.3p200v", "x": 100, "y": 0 },
    { "id": "ELB1", "type": "mitsubishi.nv32-sv.3p", "x": 40, "y": 180, "params": { "ratedCurrent": 20 } }
  ],
  "wires": [
    {
      "id": "W1",
      "from": { "device": "PS1", "terminal": "R" },
      "to": { "device": "ELB1", "terminal": "1" },
      "wireNo": "R",
      "color": "black",
      "sizeSq": 3.5,
      "wireType": "KIV"
    }
  ]
}
```

## devices（機器）

| キー | 必須 | 説明 |
|---|---|---|
| `id` | ○ | 機器名。図面内で一意（例: `ELB1`）。空白と `.` は使えない |
| `type` | ○ | 機器種別。`src/devices/catalog/` の各定義の `type` |
| `x`, `y` |  | キャンバス上の位置（左上, px）。省略時は自動で並べる |
| `params` |  | 機器パラメータ（定格電流など）。キーと選択肢は機器定義の `params`。装着していない I/O ユニットの先頭番号は `ioIn` / `ioOut`（点数）で指定できる |
| `mount` |  | 増設ユニットの連結・ベースユニットへの装着。`{ "device": 親の機器名, "slot": 位置（1 から） }` |
| `sheet` |  | 配置するシートの id（`sheets`）。省略時は最初のシート |
| `comments` |  | 端子・ピンごとのコメント（PLC の入出力の用途など）。`{ "CN1#1": "PH1 ワーク検出" }` |
| `note` |  | 機器のコメント（何をするものか。例: `"ワーク検出（コンベア入口）"`） |

### シートとリンク

図面は回路の意味ごとにシート（タブ）に分けられる。

```json
"sheets": [{ "id": "S1", "name": "主回路" }, { "id": "S2", "name": "PLC" }]
```

- 電線は同じシートの機器どうしだけをつなぐ。別のシートへは **リンク**（`type: "generic.link"`）を両方のシートに置き、
  同じ名前（`params.name`）にしてそれぞれ電線でつなぐ。名前が同じリンクどうしは導通する（同じシートの中で使ってもよい）。
  `params.side` は電線をつなぐ側（`"auto"`（既定。つないだ相手の端子のある側）/ `"left"` / `"right"`）。
- シートをまたぐ電線を書いて読み込んだ場合は、アプリが自動で両端にリンクを置いた形に置き換える。
- 相手のいないリンク・名前のないリンク・電線のつながっていないリンクは警告する。

### 装着（mount）

CPU の右に連結する増設ユニットや、ベースユニットに装着するユニットは `mount` で親を指定する。

```json
{ "id": "PLC1", "type": "keyence.kv-8000.cpu", "x": 600, "y": 0 },
{ "id": "IN1", "type": "keyence.kv-c32xc.input", "x": 0, "y": 0, "mount": { "device": "PLC1", "slot": 1 } },
{ "id": "OUT1", "type": "keyence.kv-c32tc.output", "x": 0, "y": 0, "mount": { "device": "PLC1", "slot": 2 } }
```

- 装着したユニットは親の横（ベースユニットなら上）に位置の順で並べて描く（`x` / `y` は無視される）。
- 入出力の先頭番号は位置の順に自動で割り付けられ、端子・ピンの名前に反映される。
- 親と同じ系列（バス）のユニットだけを装着できる。スロット数・内部電源（5V など）の消費電流の合計もチェックする。

## settings（図面の設定）

| キー | 説明 |
|---|---|
| `requiredPL` | 安全機能に要求するパフォーマンスレベル（ISO 13849-1。`"a"`〜`"e"`）。これを下回る安全機器を警告する |

## wires（電線）

| キー | 必須 | 説明 |
|---|---|---|
| `from`, `to` | ○ | 接続する端子 `{ "device": 機器名, "terminal": 端子ID }`。`"ELB1.1"` のような文字列でもよい |
| `id` |  | 電線ID（例: `W1`）。省略・重複時は自動採番 |
| `wireNo` |  | 線番 |
| `color` |  | 電線色ID（`src/data/wires.ts` の `WIRE_COLORS`）。既定は `DEFAULT_WIRE` |
| `sizeSq` |  | 太さ（公称断面積 mm²） |
| `wireType` |  | 電線の種類ID（`src/data/wires.ts` の `WIRE_TYPES`） |
| `bend` |  | 配線の曲がり位置の調整量[px]。ユーザーが手で調整した場合のみ |
| `route` |  | 手で曲げた経路（両端の端子から少し出た点どうしの間の頂点 `[{ "x", "y" }, …]`）。ユーザーが手で曲げた場合のみ |

電線に向きはない（`from` と `to` を入れ替えても同じ）。1つの端子に複数の電線をつないでもよい（渡り配線）。

### ケーブル（コネクタ間の接続）

MIL コネクタや LAN ポートなど、`role: 'connector'` の端子どうしはケーブルでつなぐ。ケーブルも `wires` の1要素として書き、
`wireType` を `"CABLE"` にする（`color` / `sizeSq` は使わない。`wireNo` はケーブル名として表示される）。

```json
{ "from": { "device": "IN1", "terminal": "CN1" }, "to": { "device": "TB2", "terminal": "CN" }, "wireType": "CABLE", "wireNo": "CBL1" }
```

- 同じ種類（`connector.kind`）のコネクタどうしだけをつなげる。変換ケーブルがある組み合わせ（三菱 FCN40 と MIL40 など、機器定義の `connector.mates`）もつなげる。
- 通信ポートは、両端に共通の通信方式（`connector.protocols`。Ethernet と EtherCAT など）がないと警告する。
- ケーブルでつなぐと、両端の同じ番号のピンどうしが導通する（例: PLC 側 `CN1#1` ↔ 変換端子台側 `CN#1`）。
- MIL ケーブルは、コネクタ付近で色付きの芯線が広がり黒いシースにまとまる多芯ケーブルとして描画される。M8 / M12 の丸形コネクタは灰色のセンサーケーブルとして描画される。

## 生成AIとのやりとり

1. アプリの「AI用にコピー」で、指示文・使用中の機器の端子一覧・現在のチェック結果・図面JSON をまとめてクリップボードにコピーする。
2. ChatGPT や Claude に貼り付け、返ってきた JSON をアプリの「JSONを貼り付け」で読み込む（```json のコードブロックのままでよい）。
