import { test } from "node:test";
import assert from "node:assert/strict";
import { readRelatedLinks } from "./glossary-audit-links.mjs";

const base =
  "http://localhost:8081/cms/render/default/fr/sites/mySite/contents/glossary/portal.html";

test("counts related terms in the current combined CTA without counting resource or editorial links", () => {
  const html = `<article>
    <a href="/inline.html">Inline term</a>
    <section aria-labelledby="topic-cta">
      <a data-element-location="glossary" data-element-name="topic-resource" href="/resource.html">Resource</a>
      <ul><li><a data-element-location="glossary" data-element-name="related-term" href="/term.html">Term</a></li></ul>
    </section>
    <a data-element-location="footer" data-element-name="related-term" href="/other.html">Other</a>
  </article>`;
  assert.deepEqual(
    readRelatedLinks(html, base).map((url) => url.pathname),
    ["/term.html"],
  );
});

test("handles attribute order, single quotes and encoded query parameters", () => {
  const html = `<a href='next.html?a=1&amp;b=2' data-element-name='related-term' class='cta' data-element-location='glossary'>Next</a>`;
  assert.equal(readRelatedLinks(html, base)[0].href, new URL("next.html?a=1&b=2", base).href);
});

test("returns no links when related CTAs are absent and retains duplicates for audit validation", () => {
  assert.deepEqual(readRelatedLinks("<section aria-labelledby='topic-cta'></section>", base), []);
  const link = `<a href='/term.html' data-element-location='glossary' data-element-name='related-term'>Term</a>`;
  assert.equal(readRelatedLinks(link + link, base).length, 2);
});
