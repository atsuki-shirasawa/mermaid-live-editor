import mermaid from "mermaid";
import { EditorView, basicSetup } from "codemirror";
import { StreamLanguage } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";
import "./style.css";

type ThemeName = "default" | "dark" | "forest" | "neutral";
type Curve = "basis" | "linear" | "step" | "natural";
type Background = "auto" | "white" | "dark" | "transparent";

interface Settings {
  theme: ThemeName;
  background: Background;
  fontSize: number;
  curve: Curve;
  pngScale: number;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  background: "auto",
  fontSize: 16,
  curve: "basis",
  pngScale: 2,
};

const STORAGE_KEY = "mermaid-editor:code";
const SETTINGS_KEY = "mermaid-editor:settings";

const DARK_BG = "#1e1e2e";
const LIGHT_BG = "#ffffff";

const DEFAULT_CODE = `graph TD
  A[クライアント] -->|リクエスト| B(GitHub Pages)
  B --> C{静的ファイル}
  C -->|HTML/JS/CSS| D[ブラウザで描画]
  D --> E[Mermaid.js が SVG 生成]
  E --> F[画像として出力]`;

// ---- 設定の読み書き ----
const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* 壊れた値は無視してデフォルトに戻す */
  }
  return { ...DEFAULT_SETTINGS };
};

let settings = loadSettings();

const saveSettings = () =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

/** 現在のテーマ・設定から描画/出力に使う背景色を決める（透明なら null）。 */
const resolveBackground = (): string | null => {
  switch (settings.background) {
    case "white":
      return LIGHT_BG;
    case "dark":
      return DARK_BG;
    case "transparent":
      return null;
    case "auto":
    default:
      return settings.theme === "dark" ? DARK_BG : LIGHT_BG;
  }
};

// ---- DOM 参照 ----
const editorParent = document.querySelector<HTMLDivElement>("#editor")!;
const previewEl = document.querySelector<HTMLDivElement>("#preview")!;
const previewPaneEl = document.querySelector<HTMLElement>("#preview-pane")!;
const scrollEl = document.querySelector<HTMLElement>(".preview-scroll")!;
const errorEl = document.querySelector<HTMLDivElement>("#error")!;

const zoomInBtn = document.querySelector<HTMLButtonElement>("#zoom-in")!;
const zoomOutBtn = document.querySelector<HTMLButtonElement>("#zoom-out")!;
const zoomResetBtn = document.querySelector<HTMLButtonElement>("#zoom-reset")!;
const zoomLevelEl = document.querySelector<HTMLSpanElement>("#zoom-level")!;
const btnCopy = document.querySelector<HTMLButtonElement>("#btn-copy")!;
const btnSvg = document.querySelector<HTMLButtonElement>("#btn-svg")!;
const btnPng = document.querySelector<HTMLButtonElement>("#btn-png")!;

const btnSettings = document.querySelector<HTMLButtonElement>("#btn-settings")!;
const settingsEl = document.querySelector<HTMLElement>("#settings")!;
const backdropEl = document.querySelector<HTMLElement>("#backdrop")!;
const settingsClose = document.querySelector<HTMLButtonElement>("#settings-close")!;

const setTheme = document.querySelector<HTMLSelectElement>("#set-theme")!;
const setBackground = document.querySelector<HTMLSelectElement>("#set-background")!;
const setFontSize = document.querySelector<HTMLInputElement>("#set-fontsize")!;
const fontSizeValue = document.querySelector<HTMLSpanElement>("#fontsize-value")!;
const setCurve = document.querySelector<HTMLSelectElement>("#set-curve")!;
const setScale = document.querySelector<HTMLSelectElement>("#set-scale")!;

// ---- ユーティリティ ----
const debounce = <T extends (...args: never[]) => void>(fn: T, ms: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

const setError = (message: string | null) => {
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
  }
};

