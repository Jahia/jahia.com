import { readFile, writeFile } from "node:fs/promises";

const jsonUrl = new URL("../settings/category-migration-1.3.3.json", import.meta.url);
const patchUrl = new URL(
  "../settings/patches/1.3.3-04-restore-content-categories.started.groovy",
  import.meta.url,
);
const json = await readFile(jsonUrl, "utf8");
const encoded = Buffer.from(json).toString("base64");
const chunks = encoded.match(/.{1,50000}/g) ?? [];
const declaration = `final String encodedMapping = [\n${chunks
  .map((chunk) => `        "${chunk}"`)
  .join(",\n")}\n].join("")`;

const patch = await readFile(patchUrl, "utf8");
const updated = patch.replace(
  /final String encodedMapping =[\s\S]*?(?=\nfinal Map<String, List<Map<String, Object>>> mapping =)/,
  declaration,
);
if (updated === patch) throw new Error("Encoded mapping declaration was not found");
await writeFile(patchUrl, updated);
