import { test } from "node:test";
import assert from "node:assert/strict";
import { rankLinks, rankLinksWithEvidence } from "../src/contents/GlossaryEntry/linkSelection.ts";
const item = (id, title, extra = {}) => ({ id, title, ...extra });
test("whole expressions match accents and punctuation without substring noise", () => {
  assert.deepEqual(
    rankLinks(
      [item("a", "Portail client"), item("b", "Transport"), item("c", "PORTAIL-CLIENT sécurisé")],
      ["portail client"],
      [],
      [],
      12,
    ).map((x) => x.id),
    ["a", "c"],
  );
  assert.equal(rankLinks([item("x", "Sécurité")], ["securite"], [], [], 12).length, 1);
  assert.equal(rankLinks([item("x", "Transport")], ["port"], [], [], 12).length, 0);
});
test("manual selections and exclusions never reappear; no unrelated fallback", () => {
  assert.deepEqual(
    rankLinks(
      [item("a", "Portal"), item("b", "Portal"), item("c", "Unrelated")],
      ["portal"],
      [],
      ["a", "b"],
      12,
    ),
    [],
  );
});
test("title precedes summary; duplicates and cap are deterministic", () => {
  const pool = [
    item("a", "Other", { description: "A portal" }),
    item("b", "Portal"),
    item("b", "Portal"),
  ];
  assert.deepEqual(
    rankLinks(pool, ["portal"], [], [], 1).map((x) => x.id),
    ["b"],
  );
});
test("themes restrict matching resources and synonyms provide controlled matches", () => {
  assert.equal(
    rankLinks(
      [
        item("a", "Portal", { taxonomyIds: ["cms"] }),
        item("b", "Portal", { taxonomyIds: ["other"] }),
      ],
      ["portal"],
      ["cms"],
      [],
      12,
    ).length,
    1,
  );
  assert.equal(
    rankLinks(
      [item("a", "CMS", { aliases: ["content management system"] })],
      ["content management system"],
      [],
      [],
      6,
    ).length,
    1,
  );
  assert.deepEqual(rankLinks([item("a", "CMS")], [], [], [], 12), []);
});

test("A/B Test finds bilingual testing descriptions with empty manual selections", () => {
  const candidates = [
    item("strategy", "Comment construire une stratégie de personnalisation", {
      description: "Données first-party, segmentation, A/B testing et automatisation.",
    }),
    item("feature", "Données clients et personnalisation", {
      description: "Combine les tests A/B, l'analyse et la personnalisation.",
    }),
    item("unrelated", "Test de charge", { description: "Mesurer les performances." }),
  ];
  assert.deepEqual(
    rankLinks(candidates, ["A/B Test"], [], [], 12)
      .map((x) => x.id)
      .sort(),
    ["feature", "strategy"],
  );
  assert.equal(rankLinks([item("one", "A/B testing")], ["tests A/B"], [], [], 12).length, 1);
  assert.equal(rankLinks(candidates, ["A/B Test"], [], ["feature", "strategy"], 12).length, 0);
});

test("full editorial text broadens coverage while direct matches precede related subjects", () => {
  const pool = [
    item("related", "Personnalisation", { description: "Experiences ciblees" }),
    item("body", "Mesurer une experience", {
      content: "Avec les tests A/B, comparez les variantes.",
    }),
    item("title", "A/B testing"),
    item("noise", "Legal"),
  ];
  assert.deepEqual(
    rankLinks(pool, ["A/B Test"], [], [], 24, ["Personnalisation"]).map((x) => x.id),
    ["title", "body", "related"],
  );
  assert.deepEqual(
    rankLinks(pool, ["A/B Test"], [], ["body"], 24, ["Personnalisation"]).map((x) => x.id),
    ["title", "related"],
  );
});
test("related words in long content alone do not flood results", () => {
  assert.deepEqual(
    rankLinks(
      [item("noise", "Other", { content: "A passing mention of personalization" })],
      ["A/B Test"],
      [],
      [],
      24,
      ["personalization"],
    ),
    [],
  );
});

test("generic content words do not produce related resources", () => {
  assert.deepEqual(
    rankLinks(
      [item("seo", "Content Marketing", { description: "A content site page" })],
      ["Absolute Area"],
      [],
      [],
      24,
      ["Content"],
      "Contenu page site Jahia",
    ),
    [],
  );
});
test("specific shared vocabulary broadens context without selecting unrelated articles", () => {
  const pool = [
    item("technical", "Reusable templates", {
      description: "Shared fragments across templates",
      content: "Navigation fragments reusable shared layout",
    }),
    item("noise", "Pricing", { content: "Content pages site Jahia" }),
  ];
  assert.deepEqual(
    rankLinks(
      pool,
      ["Absolute Area"],
      [],
      [],
      24,
      [],
      "Reusable shared fragments navigation templates layout",
    ).map((x) => x.id),
    ["technical"],
  );
});
test("comparison concepts select related entries and exclusions remain authoritative", () => {
  const pool = [item("area", "Area"), item("template", "Template"), item("self", "Absolute Area")];
  assert.deepEqual(
    rankLinks(pool, ["Absolute Area"], [], ["self", "area"], 6, [], "", ["Area", "Template"]).map(
      (x) => x.id,
    ),
    ["template"],
  );
});