const setExportEnabled = (enabled: boolean) => {
  btnCopy.disabled = !enabled;
  btnSvg.disabled = !enabled;
  btnPng.disabled = !enabled;
};

let toastTimer: ReturnType<typeof setTimeout>;
const toast = (message: string) => {
  let el = document.querySelector<HTMLDivElement>(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove("show"), 1800);
};

// ---- Mermaid 設定の適用 ----
const applyMermaidConfig = () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: settings.theme,
    securityLevel: "loose",
    // foreignObject を避けて canvas 変換できるようにする（PNG/コピー用）。
    htmlLabels: false,
    fontSize: settings.fontSize,
    flowchart: { htmlLabels: false, curve: settings.curve },
  });
};

// ---- エディタ（CodeMirror） ----
let editor: EditorView;
const getCode = () => editor.state.doc.toString();

// Mermaid 用の簡易シンタックスハイライト。
const MERMAID_KEYWORDS =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|subgraph|end|participant|actor|loop|alt|opt|par|rect|note|activate|deactivate|class|state|section|title|direction)\b/;

const mermaidMode = StreamLanguage.define({
  token(stream) {
    if (stream.match(/%%.*/)) return "comment";
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return "string";
    if (stream.match(/(<-->|--?>|==?>|-\.->|--[xo]|===|---|-\.-|:::)/))
      return "operator";
    if (stream.match(/\b(TB|TD|BT|RL|LR)\b/)) return "atom";
    if (stream.match(MERMAID_KEYWORDS)) return "keyword";
    if (stream.match(/[A-Za-z_][\w-]*/)) return "variableName";
    if (stream.match(/\d+/)) return "number";
    stream.next();
    return null;
  },
});

/** Mermaid のパースエラーをエディタ上の診断（下線＋ガター印）に変換する。 */
const mermaidLinter = linter(
  async (view): Promise<Diagnostic[]> => {
    const code = view.state.doc.toString();
    if (!code.trim()) return [];
    try {
      await mermaid.parse(code);
      return [];
    } catch (err) {
      const doc = view.state.doc;
      const message = err instanceof Error ? err.message : String(err);
      // エラー位置（行）を hash.loc またはメッセージの "line N" から推定する。
      const hash = (err as { hash?: { loc?: { first_line?: number } } }).hash;
      let lineNo = hash?.loc?.first_line ?? Number(message.match(/line (\d+)/i)?.[1]);
      if (lineNo && Number.isFinite(lineNo)) {
        lineNo = Math.min(Math.max(lineNo, 1), doc.lines);
        const line = doc.line(lineNo);
        return [{ from: line.from, to: line.to, severity: "error", message }];
      }
      return [{ from: 0, to: doc.length, severity: "error", message }];
    }
  },
  { delay: 300 },
);

// ---- 描画 ----
let renderSeq = 0;

const applyPreviewBackground = () => {
  const bg = resolveBackground();
  if (bg) {
    previewPaneEl.style.background = bg;
    previewPaneEl.classList.remove("checker");
  } else {
    previewPaneEl.style.removeProperty("background");
    previewPaneEl.classList.add("checker");
  }
};

