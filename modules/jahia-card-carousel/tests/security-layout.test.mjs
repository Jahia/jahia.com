import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the actual TypeScript functions, without a second test implementation.
const loadTs = async (path) => {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace('from "xss"', `from ${JSON.stringify(import.meta.resolve("xss"))}`);
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};
const { safeUrl, sanitizeRichText } = await loadTs("../src/security.ts");
const { carouselLayout } = await loadTs("../src/components/Carousel/layout.ts");
const { paginationMetrics } = await loadTs("../src/components/Carousel/pagination.ts");

test("pagination reaches the last partial page and ignores nested slides", () => {
  const original = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "3" });
  try {
    const parent = {};
    const cards = [0, 100, 200, 300, 400, 500, 600, 700].map((left) => ({
      parentElement: parent,
      getBoundingClientRect: () => ({ left }),
    }));
    cards.splice(1, 0, { parentElement: {}, getBoundingClientRect: () => ({ left: 999 }) });
    const viewport = {
      firstElementChild: { querySelectorAll: () => cards },
      clientWidth: 300,
      scrollWidth: 800,
      scrollLeft: 0,
      getBoundingClientRect: () => ({ left: 0 }),
    };
    assert.deepEqual(paginationMetrics(viewport, 8), { count: 3, offsets: [0, 300, 500] });
    assert.deepEqual(paginationMetrics({ ...viewport, scrollWidth: 300 }, 1), {
      count: 1,
      offsets: [0],
    });
  } finally {
    globalThis.getComputedStyle = original;
  }
});

test("reject executable schemes, obfuscated controls and network-path URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///test",
    "//evil.test",
    "java\nscript:alert(1)",
    "\\evil.test",
    "https:\\evil.test",
  ]) {
    assert.equal(safeUrl(url), undefined, url);
  }
  for (const url of [
    "https://example.org/a",
    "/sites/demo/home.html",
    "#section",
    "mailto:test@example.org",
    "tel:+33123456789",
  ])
    assert.equal(safeUrl(url), url);
});

test("sanitize script, event handlers and encoded executable links, preserve editorial HTML", () => {
  const result = sanitizeRichText(
    '<p onclick="bad()">Hello <strong>world</strong><script>bad()</script><a href="java&#x73;cript:alert(1)">click</a><img src=x onerror=bad()><svg onload=bad()></svg></p>',
  );
  assert.ok(result.includes("<strong>world</strong>"));
  assert.doesNotMatch(result, /onclick|onerror|onload|javascript|bad\(\)|<script|<svg|<img/i);
  assert.ok(
    sanitizeRichText('<a href="https://example.org">Safe</a>').includes(
      'href="https://example.org"',
    ),
  );
});

test("bound imported settings and preserve the eight-column desktop setting", () => {
  for (const cardSpacing of ["__proto__", "constructor", "invalid"]) {
    assert.equal(carouselLayout({ cardSpacing }).gap, "1.5rem");
  }
  assert.deepEqual(carouselLayout({}), { desktop: 3, tablet: 2, gap: "1.5rem" });
  assert.deepEqual(
    carouselLayout({ desktopCards: "8", tabletCards: "2", cardSpacing: "compact" }),
    { desktop: 8, tablet: 2, gap: "1rem" },
  );
  assert.deepEqual(carouselLayout({ desktopCards: "1", tabletCards: "2" }), {
    desktop: 1,
    tablet: 1,
    gap: "1.5rem",
  });
  for (const value of ["0", "99", "-1", "NaN", "2.5"]) {
    assert.deepEqual(
      carouselLayout({ desktopCards: value, tabletCards: value, cardSpacing: "invalid" }),
      { desktop: 3, tablet: 2, gap: "1.5rem" },
    );
  }
});
