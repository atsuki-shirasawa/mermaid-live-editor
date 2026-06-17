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
  Shapes,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide";

// アプリのロゴ（自作）。フローチャートの異なる図形ノードを連結線で結び、
// 頭文字 "M" を象る。谷のノードだけ Lavender（--accent-hover）でアクセント。
// lucide と同じ IconNode 形式で記述し、共通の <svg> ラッパー・currentColor に乗せる。
const LOGO: IconNode = [
  // 連結線（M の骨格）— currentColor のストロークを継承
  ["path", { d: "M4.5 19V5l7.5 7.5L19.5 5v14" }],
  // 左上：角丸四角ノード
  ["rect", { x: "2.7", y: "3.2", width: "3.6", height: "3.6", rx: "1.1", fill: "currentColor", stroke: "none" }],
  // 右上：円ノード
  ["circle", { cx: "19.5", cy: "5", r: "2.1", fill: "currentColor", stroke: "none" }],
  // 谷：菱形ノード（アクセント色）
  ["rect", { x: "9.9", y: "10.4", width: "4.2", height: "4.2", rx: "0.7", fill: "var(--accent-hover)", stroke: "none", transform: "rotate(45 12 12.5)" }],
  // 左下：円ノード
  ["circle", { cx: "4.5", cy: "19", r: "2.1", fill: "currentColor", stroke: "none" }],
  // 右下：角丸四角ノード
  ["rect", { x: "17.7", y: "17.2", width: "3.6", height: "3.6", rx: "1.1", fill: "currentColor", stroke: "none" }],
];

// ---- アイコン（Lucide） ----
// パスデータは lucide パッケージから取得し、共通の <svg> ラッパーに流し込む。
// 新規アイコンは lucide から import して ICONS に登録する（data-icon の値がキー）。
const ICONS: Record<string, IconNode> = {
  logo: LOGO,
  settings: SlidersHorizontal,
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
