import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Môi trường giả lập browser (jsdom) — không chạy browser thật
    environment: "jsdom",
    globals: true,
    // Chạy file setup trước mỗi test để mock localStorage, API, v.v.
    setupFiles: ["./src/__tests__/setup.js"],
    // Không import CSS — tránh lỗi parse
    css: false,
  },
});
