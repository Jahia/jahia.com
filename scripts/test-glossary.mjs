import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { filterTerms, groupTerms, termLetter } from "../src/views/Glossary/model.ts";

const { entries } = JSON.parse(
  readFileSync(new URL("../docs/glossary/wave1.json", import.meta.url), "utf8"),
);

test("wave 1 retains its 30 entries and 11 populated letters", () => {
  assert.equal(entries.length, 30);
  assert.equal(groupTerms(entries).length, 11);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 30);
});

test("every term has a distinct page, distinction and valid onward links", () => {
  assert.equal(new Set(entries.map((entry) => entry.url)).size, 30);
  for (const entry of entries) {
    assert.equal(entry.url, `/glossary/${entry.id}/`);
    assert.ok(entry.body && entry.comparisonTitle && entry.comparison);
    assert.ok(entry.resources.length > 0);
    for (const resource of entry.resources)
      assert.equal(new URL(resource.url).hostname, "www.jahia.com");
    for (const id of entry.relatedIds) {
      assert.notEqual(id, entry.id);
      assert.ok(entries.some((term) => term.id === id));
    }
  }
});

test("search matches synonyms and multiple words regardless of case", () => {
  assert.deepEqual(
    filterTerms(entries, "  REPLATFORMING  ").map((entry) => entry.title),
    ["CMS migration"],
  );
  assert.deepEqual(
    filterTerms(entries, "INTERNAL search").map((entry) => entry.title),
    ["Site search"],
  );
  assert.equal(filterTerms(entries, "no-such-glossary-term").length, 0);
  assert.equal(filterTerms(entries, "   ").length, 30);
});

test("accented and nonalphabetic terms retain navigable groups", () => {
  const accented = [{ id: "e", title: "Édition", aliases: [], summary: "Création de contenu" }];
  assert.equal(termLetter(" Édition"), "E");
  assert.equal(termLetter("360° portal"), "#");
  assert.equal(termLetter("東京"), "#");
  assert.equal(filterTerms(accented, "creation").length, 1);
  assert.equal(groupTerms(accented)[0][0], "E");
});
