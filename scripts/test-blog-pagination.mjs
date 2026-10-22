import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  blogCanonicalOrigin,
  blogPage,
  blogPageSize,
  blogPageUrl,
  paginateBlog,
} from "../src/views/ContentFolderReference/blogPagination.ts";
// Inspect the initial JSX tree without adding a React dependency. Actual SSR HTML
// and no-JavaScript navigation are validated separately on the isolated clone.
const jsx = (type, props) => ({ type, props });
const require = (name) => {
  assert.equal(name, "react/jsx-runtime");
  return { jsx, jsxs: jsx, Fragment: "fragment" };
};
const createElement = (type, props, ...children) =>
  typeof type === "function" ? type({ ...props, children }) : jsx(type, { ...props, children });
const componentTree = (tree) => tree;
const includesText = (tree, text) => JSON.stringify(tree).includes(text);
test("blog pages have distinct stable URLs and page one has no redundant parameter", () => {
  assert.equal(blogPageUrl("/fr/blog", 1), "/fr/blog");
  assert.equal(blogPageUrl("/fr/blog?ignored=1#old", 2), "/fr/blog?blogPage=2");
  assert.equal(
    blogPageUrl("/blog", 3, { filter1: "CMS & AI", injected: "bad" }),
    "/blog?blogPage=3&filter1=CMS%20%26%20AI",
  );
});
test("invalid or unbounded page inputs cannot change pagination", () => {
  for (const value of [null, "", "0", "-1", "1.5", "1x", "Infinity", "9999999999", "<script>"])
    assert.equal(blogPage(value), 1);
  assert.equal(blogPage("12"), 12);
  assert.equal(blogPageSize("6"), 6);
  assert.equal(blogPageSize("7"), 12);
});
test("server pages are disjoint, complete and clamp missing pages without inventing articles", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  assert.deepEqual(paginateBlog(items, 12, 1).items, items.slice(0, 12));
  assert.deepEqual(paginateBlog(items, 12, 2).items, items.slice(12, 24));
  assert.deepEqual(paginateBlog(items, 12, 999), { page: 3, count: 3, items: [24] });
  assert.deepEqual(paginateBlog([], 12, 2), { page: 1, count: 1, items: [] });
});
const source = fs.readFileSync(
  new URL("../src/views/ContentFolderReference/BlogGrid.client.tsx", import.meta.url),
  "utf8",
);
const module = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText,
  { module, exports: module.exports, require },
);
const Grid = module.exports.default;
const props = {
  page: 1,
  pageUrls: ["/blog", "/blog?blogPage=2", "/blog?blogPage=3"],
  gridClassName: "grid",
  paginationClassName: "pages",
  paginationLabel: "Pages",
  selectLabel: "Page",
  previousLabel: "Previous",
  nextLabel: "Next",
};
const links = (tree) => {
  const result = [];
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (node.type === "a") result.push({ href: node.props.href, rel: node.props.rel });
    visit(node.props?.children);
  };
  visit(tree);
  return result;
};
test("pagination exposes real href destinations before any user interaction", () => {
  const html = componentTree(
    createElement(Grid, props, createElement("article", null, "Page one")),
  );
  assert(includesText(html, "Page one"));
  assert.deepEqual(links(html), [{ href: "/blog?blogPage=2", rel: "next" }]);
  const middle = componentTree(createElement(Grid, { ...props, page: 2 }, "Page two"));
  assert.deepEqual(links(middle), [
    { href: "/blog", rel: "prev" },
    { href: "/blog?blogPage=3", rel: "next" },
  ]);
  assert(!includesText(middle, "Page one"));
});
test("last and single page controls do not emit nonexistent next destinations", () => {
  assert.deepEqual(links(componentTree(createElement(Grid, { ...props, page: 3 }))), [
    { href: "/blog?blogPage=2", rel: "prev" },
  ]);
  const html = componentTree(createElement(Grid, { ...props, pageUrls: ["/blog"] }));
  assert(!JSON.stringify(html).includes('"type":"nav"'));
});

test("paginated canonicals respect the configured SEO domain and otherwise use Jahia's server", () => {
  assert.equal(
    blogCanonicalOrigin("https://www.example.test/sitemap.xml", "http://internal:8080"),
    "https://www.example.test",
  );
  assert.equal(
    blogCanonicalOrigin("https://example.test:8443/site/map.xml?x=1", "http://internal"),
    "https://example.test:8443",
  );
  assert.equal(blogCanonicalOrigin(undefined, "https://fallback.test/"), "https://fallback.test");
  assert.equal(
    blogCanonicalOrigin("javascript:alert(1)", "https://fallback.test"),
    "https://fallback.test",
  );
  assert.equal(
    blogCanonicalOrigin("https://user@host.test", "https://fallback.test"),
    "https://fallback.test",
  );
});
