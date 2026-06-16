import mermaid from "mermaid";
import { STORAGE_KEY } from "./constants";
import { errorEl, previewEl } from "./dom";
import { getCode } from "./editor";
import { setExportEnabled } from "./export";
import { settings } from "./settings";
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
  localStorage.setItem(STORAGE_KEY, raw);

  if (!code) {
    previewEl.innerHTML = "";
    setExportEnabled(false);
    setError(null);
    return;
  }

  const seq = ++renderSeq;
  try {
    await mermaid.parse(code);
    const { svg } = await mermaid.render(`mermaid-${seq}`, code);
    if (seq !== renderSeq) return;
    previewEl.innerHTML = svg;
    refreshView();
    setExportEnabled(true);
    setError(null);
  } catch (err) {
    if (seq !== renderSeq) return;
    setError(err instanceof Error ? err.message : String(err));
  }
};
