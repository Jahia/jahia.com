import { test } from "node:test";
import assert from "node:assert/strict";
import { navigationUrl } from "../src/templates/navigationUrl.ts";

test("navigation accepts CMS paths, fragments and ordinary external links", () => {
  for (const url of [
    "/sites/mySite/home.html",
    "/cms/editframe/default/en/sites/mySite/home.html",
    "../resources/blog.html?filter1=abc#articles",
    "#main-content",
    "https://academy.jahia.com/",
    "HTTP://example.com/",
    "//www.jahia.com/",
    "mailto:contact@example.com",
    "tel:+33123456789",
  ]) {
    assert.equal(navigationUrl(url), url);
  }
  assert.equal(navigationUrl("  https://www.jahia.com/  "), "https://www.jahia.com/");
});

test("navigation rejects executable schemes and protocol obfuscation", () => {
  for (const url of [
    "javascript:alert(1)",
    "  JaVaScRiPt:alert(1)  ",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///C:/Windows/system.ini",
    "https:\\example.com",
    "\u0000https://example.com",
    "",
    "   ",
    undefined,
  ]) {
    assert.equal(navigationUrl(url), undefined);
  }
});
