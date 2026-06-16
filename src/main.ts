import mermaid from "mermaid";
import { EditorView, basicSetup } from "codemirror";
import { StreamLanguage } from "@codemirror/language";
import { Compartment } from "@codemirror/state";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { catppuccinMocha, catppuccinLatte } from "./catppuccin";
import "./style.css";

type UiTheme = "light" | "dark";
type ThemeName = "default" | "dark" | "forest" | "neutral";
type Curve = "basis" | "linear" | "step" | "natural";
type Background = "auto" | "white" | "dark" | "transparent";

interface Settings {
  uiTheme: UiTheme;
  diagramTheme: ThemeName;
  fontSize: number;
  curve: Curve;
  exportBackground: Background;
  exportPadding: number;
  pngScale: number;
}

const systemUiTheme = (): UiTheme =>
  window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

const DEFAULT_SETTINGS: Settings = {
  uiTheme: systemUiTheme(),
  diagramTheme: "dark",
  fontSize: 16,
  curve: "basis",
  exportBackground: "auto",
  exportPadding: 16,
  pngScale: 2,
};

const STORAGE_KEY = "mermaid-editor:code";
const SETTINGS_KEY = "mermaid-editor:settings";
const SVG_NS = "http://www.w3.org/2000/svg";

const DARK_BG = "#11131a";
const LIGHT_BG = "#ffffff";

const DEFAULT_CODE = `graph TD
  A[クライアント] -->|リクエスト| B(GitHub Pages)
  B --> C{静的ファイル}
  C -->|HTML/JS/CSS| D[ブラウザで描画]
  D --> E[Mermaid.js が SVG 生成]
  E --> F[画像として出力]`;

// ---- サンプル図 ----
interface Sample {
  label: string;
  code: string;
}

const SAMPLES: Sample[] = [
  {
    label: "Flowchart",
    code: `flowchart TD
  A[開始] --> B{条件}
  B -->|はい| C[処理 1]
  B -->|いいえ| D[処理 2]
  C --> E[終了]
  D --> E`,
  },
  {
    label: "Sequence",
    code: `sequenceDiagram
  participant U as ユーザー
  participant S as サーバー
  U->>S: リクエスト
  S-->>U: レスポンス`,
  },
  {
    label: "Class",
    code: `classDiagram
  class Animal {
    +String name
    +eat()
  }
  class Dog {
    +bark()
  }
  Animal <|-- Dog`,
  },
  {
    label: "State",
    code: `stateDiagram-v2
  [*] --> 待機
  待機 --> 実行中: 開始
  実行中 --> 完了: 終了
  完了 --> [*]`,
  },
  {
    label: "ER",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }`,
  },
  {
    label: "Gantt",
    code: `gantt
  title プロジェクト計画
  dateFormat YYYY-MM-DD
  section 設計
  要件定義 :a1, 2024-01-01, 7d
  基本設計 :after a1, 5d`,
  },
  {
    label: "Pie",
    code: `pie title 利用ブラウザ
  "Chrome" : 60
  "Safari" : 25
  "Firefox" : 15`,
  },
  {
    label: "Mindmap",
    code: `mindmap
  root((Mermaid))
    図の種類
      フローチャート
      シーケンス
    出力
      SVG
      PNG`,
  },
  {
    label: "Git",
    code: `gitGraph
  commit
  branch develop
  commit
  checkout main
  merge develop`,
  },
  {
    label: "C4",
    code: `C4Context
  title システム構成図
  Person(user, "ユーザー")
  System(app, "Web アプリ")
  Rel(user, app, "利用する")`,
  },
  {
    label: "Timeline",
    code: `timeline
  title 沿革
  2020 : 創業
  2022 : サービス開始
  2024 : 海外展開`,
  },
  {
    label: "Journey",
    code: `journey
  title 買い物体験
  section 来店
    入店: 5: 客
    商品選択: 3: 客
  section 会計
    支払い: 4: 客`,
  },
  {
    label: "Quadrant",
    code: `quadrantChart
  title 優先度マトリクス
  x-axis 低い --> 高い
  y-axis 低い --> 高い
  "施策 A": [0.3, 0.6]
  "施策 B": [0.7, 0.8]`,
  },
];

// ---- 設定の読み書き ----
const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings> & {
        theme?: ThemeName;
        background?: Background;
      };
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // 旧キー（theme / background）からの移行
        diagramTheme: parsed.diagramTheme ?? parsed.theme ?? DEFAULT_SETTINGS.diagramTheme,
        exportBackground:
          parsed.exportBackground ?? parsed.background ?? DEFAULT_SETTINGS.exportBackground,
      };
    }
  } catch {
    /* 壊れた値は無視してデフォルトに戻す */
  }
  return { ...DEFAULT_SETTINGS };
};

let settings = loadSettings();

const saveSettings = () =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

/** 出力に使う背景色を決める（透明なら null）。 */
const resolveExportBackground = (): string | null => {
  switch (settings.exportBackground) {
    case "white":
      return LIGHT_BG;
    case "dark":
      return DARK_BG;
    case "transparent":
      return null;
    case "auto":
    default:
      return settings.diagramTheme === "dark" ? DARK_BG : LIGHT_BG;
  }
};

// ---- アイコン（Lucide スタイルのインライン SVG） ----
const ICONS: Record<string, string> = {
  workflow:
    '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
  settings:
    '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  image:
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  copy:
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  maximize:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  book:
    '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  eye:
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0Z"/><circle cx="12" cy="12" r="3"/>',
  shapes:
    '<path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
};

const iconSvg = (name: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    ICONS[name] ?? ""
  }</svg>`;

const renderIcons = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = iconSvg(el.dataset.icon!);
  });
};

