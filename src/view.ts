import {
  layoutEl,
  previewEl,
  scrollEl,
  splitterEl,
  zoomInBtn,
  zoomLevelEl,
  zoomOutBtn,
  zoomResetBtn,
} from "./dom";

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

const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));

const setZoom = (next: number) => {
  zoom = clampZoom(next);
  applyTransform();
};

/**
 * 指定したクライアント座標を中心にズームする（その点を画面上で固定したまま拡縮）。
 * transform は translate(pan) scale(zoom)・原点 center なので、
 * コンテナ中心からのカーソルオフセット m に対し pan' = m(1-k) + k·pan で補正する。
 */
const zoomAt = (next: number, clientX: number, clientY: number) => {
  const prev = zoom;
  const z = clampZoom(next);
  if (z === prev) return;
  const rect = scrollEl.getBoundingClientRect();
  const mx = clientX - (rect.left + rect.width / 2);
  const my = clientY - (rect.top + rect.height / 2);
  const k = z / prev;
  panX = mx * (1 - k) + k * panX;
  panY = my * (1 - k) + k * panY;
  zoom = z;
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
    zoom = clampZoom(Math.min(availW / vbW, availH / vbH));
  }
  applyTransform();
};

/** 描画後にビューを更新する。未操作ならフィット、操作済みなら現在の倍率を維持。 */
export const refreshView = () => {
  normalizeSvgSize();
  if (userInteracted) applyTransform();
  else fitToView();
};

/** ズーム・パン・スプリッターのイベントを登録する。 */
export const initView = () => {
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
  // 倍率表示クリックで等倍（100%）に戻す。
  zoomLevelEl.addEventListener("click", () => {
    userInteracted = true;
    panX = 0;
    panY = 0;
    setZoom(1);
  });

  // マウスホイール / トラックパッドでカーソル位置を中心にズーム。
  scrollEl.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      userInteracted = true;
      zoomAt(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
    },
    { passive: false },
  );

  // ダブルクリックで画面にフィット（自動追従も再開）。
  scrollEl.addEventListener("dblclick", () => {
    userInteracted = false;
    fitToView();
  });

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
};
