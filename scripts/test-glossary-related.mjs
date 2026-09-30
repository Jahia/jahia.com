import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const path = new URL("../src/contents/GlossaryEntry/relatedTerms.ts", import.meta.url);
const source = readFileSync(path, "utf8").replace(
  "./linkSelection.js",
  new URL("./linkSelection.ts", path).href,
);
const {
  selectRelatedTerms,
  selectRelatedTermDetails,
  mergeRelatedTranslations,
  resetRelatedCache,
  getRelatedCacheStats,
} = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const item = (id, title, content = "") => ({ id, title, content });
test("explicit comparison concepts come first, including French zone/Area", () => {
  const current = item("self", "Absolute Area", "Shared templates and references");
  const result = selectRelatedTerms(
    [current, item("area", "Area"), item("template", "Template"), item("ref", "Content Reference")],
    current,
    ["Zone"],
  );
  assert.equal(result[0].id, "area");
  assert.equal(result.length, 3);
});
test("minimum uses nearby concepts and rejects ambiguous dynamic fieldsets when alternatives exist", () => {
  const current = item(
    "self",
    "Static vs dynamic website",
    "Dynamic pages assembled through rendering architecture",
  );
  const result = selectRelatedTerms(
    [
      item("wrong", "Dynamic Fieldset", "Dynamic pages assembled through rendering architecture"),
      item("headless", "Headless CMS", "Rendering pages"),
      item("cloud", "Cloud content management", "Website hosting"),
      item("hybrid", "Hybrid CMS", "Rendering architecture"),
      item("enterprise", "Enterprise CMS", "Website architecture"),
    ],
    current,
  );
  assert.equal(result.length, 4);
  assert.ok(!result.some((x) => x.id === "wrong"));
});
test("self and duplicate references are excluded and six is a hard maximum", () => {
  const current = item("self", "CMS", "CMS architecture");
  const a = item("a", "Headless CMS");
  const pool = [
    current,
    a,
    a,
    ...Array.from({ length: 9 }, (_, i) => item(String(i), `CMS architecture ${i}`)),
  ];
  const result = selectRelatedTerms(pool, current);
  assert.equal(result.length, 6);
  assert.equal(new Set(result.map((x) => x.id)).size, 6);
  assert.ok(!result.some((x) => x.id === "self"));
});
test("small eligible pools are not filled with duplicates or invented entries", () => {
  const current = item("self", "CMS");
  assert.deepEqual(selectRelatedTerms([], current), []);
  assert.equal(selectRelatedTerms([current, item("one", "Headless CMS")], current).length, 1);
});
test("reverse mentions establish a relationship", () => {
  const current = item("self", "A/B Test");
  const result = selectRelatedTerms(
    [
      item("noise", "Template"),
      item("goal", "Goal", "A/B testing measures this goal"),
      item("conversion", "Conversion Rate"),
    ],
    current,
  );
  assert.equal(result[0].id, "goal");
});
test("a generic French service model does not become a Template relation", () => {
  const current = item("self", "Cloud hosting", "Un modèle de service pour hébergement cloud");
  const result = selectRelatedTerms(
    [
      item("template", "Template"),
      item("cloud", "Cloud content management"),
      item("cms", "Enterprise CMS"),
      item("hybrid", "Hybrid CMS"),
      item("headless", "Headless CMS"),
    ],
    current,
  );
  assert.ok(!result.some((x) => x.id === "template"));
});

test("shared translation profiles produce the same IDs and order regardless of display language", () => {
  const fr = {
    ...item("self", "Zone absolue", "Zone partagée, template et référence"),
    language: "fr",
    concepts: ["Zone", "Template"],
  };
  const en = {
    ...item("self", "Absolute Area", "Shared area and template"),
    language: "en",
    concepts: ["Area", "Template"],
  };
  const profileFR = mergeRelatedTranslations("self", [fr, en]);
  const profileEN = mergeRelatedTranslations("self", [en, fr]);
  assert.deepEqual(profileFR, profileEN);
  const pool = [
    item("area", "Area"),
    item("template", "Template"),
    item("reference", "Content Reference"),
    item("portal", "Web portal"),
  ];
  assert.deepEqual(
    selectRelatedTerms(pool, profileFR, profileFR.concepts).map((x) => x.id),
    selectRelatedTerms([...pool].reverse(), profileEN, profileEN.concepts).map((x) => x.id),
  );
});

test("a shared explicit concept improves a nearby candidate and explains its selection", () => {
  const current = { ...item("self", "Alpha Topic"), concepts: ["Shared Bridge"] };
  const pool = [
    { ...item("beta", "Beta Topic"), concepts: ["Shared Bridge"] },
    item("bridge", "Shared Bridge"),
    item("noise", "Unrelated Topic"),
    item("other", "Other Topic"),
  ];
  const result = selectRelatedTermDetails(pool, current, current.concepts);
  assert.ok(
    result.findIndex((x) => x.item.id === "beta") < result.findIndex((x) => x.item.id === "noise"),
  );
  assert.equal(result.find((x) => x.item.id === "beta").reason, "shared-concepts");
  assert.deepEqual(result.find((x) => x.item.id === "beta").via, ["Shared Bridge"]);
});

test("cache reuses bilingual corpus and returns fresh eligible objects", () => {
  resetRelatedCache();
  const current = item("self", "CMS");
  const pool = [item("a", "Headless CMS"), item("b", "Hybrid CMS")];
  const first = selectRelatedTermDetails(pool, current);
  first[0].via.push("must not leak");
  const fresh = pool.map((x) => ({ ...x, url: "/fr/" + x.id })).reverse();
  const second = selectRelatedTermDetails(fresh, { ...current });
  assert.equal(getRelatedCacheStats().prepared, 1);
  assert.equal(getRelatedCacheStats().resultHits, 1);
  assert.ok(second.every((x) => fresh.includes(x.item) && !x.via.includes("must not leak")));
});

test("editorial changes and eligible pool changes invalidate cached results", () => {
  const fields = {
    title: "Changed",
    aliases: ["Changed"],
    description: "Changed",
    content: "Changed",
    comparison: "Changed",
    concepts: ["Changed"],
    taxonomyIds: ["Changed"],
  };
  for (const [field, value] of Object.entries(fields)) {
    resetRelatedCache();
    const current = item("self", "CMS");
    const pool = [item("a", "Headless CMS"), item("b", "Hybrid CMS")];
    selectRelatedTerms(pool, current);
    selectRelatedTerms([{ ...pool[0], [field]: value }, pool[1]], current);
    assert.equal(getRelatedCacheStats().prepared, 2, field);
    assert.deepEqual(
      selectRelatedTerms([pool[1]], current).map((x) => x.id),
      ["b"],
    );
    assert.equal(getRelatedCacheStats().prepared, 3);
  }
});

test("cache is bounded and comparison choices have separate result keys", () => {
  resetRelatedCache();
  const pool = [item("a", "Headless CMS"), item("b", "Hybrid CMS")];
  const current = item("self", "CMS");
  selectRelatedTerms(pool, current, ["Headless CMS"]);
  assert.equal(selectRelatedTerms(pool, current, ["Hybrid CMS"])[0].id, "b");
  assert.equal(getRelatedCacheStats().prepared, 1);
  assert.equal(getRelatedCacheStats().resultHits, 0);
  for (let i = 0; i < 6; i++) selectRelatedTerms(pool, { ...current, content: String(i) });
  assert.equal(getRelatedCacheStats().corpora, 4);
  assert.equal(getRelatedCacheStats().evictions, 3);
});
