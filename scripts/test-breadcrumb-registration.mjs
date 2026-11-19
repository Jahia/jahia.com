import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";

const manifest = JSON.parse(
  readFileSync(new URL("../javascript/apps/jahia.json", import.meta.url), "utf8"),
);
const entry = new URL("../" + manifest.jahia.apps.jahia, import.meta.url);

function routes() {
  const registrations = new Map();
  const registry = {
    add: (type, key, value) => registrations.set(type + "/" + key, value),
    get: (type, key) => registrations.get(type + "/" + key),
  };
  runInNewContext(readFileSync(entry, "utf8"), {
    window: { jahia: { uiExtender: { registry }, i18n: { addResourceBundle() {} } } },
  });
  return registrations;
}

// Same filtering contract as jContent's AdditionalAppsTree and AdditionalAppsRoute.
function available(route, permissions, modules) {
  return (
    (route.requiredPermission === undefined || permissions[route.requiredPermission] !== false) &&
    (route.requireModuleInstalledOnSite === undefined ||
      modules.includes(route.requireModuleInstalledOnSite))
  );
}

test("the deployed app manifest loads a new bootstrap URL containing the independent breadcrumb route", () => {
  assert.notEqual(manifest.jahia.apps.jahia, "javascript/apps/partner-editors-1.5.js");
  assert.ok(existsSync(entry));
  const registered = routes();
  const route = registered.get("adminRoute/jahiacom-breadcrumb");
  assert.ok(route);
  assert.deepEqual(Array.from(route.targets), ["jcontent:85"]);
  assert.equal(typeof route.render, "function");
  assert.equal(route.isSelectable, true);
  assert.ok(registered.has("selectorType/FooterLinksPicker"));
  assert.ok(registered.has("adminRoute/jahiacom-navigation"));
});

test("an editor can see Breadcrumb without write access to the site root", () => {
  const route = routes().get("adminRoute/jahiacom-breadcrumb");
  assert.equal(route.requiredPermission, "jContentAccess");
  assert.equal(
    available(route, { "jContentAccess": true, "jcr:modifyProperties": false }, ["jahiacom"]),
    true,
  );
});

test("the entry still requires jContent access and the module enabled on the selected site", () => {
  const route = routes().get("adminRoute/jahiacom-breadcrumb");
  assert.equal(available(route, { jContentAccess: false }, ["jahiacom"]), false);
  assert.equal(available(route, { jContentAccess: true }, ["another-module"]), false);
});