// ---- DOM 参照 ----
const editorParent = document.querySelector<HTMLDivElement>("#editor")!;
const previewEl = document.querySelector<HTMLDivElement>("#preview")!;
const scrollEl = document.querySelector<HTMLElement>(".preview-scroll")!;
const errorEl = document.querySelector<HTMLDivElement>("#error")!;
const layoutEl = document.querySelector<HTMLElement>(".layout")!;
const splitterEl = document.querySelector<HTMLElement>("#splitter")!;
const samplesEl = document.querySelector<HTMLElement>("#samples")!;
const samplesBody = document.querySelector<HTMLDivElement>("#samples-body")!;
const samplesToggle = document.querySelector<HTMLButtonElement>("#samples-toggle")!;

const zoomInBtn = document.querySelector<HTMLButtonElement>("#zoom-in")!;
const zoomOutBtn = document.querySelector<HTMLButtonElement>("#zoom-out")!;
const zoomResetBtn = document.querySelector<HTMLButtonElement>("#zoom-reset")!;
const zoomLevelEl = document.querySelector<HTMLSpanElement>("#zoom-level")!;

const btnTheme = document.querySelector<HTMLButtonElement>("#btn-theme")!;
const btnExport = document.querySelector<HTMLButtonElement>("#btn-export")!;
const btnSettings = document.querySelector<HTMLButtonElement>("#btn-settings")!;

const settingsEl = document.querySelector<HTMLElement>("#settings")!;
const backdropEl = document.querySelector<HTMLElement>("#backdrop")!;
const settingsClose = document.querySelector<HTMLButtonElement>("#settings-close")!;

const setTheme = document.querySelector<HTMLSelectElement>("#set-theme")!;
const setFontSize = document.querySelector<HTMLInputElement>("#set-fontsize")!;
const fontSizeValue = document.querySelector<HTMLSpanElement>("#fontsize-value")!;
const setCurve = document.querySelector<HTMLSelectElement>("#set-curve")!;

const exportModal = document.querySelector<HTMLElement>("#export-modal")!;
const exportBackdrop = document.querySelector<HTMLElement>("#export-backdrop")!;
const exportClose = document.querySelector<HTMLButtonElement>("#export-close")!;
const exportCanvas = document.querySelector<HTMLDivElement>("#export-canvas")!;
const segBg = document.querySelector<HTMLDivElement>("#export-bg")!;
const segPad = document.querySelector<HTMLDivElement>("#export-pad")!;
const segScale = document.querySelector<HTMLDivElement>("#export-scale")!;
const btnExportCopy = document.querySelector<HTMLButtonElement>("#export-copy")!;
const btnExportSvg = document.querySelector<HTMLButtonElement>("#export-svg")!;
const btnExportPng = document.querySelector<HTMLButtonElement>("#export-png")!;

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
  btnExport.disabled = !enabled;
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

// ---- UI テーマ ----
const cmTheme = new Compartment();

const applyUiTheme = () => {
  document.documentElement.dataset.theme = settings.uiTheme;
  const isDark = settings.uiTheme === "dark";
  // ヘッダーのトグルは「切り替え後のテーマ」を示すアイコンにする。
  btnTheme.innerHTML = iconSvg(isDark ? "sun" : "moon");
  btnTheme.setAttribute(
    "aria-label",
    isDark ? "ライトモードに切り替える" : "ダークモードに切り替える",
  );
};

