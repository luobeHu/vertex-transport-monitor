import { copyFile, mkdir, writeFile } from "node:fs/promises";

// Keep previously shared /vue3/ links working with one application build.
const output = new URL("../dist/", import.meta.url);
const compatibility = new URL("vue3/", output);
await mkdir(new URL("data/", compatibility), { recursive: true });
await writeFile(
  new URL("index.html", compatibility),
  `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>VERTEX · 正在打开监控</title>
    <script>
      location.replace(new URL('../' + location.search + location.hash, location.href));
    </script>
    <noscript><meta http-equiv="refresh" content="0;url=../" /></noscript>
  </head>
  <body><a href="../">打开垂直运输监控</a></body>
</html>
`,
);
for (const asset of ["agent-manifest.json", "data/snapshot.json"]) {
  await copyFile(new URL(asset, output), new URL(asset, compatibility));
}
console.log("Created /vue3/ compatibility entry for the Vue application.");
