import { defineConfig } from "vite";

// GitHub Pages（プロジェクトページ）でも動くように相対パスで出力する。
// これにより /<repo-name>/ 配下でもアセット参照が壊れない。
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
  },
});
