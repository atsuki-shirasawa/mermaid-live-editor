import mermaid from "mermaid";
import { STORAGE_KEY } from "./constants";
import {
  emptyStateEl,
  errorEl,
  previewEl,
  previewPaneEl,
  renderBarEl,
} from "./dom";
import { getCode } from "./editor";
import { setExportEnabled } from "./export";
import { isDarkDiagramTheme, settings } from "./settings";
import { refreshView } from "./view";

const setError = (message: string | null) => {
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
  }
};

/** 現在の設定を Mermaid に反映する。 */
export const applyMermaidConfig = () => {
  // プレビューのキャンバス背景は UI テーマではなく図のテーマに連動させる。
  document.documentElement.dataset.diagram = isDarkDiagramTheme()
    ? "dark"
    : "light";
  mermaid.initialize({
    startOnLoad: false,
    theme: settings.diagramTheme,
    securityLevel: "loose",
    // foreignObject を避けて canvas 変換できるようにする（PNG/コピー用）。
    htmlLabels: false,
    fontSize: settings.fontSize,
    flowchart: { htmlLabels: false, curve: settings.curve },
  });
};

// 描画は非同期。最新の要求だけを反映するための連番。
let renderSeq = 0;

/** エディタの内容を描画し、プレビュー・エラー・出力可否を更新する。 */
export const render = async () => {
  const raw = getCode();
  const code = raw.trim();
  // 空コードはストレージに残さない（リロード時に初期サンプルへ戻す）。
  if (code) localStorage.setItem(STORAGE_KEY, raw);
  else localStorage.removeItem(STORAGE_KEY);

  if (!code) {
    previewEl.innerHTML = "";
    emptyStateEl.hidden = false;
    previewPaneEl.classList.remove("has-error");
    setExportEnabled(false);
    setError(null);
    return;
  }
  emptyStateEl.hidden = true;

  const seq = ++renderSeq;
  // 重い図のときだけローディングバーを出す（軽い描画ではちらつかせない）。
  const barTimer = setTimeout(() => {
    if (seq === renderSeq) renderBarEl.classList.add("active");
  }, 180);
  try {
    await mermaid.parse(code);
    const { svg } = await mermaid.render(`mermaid-${seq}`, code);
    if (seq !== renderSeq) return;
    previewEl.innerHTML = svg;
    refreshView();
    setExportEnabled(true);
    setError(null);
    previewPaneEl.classList.remove("has-error");
  } catch (err) {
    if (seq !== renderSeq) return;
    // 直近の有効な図は残したまま、エラー中であることを示す。
    setError(err instanceof Error ? err.message : String(err));
    previewPaneEl.classList.add("has-error");
  } finally {
    clearTimeout(barTimer);
    if (seq === renderSeq) renderBarEl.classList.remove("active");
  }
};