// ---- Mermaid 設定の適用 ----
const applyMermaidConfig = () => {
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
// 画面に合わせて再フィット（自動追従も再開）。
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

// ---- ペインのリサイズ（スプリッター） ----
let resizing = false;
splitterEl.addEventListener("pointerdown", (e) => {
  resizing = true;
  splitterEl.setPointerCapture(e.pointerId);
  splitterEl.classList.add("dragging");
});
splitterEl.addEventListener("pointermove", (e) => {
  if (!resizing) return;
  const rect = layoutEl.getBoundingClientRect();
  const w = Math.max(280, Math.min(rect.width - 360, e.clientX - rect.left));
  layoutEl.style.setProperty("--editor-w", `${w}px`);
  if (!userInteracted) fitToView();
});
const endResize = () => {
  resizing = false;
  splitterEl.classList.remove("dragging");
};
splitterEl.addEventListener("pointerup", endResize);
splitterEl.addEventListener("pointercancel", endResize);

// ---- 画像出力 ----
/** プレビューの SVG を、余白・背景を反映した出力用の複製として組み立てる。 */
const buildExportSvg = (background: string | null): SVGSVGElement | null => {
  const original = previewEl.querySelector("svg");
  if (!original) return null;
  const svg = original.cloneNode(true) as SVGSVGElement;
  // 画面表示用に付与したズーム由来の inline サイズは出力に持ち込まない。
  svg.style.removeProperty("width");
  svg.style.removeProperty("height");
  svg.style.removeProperty("max-width");

  const vb = original.viewBox.baseVal;
  const baseW = vb.width || original.getBoundingClientRect().width;
  const baseH = vb.height || original.getBoundingClientRect().height;
  const x = vb.width ? vb.x : 0;
  const y = vb.height ? vb.y : 0;
  const p = settings.exportPadding;

  const outW = baseW + p * 2;
  const outH = baseH + p * 2;
  svg.setAttribute("viewBox", `${x - p} ${y - p} ${outW} ${outH}`);
  svg.setAttribute("width", String(outW));
  svg.setAttribute("height", String(outH));
  svg.setAttribute("xmlns", SVG_NS);

  if (background) {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(x - p));
    rect.setAttribute("y", String(y - p));
    rect.setAttribute("width", String(outW));
    rect.setAttribute("height", String(outH));
    rect.setAttribute("fill", background);
    svg.insertBefore(rect, svg.firstChild);
  }
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

const exportSvg = () => {
  const svg = buildExportSvg(resolveExportBackground());
  if (!svg) return;
  const blob = new Blob([svgToString(svg)], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, "diagram.svg");
  toast("SVG を保存しました");
};

const exportPng = async () => {
  const bg = resolveExportBackground();
  const svg = buildExportSvg(bg);
  if (!svg) return;
  try {
    const blob = await svgToPngBlob(svg, settings.pngScale, bg);
    downloadBlob(blob, "diagram.png");
    toast("PNG を保存しました");
  } catch (err) {
    console.error("PNG export failed:", err);
    toast(err instanceof Error ? err.message : "PNG 出力に失敗しました");
  }
};

const exportCopy = async () => {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    toast("このブラウザは画像コピーに未対応です（HTTPS が必要）");
    return;
  }
  // コピーは貼り付け先で見えるよう、透明設定でも背景を補う。
  const bg =
    resolveExportBackground() ??
    (settings.diagramTheme === "dark" ? DARK_BG : LIGHT_BG);
  const svg = buildExportSvg(bg);
  if (!svg) return;
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
};

btnExportSvg.addEventListener("click", () => void exportSvg());
btnExportPng.addEventListener("click", () => void exportPng());
btnExportCopy.addEventListener("click", () => void exportCopy());

// ---- 出力モーダル ----
/** モーダル内のプレビューを現在のデザイン設定で更新する。 */
const renderExportPreview = () => {
  exportCanvas.innerHTML = "";
  const original = previewEl.querySelector("svg");
  if (!original) return;
  const clone = original.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  clone.style.removeProperty("width");
  clone.style.removeProperty("height");
  clone.style.maxWidth = "100%";
  exportCanvas.appendChild(clone);

  const bg = resolveExportBackground();
  exportCanvas.style.padding = `${settings.exportPadding}px`;
  if (bg) {
    exportCanvas.style.background = bg;
    exportCanvas.classList.remove("checker");
  } else {
    exportCanvas.style.removeProperty("background");
    exportCanvas.classList.add("checker");
  }
};

