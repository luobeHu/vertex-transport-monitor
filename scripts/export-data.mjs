import { mkdir, writeFile } from 'node:fs/promises';
import { devices, tasks, TYPES, SNAPSHOT } from '../src/data.js';
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/snapshot.json', import.meta.url), JSON.stringify({ schemaVersion: '1.0', demo: true, snapshotAt: SNAPSHOT, types: TYPES.map(({ id, name }) => ({ id, name })), devices, tasks }, null, 2) + '\n');
console.log(`Exported ${devices.length} devices and ${tasks.length} tasks.`);
