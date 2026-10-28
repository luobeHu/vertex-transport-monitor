import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [vue()],
  server: { host: "127.0.0.1", port: 5174 },
  build: {
    target: "es2020",
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