const render = async () => {
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

// ---- ズーム & パン ----
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 5;
const FIT_PADDING = 32; // フィット時にプレビュー領域に残す余白(px)
let zoom = 1;
let panX = 0;
let panY = 0;
// ユーザーが手動でズーム/パンしたら true。以後は自動フィットしない。
let userInteracted = false;

/** 現在のズーム・移動量を transform でプレビューに反映する。 */
const applyTransform = () => {
  previewEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
};

const setZoom = (next: number) => {
  zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
  applyTransform();
};

/** SVG の表示サイズを viewBox の自然サイズに固定する（Mermaid の max-width を解除）。 */
const normalizeSvgSize = () => {
  const svg = previewEl.querySelector("svg");
  if (!svg) return;
  const vbW = svg.viewBox.baseVal.width;
  const vbH = svg.viewBox.baseVal.height;
  if (vbW && vbH) {
    svg.style.maxWidth = "none";
    svg.style.width = `${vbW}px`;
    svg.style.height = `${vbH}px`;
  }
};

/** 図をプレビュー領域いっぱいにフィットさせる（中央・余白あり）。 */
const fitToView = () => {
  const svg = previewEl.querySelector("svg");
  if (!svg) {
    applyTransform();
    return;
  }
  const vbW = svg.viewBox.baseVal.width;
  const vbH = svg.viewBox.baseVal.height;
  panX = 0;
  panY = 0;
  if (vbW && vbH) {
    const availW = Math.max(scrollEl.clientWidth - FIT_PADDING, 50);
    const availH = Math.max(scrollEl.clientHeight - FIT_PADDING, 50);
    const scale = Math.min(availW / vbW, availH / vbH);
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
  }
  applyTransform();
};

/** 描画後にビューを更新する。未操作ならフィット、操作済みなら現在の倍率を維持。 */
const refreshView = () => {
  normalizeSvgSize();
  if (userInteracted) applyTransform();
  else fitToView();
};

zoomInBtn.addEventListener("click", () => {
  userInteracted = true;
  setZoom(zoom * 1.2);
});
zoomOutBtn.addEventListener("click", () => {
  userInteracted = true;
  setZoom(zoom / 1.2);
});
// ⤢: 画面に合わせて再フィット（自動追従も再開）。
zoomResetBtn.addEventListener("click", () => {
  userInteracted = false;
  fitToView();
});

// マウスホイール / トラックパッドでズーム。
scrollEl.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    userInteracted = true;
    setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  },
  { passive: false },
);

// 図を掴んで自由な位置にドラッグで移動する。
let panning = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPanX = 0;
let dragStartPanY = 0;

scrollEl.addEventListener("pointerdown", (e) => {
  panning = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartPanX = panX;
  dragStartPanY = panY;
  scrollEl.setPointerCapture(e.pointerId);
  scrollEl.classList.add("panning");
});

scrollEl.addEventListener("pointermove", (e) => {
  if (!panning) return;
  userInteracted = true;
  panX = dragStartPanX + (e.clientX - dragStartX);
  panY = dragStartPanY + (e.clientY - dragStartY);
  applyTransform();
});

const endPan = () => {
  panning = false;
  scrollEl.classList.remove("panning");
};
scrollEl.addEventListener("pointerup", endPan);
scrollEl.addEventListener("pointercancel", endPan);

// ウィンドウリサイズ時、未操作なら再フィット。
window.addEventListener("resize", () => {
  if (!userInteracted) fitToView();
});

// ---- 画像出力 ----
/** プレビューの SVG を width/height 明示の複製として取得する。 */
const getSvgElement = (): SVGSVGElement | null => {
  const original = previewEl.querySelector("svg");
  if (!original) return null;
  const svg = original.cloneNode(true) as SVGSVGElement;
  // 画面表示用に付与したズーム由来の inline サイズは出力に持ち込まない。
  svg.style.removeProperty("width");
  svg.style.removeProperty("height");
  const width = original.viewBox.baseVal.width || original.getBoundingClientRect().width;
  const height = original.viewBox.baseVal.height || original.getBoundingClientRect().height;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return svg;
};

/** SVG の先頭に背景の rect を差し込む（SVG 保存用。bg が null なら何もしない）。 */
const withBackgroundRect = (svg: SVGSVGElement, bg: string | null) => {
  if (!bg) return svg;
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", "100%");
  rect.setAttribute("height", "100%");
  rect.setAttribute("fill", bg);
  svg.insertBefore(rect, svg.firstChild);
  return svg;
};

const svgToString = (svg: SVGSVGElement): string =>
  new XMLSerializer().serializeToString(svg);

