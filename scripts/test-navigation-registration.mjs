import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const manifest = JSON.parse(
  readFileSync(new URL("../javascript/apps/jahia.json", import.meta.url), "utf8"),
);
function route() {
  const entries = new Map();
  const registry = {
    add: (type, key, value) => entries.set(type + "/" + key, value),
    get: (type, key) => entries.get(type + "/" + key),
  };
  runInNewContext(
    readFileSync(new URL("../" + manifest.jahia.apps.jahia, import.meta.url), "utf8"),
    {
      window: {
        jahia: { uiExtender: { registry }, i18n: { addResourceBundle() {} } },
      },
    },
  );
  return entries.get("adminRoute/jahiacom-navigation");
}
const visible = (entry, permissions, modules) =>
  permissions[entry.requiredPermission] !== false &&
  modules.includes(entry.requireModuleInstalledOnSite);

test("the manifest registers the navbar before Moonstone is loaded through a fresh bootstrap URL", () => {
  assert.notEqual(manifest.jahia.apps.jahia, "javascript/apps/partner-editors-1.5.js");
  const entry = route();
  assert.ok(entry);
  assert.deepEqual(Array.from(entry.targets), ["jcontent:80"]);
  assert.equal(entry.label, "jahiacom-navigation:title");
  assert.equal(typeof entry.render, "function");
});

test("navbar is visible to editors without requiring write access on the site root", () => {
  const entry = route();
  assert.equal(entry.requiredPermission, "jContentAccess");
  assert.equal(
    visible(entry, { "jContentAccess": true, "jcr:modifyProperties": false }, ["jahiacom"]),
    true,
  );
  assert.equal(visible(entry, { jContentAccess: false }, ["jahiacom"]), false);
  assert.equal(visible(entry, { jContentAccess: true }, ["other"]), false);
});
