import { EditorView, basicSetup } from "codemirror";
import { Compartment, type Extension } from "@codemirror/state";
import { lintGutter } from "@codemirror/lint";
import { catppuccinMocha, catppuccinLatte } from "./catppuccin";
import { mermaidMode, mermaidLinter } from "./mermaid-syntax";
import type { UiTheme } from "./types";

const cmTheme = new Compartment();

const themeExtension = (uiTheme: UiTheme): Extension =>
  uiTheme === "dark" ? catppuccinMocha : catppuccinLatte;

let view: EditorView;

/** エディタを生成する。docChanged のたびに onChange が呼ばれる。 */
export const createEditor = (opts: {
  parent: HTMLElement;
  doc: string;
  uiTheme: UiTheme;
  onChange: () => void;
}): EditorView => {
  view = new EditorView({
    doc: opts.doc,
    parent: opts.parent,
    extensions: [
      basicSetup,
      mermaidMode,
      cmTheme.of(themeExtension(opts.uiTheme)),
      lintGutter(),
      mermaidLinter,
      EditorView.updateListener.of((u) => {
        if (u.docChanged) opts.onChange();
      }),
    ],
  });
  return view;
};

export const getCode = () => view.state.doc.toString();

/** エディタ全体を置き換える（Undo で元に戻せる）。 */
export const setCode = (code: string) => {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: code },
  });
  view.focus();
};

/** UI テーマに合わせて CodeMirror の配色を再構成する（再生成しない）。 */
export const reconfigureEditorTheme = (uiTheme: UiTheme) => {
  view.dispatch({ effects: cmTheme.reconfigure(themeExtension(uiTheme)) });
};
