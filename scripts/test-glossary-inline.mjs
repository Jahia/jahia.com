import { test } from "node:test";
import assert from "node:assert/strict";
import { linkTermMentions, splitDefinition } from "../src/contents/GlossaryEntry/inlineTerms.ts";
import { sanitizeHtml } from "../src/contents/GlossaryEntry/sanitizeHtml.ts";

const terms = [
  { id: "portal", url: "/web-portal", labels: ["Web portal", "Portail web"] },
  { id: "item", url: "/content-item", labels: ["Content item", "Content"] },
  { id: "type", url: "/content-type", labels: ["Content type", "Type de contenu"] },
  { id: "cms", url: "/cms", labels: ["CMS", "Système de gestion de contenu"] },
];
const count = (html) => (html.match(/data-glossary-mention/g) || []).length;

test("first paragraph below H1 has no links, including editorial anchors", () => {
  const [result] = linkTermMentions(
    [' <p><a href="/web-portal">Web portal</a> and Content item.</p><p>Web portal.</p>'],
    terms,
    "other",
  );
  const { lead, body } = splitDefinition(result);
  assert.doesNotMatch(lead, /<a\b/);
  assert.equal(count(body), 1);
});

test("one first eligible occurrence per target across all sections and aliases", () => {
  const result = linkTermMentions(
    [
      "<p>Intro</p><p>Portail web, Web portal.</p>",
      "<table><tr><th scope='row'>Web portal</th><td>Content item</td></tr></table>",
      "<p>Content item. Type de contenu.</p>",
      "<p>Content type.</p>",
    ],
    terms,
    "other",
  );
  assert.equal(count(result.join("")), 3);
  assert.equal(count(result[0]), 1);
  assert.equal(count(result[1]), 1);
  assert.equal(count(result[2]), 1);
  assert.equal(count(result[3]), 0);
});

test("isolated words and acronyms never trigger automatic links, even in table notions", () => {
  const words = ["content", "CMS", "template", "module", "visitor", "goal", "Vue", "Intranet"];
  const entries = words.map((word, i) => ({ id: String(i), url: "/term-" + i, labels: [word] }));
  const result = linkTermMentions(
    [
      "<p>Intro</p><p>" +
        words.join(" ") +
        "</p><table><tr><td>CMS</td><th scope='row'>template</th></tr></table>",
    ],
    entries,
    "other",
  );
  assert.equal(count(result.join("")), 0);
});

test("complete expressions match without linking generic aliases or partial words", () => {
  const [result] = linkTermMentions(
    [
      "<p>Content is the intro.</p><p>Content, CMS, Content items, Content item and Content type.</p>",
    ],
    terms,
    "other",
  );
  assert.equal(count(result), 2);
  assert.match(result, />Content item<\/a>/);
  assert.match(result, />Content type<\/a>/);
  assert.doesNotMatch(result, />Content<\/a>/);
});

test("six automatic links maximum across the full page", () => {
  const entries = Array.from({ length: 9 }, (_, i) => ({
    id: String(i),
    url: "/term-" + i,
    labels: ["Concept " + i],
  }));
  const result = linkTermMentions(
    [
      "<p>Intro</p><p>Concept 0, Concept 1, Concept 2.</p>",
      "<p>Concept 3, Concept 4, Concept 5.</p>",
      "<p>Concept 6, Concept 7, Concept 8.</p>",
    ],
    entries,
    "other",
  );
  assert.equal(count(result.join("")), 6);
  assert.equal(count(result[2]), 0);
});

test("titles and column headers stay unlinked; formatted row notion remains eligible", () => {
  const [result] = linkTermMentions(
    [
      '<p>Intro</p><h2><a href="/web-portal">Web portal</a></h2><table><thead><tr><th>Content item</th></tr></thead><tbody><tr><th scope="col">Content type</th><th scope="row"><strong>Web</strong> portal</th></tr></tbody></table>',
    ],
    terms,
    "other",
  );
  assert.equal(count(result), 1);
  assert.match(result, /<h2>Web portal<\/h2>/);
  assert.match(result, /<a[^>]+><strong>Web<\/strong> portal<\/a>/);
});

test("authored glossary links participate in target deduplication; external sources survive", () => {
  const [result] = linkTermMentions(
    [
      '<p>Intro</p><p><a href="/web-portal">Portal source</a> Web portal.</p><p><a href="/web-portal">Again</a><a href="https://academy.jahia.com/">Academy</a> Content item.</p>',
    ],
    terms,
    "other",
  );
  assert.equal((result.match(/href="\/web-portal"/g) || []).length, 1);
  assert.match(result, /href="https:\/\/academy.jahia.com\/"/);
  assert.equal(count(result), 1);
});

test("self, ambiguous labels, code and unsafe targets remain excluded", () => {
  const entries = [
    ...terms,
    { id: "duplicate", url: "/duplicate", labels: ["Content type"] },
    { id: "unsafe", url: "javascript:alert(1)", labels: ["Unsafe term"] },
  ];
  const [result] = linkTermMentions(
    [
      "<p>Intro</p><p>Web portal, Content type, Unsafe term.</p><code>Content item</code><pre>Content item</pre>",
    ],
    entries,
    "portal",
  );
  assert.equal(count(result), 0);
});

test("disabled mentions retain native URL resolution and heading/intro exclusions", () => {
  const entries = [
    {
      id: "portal",
      url: "/native",
      urlAliases: ["/fr/glossaire/portail-web"],
      labels: ["Portail web"],
    },
  ];
  const [result] = linkTermMentions(
    [
      '<p>Intro</p><p><a href="/fr/glossaire/portail-web#test">Source</a> Portail web.</p><h3><a href="/native">Title</a></h3>',
    ],
    entries,
    "other",
    false,
  );
  assert.equal(count(result), 0);
  assert.match(result, /href="\/native#test"/);
  assert.match(result, /<h3>Title<\/h3>/);
});

test("generated links can be recalculated without accumulating duplicates", () => {
  const source = ["<p>Intro</p><p>Web portal, Content item, Web portal.</p>"];
  const once = linkTermMentions(source, terms, "other");
  assert.deepEqual(linkTermMentions(once, terms, "other"), once);
});

test("rich-text sanitizer removes executable markup and dangerous URL schemes", () => {
  const result = sanitizeHtml(
    '<script>alert(1)</script><p onclick="alert(1)">Text</p><img src="/image.png" onerror="alert(1)"><a href="jav&#x61;script:alert(1)">bad</a><svg onload="alert(1)"></svg><iframe srcdoc="bad"></iframe><a href="data:text/html,bad">data</a><span style="background:url(https://example.org)">style</span>',
  );
  assert.doesNotMatch(result, /script|onclick|onerror|onload|iframe|svg|srcdoc|data:text|style=/i);
  assert.match(result, /<p>Text<\/p>/);
  assert.match(result, /src="\/image.png"/);
});

test("sanitizer preserves table semantics, sources and percentages", () => {
  const html =
    '<table><caption>Comparison</caption><thead><tr><th scope="col">Notion</th></tr></thead><tbody><tr><th scope="row"><a href="/term" data-glossary-mention="true">CMS</a></th><td rowspan="2">85% <strong>source</strong></td></tr></tbody></table><a href="https://example.org" target="_blank">Source</a>';
  const result = sanitizeHtml(html);
  for (const fragment of [
    'scope="row"',
    'rowspan="2"',
    'data-glossary-mention="true"',
    "85% <strong>source</strong>",
    'rel="noopener noreferrer"',
  ])
    assert.ok(result.includes(fragment));
  assert.equal(sanitizeHtml(result), result);
});
