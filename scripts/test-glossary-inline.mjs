import { test } from "node:test";
import assert from "node:assert/strict";
import { linkTermMentions, splitDefinition } from "../src/contents/GlossaryEntry/inlineTerms.ts";
import { sanitizeHtml } from "../src/contents/GlossaryEntry/sanitizeHtml.ts";

test("ambiguous FR/EN words stay plain in prose but link as explicit table notions", () => {
  const entries = [
    { id: "view", url: "/view", labels: ["Vue", "View"] },
    { id: "field", url: "/field", labels: ["Champ", "Field"] },
  ];
  const [result] = linkTermMentions(
    [
      '<p>Une version vue et un champ libre. A view of the field.</p><table><thead><tr><th>Vue</th></tr></thead><tbody><tr><th scope="row">Vue</th><td>Field</td></tr></tbody></table><p><a href="/view">vue</a> technique.</p>',
    ],
    entries,
    "other",
  );
  assert.match(result, /<p>Une version vue et un champ libre\. A view of the field\.<\/p>/);
  assert.equal((result.match(/data-glossary-mention/g) || []).length, 2);
  assert.match(result, /<a href="\/view">vue<\/a>/);
});

test("rich-text sanitizer removes executable markup and dangerous URL schemes", () => {
  const result = sanitizeHtml(
    '<script>alert(1)</script><p onclick="alert(1)">Text</p><img src="/image.png" onerror="alert(1)"><a href="jav&#x61;script:alert(1)">bad</a><svg onload="alert(1)"></svg><iframe srcdoc="bad"></iframe><a href="data:text/html,bad">data</a><span style="background:url(https://example.org)">style</span>',
  );
  assert.doesNotMatch(result, /script|onclick|onerror|onload|iframe|svg|srcdoc|data:text|style=/i);
  assert.match(result, /<p>Text<\/p>/);
  assert.match(result, /src="\/image.png"/);
});

test("sanitizer preserves editorial tables, inline links and percentages", () => {
  const html =
    '<table><caption>Comparison</caption><thead><tr><th scope="col">Notion</th></tr></thead><tbody><tr><th scope="row"><a href="/term" data-glossary-mention="true">CMS</a></th><td rowspan="2">85% <strong>source</strong></td></tr></tbody></table><a href="https://example.org" target="_blank">Source</a>';
  const result = sanitizeHtml(html);
  assert.match(result, /scope="row"/);
  assert.match(result, /rowspan="2"/);
  assert.match(result, /data-glossary-mention="true"/);
  assert.match(result, /85% <strong>source<\/strong>/);
  assert.match(result, /rel="noopener noreferrer"/);
  assert.equal(sanitizeHtml(result), result);
});

const terms = [
  { id: "portal", url: "/glossary/web-portal", labels: ["Web portal", "Portail web"] },
  { id: "intranet", url: "/glossary/intranet", labels: ["Intranet"] },
  { id: "dam", url: "/glossary/dam", labels: ["DAM"] },
];
test("FR and EN repeat mentions across sections without self links", () => {
  const result = linkTermMentions(
    ["<p>Portail web et intranet. intranet.</p>", "<p>Web portal, Intranet, DAM, dam.</p>"],
    terms,
    "portal",
  );
  assert.equal(result.join("").match(/data-glossary-mention/g).length, 4);
  assert.match(result[0], /<a[^>]+>intranet<\/a>/);
  assert.doesNotMatch(result.join(""), /<a[^>]+>(?:Portail web|Web portal|dam)<\/a>/);
});
test("preserves markup, entities, existing links, headings, code and attributes", () => {
  const result = linkTermMentions(
    [
      '<h2>Intranet</h2><p title="Intranet">&lt;Intranet&gt; &amp; DAM</p><code>DAM</code>',
      '<a href="/glossary/intranet">Existing intranet link</a>',
    ],
    terms,
    "portal",
  );
  assert.equal(result.join("").match(/data-glossary-mention/g).length, 2);
  assert.match(result[0], /title="Intranet"/);
  assert.match(result[0], /&lt;<a[^>]+>Intranet<\/a>&gt; &amp;/);
  assert.match(result[0], /<code>DAM<\/code>/);
});
test("ignores ambiguous aliases, partial words and unsafe target URLs", () => {
  const entries = [
    ...terms,
    { id: "other", url: "/other", labels: ["Intranet"] },
    { id: "bad", url: "javascript:alert(1)", labels: ["unsafe"] },
  ];
  assert.equal(
    linkTermMentions(["<p>intranets Intranet unsafe dam</p>"], entries, "portal")[0],
    "<p>intranets Intranet unsafe dam</p>",
  );
});
test("longest term wins and definition lead keeps inline markup", () => {
  const result = linkTermMentions(
    ["<p>Web portal &amp; portal.</p>"],
    [...terms, { id: "short", url: "/short", labels: ["portal"] }],
    "other",
  );
  assert.match(result[0], /href="\/glossary\/web-portal"[^>]*>Web portal<\/a>/);
  assert.deepEqual(splitDefinition("<p>A <strong>definition</strong>.</p><p>Details.</p>"), {
    lead: "A <strong>definition</strong>.",
    body: "<p>Details.</p>",
  });
});

