// ---- フォーカストラップ ----
// モーダル/ドロワーを開いている間、Tab を内部に閉じ込め、
// 閉じたら開く前にフォーカスしていた要素へ戻す。

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** container 内で実際にフォーカス可能な要素（非表示は除く）。 */
const focusable = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );

export interface FocusTrap {
  /** 開いた直後（container が表示状態になってから）に呼ぶ。 */
  activate(): void;
  /** 閉じるときに呼ぶ。 */
  release(): void;
}

/**
 * container 用のフォーカストラップを作る。
 * container 自身は tabindex="-1" を持つこと（開いたときにここへフォーカスを移す）。
 */
export const createFocusTrap = (container: HTMLElement): FocusTrap => {
  // 開く直前にフォーカスしていた要素（閉じたら戻す）。
  let lastFocused: HTMLElement | null = null;

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = focusable(container);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    // idx === -1 は container 本体（tabindex=-1）など一覧外にフォーカスがある状態。
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey) {
      if (idx <= 0) {
        e.preventDefault();
        last.focus();
      }
    } else if (idx === -1 || idx === items.length - 1) {
      e.preventDefault();
      first.focus();
    }
  };

  return {
    activate() {
      lastFocused = document.activeElement as HTMLElement | null;
      container.addEventListener("keydown", onKeydown);
      // container 自身にフォーカスを移し、ラベルが読み上げられるようにする。
      container.focus();
    },
    release() {
      container.removeEventListener("keydown", onKeydown);
      lastFocused?.focus();
      lastFocused = null;
    },
  };
};
