// ---- DOM 参照 ----
// querySelector を一箇所に集約する。各モジュールはここから import する。
const $ = <T extends Element>(selector: string): T =>
  document.querySelector<T>(selector)!;

// エディタ / プレビュー
export const editorParent = $<HTMLDivElement>("#editor");
export const previewEl = $<HTMLDivElement>("#preview");
export const scrollEl = $<HTMLElement>(".preview-scroll");
export const errorEl = $<HTMLDivElement>("#error");
export const layoutEl = $<HTMLElement>(".layout");
export const splitterEl = $<HTMLElement>("#splitter");

// サンプル図
export const samplesEl = $<HTMLElement>("#samples");
export const samplesBody = $<HTMLDivElement>("#samples-body");
export const samplesToggle = $<HTMLButtonElement>("#samples-toggle");

// ズーム
export const zoomInBtn = $<HTMLButtonElement>("#zoom-in");
export const zoomOutBtn = $<HTMLButtonElement>("#zoom-out");
export const zoomResetBtn = $<HTMLButtonElement>("#zoom-reset");
export const zoomLevelEl = $<HTMLSpanElement>("#zoom-level");

// ヘッダー操作
export const btnTheme = $<HTMLButtonElement>("#btn-theme");
export const btnExport = $<HTMLButtonElement>("#btn-export");
export const btnSettings = $<HTMLButtonElement>("#btn-settings");

// 設定ドロワー
export const settingsEl = $<HTMLElement>("#settings");
export const backdropEl = $<HTMLElement>("#backdrop");
export const settingsClose = $<HTMLButtonElement>("#settings-close");
export const setTheme = $<HTMLSelectElement>("#set-theme");
export const setFontSize = $<HTMLInputElement>("#set-fontsize");
export const fontSizeValue = $<HTMLSpanElement>("#fontsize-value");
export const setCurve = $<HTMLSelectElement>("#set-curve");

// 出力モーダル
export const exportModal = $<HTMLElement>("#export-modal");
export const exportBackdrop = $<HTMLElement>("#export-backdrop");
export const exportClose = $<HTMLButtonElement>("#export-close");
export const exportCanvas = $<HTMLDivElement>("#export-canvas");
export const segFormat = $<HTMLDivElement>("#export-format");
export const segBg = $<HTMLDivElement>("#export-bg");
export const segPad = $<HTMLDivElement>("#export-pad");
export const segScale = $<HTMLDivElement>("#export-scale");
export const segScaleGroup = $<HTMLDivElement>("#export-scale-group");
export const exportHint = $<HTMLSpanElement>("#export-hint");
export const btnExportCopy = $<HTMLButtonElement>("#export-copy");
export const btnExportDownload = $<HTMLButtonElement>("#export-download");
