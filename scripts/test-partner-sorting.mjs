import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const load = (
  file,
  require = () => {
    throw new Error("Unexpected import");
  },
) => {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require });
  return exports;
};
const identity = load("../src/contents/Partner/classification.ts");
const { comparePartners, defaultPartnerSort } = load(
  "../src/views/PartnerDirectory/sorting.ts",
  () => identity,
);
const partner = (title, level, region) => ({
  "jcr:title": title,
  "partnerClassification": level ? `solution_${level}` : "technology_integration",
  "regions": region ? [region] : [],
});
const names = (partners, mode) =>
  [...partners].sort((a, b) => comparePartners(a, b, mode)).map((p) => p["jcr:title"]);

test("level order is Diamond, Gold, Silver before A–Z within each level", () => {
  const items = [
    partner("Alfa Silver", "silver", "europe"),
    partner("Zulu Diamond", "diamond", "apac"),
    partner("Beta Gold", "gold", "americas"),
    partner("Alpha Diamond", "diamond", "americas"),
  ];
  assert.deepEqual(names(items, "levelAlphabetical"), [
    "Alpha Diamond",
    "Zulu Diamond",
    "Beta Gold",
    "Alfa Silver",
  ]);
  assert.equal(items[0]["jcr:title"], "Alfa Silver");
});

test("region order groups Europe, Americas, APAC before A–Z, regardless of level", () => {
  const items = [
    partner("Alpha APAC", "diamond", "apac"),
    partner("Zulu Europe", "silver", "europe"),
    partner("Alpha Europe", "gold", "europe"),
    partner("Beta Americas", "diamond", "americas"),
  ];
  assert.deepEqual(names(items, "regionAlphabetical"), [
    "Alpha Europe",
    "Zulu Europe",
    "Beta Americas",
    "Alpha APAC",
  ]);
});

test("strategic technology partners precede integrations, A–Z inside each group", () => {
  const items = [
    {
      "jcr:title": "Alpha integration",
      "partnerClassification": "technology_integration",
      "regions": ["europe"],
    },
    {
      "jcr:title": "Zulu strategic",
      "partnerClassification": "technology_strategic",
      "regions": ["apac"],
    },
    { "jcr:title": "École strategic", "partnerType": "technology", "strategicPartner": true },
    { "jcr:title": "Beta integration", "partnerType": "technology", "integrationPartner": true },
    { "jcr:title": "Other", "partnerClassification": "unknown" },
  ];
  const before = JSON.stringify(items);
  assert.deepEqual(names(items, "partnershipAlphabetical"), [
    "École strategic",
    "Zulu strategic",
    "Alpha integration",
    "Beta integration",
    "Other",
  ]);
  assert.equal(JSON.stringify(items), before);
  assert.equal(defaultPartnerSort("technology"), "partnershipAlphabetical");
  assert.equal(defaultPartnerSort("solution"), "regionAlphabetical");
  assert.equal(defaultPartnerSort("all"), "regionAlphabetical");
});

test("alphabetical order ignores case, accents and surrounding whitespace", () => {
  const items = [partner("Zulu", "gold"), partner(" école ", "gold"), partner("ALPHA", "gold")];
  assert.deepEqual(names(items, "levelAlphabetical"), ["ALPHA", " école ", "Zulu"]);
});

test("technology and unspecified levels follow certified levels without being removed", () => {
  const items = [
    partner("Beta", undefined),
    { "jcr:title": "Alpha", "partnerClassification": "unknown" },
    partner("Zulu", "silver"),
  ];
  assert.deepEqual(names(items, "levelAlphabetical"), ["Zulu", "Alpha", "Beta"]);
});

test("existing legacy certification is used without rewriting partner data", () => {
  const items = [
    { "jcr:title": "Legacy", "partnerType": "integrator", "certification": "diamond" },
    partner("Alfa", "gold"),
  ];
  assert.deepEqual(names(items, "levelAlphabetical"), ["Legacy", "Alfa"]);
});

test("missing regions follow identified regions and use A–Z", () => {
  const items = [
    partner("Beta", "gold"),
    partner("Zulu APAC", "silver", "apac"),
    partner("Alpha", "diamond"),
  ];
  assert.deepEqual(names(items, "regionAlphabetical"), ["Zulu APAC", "Alpha", "Beta"]);
});

test("partner form offers one sort control and removes only its generic ordering section", () => {
  const form = JSON.parse(
    readFileSync(
      new URL("../settings/content-editor-forms/forms/jahiacom_partnerList.json", import.meta.url),
    ),
  );
  assert.equal(form.nodeType, "jahiacom:partnerList");
  assert.equal(form.sections.find((s) => s.name === "listOrdering").hide, true);
  const fields = form.sections.flatMap((s) => s.fieldSets || []).flatMap((f) => f.fields || []);
  assert.deepEqual(
    fields.map((f) => f.name),
    ["partnerSort"],
  );
  const cnd = readFileSync(
    new URL("../src/views/PartnerDirectory/definition.cnd", import.meta.url),
    "utf8",
  );
  assert.match(
    cnd,
    /partnerSort .* = 'regionAlphabetical' < 'levelAlphabetical', 'regionAlphabetical'/,
  );
});

test("old lists display their effective default without projecting over a saved choice", () => {
  const source = readFileSync(
    new URL("../javascript/apps/partner-editors-1.5.js", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("function upgradeValues(");
  const end = source.indexOf("function sameUpgradeValue(", start);
  assert.ok(start > 0 && end > start);
  const project = vm.runInNewContext("(" + source.slice(start, end).trim() + ")");
  const node = { primaryNodeType: { name: "jahiacom:partnerList" }, properties: [] };
  assert.equal(project(node, "fr").partnerSort, "regionAlphabetical");
  node.properties = [{ name: "partnerSort", value: "levelAlphabetical" }];
  assert.equal(project(node, "en").partnerSort, undefined);
  node.properties = [{ name: "directoryMode", value: "technology" }];
  assert.equal(project(node, "fr").partnerSort, "partnershipAlphabetical");
  node.properties.push({ name: "partnerSort", value: "regionAlphabetical" });
  assert.equal(project(node, "fr").partnerSort, undefined);
});
