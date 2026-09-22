import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const version = "1.7.0";
const source = `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`;
const keep = new Set([
  "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
  "/onnxruntime-web/ort-wasm-simd-threaded.mjs",
  "/models/isnet_quint8",
]);
const outDir = path.resolve("public/bg");

const response = await fetch(`${source}resources.json`);
if (!response.ok) {
  throw new Error(`Could not download model list (${response.status}).`);
}
const all = await response.json();
const trimmed = {};
for (const key of keep) {
  const entry = all[key];
  if (!entry) throw new Error(`Model list is missing ${key}.`);
  trimmed[key] = entry;
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "resources.json"), JSON.stringify(trimmed));

for (const entry of Object.values(trimmed)) {
  for (const chunk of entry.chunks) {
    const dest = path.join(outDir, chunk.name);
    try {
      await access(dest);
      continue;
    } catch {
      // Download missing chunks only.
    }
    const file = await fetch(source + chunk.name);
    if (!file.ok) throw new Error(`Could not download ${chunk.name} (${file.status}).`);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(dest, bytes);
    console.log(`saved ${chunk.name} (${bytes.length} bytes)`);
  }
}

console.log("Background-removal models are in public/bg.");
