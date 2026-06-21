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
  RotateCcw,
  Shapes,
  Shuffle,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide";

// アプリのロゴ（自作）。Mermaid（人魚）の二股の尾ひれをシルエット化したマーク。
// くびれから左右に大きく開いたフルークと、中央の深いノッチで尾ひれらしさを出す。
// ヘッダーでは currentColor（accent）の単色シルエット、favicon では紫バッジ＋白抜きと
// なるが、パスは public/favicon.svg と同一形状で統一している。
const LOGO: IconNode = [
  [
    "path",
    {
      d: "M12 3.6C13.3 6.8 13.5 9.2 12.85 11.7 15 13.9 18 16.1 21.4 18.4 18 17.3 14.5 16.3 12 15.2 9.5 16.3 6 17.3 2.6 18.4 6 16.1 9 13.9 11.15 11.7 10.5 9.2 10.7 6.8 12 3.6Z",
      fill: "currentColor",
      stroke: "none",
    },
  ],
];

// GitHub マーク。lucide はブランドアイコンを廃止したため、他アイコンと同じ
// ストローク方式（fill:none / stroke:currentColor）で自作する。
const GITHUB: IconNode = [
  [
    "path",
    {
      d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
    },
  ],
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
  shuffle: Shuffle,
  github: GITHUB,
  "rotate-ccw": RotateCcw,
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
