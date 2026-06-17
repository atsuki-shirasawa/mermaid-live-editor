<div align="center">

<img src="public/icon-512.png" alt="Mermaid Editor ロゴ" width="112" height="112" />

# Mermaid Editor

Mermaid のコードを入力するとリアルタイムで図を描画し、SVG / PNG での保存・クリップボードへのコピーができる静的 Web アプリです。GitHub Pages でそのまま公開できます（サーバー不要・すべてブラウザ内で完結）。

<a href="https://atsuki-shirasawa.github.io/mermaid-live-editor/"><strong>▶ ライブデモ</strong></a>

</div>

## 機能

- Mermaid コードのライブプレビュー（入力 250ms デバウンス）
- SVG として保存
- PNG として保存（2倍解像度）
- 画像をクリップボードにコピー（要 HTTPS）
- 入力内容を localStorage に自動保存

## 開発

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ に静的ファイルを出力
npm run preview  # ビルド結果をローカル確認
```

## GitHub Pages へのデプロイ

1. このリポジトリを GitHub に push する（`main` ブランチ）。
2. GitHub のリポジトリ設定 → **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定する。
3. `main` に push すると `.github/workflows/deploy.yml` が動き、自動でビルド & デプロイされる。

`vite.config.ts` の `base: "./"` により、`https://<user>.github.io/<repo>/` のようなプロジェクトページでもアセット参照が壊れません。

## 構成

- Vite + TypeScript
- mermaid（描画エンジン）
- 画像出力はブラウザの Canvas / Blob / Clipboard API を使用
