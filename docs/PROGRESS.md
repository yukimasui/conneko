# 進捗

最終更新: 2026-10-23（別の環境へ引き継ぐ時点）

## 現在地

- `main` は `8c4dc3d`（PR #27 のマージ）。作業中のブランチ・未コミットの変更はない
- 直近で入れたもの
  - PR #26 端子の案内: 選択中の機器の端子に呼び名の吹き出し、ホバーで即ポップアップ、インスペクタの端子表（ADR-001・002）
  - PR #27 コネクタの「つなげる機器」の候補: コネクタから引いて離す／インスペクタの「つなぐ機器を選ぶ…」で、合う機器を置いてケーブルでつなぐ（ADR-003・004）
- 設計判断は [DECISIONS.md](DECISIONS.md) の ADR-001〜004

## 次にやること（ユーザーの判断待ち）

1. **装着が必要なユニットの扱い**（未決）: コネクタの候補で RCON-PC などゲートウェイへの装着が必要なユニットを選ぶと、単独で置いて「装着が必要」のタグを出すだけ。
   選択肢: (a) ゲートウェイ（RCON-GW など）も一緒に置いて装着する、(b) いまのまま
2. **次の作業の候補**（ユーザーに選んでもらう）
   - `hint` がまだない機器への追加（`omron.g7sa-3a1b` など）
   - インスペクタの端子表の行にマウスを乗せたら、キャンバスの端子を強調する
   - `vite.config.ts` の Vite 8 の警告 2 件の修正（下の「既知の落とし穴」）

## 作業リスト

- [x] 端子の短い呼び名 `hint` と、吹き出しの文字の決め方（`src/devices/hint.ts`）
- [x] 主要な機器への `hint` の書き足し（リレー・ブレーカー・電磁接触器・サーマル・電源・負荷）
- [x] 選択中の機器の吹き出し、ホバーのポップアップ（`src/editor/TerminalHints.tsx`）、インスペクタの端子表
- [x] 端子の案内のユーザー確認（縦書きの吹き出しも OK）
- [x] コネクタの「つなげる機器」の候補（`src/model/mates.ts`、`ConnectPicker`・インスペクタの入口）
- [ ] コネクタの候補のユーザー目視確認（下記。PR #27 はユーザーの判断でマージ済み）
- [ ] 装着が必要なユニットの扱いを決めて実装（上記）

## ユーザーの目視確認が必要な項目

- コネクタの候補: ロボシリンダー（RCP6・RCS4）のモーターコネクタから線を引いて離したときの候補の並び・説明・タグ
  （「ケーブル 2 本」「〜を変更」「装着が必要」）が分かりやすいか
- インスペクタの「つなぐ機器を選ぶ…」から置いたときの位置（コネクタの外側 160px）
- 端子の吹き出し: 機器の上側の吹き出しが機器名のラベル（PSU1 など）に重なる（選択中だけなので許容とした）。拡大率が低いと文字が小さくて読めない

（確認済み: 電線をドラッグ中につなぎ先の端子へ乗せてもポップアップが出る。コネクタの候補をドラッグ・インスペクタの両方から選んで置ける。いずれも Playwright で確認）

## 積み残し

- コネクタの候補で、装着が必要なユニットは単独で置かれる（上記 1）
- コネクタの候補は「引いた側と同じ分類（category）の機器は除く」で絞っている（ADR-004）。同じ分類どうしで本当につなぐ組み合わせが出てきたら、
  `ConnectorSpec` にオス・メスを持たせる案を見直す
- `hint` を書いていない機器: `omron.g7sa-3a1b`（自動の呼び名が長い）。FX5U の入出力・MIL 変換端子台・端子台は意味がつなぐ相手で決まるため対象外
- インスペクタの端子表の行にマウスを乗せたら、キャンバスの端子を強調する（未実装）

## 既知の落とし穴

### 環境
- 元の環境の git には user.name / user.email が未設定だった。コミットは `git -c user.name=yukimasui -c user.email=6rr.2525gnm@gmail.com commit …` で行った（過去のコミットと同じ作成者）。
  新しい環境で設定済みなら不要
- 元の環境ではリモートが https なのに git の credential helper がなく、push に失敗した。`gh` はログイン済みだったので
  `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push` で push した（設定は変えていない）。`gh auth setup-git` を一度流せば常用できる
- Claude Code の auto mode は `gh pr merge` を「レビューなしのマージ」として止める。PR のマージはユーザーが `! gh pr merge <番号> --merge` で実行している
- clone 直後は `node_modules` がないので `npm ci` から（ないと `npm run build` が `tsc: not found` で落ちる）

### 検査・テスト
- コミット前に流すもの: `npm run typecheck` / `npx vitest run` / `npm run build`（リンタ・フォーマッタの設定はリポジトリにない）
- `src/check/rules.test.ts` の iQ-R 装着のテストは、registry の動的 import（全機器の読み込み）がテスト時間に含まれる。既定の 5 秒では不定期に落ちたので 30 秒にした。
  全機器を読み込む新しいテストを書くときは、registry をファイルの先頭で import する（テスト時間に含めない）
- `vite.config.ts` について Vite 8 が警告を出す（`./package.json` の import に `with { type: 'json' }`、`./build/third-party` に拡張子を付けること）。いまは動作に影響しない

### 調べ方
- 吹き出しが出ない・長すぎる端子の一覧は、`deviceDefinitions` を回して `terminalCallout()`（`src/devices/hint.ts`）が undefined のもの・`terminalHint()` が 8 文字を超えるものを書き出す一時テストで出せる（`import.meta.glob` を使う registry は tsx では読めないため、vitest の一時テストにする。終わったら消す）
- 機器定義の変更が意図した項目だけか（`hint` だけ、など）は、全機種・全パラメータ（`paramVariants`）の `resolveDevice` の結果と SVG を JSON に書き出し、
  変更前（`git stash`）と比べると確かめられる
- 画面の確認は、`playwright-core` をリポジトリの外に入れ、システムの Chrome（`executablePath`）で `dist/index.html` を開いて行った。
  図面は `input[type=file]` に JSON を `setInputFiles` で読み込ませる。ドラッグは `mouse.down/move/up`（離す位置がキャンバスの外・タブの帯にならないよう注意）。
  端子は `.react-flow__node[data-id="<機器ID>"] .react-flow__handle[data-handleid="<端子ID>"]` で取れる
