import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Jahia supplies React at runtime. Evaluate JSX trees here without adding a dependency.
const jsx = (type, props) => ({ type, props: props || {} });
function renderTree(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(renderTree).join("");
  if (typeof tree !== "object") return String(tree);
  if (typeof tree.type === "function") return renderTree(tree.type(tree.props));
  const { children, ...attributes } = tree.props;
  return `<${tree.type}${Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${String(value)}"`)
    .join("")}>${renderTree(children)}</${tree.type}>`;
}

const require = createRequire(import.meta.url);
const unavailable = () => {
  throw new Error("ItemNotFoundException: unavailable in LIVE");
};
const node = (name, extra = {}) => ({
  getName: () => name,
  getIdentifier: () => name,
  getDisplayableName: () => name,
  hasProperty: () => false,
  hasNode: () => false,
  getPath: () => `/sites/test/${name}`,
  isNodeType: (type) => type === "jnt:page",
  hasI18N: () => true,
  hasPermission: () => true,
  ...extra,
});

// Exercise the actual server components with JCR failures, without changing site content.
function harness() {
  const views = new Map();
  const cache = new Map();
  let navProps;
  const current = node("current");
  const lib = {
    jahiaComponent: (definition, view) => views.set(definition.nodeType, view),
    buildNodeUrl: (target) => {
      if (target.badUrl) throw new Error("RepositoryException: URL resolution failed");
      return `/${target.getName()}.html`;
    },
    buildModuleFileUrl: (url) => url,
    getChildNodes: (root) => root.children || [],
    getSiteLocales: () => ({ en: { getDisplayLanguage: () => "English" } }),
    // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- Match the Jahia hook API in this mock.
    useJCRQuery: () => [],
    // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- Match the Jahia hook API in this mock.
    useServerContext: () => ({
      renderContext: { getRequest: () => ({ getParameter: () => null }), isEditMode: () => false },
    }),
    server: { render: { addCacheDependency() {} } },
    Island: ({ props, children }) => {
      navProps = props;
      return jsx("nav", { children });
    },
    AbsoluteArea: ({ name }) => jsx("section", { "data-absolute-area": name }),
    RenderChildren: () => null,
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    runInNewContext(source, {
      module,
      exports: module.exports,
      require: (id) => {
        if (id === "@jahia/javascript-modules-library") return lib;
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- Match the translation hook API in this mock.
        if (id === "react-i18next") return { useTranslation: () => ({ t: (key) => key }) };
        if (id === "react/jsx-runtime")
          return { jsx, jsxs: jsx, Fragment: ({ children }) => children };
        if (id.endsWith(".css")) return {};
        if (/\.(svg|png)/.test(id)) return "image.svg";
        if (id.endsWith("NavBar.client.jsx")) return { default: () => null };
        if (id.startsWith(".")) {
          const path = resolve(dirname(file), id).replace(/\.jsx?$/, "");
          return load(existsSync(`${path}.tsx`) ? `${path}.tsx` : `${path}.ts`);
        }
        return require(id);
      },
    });
    return module.exports;
  }
  const navbar = load(resolve("src/templates/NavBar.tsx")).default;
  load(resolve("src/templates/footer.server.tsx"));
  return {
    nav(site, children, home = {}) {
      renderTree(
        navbar({ site, root: node("home", { children, ...home }), current, language: "en" }),
      );
      return navProps;
    },
    footer(type, props, { edit = false } = {}) {
      const view = views.get(`jahiacom:${type}`);
      return renderTree(
        view(props, {
          currentNode: node("footer"),
          renderContext: { isEditMode: () => edit },
          currentResource: { getLocale: () => ({ getLanguage: () => "en" }) },
        }),
      );
    },
  };
}

test("footer EDIT keeps the original native areas and does not turn icons into edit buttons", () => {
  const h = harness();
  const html = h.footer("pageFooter", { bottomLinks: [] }, { edit: true });
  assert.deepEqual(
    [...html.matchAll(/data-absolute-area="([^"]+)"/g)].map((match) => match[1]),
    ["columns", "iconsLeft", "iconsRight"],
  );
  assert.doesNotMatch(html, /<button/);
  const icon = h.footer("footerIcon", { "icon": node("badge"), "jcr:title": "G2" }, { edit: true });
  assert.match(icon, /<span/);
  assert.doesNotMatch(icon, /<button|<a /);
});

test("broken site CTA does not remove the valid CTA or the navigation", () => {
  const site = node("site", {
    hasProperty: (name) => name.endsWith("CTALink"),
    getProperty: (name) => ({
      getValue: () => ({
        getNode: name === "primaryCTALink" ? unavailable : () => node("contact"),
      }),
    }),
  });
  const props = harness().nav(site, [node("product")]);
  assert.equal(props.primaryCTA, undefined);
  assert.equal(props.secondaryCTA.href, "/contact.html");
  assert.equal(props.entries[0].href, "/product.html");
});

test("broken internal menu reference and URL failure preserve valid siblings", () => {
  const broken = node("broken", {
    isNodeType: (type) => type === "jnt:nodeLink",
    hasProperty: () => true,
    getProperty: () => ({ getValue: () => ({ getNode: unavailable }) }),
  });
  const props = harness().nav(node("site"), [
    node("before"),
    broken,
    node("url", { badUrl: true }),
    node("after"),
  ]);
  assert.deepEqual(
    Array.from(props.entries, (entry) => entry.title),
    ["before", "after"],
  );
});

test("navigation image overrides the preset and a broken image keeps the existing icon", () => {
  const entry = (name, image) =>
    node(name, {
      hasProperty: (property) => ["navIcon", "navIconImage"].includes(property),
      getPropertyAsString: () => "cms",
      getProperty: () => ({ getValue: () => ({ getNode: image }) }),
    });
  const props = harness().nav(node("site"), [
    entry("custom", () => node("custom-image")),
    entry("deleted", unavailable),
    entry("bad-url", () => node("image", { badUrl: true })),
  ]);
  assert.equal(props.entries[0].icon, "/custom-image.html");
  assert.equal(props.entries[1].icon, "image.svg");
  assert.equal(props.entries[2].icon, "image.svg");
});

for (const [view, property] of [
  ["pageFooter", "bottomLinks"],
  ["footerColumn", "links"],
]) {
  test(`${view} omits null, stale and inaccessible targets without losing valid links`, () => {
    const html = harness().footer(view, {
      "jcr:title": "Footer",
      "ctaType": "none",
      [property]: [
        node("before"),
        null,
        node("stale", { getDisplayableName: unavailable }),
        node("denied", { getIdentifier: unavailable }),
        node("url", { badUrl: true }),
        node("after"),
      ],
    });
    assert.match(html, /href="\/before.html"/);
    assert.match(html, /href="\/after.html"/);
    assert.doesNotMatch(html, /stale|denied|\/url.html/);
  });
}

test("obsolete footer CTA is ignored and an invalid social image cannot break the footer", () => {
  const h = harness();
  const html = h.footer("pageFooter", {
    "jcr:title": "Footer",
    "ctaType": "internal",
    "j:linknode": node("bad", { badUrl: true }),
    "bottomLinks": [node("legal")],
  });
  assert.match(html, /href="\/legal.html"/);
  assert.doesNotMatch(html, /href="\/bad.html"/);
  assert.equal(
    h.footer("footerIcon", { icon: node("bad", { badUrl: true }), href: "https://example.com" }),
    "",
  );
});

test("demo panel remains absent while valid footer icons keep their destination and label", () => {
  const h = harness();
  const html = h.footer("pageFooter", {
    "ctaType": "internal",
    "j:linknode": node("contact"),
    "ctaLabel": "Contact",
    "bottomLinks": [],
  });
  assert.doesNotMatch(html, /href="\/contact.html"|>Contact</);
  const icon = h.footer("footerIcon", {
    "jcr:title": "Network",
    "icon": node("logo"),
    "href": "https://example.com",
  });
  assert.match(icon, /href="https:\/\/example.com"/);
  assert.match(icon, /src="\/logo.html"/);
});

test("references denied by ACL are omitted from menus and footer", () => {
  const denied = node("private", { hasPermission: () => false });
  const h = harness();
  assert.deepEqual(
    h.nav(node("site"), [denied, node("public")]).entries.map((e) => e.title),
    ["public"],
  );
  const html = h.footer("footerColumn", { links: [denied, node("public")] });
  assert.doesNotMatch(html, /private/);
  assert.match(html, /public/);
});

test("executable social URLs become inert images and safe destinations retain rel protections", () => {
  const h = harness();
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///C:/secret",
    "java\nscript:alert(1)",
  ]) {
    const html = h.footer("footerIcon", { icon: node("logo"), href, displayStyle: "social" });
    assert.doesNotMatch(html, /<a /);
    assert.match(html, /<img /);
  }
  assert.match(
    h.footer("footerIcon", { icon: node("logo"), href: "https://example.com" }),
    /rel="noopener noreferrer"/,
  );
});

test("an explicitly empty Home selection does not restore the legacy site links", () => {
  const site = node("site", {
    hasProperty: (name) => name === "utilityNavigationLinks",
    getProperty: () => ({ getValues: () => [{ getNode: () => node("legacy") }] }),
  });
  assert.equal(harness().nav(site, []).utilityEntries[0].title, "legacy");
  const home = { isNodeType: (type) => type === "jahiacommix:homeUtilityNavigation" };
  assert.equal(harness().nav(site, [], home).utilityEntries.length, 0);
});

test("Home controls accept explicit false and sort positions independently of labels", () => {
  const values = {
    utilitySearchVisible: false,
    utilityLanguagesVisible: false,
    utilityRssVisible: false,
    utilitySearchPosition: 0,
    utilityLinksPosition: 30,
    utilityRssPosition: 20,
    utilityLanguagesPosition: 10,
  };
  const home = {
    hasProperty: (name) => Object.hasOwn(values, name),
    getProperty: (name) => ({ getBoolean: () => values[name], getLong: () => values[name] }),
  };
  const props = harness().nav(node("site"), [], home);
  assert.equal(props.controls.searchVisible, false);
  assert.equal(props.controls.languagesVisible, false);
  assert.equal(props.rss, undefined);
  assert.deepEqual([...props.controls.order], ["search", "languages", "rss", "links"]);
});

test("RSS rejects executable, network and non-feed protocols while accepting HTTPS and local paths", () => {
  for (const address of [
    "javascript:alert(1)",
    "//other.example/rss",
    "mailto:press@example.com",
    "data:text/xml,test",
    "file:///secret",
    "https://example.com\n/rss",
  ]) {
    const home = {
      hasProperty: (n) => ["utilityRssVisible", "utilityRssUrl"].includes(n),
      getProperty: () => ({ getBoolean: () => true }),
      getPropertyAsString: () => address,
    };
    assert.equal(harness().nav(node("site"), [], home).rss.href, undefined);
  }
  for (const address of ["https://example.com/rss.xml", "/rss.xml"]) {
    const home = {
      hasProperty: (n) => ["utilityRssVisible", "utilityRssUrl"].includes(n),
      getProperty: () => ({ getBoolean: () => true }),
      getPropertyAsString: () => address,
    };
    assert.equal(harness().nav(node("site"), [], home).rss.href, address);
  }
});
