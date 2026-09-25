import assert from "node:assert/strict";
import { test } from "node:test";
import { glossaryUpdatedLabel, nodeModifiedAt } from "../src/views/Glossary/updatedDate.ts";
const node = (properties) => ({
  hasProperty: (name) => name in properties,
  getProperty: (name) => ({
    getValue: () => ({ getDate: () => ({ getTimeInMillis: () => Date.parse(properties[name]) }) }),
  }),
});
test("new December entry advances the month in both languages", () => {
  const old = nodeModifiedAt(node({ "jcr:lastModified": "2026-09-22T12:00:00Z" }));
  const added = nodeModifiedAt(node({ "jcr:created": "2026-12-02T12:00:00Z" }));
  assert.equal(glossaryUpdatedLabel(Math.max(old, added), "fr"), "décembre 2026");
  assert.equal(glossaryUpdatedLabel(Math.max(old, added), "en"), "December 2026");
});
test("modification wins over creation and missing dates stay empty", () => {
  assert.equal(
    glossaryUpdatedLabel(
      nodeModifiedAt(
        node({ "jcr:created": "2026-09-22T12:00:00Z", "jcr:lastModified": "2027-01-02T12:00:00Z" }),
      ),
      "en",
    ),
    "January 2027",
  );
  assert.equal(glossaryUpdatedLabel(nodeModifiedAt(node({})), "fr"), undefined);
  assert.equal(glossaryUpdatedLabel(NaN, "en"), undefined);
});
