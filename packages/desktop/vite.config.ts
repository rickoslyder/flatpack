import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      // Externalize optional dependencies that are loaded dynamically
      // These are web-specific converters not used in desktop (Tauri handles them natively)
      external: [
        "mammoth",
        "xlsx",
        "pptx2json",
        "epub2",
        "pdfjs-dist",
        "jszip",
        "turndown",
        "html-entities",
      ],
    },
  },
  optimizeDeps: {
    exclude: [
      "mammoth",
      "xlsx",
      "pptx2json",
      "epub2",
      "pdfjs-dist",
      "jszip",
      "turndown",
      "html-entities",
    ],
  },
});
