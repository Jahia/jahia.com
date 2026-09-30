import { test } from "node:test";
import assert from "node:assert/strict";
import { rankLinks } from "../src/contents/GlossaryEntry/linkSelection.ts";
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
