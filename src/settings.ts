import type { Background, Settings, ThemeName } from "./types";
import { DARK_BG, LIGHT_BG, SETTINGS_KEY } from "./constants";

const systemUiTheme = (): Settings["uiTheme"] =>
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
        diagramTheme:
          parsed.diagramTheme ?? parsed.theme ?? DEFAULT_SETTINGS.diagramTheme,
        exportBackground:
          parsed.exportBackground ??
          parsed.background ??
          DEFAULT_SETTINGS.exportBackground,
      };
    }
  } catch {
    /* 壊れた値は無視してデフォルトに戻す */
  }
  return { ...DEFAULT_SETTINGS };
};

/** アプリ全体で共有する設定（プロパティを直接書き換えて使う）。 */
export const settings = loadSettings();

export const saveSettings = () =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

/** 図のテーマが暗色系か（Mermaid は dark のみ暗色、他は明色）。 */
export const isDarkDiagramTheme = (): boolean =>
  settings.diagramTheme === "dark";

/** 出力に使う背景色を決める（透明なら null）。 */
export const resolveExportBackground = (): string | null => {
  switch (settings.exportBackground) {
    case "white":
      return LIGHT_BG;
    case "dark":
      return DARK_BG;
    case "transparent":
      return null;
    case "auto":
    default:
      return isDarkDiagramTheme() ? DARK_BG : LIGHT_BG;
  }
};