/** SVG を PNG の Blob に変換する。background が null なら透明背景。 */
const svgToPngBlob = async (
  svg: SVGSVGElement,
  scale: number,
  background: string | null,
): Promise<Blob> => {
  const source = svgToString(svg);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("SVG を画像として読み込めませんでした"));
    img.src = url;
  });

  const width = svg.width.baseVal.value || img.naturalWidth;
  const height = svg.height.baseVal.value || img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("PNG 変換に失敗しました")),
      "image/png",
    );
  });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

btnSvg.addEventListener("click", () => {
  const svg = getSvgElement();
  if (!svg) return;
  withBackgroundRect(svg, resolveBackground());
  const blob = new Blob([svgToString(svg)], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, "diagram.svg");
});

btnPng.addEventListener("click", async () => {
  const svg = getSvgElement();
  if (!svg) return;
  try {
    const blob = await svgToPngBlob(svg, settings.pngScale, resolveBackground());
    downloadBlob(blob, "diagram.png");
  } catch (err) {
    console.error("PNG export failed:", err);
    toast(err instanceof Error ? err.message : "PNG 出力に失敗しました");
  }
});

btnCopy.addEventListener("click", async () => {
  const svg = getSvgElement();
  if (!svg) return;
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    toast("このブラウザは画像コピーに未対応です（HTTPS が必要）");
    return;
  }
  // コピーは貼り付け先で見えるよう、透明設定でも背景を補う。
  const bg = resolveBackground() ?? (settings.theme === "dark" ? DARK_BG : LIGHT_BG);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": svgToPngBlob(svg, settings.pngScale, bg),
      }),
    ]);
    toast("画像をクリップボードにコピーしました");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    toast(
      err instanceof Error ? `コピー失敗: ${err.message}` : "コピーに失敗しました",
    );
  }
});

// ---- 設定ドロワー ----
const openSettings = () => {
  settingsEl.hidden = false;
  backdropEl.hidden = false;
};
const closeSettings = () => {
  settingsEl.hidden = true;
  backdropEl.hidden = true;
};

btnSettings.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
backdropEl.addEventListener("click", closeSettings);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !settingsEl.hidden) closeSettings();
});

/** 設定値を UI コントロールに反映する。 */
const syncSettingsUI = () => {
  setTheme.value = settings.theme;
  setBackground.value = settings.background;
  setFontSize.value = String(settings.fontSize);
  fontSizeValue.textContent = `${settings.fontSize}px`;
  setCurve.value = settings.curve;
  setScale.value = String(settings.pngScale);
};

/** 設定変更後の共通処理：保存 → Mermaid 再設定 → 再描画 → 背景反映。 */
const onSettingsChange = () => {
  saveSettings();
  applyMermaidConfig();
  applyPreviewBackground();
  void render();
};

setTheme.addEventListener("change", () => {
  settings.theme = setTheme.value as ThemeName;
  onSettingsChange();
});
setBackground.addEventListener("change", () => {
  settings.background = setBackground.value as Background;
  onSettingsChange();
});
setFontSize.addEventListener("input", () => {
  settings.fontSize = Number(setFontSize.value);
  fontSizeValue.textContent = `${settings.fontSize}px`;
  onSettingsChange();
});
setCurve.addEventListener("change", () => {
  settings.curve = setCurve.value as Curve;
  onSettingsChange();
});
setScale.addEventListener("change", () => {
  settings.pngScale = Number(setScale.value);
  saveSettings(); // 解像度は再描画不要
});

// ---- 初期化 ----
const initialCode = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CODE;
const debouncedRender = debounce(() => void render(), 250);

editor = new EditorView({
  doc: initialCode,
  parent: editorParent,
  extensions: [
    basicSetup,
    mermaidMode,
    oneDark,
    lintGutter(),
    mermaidLinter,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) debouncedRender();
    }),
  ],
});

syncSettingsUI();
applyMermaidConfig();
applyPreviewBackground();
void render();
