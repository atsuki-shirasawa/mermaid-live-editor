import { DARK_BG, LIGHT_BG, SVG_NS } from "./constants";
import {
  btnExport,
  btnExportCopy,
  btnExportDownload,
  copyLabel,
  exportBackdrop,
  exportCanvas,
  exportClose,
  exportExt,
  exportFilename,
  exportHint,
  exportModal,
  previewEl,
  segBg,
  segFormat,
  segPad,
  segScale,
  segScaleGroup,
} from "./dom";
import { createFocusTrap } from "./focus-trap";
import {
  isDarkDiagramTheme,
  resolveExportBackground,
  saveSettings,
  settings,
} from "./settings";
import type { Background, ExportFormat } from "./types";
import { toast } from "./utils";

export const setExportEnabled = (enabled: boolean) => {
  btnExport.disabled = !enabled;
};

// ---- 出力用 SVG の組み立て ----
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
    img.onerror = () =>
      reject(new Error("SVG を画像として読み込めませんでした"));
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

/** 入力欄のファイル名（空ならデフォルト）。拡張子は形式から付与する。 */
const fileBase = (): string => exportFilename.value.trim() || "diagram";

/** 出力画像の実寸（余白込み・PNG は解像度倍率込み）を求める。 */
const outputDimensions = (): { w: number; h: number } | null => {
  const original = previewEl.querySelector("svg");
  if (!original) return null;
  const vb = original.viewBox.baseVal;
  const baseW = vb.width || original.getBoundingClientRect().width;
  const baseH = vb.height || original.getBoundingClientRect().height;
  const p = settings.exportPadding;
  const scale = settings.exportFormat === "png" ? settings.pngScale : 1;
  return {
    w: Math.round((baseW + p * 2) * scale),
    h: Math.round((baseH + p * 2) * scale),
  };
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---- 各出力アクション ----
const exportSvg = () => {
  const svg = buildExportSvg(resolveExportBackground());
  if (!svg) return;
  const blob = new Blob([svgToString(svg)], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, `${fileBase()}.svg`);
  toast("SVG を保存しました");
};

const exportPng = async () => {
  const bg = resolveExportBackground();
  const svg = buildExportSvg(bg);
  if (!svg) return;
  try {
    const blob = await svgToPngBlob(svg, settings.pngScale, bg);
    downloadBlob(blob, `${fileBase()}.png`);
    toast("PNG を保存しました");
  } catch (err) {
    console.error("PNG export failed:", err);
    toast(err instanceof Error ? err.message : "PNG 出力に失敗しました");
  }
};

/** PNG 画像をクリップボードへコピーする。 */
const copyPng = async () => {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    toast("このブラウザは画像コピーに未対応です（HTTPS が必要）");
    return;
  }
  // コピーは貼り付け先で見えるよう、透明設定でも背景を補う。
  const bg =
    resolveExportBackground() ?? (isDarkDiagramTheme() ? DARK_BG : LIGHT_BG);
  const svg = buildExportSvg(bg);
  if (!svg) return;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        // Safari のユーザージェスチャ保持のため Blob を Promise で渡す。
        "image/png": svgToPngBlob(svg, settings.pngScale, bg),
      }),
    ]);
    toast("PNG をクリップボードにコピーしました");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    toast(
      err instanceof Error
        ? `コピー失敗: ${err.message}`
        : "コピーに失敗しました",
    );
  }
};

/** SVG ソースをテキストとしてクリップボードへコピーする。 */
const copySvg = async () => {
  if (!navigator.clipboard?.writeText) {
    toast("このブラウザはコピーに未対応です（HTTPS が必要）");
    return;
  }
  const svg = buildExportSvg(resolveExportBackground());
  if (!svg) return;
  try {
    await navigator.clipboard.writeText(svgToString(svg));
    toast("SVG コードをクリップボードにコピーしました");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    toast(
      err instanceof Error
        ? `コピー失敗: ${err.message}`
        : "コピーに失敗しました",
    );
  }
};

// ---- 形式に応じたアクションの振り分け ----
const runDownload = () =>
  settings.exportFormat === "svg" ? exportSvg() : void exportPng();

const runCopy = () =>
  settings.exportFormat === "svg" ? void copySvg() : void copyPng();

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
    const active = b.dataset.value === value;
    b.classList.toggle("is-active", active);
    // 見た目だけでなく支援技術にも選択状態を伝える。
    b.setAttribute("aria-pressed", String(active));
  });
};

/** 形式に依存する表示（解像度の出し分け・実寸・コピー挙動）を更新する。 */
const syncFormatUI = () => {
  const isPng = settings.exportFormat === "png";
  // 解像度は PNG にだけ効くので、SVG のときは隠す。
  segScaleGroup.hidden = !isPng;
  // 拡張子表示と、形式で変わるコピー挙動（PNG=画像 / SVG=コード）を明示する。
  exportExt.textContent = isPng ? ".png" : ".svg";
  copyLabel.textContent = isPng ? "画像をコピー" : "コードをコピー";

  const dim = outputDimensions();
  const size = dim ? ` · ${dim.w} × ${dim.h} px` : "";
  exportHint.textContent = isPng
    ? `PNG · ${settings.pngScale}x${size}`
    : `SVG · ベクター${size}`;
};

const syncExportUI = () => {
  syncSeg(segFormat, settings.exportFormat);
  syncSeg(segBg, settings.exportBackground);
  syncSeg(segPad, String(settings.exportPadding));
  syncSeg(segScale, String(settings.pngScale));
  syncFormatUI();
};

/** セグメント選択時：値を保存しつつ選択状態を同期する共通ハンドラ。 */
const bindSeg = (group: HTMLElement, onPick: (value: string) => void) => {
  group.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
      ".seg-item",
    );
    if (!btn) return;
    const value = btn.dataset.value!;
    onPick(value);
    saveSettings();
    syncSeg(group, value);
  });
};

// Tab をモーダル内に閉じ込め、閉じたら「出力」ボタンへフォーカスを戻す。
const trap = createFocusTrap(exportModal);

export const openExport = () => {
  if (btnExport.disabled) return;
  syncExportUI();
  renderExportPreview();
  exportModal.hidden = false;
  exportBackdrop.hidden = false;
  trap.activate();
};

export const closeExport = () => {
  exportModal.hidden = true;
  exportBackdrop.hidden = true;
  trap.release();
};

export const isExportOpen = () => !exportModal.hidden;

/** 出力に関するイベントを登録する。 */
export const initExport = () => {
  btnExportDownload.addEventListener("click", () => runDownload());
  btnExportCopy.addEventListener("click", () => runCopy());

  btnExport.addEventListener("click", openExport);
  exportClose.addEventListener("click", closeExport);
  exportBackdrop.addEventListener("click", closeExport);

  bindSeg(segFormat, (value) => {
    settings.exportFormat = value as ExportFormat;
    syncFormatUI();
  });
  bindSeg(segBg, (value) => {
    settings.exportBackground = value as Background;
    renderExportPreview();
  });
  bindSeg(segPad, (value) => {
    settings.exportPadding = Number(value);
    renderExportPreview();
    syncFormatUI();
  });
  bindSeg(segScale, (value) => {
    settings.pngScale = Number(value);
    syncFormatUI();
  });
};
