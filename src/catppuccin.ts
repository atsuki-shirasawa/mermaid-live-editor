import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

// Catppuccin パレット（必要な色のみ）
interface Palette {
  base: string;
  mantle: string;
  surface0: string;
  surface1: string;
  overlay0: string;
  overlay1: string;
  overlay2: string;
  text: string;
  rosewater: string;
  mauve: string;
  blue: string;
  sky: string;
  green: string;
  yellow: string;
  peach: string;
  red: string;
  teal: string;
}

const mocha: Palette = {
  base: "#1e1e2e",
  mantle: "#181825",
  surface0: "#313244",
  surface1: "#45475a",
  overlay0: "#6c7086",
  overlay1: "#7f849c",
  overlay2: "#9399b2",
  text: "#cdd6f4",
  rosewater: "#f5e0dc",
  mauve: "#cba6f7",
  blue: "#89b4fa",
  sky: "#89dceb",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  peach: "#fab387",
  red: "#f38ba8",
  teal: "#94e2d5",
};

const latte: Palette = {
  base: "#eff1f5",
  mantle: "#e6e9ef",
  surface0: "#ccd0da",
  surface1: "#bcc0cc",
  overlay0: "#9ca0b0",
  overlay1: "#8c8fa1",
  overlay2: "#7c7f93",
  text: "#4c4f69",
  rosewater: "#dc8a78",
  mauve: "#8839ef",
  blue: "#1e66f5",
  sky: "#04a5e5",
  green: "#40a02b",
  yellow: "#df8e1d",
  peach: "#fe640b",
  red: "#d20f39",
  teal: "#179299",
};

const buildTheme = (p: Palette, dark: boolean): Extension => {
  const selection = dark ? "#414458" : "#bcc0cc";
  const editorTheme = EditorView.theme(
    {
      "&": {
        color: p.text,
        backgroundColor: p.base,
      },
      ".cm-content": {
        caretColor: p.rosewater,
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: p.rosewater,
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: selection,
        },
      ".cm-panels": { backgroundColor: p.mantle, color: p.text },
      ".cm-searchMatch": {
        backgroundColor: p.surface1,
        outline: `1px solid ${p.overlay0}`,
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: p.surface0,
      },
      ".cm-activeLine": { backgroundColor: dark ? "#28283c66" : "#dce0e866" },
      ".cm-selectionMatch": { backgroundColor: p.surface0 },
      ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
        backgroundColor: "transparent",
        outline: `1px solid ${p.overlay1}`,
        borderRadius: "2px",
      },
      ".cm-gutters": {
        backgroundColor: p.mantle,
        color: p.overlay0,
        border: "none",
      },
      ".cm-activeLineGutter": {
        backgroundColor: dark ? "#28283c" : "#dce0e8",
        color: p.overlay2,
      },
      ".cm-foldPlaceholder": {
        backgroundColor: p.surface0,
        border: "none",
        color: p.overlay1,
      },
      ".cm-tooltip": {
        backgroundColor: p.surface0,
        border: "none",
        borderRadius: "6px",
        color: p.text,
      },
      ".cm-tooltip .cm-tooltip-arrow:before": {
        borderTopColor: p.surface0,
        borderBottomColor: p.surface0,
      },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: p.surface1,
        color: p.text,
      },
      // lint（エラー）の表示色
      ".cm-diagnostic-error": { borderLeftColor: p.red },
      ".cm-lintRange-error": {
        backgroundImage: "none",
        textDecoration: `underline wavy ${p.red}`,
      },
      ".cm-gutter-lint .cm-gutterElement .cm-lint-marker-error": {
        color: p.red,
      },
    },
    { dark },
  );

  const highlight = HighlightStyle.define([
    { tag: t.comment, color: p.overlay1, fontStyle: "italic" },
    { tag: t.keyword, color: p.mauve },
    { tag: [t.string, t.special(t.string)], color: p.green },
    { tag: t.operator, color: p.sky },
    { tag: [t.atom, t.bool], color: p.peach },
    { tag: t.number, color: p.peach },
    { tag: [t.variableName, t.name], color: p.text },
    { tag: t.propertyName, color: p.blue },
    { tag: [t.typeName, t.className], color: p.yellow },
    { tag: t.tagName, color: p.mauve },
    { tag: t.attributeName, color: p.yellow },
    { tag: t.punctuation, color: p.overlay2 },
    { tag: [t.heading, t.strong], color: p.peach, fontWeight: "bold" },
    { tag: t.link, color: p.teal, textDecoration: "underline" },
    { tag: t.invalid, color: p.red },
  ]);

  return [editorTheme, syntaxHighlighting(highlight)];
};

export const catppuccinMocha = buildTheme(mocha, true);
export const catppuccinLatte = buildTheme(latte, false);
