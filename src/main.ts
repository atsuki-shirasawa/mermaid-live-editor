import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./style.css";
import { DEFAULT_CODE, STORAGE_KEY } from "./constants";
import {
  backdropEl,
  btnExport,
  btnSettings,
  btnTheme,
  editorParent,
  emptySampleBtn,
  emptyStateEl,
  exportKbd,
  samplesBody,
  samplesEl,
  samplesToggle,
  setCurve,
  setFontSize,
  fontSizeValue,
  setTheme,
  settingsClose,
  settingsEl,
} from "./dom";
import {
  createEditor,
  getCode,
  reconfigureEditorTheme,
  setCode,
} from "./editor";
import { closeExport, initExport, isExportOpen, openExport } from "./export";
import { createFocusTrap } from "./focus-trap";
import { iconSvg, renderIcons } from "./icons";
import { applyMermaidConfig, render } from "./render";
import { SAMPLES } from "./samples";
import { saveSettings, settings } from "./settings";
import type { Curve, ThemeName } from "./types";
import { debounce, toast } from "./utils";
import { initView } from "./view";

// ---- UI テーマ ----
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

const toggleUiTheme = () => {
  settings.uiTheme = settings.uiTheme === "dark" ? "light" : "dark";
  applyUiTheme();
  reconfigureEditorTheme(settings.uiTheme);
  saveSettings();
};

// ---- 設定ドロワー ----
// Tab をドロワー内に閉じ込め、閉じたら「設定」ボタンへフォーカスを戻す。
const settingsTrap = createFocusTrap(settingsEl);
const openSettings = () => {
  settingsEl.hidden = false;
  backdropEl.hidden = false;
  settingsTrap.activate();
};
const closeSettings = () => {
  settingsEl.hidden = true;
  backdropEl.hidden = true;
  settingsTrap.release();
};

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

const initSettings = () => {
  btnSettings.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);
  backdropEl.addEventListener("click", closeSettings);
  btnTheme.addEventListener("click", toggleUiTheme);

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
};

// ---- サンプル図 ----
/** エディタの内容をサンプルコードで置き換える（Undo で元に戻せる）。 */
const loadSample = (code: string) => {
  setCode(code);
  void render();
  toast("サンプルを読み込みました（⌘Z で元に戻せます）");
};

const initSamples = () => {
  for (const sample of SAMPLES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = sample.label;
    chip.addEventListener("click", () => loadSample(sample.code));
    samplesBody.appendChild(chip);
  }

  samplesToggle.addEventListener("click", () => {
    const collapsed = samplesEl.classList.toggle("collapsed");
    samplesToggle.setAttribute("aria-expanded", String(!collapsed));
  });

  // 空状態の「ランダムにサンプルを表示」：現在と違うサンプルを 1 つ選んで読み込む。
  // プレビュー領域のパン操作を誘発しないよう pointerdown は止める。
  emptyStateEl.addEventListener("pointerdown", (e) => e.stopPropagation());
  emptySampleBtn.addEventListener("click", () => {
    const current = getCode().trim();
    const pool = SAMPLES.filter((s) => s.code.trim() !== current);
    const list = pool.length ? pool : SAMPLES;
    const sample = list[Math.floor(Math.random() * list.length)];
    loadSample(sample.code);
  });
};

// ---- ショートカット表示（OS で表記を出し分け） ----
const initShortcutHint = () => {
  const isMac = /mac|iphone|ipad/i.test(
    navigator.platform || navigator.userAgent,
  );
  const combo = isMac ? "⌘E" : "Ctrl+E";
  exportKbd.textContent = combo;
  btnExport.title = `画像を出力 (${combo})`;
};

// ---- キーボード: Esc で閉じる / Cmd|Ctrl+E で出力 ----
const initKeyboard = () => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (isExportOpen()) closeExport();
      else if (!settingsEl.hidden) closeSettings();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
      e.preventDefault();
      if (!isExportOpen()) openExport();
    }
  });
};

// ---- 初期化 ----
renderIcons();
applyUiTheme();
initSamples();
initSettings();
initView();
initExport();
initKeyboard();
initShortcutHint();

// 空文字・空白のみの保存値は初期サンプルへフォールバックさせる。
const stored = localStorage.getItem(STORAGE_KEY);
const initialCode = stored && stored.trim() ? stored : DEFAULT_CODE;
const debouncedRender = debounce(() => void render(), 250);

createEditor({
  parent: editorParent,
  doc: initialCode,
  uiTheme: settings.uiTheme,
  onChange: debouncedRender,
});

syncSettingsUI();
applyMermaidConfig();
void render();