test("concept profiles find bilingual resources and reject unrelated semantic fallback", () => {
  const pool = [
    item("fr", "Une usine à sites", { content: "Blocs de contenu partagés par tous les sites" }),
    item("en", "Site factory", { content: "Shared content blocks across sites" }),
    item("noise", "YourKit Java Profiler", {
      content: "Templates memory profiling navigation layout",
    }),
    item("direct", "Absolute Area explained"),
  ];
  assert.deepEqual(
    rankLinks(
      pool,
      ["Absolute Area"],
      [],
      [],
      24,
      ["Java Profiler"],
      "Templates shared fragments navigation layout",
      [],
      "absolute-area",
    ).map((x) => x.id),
    ["direct", "fr", "en"],
  );
});
test("jExperience events require product, event and collection evidence together", () => {
  const pool = [
    item("fr", "CDP", { content: "Apache Unomi : données collectées depuis chaque événement." }),
    item("en", "CDP", { content: "Unomi stores events collected from interactions." }),
    item("noise", "jExperience webinar", { content: "Attend our event" }),
    item("other", "Events collected", { content: "Other analytics product" }),
  ];
  assert.deepEqual(
    rankLinks(pool, ["Event (jExperience)"], [], [], 24, [], "", [], "event-jexperience")
      .map((x) => x.id)
      .sort(),
    ["en", "fr"],
  );
  assert.equal(
    rankLinks(
      pool,
      ["Event (jExperience)"],
      ["missing-theme"],
      [],
      24,
      [],
      "",
      [],
      "event-jexperience",
    ).length,
    0,
  );
});
test("content properties and visitor properties remain distinct concepts", () => {
  const pool = [
    item("content", "Content types", { content: "Editable fields and editorial properties" }),
    item("visitor", "Visitor profiles", {
      content: "Unomi enriches visitor profiles with attributes",
    }),
    item("noise", "Property market", { content: "Buy your next property" }),
  ];
  assert.deepEqual(
    rankLinks(pool, ["Property (content)"], [], [], 24, [], "", [], "property-content").map(
      (x) => x.id,
    ),
    ["content"],
  );
  assert.deepEqual(
    rankLinks(pool, ["Property (jExperience)"], [], [], 24, [], "", [], "property-jexperience").map(
      (x) => x.id,
    ),
    ["visitor"],
  );
});
test("reuse and visibility concepts reject mere content or SEO visibility", () => {
  const pool = [
    item("reuse", "CMS", { content: "Réutilisation du contenu entre sites" }),
    item("visibility", "Conditional display", { content: "Component rules" }),
    item("noise", "SEO visibility", { content: "Content marketing" }),
  ];
  assert.deepEqual(
    rankLinks(pool, ["Content Reference"], [], [], 24, [], "", [], "content-reference").map(
      (x) => x.id,
    ),
    ["reuse"],
  );
  assert.deepEqual(
    rankLinks(pool, ["Visibility Condition"], [], [], 24, [], "", [], "visibility-condition").map(
      (x) => x.id,
    ),
    ["visibility"],
  );
  assert.equal(
    rankLinks(pool, ["Content Reference"], [], ["reuse"], 24, [], "", [], "content-reference")
      .length,
    0,
  );
});

test("concept evidence cannot be assembled from distant unrelated passages", () => {
  const item = {
    id: "distant",
    title: "Platform news",
    content: "Unomi " + "other topic ".repeat(100) + "events collected from interactions",
  };
  assert.deepEqual(
    rankLinks([item], ["Event (jExperience)"], [], [], 24, [], "", [], "event-jexperience"),
    [],
  );
});

test("editable bilingual vocabulary overrides defaults and requires every configured group", () => {
  const options = {
    conceptTerms: ["Event", "événement"],
    conceptScope: ["Unomi"],
    conceptSignals: ["collected", "collectées"],
  };
  const pool = [
    item("yes", "CDP", { content: "Unomi : données collectées pour cet événement" }),
    item("no", "Event", { content: "A marketing event" }),
  ];
  const result = rankLinksWithEvidence(
    pool,
    ["custom glossary title"],
    [],
    [],
    24,
    [],
    "",
    [],
    "absolute-area",
    options,
  );
  assert.deepEqual(
    result.map((r) => r.item.id),
    ["yes"],
  );
  assert.equal(result[0].evidence.reason, "concept");
  assert.deepEqual(result[0].evidence.phrases, ["evenement", "unomi", "collectees"]);
  assert.match(result[0].evidence.passage, /unomi/);
});
test("educational preference only ranks relevant resources and can be disabled", () => {
  const pool = [
    item("plain", "A platform", { content: "shared content blocks across sites" }),
    item("guide", "How to share content", { content: "shared content blocks across sites" }),
    item("noise", "How to cook"),
    item("direct", "Absolute Area"),
  ];
  const args = [pool, ["Absolute Area"], [], [], 24, [], "", [], "absolute-area"];
  assert.deepEqual(
    rankLinks(...args, { preferEducational: true }).map((r) => r.id),
    ["direct", "guide", "plain"],
  );
  assert.deepEqual(
    rankLinks(...args, { preferEducational: false }).map((r) => r.id),
    ["direct", "plain", "guide"],
  );
  assert.equal(
    rankLinksWithEvidence(...args, { preferEducational: true })[1].educational.reason,
    "educational-title",
  );
});
