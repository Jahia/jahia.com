import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
const hooks = registerHooks({
  resolve(name, ctx, next) {
    if (name === "@jahia/javascript-modules-library")
      return { url: "glossary-editorial:jahia", shortCircuit: true };
    if (name.endsWith(".js") && ctx.parentURL?.includes("/src/")) {
      const url = new URL(name.replace(/\.js$/, ".ts"), ctx.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, ctx);
    }
    return next(name, ctx);
  },
  load(url, ctx, next) {
    if (url === "glossary-editorial:jahia")
      return {
        format: "module",
        shortCircuit: true,
        source: `export const buildNodeUrl=node=>'/native/'+node.getIdentifier()+'.html';`,
      };
    return next(url, ctx);
  },
});
const { faqBlocks } = await import("../src/contents/GlossaryEntry/faqBlocks.ts");
const { sanitizeHtml } = await import("../src/contents/GlossaryEntry/sanitizeHtml.ts");
const { entrySchemas, faqQuestions } =
  await import("../src/contents/GlossaryEntry/structuredData.ts");
const { manualResources } = await import("../src/contents/GlossaryEntry/manualResources.server.ts");

test("FAQ pairs preserve rich answers, heading wrappers and text before the questions", () => {
  const html =
    '<p>Intro</p><div><h3>Question <em>one</em>?</h3><p>A <strong>rich</strong> answer.</p><ul><li>One</li><li>Two</li></ul><h3>Question two?</h3><p><a href="/resource">Read more</a></p></div>';
  const b = faqBlocks(sanitizeHtml(html));
  assert.equal(b.length, 3);
  assert.equal(b[0].question, undefined);
  assert.equal(b[1].question, "Question one?");
  assert.match(b[1].html, /<strong>rich<\/strong>/);
  assert.match(b[1].html, /<ul><li>One/);
  assert.equal(b[2].question, "Question two?");
  assert.match(b[2].html, /href="\/resource"/);
});
test("FAQ rendering keeps the sanitizer boundary and does not permit injected styles or scripts", () => {
  const b = faqBlocks(
    sanitizeHtml(
      '<h3 onclick="evil()">Safe?</h3><p style="color:red">Answer<script>evil()</script><img src="javascript:evil()" onerror="evil()"></p>',
    ),
  );
  assert.equal(b[0].question, "Safe?");
  assert.doesNotMatch(b[0].html, /evil\(|onerror|style=/);
});
test("DefinedTerm uses index label; WebPage, H1 input and FAQPage remain unchanged", () => {
  const base = {
    url: "https://example.test/agentic-ai",
    title: "What is agentic AI?",
    summary: "A definition.",
    slug: "agentic-ai",
    language: "en",
    faq: "<h3>Question?</h3><p>Answer.</p>",
    breadcrumbs: [],
  };
  const before = entrySchemas(base),
    after = entrySchemas({ ...base, indexLabel: " Agentic AI " });
  assert.equal(after.find((x) => x["@type"] === "DefinedTerm").name, "Agentic AI");
  assert.equal(after.find((x) => x["@type"] === "WebPage").name, base.title);
  assert.deepEqual(
    after.find((x) => x["@type"] === "FAQPage"),
    before.find((x) => x["@type"] === "FAQPage"),
  );
  assert.equal(after.filter((x) => x["@type"] === "FAQPage").length, 1);
  assert.equal(entrySchemas({ ...base, indexLabel: "  " })[0].name, base.title);
  assert.deepEqual(faqQuestions(base.faq), [{ name: "Question?", answer: "Answer." }]);
});
const node = (
  id,
  {
    type = "jnt:page",
    pageType = "generic",
    read = true,
    translated = true,
    published = true,
  } = {},
) => ({
  getIdentifier: () => id,
  getPath: () => "/sites/test/" + id,
  hasPermission: () => read,
  hasI18N: () => translated,
  isNodeType: (t) => t === type,
  hasProperty: (key) => key === "j:published",
  getProperty: (key) => {
    if (key === "j:published") return { getBoolean: () => published };
    throw Error("missing");
  },
  getPropertyAsString: (key) => (key === "jcr:title" ? id : key === "pageType" ? pageType : ""),
  getDisplayableName: () => id,
});
test("manual resources accept blog, customer case and generic page, preserve order and deduplicate", () => {
  const deps = [];
  const main = node("term");
  const blog = node("blog", { type: "jahiacom:blogEntry" }),
    customer = node("case", { pageType: "case-study" }),
    page = node("page");
  const rows = manualResources([page, blog, customer, page], main, {}, (n) =>
    deps.push(n.getIdentifier()),
  );
  assert.deepEqual(
    rows.map((x) => x.id),
    ["page", "blog", "case"],
  );
  assert.deepEqual(
    rows.map((x) => x.kind),
    ["resource", "blog", "customerCase"],
  );
  assert.ok(deps.includes("case"));
});
test("manual resources never expose drafts, unreadable content, missing translations or the current entry", () => {
  const main = node("term");
  const rows = manualResources(
    [
      null,
      node("draft", { published: false }),
      node("private", { read: false }),
      node("english-only", { translated: false }),
      main,
      node("wrong", { type: "jahiacom:glossaryEntry" }),
    ],
    main,
    {},
    () => {},
  );
  assert.deepEqual(rows, []);
});

const { selectedFaqItems } = await import("../src/contents/GlossaryEntry/faqItems.server.ts");
test("structured FAQ uses one schema source, sanitizes answers, and preserves legacy fallback", () => {
  const items = parseFaqData(
    JSON.stringify([
      {
        question: "<script>text</script>?",
        answer:
          '<p onclick="evil()">Safe</p><h3>Answer heading</h3><p>Continued<script>evil()</script></p>',
      },
    ]),
  );
  assert.doesNotMatch(items[0].html, /onclick|evil\(/);
  const base = {
    url: "https://example.test/term",
    title: "Term",
    summary: "Summary",
    slug: "term",
    language: "fr",
    breadcrumbs: [],
    faq: "<h3>Legacy?</h3><p>Old.</p>",
  };
  const schemas = entrySchemas({ ...base, faqItems: items });
  const faq = schemas.filter((x) => x["@type"] === "FAQPage");
  assert.equal(faq.length, 1);
  assert.equal(faq[0].mainEntity.length, 1);
  assert.equal(faq[0].mainEntity[0].name, "<script>text</script>?");
  assert.equal(faq[0].mainEntity[0].acceptedAnswer.text, "Safe Answer heading Continued");
  assert.equal(
    entrySchemas({ ...base, faqItems: [] }).find((x) => x["@type"] === "FAQPage").mainEntity[0]
      .name,
    "Legacy?",
  );
});

hooks.deregister();

const { parseFaqData } = await import("../src/contents/GlossaryEntry/faqItems.ts");
test("inline FAQ data keeps ordered complete pairs, filters active content, and falls back safely", () => {
  const raw = JSON.stringify([
    { question: "Second?", answer: "<p>Two</p>" },
    { question: "First?", answer: '<p onclick="evil()">One<script>evil()</script></p>' },
    { question: "", answer: "Incomplete" },
  ]);
  assert.deepEqual(
    parseFaqData(raw).map((x) => x.question),
    ["Second?", "First?"],
  );
  assert.doesNotMatch(parseFaqData(raw)[1].html, /onclick|evil/);
  for (const value of ["bad", "null", "{}", '[{"question":4,"answer":{}}]'])
    assert.deepEqual(parseFaqData(value), []);
  const entry = { hasProperty: (k) => k === "faqData", getPropertyAsString: () => raw };
  assert.equal(selectedFaqItems(entry).length, 2);
});
