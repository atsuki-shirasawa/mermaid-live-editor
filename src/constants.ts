// ---- 定数 ----

/** エディタ本文の永続化キー。 */
export const STORAGE_KEY = "mermaid-editor:code";

/** 設定の永続化キー。 */
export const SETTINGS_KEY = "mermaid-editor:settings";

export const SVG_NS = "http://www.w3.org/2000/svg";

/** 出力・背景に使う基準色。 */
export const DARK_BG = "#11131a";
export const LIGHT_BG = "#ffffff";

/** 初回起動時に表示するサンプルコード。 */
export const DEFAULT_CODE = `graph TD
  A[クライアント] -->|リクエスト| B(GitHub Pages)
  B --> C{静的ファイル}
  C -->|HTML/JS/CSS| D[ブラウザで描画]
  D --> E[Mermaid.js が SVG 生成]
  E --> F[画像として出力]`;
