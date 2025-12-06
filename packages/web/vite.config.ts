import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure converter dependencies resolve to local node_modules
      "mammoth": path.resolve(__dirname, "node_modules/mammoth"),
      "xlsx": path.resolve(__dirname, "node_modules/xlsx"),
      "turndown": path.resolve(__dirname, "node_modules/turndown"),
      "html-entities": path.resolve(__dirname, "node_modules/html-entities"),
      "jszip": path.resolve(__dirname, "node_modules/jszip"),
      "pdfjs-dist": path.resolve(__dirname, "node_modules/pdfjs-dist"),
    },
  },
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      include: [/mammoth/, /xlsx/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ["pdfjs-dist"],
          converters: ["mammoth", "xlsx", "turndown", "html-entities"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["@flatpack/core", "@flatpack/ui", "mammoth", "xlsx", "turndown", "html-entities", "jszip"],
  },
});
