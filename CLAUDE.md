# Mermaid Live Editor

Mermaid 図をブラウザ上で編集・プレビュー・画像出力できる静的 SPA。
GitHub Pages へデプロイする。

## 技術スタック

- **ビルド**: Vite 6 + TypeScript 5（フレームワークなしの素の SPA）
- **エディタ**: CodeMirror 6（`@codemirror/*`）
- **描画**: Mermaid 11（クライアントサイドで `mermaid.parse` / `mermaid.render`）
- **シンタックスハイライト**: `@lezer/highlight` + 自作テーマ
- デプロイ: `.github/workflows/deploy.yml`（GitHub Actions / Node.js 24）

## コマンド

- `npm run dev` — 開発サーバー
- `npm run build` — `tsc && vite build`（型チェック込み）
- `npm run preview` — ビルド成果物のプレビュー

`vite.config.ts` の `base: "./"` は GitHub Pages 配信のため。変更しない。

## 主要ファイル

`src/` は責務ごとにモジュール分割されている。

- `index.html` — マークアップ。`<head>` の no-flash スクリプトが描画前に UI テーマを確定する
- `src/main.ts` — 各モジュールの初期化・配線のみ（UI テーマ・設定ドロワー・サンプル・キーボード）
- `src/types.ts` / `src/constants.ts` — 型定義 / 定数（永続化キー・色・初期コード）
- `src/settings.ts` — 設定の読み書き・旧キー移行・出力背景の解決
- `src/dom.ts` — DOM 参照の集約（`$` ヘルパ）
- `src/editor.ts` — CodeMirror 生成・`getCode`/`setCode`・テーマ再構成（`Compartment` を内包）
- `src/mermaid-syntax.ts` — Mermaid 用の言語定義・リンター
- `src/render.ts` — Mermaid 設定適用・描画
- `src/view.ts` — ズーム/パン/フィット・スプリッター
- `src/export.ts` — 画像出力・出力モーダル
- `src/icons.ts` — `lucide` パッケージのアイコン
- `src/samples.ts` — サンプル図データ
- `src/utils.ts` — `debounce` / `toast`
- `src/style.css` — CSS 変数（デザイントークン）で全テーマを管理
- `src/catppuccin.ts` — CodeMirror 用 Catppuccin テーマ（Mocha / Latte）。lint 表示色も含む自作テーマ
- 設定の永続化キー: `mermaid-editor:settings`（localStorage）

## コーディング規約

- **アイコンは絵文字を使わない**。`lucide` パッケージのアイコンを `data-icon` 属性で注入する（`src/icons.ts` の `ICONS` レコード参照）。新規アイコンは lucide から import して `ICONS` に登録する（キーが `data-icon` の値）
- **色は CSS 変数で管理**。`[data-theme="dark"]`（Catppuccin Mocha）/ `[data-theme="light"]`（Catppuccin Latte）に対応するトークンを `src/style.css` に定義し、コンポーネントは変数を参照する。16進カラーを直書きしない
- **UI テーマと図のテーマは別物**。UI テーマ（dark/light）は `data-theme` 属性、図のテーマ（default/dark/forest/neutral）は Mermaid の設定。混同しない
- CodeMirror のテーマ切替は `Compartment` の `reconfigure` で行う（再生成しない）
- Mermaid は `htmlLabels: false` で描画する（SVG 出力の互換性のため）
- 文言・コメント・サンプル図の内容は日本語

## フォーマット

Prettier を使用（`.prettierrc.json`）。`.claude/settings.json` の PostToolUse フックで
編集後に自動整形される。手動実行は `npx prettier --write .`。

## 画像出力

- SVG → PNG は Image + Canvas（data URI）経由
- 余白は viewBox 拡張で付与（`viewBox="${x-p} ${y-p} ${W+2p} ${H+2p}"`）
- クリップボードコピーは Safari のユーザージェスチャ保持のため Blob を Promise で渡す
