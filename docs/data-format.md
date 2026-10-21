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
| `params` |  | 機器パラメータ（定格電流など）。キーと選択肢は機器定義の `params` |

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

電線に向きはない（`from` と `to` を入れ替えても同じ）。1つの端子に複数の電線をつないでもよい（渡り配線）。

### ケーブル（コネクタ間の接続）

MIL コネクタや LAN ポートなど、`role: 'connector'` の端子どうしはケーブルでつなぐ。ケーブルも `wires` の1要素として書き、
`wireType` を `"CABLE"` にする（`color` / `sizeSq` は使わない。`wireNo` はケーブル名として表示される）。

```json
{ "from": { "device": "IN1", "terminal": "CN1" }, "to": { "device": "TB2", "terminal": "CN" }, "wireType": "CABLE", "wireNo": "CBL1" }
```

- 同じ種類（`connector.kind`）のコネクタどうしだけをつなげる。
- ケーブルでつなぐと、両端の同じ番号のピンどうしが導通する（例: PLC 側 `CN1#1` ↔ 変換端子台側 `CN#1`）。
- MIL ケーブルは、コネクタ付近で色付きの芯線が広がり黒いシースにまとまる多芯ケーブルとして描画される。

## 生成AIとのやりとり

1. アプリの「AI用にコピー」で、指示文・使用中の機器の端子一覧・現在のチェック結果・図面JSON をまとめてクリップボードにコピーする。
2. ChatGPT や Claude に貼り付け、返ってきた JSON をアプリの「JSONを貼り付け」で読み込む（```json のコードブロックのままでよい）。
