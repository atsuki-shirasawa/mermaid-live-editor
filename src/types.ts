// ---- アプリ全体で共有する型定義 ----

/** UI（画面）のテーマ。図のテーマ（ThemeName）とは別物。 */
export type UiTheme = "light" | "dark";

/** Mermaid の図テーマ。 */
export type ThemeName = "default" | "dark" | "forest" | "neutral";

/** フローチャートのエッジ曲線。 */
export type Curve = "basis" | "linear" | "step" | "natural";

/** 画像出力時の背景。 */
export type Background = "auto" | "white" | "dark" | "transparent";

/** 画像出力の形式。 */
export type ExportFormat = "svg" | "png";

export interface Settings {
  uiTheme: UiTheme;
  diagramTheme: ThemeName;
  fontSize: number;
  curve: Curve;
  exportFormat: ExportFormat;
  exportBackground: Background;
  exportPadding: number;
  pngScale: number;
}

/** サンプル図（チップから読み込む）。 */
export interface Sample {
  label: string;
  code: string;
}
