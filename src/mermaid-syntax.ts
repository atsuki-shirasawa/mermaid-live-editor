import mermaid from "mermaid";
import { StreamLanguage } from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";

// Mermaid 用の簡易シンタックスハイライト。
const MERMAID_KEYWORDS =
  /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|subgraph|end|participant|actor|loop|alt|opt|par|rect|note|activate|deactivate|class|state|section|title|direction)\b/;

export const mermaidMode = StreamLanguage.define({
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
export const mermaidLinter = linter(
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
      let lineNo =
        hash?.loc?.first_line ?? Number(message.match(/line (\d+)/i)?.[1]);
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
