// ---- 汎用ユーティリティ ----

/** 連続呼び出しを ms 間まとめる。 */
export const debounce = <T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

let toastTimer: ReturnType<typeof setTimeout>;

/** 画面下部に一時的な通知を表示する。 */
export const toast = (message: string) => {
  let el = document.querySelector<HTMLDivElement>(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el!.classList.remove("show"), 1800);
};