test("native URL resolution preserves editorial links even with automatic mentions disabled", () => {
  const target = {
    id: "intranet",
    url: "/cms/render/default/fr/sites/mySite/intranet.html",
    labels: ["Intranet"],
    urlAliases: ["/fr/glossaire/intranet"],
  };
  const html = '<p><a href="/fr/glossaire/intranet#details">Intranet</a>. Intranet.</p>';
  const result = linkTermMentions([html], [target], "portal", false)[0];
  assert.match(result, /href="\/cms\/render\/default\/fr\/sites\/mySite\/intranet.html#details"/);
  assert.doesNotMatch(result, /data-glossary-mention/);
  assert.match(linkTermMentions([html], [target], "portal")[0], /data-glossary-mention/);
});

test("case differences no longer create inconsistent links for unique terms", () => {
  const result = linkTermMentions(
    ["<p>Un intranet et un objectif. Intranet et Objectif.</p>"],
    [
      { id: "intranet", url: "/intranet", labels: ["Intranet"] },
      { id: "goal", url: "/goal", labels: ["Objectif"] },
    ],
    "portal",
  )[0];
  assert.equal(result.match(/data-glossary-mention/g).length, 4);
});
test("table terms link even after prose or an existing editorial link, preserving emphasis", () => {
  const result = linkTermMentions(
    [
      '<p><a href="/glossary/intranet">Intranet</a>. Intranet.</p>',
      "<table><tbody><tr><td><strong>Web</strong> portal</td><td>Intranet et intranet</td></tr></tbody></table>",
    ],
    terms,
    "other",
  );
  assert.equal(result.join("").match(/data-glossary-mention/g).length, 4);
  assert.match(result[1], /<td><a[^>]+><strong>Web<\/strong> portal<\/a><\/td>/);
  assert.doesNotMatch(result.join(""), /<a[^>]*>[^<]*<a/);
  assert.equal(linkTermMentions(result, terms, "other").join(""), result.join(""));
});

test("headings and column headers stay unlinked while row terms remain clickable", () => {
  const sections = [
    ...[1, 2, 3, 4, 5, 6].map(
      (level) => `<h${level}>Intranet <a href="/glossary/dam"><strong>DAM</strong></a></h${level}>`,
    ),
    '<table><caption><a href="/glossary/intranet">Intranet</a></caption><thead><tr><td>Intranet <a href="/external">DAM</a></td></tr></thead><tbody><tr><th scope="row"><a href="/glossary/intranet">Intranet</a> DAM</th><td>Intranet</td></tr></tbody></table>',
  ];
  for (const enabled of [true, false]) {
    const result = linkTermMentions(sections, terms, "portal", enabled);
    for (const heading of result.slice(0, 6)) {
      assert.doesNotMatch(heading, /<a[ >]/);
      assert.match(heading, /<strong>DAM<\/strong>/);
    }
    assert.doesNotMatch(result[6].match(/<thead>.*?<\/thead>/s)[0], /<a[ >]/);
    assert.match(result[6].match(/<th scope="row">.*?<\/th>/s)[0], /href="\/glossary\/intranet"/);
    assert.doesNotMatch(result[6].match(/<caption>.*?<\/caption>/s)[0], /<a[ >]/);
    assert.equal((result[6].match(/data-glossary-mention/g) || []).length, enabled ? 2 : 0);
    assert.deepEqual(linkTermMentions(result, terms, "portal", enabled), result);
  }
});

test("formatted row labels link fully and column scope stays unlinked outside thead", () => {
  const html =
    '<table><tbody><tr><th scope="col"><a href="/glossary/intranet">Intranet</a></th></tr><tr><th scope="row"><strong>Web</strong> portal</th><td>Intranet</td></tr></tbody></table>';
  const result = linkTermMentions([html], terms, "other")[0];
  assert.match(result, /<th scope="col">Intranet<\/th>/);
  assert.match(
    result,
    /<th scope="row"><a href="\/glossary\/web-portal"[^>]*><strong>Web<\/strong> portal<\/a><\/th>/,
  );
  assert.equal((result.match(/data-glossary-mention/g) || []).length, 2);
});
