import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
const root = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);
// Root-repo development shares dependencies; standalone installs resolve locally.
const fonts = ["@fontsource-variable/dm-sans", "@fontsource/ibm-plex-mono"].map(
  (name) => dirname(require.resolve(`${name}/package.json`)),
);
export default defineConfig({
  root,
  base: "./",
  plugins: [vue()],
  server: { host: "127.0.0.1", port: 5174, fs: { allow: [root, ...fonts] } },
  build: {
    target: "es2020",
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
