import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

test("LIVE access in migration scripts must be explicitly reviewed", async () => {
  const baseline = JSON.parse(
    await readFile(new URL("./publication-migrations-baseline.json", import.meta.url), "utf8"),
  );
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      if (entry.isDirectory()) {
        await walk(url);
        continue;
      }
      if (!entry.name.endsWith(".groovy")) continue;
      const source = (await readFile(url, "utf8")).replace(/\r\n/g, "\n");
      if (!/LIVE_WORKSPACE|["']live["']/.test(source)) continue;
      const relative = url.href.slice(new URL("../settings/", import.meta.url).href.length);
      assert.equal(
        createHash("sha256").update(source).digest("hex"),
        baseline[relative],
        `${relative}: new or changed LIVE access needs publication review. Write drafts to EDIT, then use native publication; never copy publication/versioning metadata from exports.`,
      );
    }
  };
  await walk(new URL("../settings/", import.meta.url));
});

test("continuous repair is generic and never publishes drafts", async () => {
  const source = await readFile(
    new URL(
      "../publication-integrity/src/main/java/org/jahia/modules/publicationintegrity/PublicationIntegrity.java",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /contentsquare|faciliti|claude/i);
  assert.doesNotMatch(source, /\.publish\(|\.unpublish\(|\.deleteNode\(|\.addNode\(/);
  assert.match(source, /getInstalledModules\(\)\.contains\("jahiacom"\)/);
  assert.match(source, /pushEventListenersAvailableDuringPublishOnly/);
  assert.match(source, /finally[\s\S]*popEventListenersAvailableDuringPublishOnly/);
  assert.match(source, /backups.save\(pairs\)/);
  assert.doesNotMatch(source, /exportSystemView/);
  assert.match(source, /query.setLimit\(limit\)/);
  assert.match(source, /TICK_BUDGET/);
  assert.match(source, /shutdownNow/);
});
