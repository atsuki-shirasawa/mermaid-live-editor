import {
  Book,
  ChevronDown,
  Code,
  Copy,
  Download,
  Eye,
  type IconNode,
  Image,
  Maximize,
  Minus,
  Moon,
  Plus,
  Settings,
  Shapes,
  Sun,
  Workflow,
  X,
} from "lucide";

// ---- アイコン（Lucide） ----
// パスデータは lucide パッケージから取得し、共通の <svg> ラッパーに流し込む。
// 新規アイコンは lucide から import して ICONS に登録する（data-icon の値がキー）。
const ICONS: Record<string, IconNode> = {
  workflow: Workflow,
  settings: Settings,
  image: Image,
  copy: Copy,
  download: Download,
  sun: Sun,
  moon: Moon,
  plus: Plus,
  minus: Minus,
  maximize: Maximize,
  x: X,
  code: Code,
  book: Book,
  eye: Eye,
  shapes: Shapes,
  "chevron-down": ChevronDown,
};

/** lucide の IconNode を SVG 子要素のマークアップ文字列に変換する。 */
const nodeToInner = (node: IconNode): string =>
  node
    .map(([tag, attrs]) => {
      const props = Object.entries(attrs)
        .map(([key, value]) => `${key}="${value}"`)
        .join(" ");
      return `<${tag} ${props}/>`;
    })
    .join("");

export const iconSvg = (name: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    ICONS[name] ? nodeToInner(ICONS[name]) : ""
  }</svg>`;

/** data-icon 属性を持つ要素に SVG を流し込む。 */
export const renderIcons = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    el.innerHTML = iconSvg(el.dataset.icon!);
  });
};
