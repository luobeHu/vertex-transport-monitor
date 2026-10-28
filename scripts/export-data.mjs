import { mkdir, writeFile } from "node:fs/promises";
import { devices, tasks, TYPES, SNAPSHOT } from "../src/core/data.js";
const directory = new URL("../public/data/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("snapshot.json", directory),
  JSON.stringify(
    {
      schemaVersion: "1.0",
      demo: true,
      snapshotAt: SNAPSHOT,
      types: TYPES,
      devices,
      tasks,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Vue snapshot: ${devices.length} devices, ${tasks.length} tasks.`);
