import assert from "node:assert/strict";
import { test } from "node:test";
import { planFaqMigration } from "./lib/glossary-faq-migration.mjs";
const row = {
  workspace: "default",
  path: "/sites/test/contents/glossary/term/j:translation_fr",
  faqData: "",
  faq: "<h3>Question &amp; one?</h3><p>First <strong>answer</strong>.</p><h3>Two?</h3><ul><li>Second</li></ul>",
};
test("migration preserves order and rich answers and is idempotent", () => {
  const [plan] = planFaqMigration([row]);
  assert.equal(plan.action, "migrate");
  const items = JSON.parse(plan.nextData);
  assert.deepEqual(
    items.map((i) => i.question),
    ["Question & one?", "Two?"],
  );
  assert.match(items[0].answer, /<strong>answer<\/strong>/);
  assert.match(items[1].answer, /<ul>/);
  assert.deepEqual(planFaqMigration([{ ...row, faq: "", faqData: plan.nextData }]), []);
});
test("migration never overwrites a structured FAQ, malformed data or ambiguous legacy text", () => {
  for (const source of [
    { ...row, faqData: '[{"question":"New","answer":"New"}]' },
    { ...row, faqData: "broken" },
    { ...row, faq: "<p>Unpaired intro</p>" + row.faq },
    { ...row, faq: "<h3>Empty?</h3>" },
  ])
    assert.equal(planFaqMigration([source])[0].action, "skip");
});
test("migration strips active content and keeps draft and live versions independent", () => {
  const rows = [
    { ...row, faq: '<h3 onclick="bad()">Q?</h3><p>Draft<script>bad()</script></p>' },
    { ...row, workspace: "live", faq: "<h3>Q?</h3><p>Published</p>" },
  ];
  const plan = planFaqMigration(rows);
  assert.doesNotMatch(plan[0].nextData, /onclick|bad\(/);
  assert.match(plan[0].nextData, /Draft/);
  assert.match(plan[1].nextData, /Published/);
});