/** セグメンテッドコントロールの選択状態を value に合わせる。 */
const syncSeg = (group: HTMLElement, value: string) => {
  group.querySelectorAll<HTMLButtonElement>(".seg-item").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.value === value);
  });
};

const syncExportUI = () => {
  syncSeg(segBg, settings.exportBackground);
  syncSeg(segPad, String(settings.exportPadding));
  syncSeg(segScale, String(settings.pngScale));
};

const openExport = () => {
  if (btnExport.disabled) return;
  syncExportUI();
  renderExportPreview();
  exportModal.hidden = false;
  exportBackdrop.hidden = false;
};
const closeExport = () => {
  exportModal.hidden = true;
  exportBackdrop.hidden = true;
};

btnExport.addEventListener("click", openExport);
exportClose.addEventListener("click", closeExport);
exportBackdrop.addEventListener("click", closeExport);

segBg.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".seg-item");
  if (!btn) return;
  settings.exportBackground = btn.dataset.value as Background;
  saveSettings();
  syncSeg(segBg, btn.dataset.value!);
  renderExportPreview();
});
segPad.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".seg-item");
  if (!btn) return;
  settings.exportPadding = Number(btn.dataset.value);
  saveSettings();
  syncSeg(segPad, btn.dataset.value!);
  renderExportPreview();
});
segScale.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".seg-item");
  if (!btn) return;
  settings.pngScale = Number(btn.dataset.value);
  saveSettings();
  syncSeg(segScale, btn.dataset.value!);
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

// UI テーマ切り替え
btnTheme.addEventListener("click", () => {
  settings.uiTheme = settings.uiTheme === "dark" ? "light" : "dark";
  applyUiTheme();
  editor.dispatch({
    effects: cmTheme.reconfigure(
      settings.uiTheme === "dark" ? catppuccinMocha : catppuccinLatte,
    ),
  });
  saveSettings();
});

// キーボード: Esc で閉じる / Cmd|Ctrl+E で出力
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!exportModal.hidden) closeExport();
    else if (!settingsEl.hidden) closeSettings();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
    e.preventDefault();
    if (exportModal.hidden) openExport();
  }
});

/** 設定値を UI コントロールに反映する。 */
const syncSettingsUI = () => {
  setTheme.value = settings.diagramTheme;
  setFontSize.value = String(settings.fontSize);
  fontSizeValue.textContent = `${settings.fontSize}px`;
  setCurve.value = settings.curve;
};

/** 図に関わる設定変更後の共通処理：保存 → Mermaid 再設定 → 再描画。 */
const onDiagramSettingsChange = () => {
  saveSettings();
  applyMermaidConfig();
  void render();
};

setTheme.addEventListener("change", () => {
  settings.diagramTheme = setTheme.value as ThemeName;
  onDiagramSettingsChange();
});
setFontSize.addEventListener("input", () => {
  settings.fontSize = Number(setFontSize.value);
  fontSizeValue.textContent = `${settings.fontSize}px`;
  onDiagramSettingsChange();
});
setCurve.addEventListener("change", () => {
  settings.curve = setCurve.value as Curve;
  onDiagramSettingsChange();
});

// ---- サンプル図 ----
/** エディタの内容をサンプルコードで置き換える（Undo で元に戻せる）。 */
const loadSample = (code: string) => {
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: code },
  });
  editor.focus();
  void render();
};

const buildSampleChips = () => {
  for (const sample of SAMPLES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = sample.label;
    chip.addEventListener("click", () => loadSample(sample.code));
    samplesBody.appendChild(chip);
  }
};

samplesToggle.addEventListener("click", () => {
  const collapsed = samplesEl.classList.toggle("collapsed");
  samplesToggle.setAttribute("aria-expanded", String(!collapsed));
});

// ---- 初期化 ----
renderIcons();
applyUiTheme();
buildSampleChips();

const initialCode = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CODE;
const debouncedRender = debounce(() => void render(), 250);

editor = new EditorView({
  doc: initialCode,
  parent: editorParent,
  extensions: [
    basicSetup,
    mermaidMode,
    cmTheme.of(settings.uiTheme === "dark" ? catppuccinMocha : catppuccinLatte),
    lintGutter(),
    mermaidLinter,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) debouncedRender();
    }),
  ],
});

syncSettingsUI();
applyMermaidConfig();
void render();
