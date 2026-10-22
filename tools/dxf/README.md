# conneko-dxf

Conneko の展開図 JSON（`conneko-schematic`）を DXF に変換する Python スクリプト。
展開図 JSON は座標・記号・線・文字がすべて解決済みで、このスクリプトは図形を DXF に写すだけにする。
形式と全体の設計は [docs/schematic-dxf.md](../../docs/schematic-dxf.md)、型は `src/schematic/format.ts`。

配布する HTML には含めない補助ツール。[uv](https://docs.astral.sh/uv/) で動かす。

## 使い方

```sh
cd tools/dxf
uv sync                                  # 初回だけ（ezdxf を入れる）
uv run conneko_dxf.py 展開図.json 出力.dxf
uv run conneko_dxf.py 展開図.json 出力.dxf --split   # シートごとに 出力-<シートID>.dxf
uv sync --extra preview                  # PNG で確かめる場合（matplotlib を入れる）
uv run conneko_dxf.py 展開図.json 出力.dxf --png
```

- DXF は AutoCAD 2013 形式（文字は UTF-8）。IJCAD で開く想定。
- 単位は mm。既定では全シートをモデル空間に横に並べる（間隔 20mm）。
- レイヤーは展開図 JSON の `layers`（FRAME / SYMBOL / WIRE / WIRENO / TAG / TEXT）。
- 記号はブロックになり、機器名・端子番号などは属性（ATTRIB、TAG レイヤー）になる。記号の図形は画層 0 で描くので、
  配置した画層（SYMBOL）の色を受け継ぐ。
- 文字スタイル `CONNEKO`（MS ゴシック `msgothic.ttc`）、破線は線種 `CONNEKO_DASH`。
- 書き出す前に ezdxf の監査（audit）を行い、エラーがあれば書き出さずに終了コード 1 で終わる。
- `--png` の確認画像は、MS ゴシックが無い環境（Linux など）では Noto Sans CJK などに差し替えて描く（DXF の中身は変えない）。

## 見本とテスト

`samples/sample.json` は記号ライブラリの全記号の一覧と、自己保持回路の段の見本。アプリ側で作る。

```sh
npm run schematic-sample            # samples/sample.json を作り直す（リポジトリのルートで）
npm run schematic-sample -- out.json --png   # アプリ側の描画（SVG）の PNG も出す
cd tools/dxf && uv run python -m unittest    # DXF にして読み戻すテスト
```

記号ライブラリ（`src/schematic/symbols.ts`）を変えたら `npm run schematic-sample` で見本を作り直してコミットする。
