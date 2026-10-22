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
  assert.equal(
    props.buttons.find((button) => button.id === "demo"),
    undefined,
  );
  assert.equal(props.buttons.find((button) => button.id === "contact").href, "/contact.html");
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

test("navigation uses the single image field and broken images preserve their menu entries", () => {
  const entry = (name, image) =>
    node(name, {
      hasProperty: (property) => property === "navIconImage",
      getProperty: () => ({ getValue: () => ({ getNode: image }) }),
    });
  const props = harness().nav(node("site"), [
    entry("custom", () => node("custom-image")),
    entry("deleted", unavailable),
    entry("bad-url", () => node("image", { badUrl: true })),
  ]);
  assert.equal(props.entries[0].icon, "/custom-image.html");
  assert.equal(props.entries[1].icon, undefined);
  assert.equal(props.entries[2].icon, undefined);
  assert.deepEqual(
    Array.from(props.entries, (entry) => entry.href),
    ["/custom.html", "/deleted.html", "/bad-url.html"],
  );
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

test("Home visibility controls remain independent from the ordered link list", () => {
  const values = {
    utilitySearchVisible: false,
    utilityLanguagesVisible: false,
    utilityRssVisible: false,
  };
  const home = {
    hasProperty: (name) => Object.hasOwn(values, name),
    getProperty: (name) => ({ getBoolean: () => values[name] }),
    getPropertyAsString: (name) => values[name],
  };
  const props = harness().nav(node("site"), [], home);
  assert.equal(props.controls.searchVisible, false);
  assert.equal(props.controls.languagesVisible, false);
  assert.equal(props.rss, undefined);
  assert.equal(Object.hasOwn(props.controls, "order"), false);
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

test("selected reusable footer links preserve labels and reject private nodes and targets", () => {
  const reusable = (name, target, extra = {}) =>
    node(name, {
      isNodeType: (type) => type === "jahiacom:footerLink",
      getPropertyAsString: () => "internal",
      getProperty: () => ({ getValue: () => ({ getNode: () => target }) }),
      ...extra,
    });
  const html = harness().footer("footerColumn", {
    links: [
      reusable("Editorial label", node("destination")),
      reusable("private-link", node("hidden"), { hasPermission: () => false }),
      reusable("private-target", node("hidden-target", { hasPermission: () => false })),
      reusable("broken", null),
    ],
  });
  assert.match(html, /href="\/destination.html"/);
  assert.match(html, />Editorial label<\/a>/);
  assert.doesNotMatch(html, /private-link|private-target|hidden|broken/);
});

test("upper navigation mixes pages and external links in editorial order with safe URLs", () => {
  const external = (name, url, label = name) =>
    node(name, {
      isNodeType: (type) => type === "jnt:externalLink",
      hasProperty: (property) => ["j:url", "navUtilityLabel"].includes(property),
      getPropertyAsString: (property) => (property === "j:url" ? url : label),
    });
  const home = {
    isNodeType: (type) => type === "jahiacommix:homeUtilityNavigation",
    hasProperty: (property) => property === "utilityNavigationLinks",
    getProperty: () => ({
      getValues: () =>
        [
          node("contact"),
          external("academy-link", "https://academy.example.com/training", "Academy"),
          external("unsafe", "javascript:alert(1)"),
          node("documentation"),
        ].map((target) => ({ getNode: () => target })),
    }),
  };
  const entries = harness().nav(node("site"), [], home).utilityEntries;
  assert.deepEqual(
    Array.from(entries, ({ title, href }) => ({ title, href })),
    [
      { title: "contact", href: "/contact.html" },
      { title: "Academy", href: "https://academy.example.com/training" },
      { title: "documentation", href: "/documentation.html" },
    ],
  );
});

test("inline upper links preserve order, localized labels and internal permissions", () => {
  const targets = {
    public: node("public"),
    private: node("private", { hasPermission: () => false }),
  };
  const rows = [
    {
      kind: "external",
      labels: { fr: "Académie", en: "Academy" },
      url: "https://academy.example.com/training",
    },
    { kind: "internal", id: "public" },
    { kind: "internal", id: "private" },
    { kind: "internal", id: "missing" },
    { kind: "external", labels: { en: "Unsafe" }, url: "javascript:alert(1)" },
    { kind: "external", labels: { en: "Unsafe" }, url: "https://example.com\n/test" },
    { kind: "external", labels: {}, url: "https://example.com" },
  ];
  const home = {
    hasProperty: (key) => key === "utilityItemsData",
    getPropertyAsString: () => JSON.stringify(rows),
    getSession: () => ({
      getNodeByIdentifier: (id) => {
        if (!targets[id]) throw new Error("missing");
        return targets[id];
      },
    }),
  };
  const entries = harness().nav(node("site"), [], home).utilityEntries;
  assert.deepEqual(
    Array.from(entries, ({ title, href }) => ({ title, href })),
    [
      { title: "Academy", href: "https://academy.example.com/training" },
      { title: "public", href: "/public.html" },
    ],
  );
  home.getPropertyAsString = () => "[]";
  assert.equal(harness().nav(node("site"), [], home).utilityEntries.length, 0);
});

test("one mixed navigation list preserves tools between individual links", () => {
  const rows = [
    { kind: "rss" },
    {
      kind: "external",
      labels: { en: "Academy", fr: "Académie" },
      url: "https://academy.example.com",
    },
    { kind: "search" },
    { kind: "external", labels: { en: "Docs" }, url: "https://docs.example.com" },
    { kind: "languages" },
  ];
  const home = {
    hasProperty: (key) => key === "utilityItemsData",
    getPropertyAsString: () => JSON.stringify(rows),
  };
  const props = harness().nav(node("site"), [], home);
  assert.deepEqual(
    Array.from(props.utilityEntries, (entry) => entry.kind || entry.title),
    ["rss", "Academy", "search", "Docs", "languages"],
  );
  assert.equal(Object.hasOwn(props.controls, "order"), false);
});

function inlineSettingsHarness({ readOnly = false } = {}) {
  const registrations = new Map();
  const registry = {
    add: (type, key, value) => registrations.set(type + "/" + key, value),
    get: (type, key) => registrations.get(type + "/" + key),
  };
  for (const kind of ["Text", "Checkbox", "Picker"]) {
    const selector = { cmp: (props) => ({ type: "Native" + kind, props }) };
    if (kind === "Picker") selector.resolver = () => selector;
    registry.add("selectorType", kind, selector);
  }
  runInNewContext(readFileSync(resolve("javascript/apps/partner-editors-1.5.js"), "utf8"), {
    window: {
      jahia: {
        uiExtender: { registry },
        moonstone: { Button: "Button", Field: "Field", Typography: "Typography" },
        jcontent: { ContentEditorContext: { Consumer: "EditorContextConsumer" } },
      },
    },
    document: { documentElement: { lang: "fr" } },
  });
  const names = [
    "utilitySearchVisible",
    "utilitySearchLabel",
    "utilityLanguagesVisible",
    "utilityLanguagesLabel",
    "utilityRssVisible",
    "utilityRssLabel",
    "utilityRssUrl",
    "utilityRssImage",
  ];
  const fields = ["utilityItemsData", ...names].map((propertyName) => ({
    name: "home_" + propertyName,
    propertyName,
    nodeType: "jahiacommix:homeUtilityNavigation",
    visible: true,
    readOnly,
    displayName: propertyName,
    selectorType: propertyName.endsWith("Visible")
      ? "Checkbox"
      : propertyName.endsWith("Image")
        ? "Picker"
        : "Text",
  }));
  const value = JSON.stringify([{ kind: "rss" }, { kind: "search" }, { kind: "languages" }]);
  const values = Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.propertyName === "utilityItemsData"
        ? value
        : field.propertyName.endsWith("Visible")
          ? true
          : "original-" + field.propertyName,
    ]),
  );
  const writes = [];
  const form = {
    values,
    setFieldValue(name, value) {
      writes.push([name, value]);
      values[name] = value;
    },
    setFieldTouched() {},
  };
  const fieldset = { fields };
  const context = { sections: [{ fieldSets: [fieldset] }], onSectionsUpdate() {} };
  const hook = registry.get("selectorType.onChange", "jahiacomInlineUtilitySettings");
  const render = () => {
    const nodes = [];
    function visit(tree) {
      if (Array.isArray(tree)) return tree.forEach(visit);
      if (!tree || typeof tree !== "object") return;
      if (typeof tree.type === "function") return visit(tree.type(tree.props));
      nodes.push(tree);
      visit(tree.props?.children);
    }
    visit(
      registry
        .get("selectorType", "UtilityItemsPicker")
        .cmp({ field: fieldset.fields[0], value, form, editorContext: { uilang: "fr" } }),
    );
    return nodes;
  };
  return { hook, context, fieldset, value, values, writes, render };
}

test("inline tool settings reuse native values, hide duplicate controls and do not write on open", () => {
  const h = inlineSettingsHarness();
  const original = { ...h.values };
  h.hook.onChange(undefined, h.value, h.fieldset.fields[0], h.context);
  assert.deepEqual(h.values, original);
  assert.equal(h.writes.length, 0);
  assert.equal(h.fieldset.fields.filter((field) => field.visible).length, 1);
  const nodes = h.render();
  assert.ok(nodes.some((n) => n.type === "label" && n.props.htmlFor === "home_utilitySearchLabel"));
  const consumer = nodes.find((n) => n.type === "EditorContextConsumer");
  const initialValues = {};
  const syncNode = consumer.props.children({ initialValues });
  const sync = new syncNode.type(syncNode.props);
  const beforeLanguageChange = h.fieldset.fields[0];
  sync.componentDidUpdate({ initialValues });
  assert.equal(h.fieldset.fields[0], beforeLanguageChange);
  sync.props = consumer.props.children({ initialValues: { language: "en" } }).props;
  sync.componentDidUpdate({ initialValues });
  assert.notEqual(h.fieldset.fields[0], beforeLanguageChange);
  assert.equal(h.writes.length, 0);
  assert.equal(nodes.filter((n) => n.type === "details").length, 3);
  assert.ok(nodes.filter((n) => n.type === "details").every((n) => !n.props.open));
  const checkbox = nodes.find(
    (n) => n.type === "NativeCheckbox" && n.props.field.propertyName === "utilitySearchVisible",
  );
  const fieldBefore = h.fieldset.fields[0];
  checkbox.props.onChange(false);
  assert.equal(h.values.home_utilitySearchVisible, false);
  assert.equal(h.values.home_utilityItemsData, h.value);
  assert.notEqual(h.fieldset.fields[0], fieldBefore);
  assert.equal(
    h
      .render()
      .find(
        (n) => n.type === "NativeCheckbox" && n.props.field.propertyName === "utilitySearchVisible",
      ).props.value,
    false,
  );
  const label = h
    .render()
    .find((n) => n.type === "NativeText" && n.props.field.propertyName === "utilitySearchLabel");
  label.props.onChange("Find");
  assert.equal(h.values.home_utilitySearchLabel, "Find");
  assert.equal(h.values.home_utilityRssUrl, original.home_utilityRssUrl);
  assert.equal(h.values.home_utilityRssImage, original.home_utilityRssImage);
  const image = h.render().find((n) => n.type === "NativePicker");
  image.props.onChange("new-image-id");
  assert.equal(h.values.home_utilityRssImage, "new-image-id");
  h.render()
    .find((n) => n.type === "Button" && n.props.label === "Retirer l’image")
    .props.onClick();
  assert.equal(h.values.home_utilityRssImage, undefined);
  assert.equal(h.values.home_utilityItemsData, h.value);
});

test("inline settings respect field permissions and keep native controls if metadata is incomplete", () => {
  const h = inlineSettingsHarness({ readOnly: true });
  h.hook.onChange(undefined, h.value, h.fieldset.fields[0], h.context);
  for (const node of h.render().filter((n) => n.type?.startsWith("Native")))
    node.props.onChange("changed");
  assert.equal(h.writes.length, 0);
  const incomplete = inlineSettingsHarness();
  incomplete.fieldset.fields.pop();
  incomplete.hook.onChange(
    undefined,
    incomplete.value,
    incomplete.fieldset.fields[0],
    incomplete.context,
  );
  assert.ok(incomplete.fieldset.fields.every((field) => field.visible));
});

test("navbar buttons use home labels, styles, placement and order without reviving cleared legacy links", () => {
  const values = {
    primaryCTALink: node("demo"),
    primaryCTALabel: "Voir une démo",
    secondaryCTALink: node("contact"),
    secondaryCTALabel: "Parlons ensemble",
    primaryCTAStyle: "secondary",
    secondaryCTAStyle: "primary",
    primaryCTAPlacement: "upper",
    secondaryCTAPlacement: "main",
    navbarCTAOrder: "demoContact",
  };
  const home = {
    isNodeType: (type) => type === "jahiacommix:homeNavbarButtons",
    hasProperty: (key) => Object.hasOwn(values, key),
    getPropertyAsString: (key) => values[key],
    getProperty: (key) => ({ getValue: () => ({ getNode: () => values[key] }) }),
  };
  const props = harness().nav(node("site"), [], home);
  assert.deepEqual(
    Array.from(props.buttons, (b) => [b.id, b.label, b.style, b.placement]),
    [
      ["demo", "Voir une démo", "secondary", "upper"],
      ["contact", "Parlons ensemble", "primary", "main"],
    ],
  );
  delete values.secondaryCTALink;
  assert.equal(harness().nav(node("site"), [], home).buttons.length, 1);
  values.primaryCTALink = node("private", { hasPermission: () => false });
  assert.equal(harness().nav(node("site"), [], home).buttons.length, 0);
});

test("footer labels override existing references without adding creation areas to EDIT", () => {
  const h = harness();
  const props = {
    "jcr:title": "Comparisons",
    "links": [node("selected")],
    "selectedLinkLabels": JSON.stringify({ selected: "Short label" }),
  };
  const edit = h.footer("footerColumn", props, { edit: true });
  const live = h.footer("footerColumn", props);
  assert.doesNotMatch(edit, /data-absolute-area="items"|footer.customLinksHelp/);
  assert.doesNotMatch(live, /data-absolute-area="items"|footer.customLinksHelp/);
  assert.match(live, /href="\/selected.html"/);
  assert.match(live, />Short label<\/a>/);
  assert.match(live, /data-element-text="Short label"/);
  for (const value of [undefined, "invalid", "[]", '{"selected":"  "}', '{"selected":42}']) {
    assert.match(
      h.footer("footerColumn", { ...props, selectedLinkLabels: value }),
      />selected<\/a>/,
    );
  }
  assert.match(
    h.footer("footerColumn", { ...props, links: [node("other"), node("selected")] }),
    /other<\/a>.*Short label<\/a>/,
  );
});

test("selected reusable footer links preserve labels and reject private nodes and targets", () => {
  const reusable = (name, target, extra = {}) =>
    node(name, {
      isNodeType: (type) => type === "jahiacom:footerLink",
      getPropertyAsString: () => "internal",
      getProperty: () => ({ getValue: () => ({ getNode: () => target }) }),
      ...extra,
    });
  const html = harness().footer("footerColumn", {
    links: [
      reusable("Editorial label", node("destination")),
      reusable("private-link", node("hidden"), { hasPermission: () => false }),
      reusable("private-target", node("hidden-target", { hasPermission: () => false })),
      reusable("broken", null),
    ],
  });
  assert.match(html, /href="\/destination.html"/);
  assert.match(html, />Editorial label<\/a>/);
  assert.doesNotMatch(html, /private-link|private-target|hidden|broken/);
});

function footerEditorRegistry() {
  const registrations = new Map();
  const registry = {
    add: (type, key, value) => registrations.set(type + "/" + key, value),
    get: (type, key) => registrations.get(type + "/" + key),
  };
  for (const kind of ["Text", "Checkbox", "Picker"]) {
    const selector = { cmp: (props) => ({ type: "Native" + kind, props }) };
    if (kind === "Picker") selector.resolver = () => selector;
    registry.add("selectorType", kind, selector);
  }
  runInNewContext(readFileSync(resolve("javascript/apps/partner-editors-1.5.js"), "utf8"), {
    window: {
      jahia: {
        uiExtender: { registry },
        moonstone: { Button: "Button", Field: "Field", Typography: "Typography" },
        jcontent: { ContentEditorContext: { Consumer: "EditorContextConsumer" } },
      },
    },
    document: { documentElement: { lang: "fr" } },
  });
  return registry;
}

test("footer inline labels preserve references on open, follow UUIDs and respect permissions", () => {
  const registry = footerEditorRegistry();
  const fields = ["links", "selectedLinkLabels"].map((propertyName) => ({
    name: "footer_" + propertyName,
    propertyName,
    nodeType: "jahiacom:footerColumn",
    selectorOptions: [],
    visible: true,
  }));
  const fieldset = { fields };
  const context = { sections: [{ fieldSets: [fieldset] }], onSectionsUpdate() {} };
  const values = { footer_selectedLinkLabels: '{"page-a":"Court"}' };
  const writes = [];
  const form = {
    values,
    setFieldValue: (name, value) => {
      writes.push([name, value]);
      values[name] = value;
    },
    setFieldTouched() {},
  };
  registry
    .get("selectorType.onChange", "jahiacomFooterLabels")
    .onChange(undefined, ["page-a", "page-b"], fields[0], context);
  assert.equal(writes.length, 0);
  assert.equal(fieldset.fields[1].visible, false);
  const render = (extra = {}) => {
    const nodes = [];
    function visit(tree) {
      if (Array.isArray(tree)) return tree.forEach(visit);
      if (!tree || typeof tree !== "object") return;
      if (typeof tree.type === "function") return visit(tree.type(tree.props));
      nodes.push(tree);
      visit(tree.props?.children);
    }
    visit(
      registry
        .get("selectorType", "FooterLinksPicker")
        .cmp({ field: fieldset.fields[0], value: ["page-b", "page-a"], form, ...extra }),
    );
    return nodes;
  };
  const inputs = render().filter((n) => n.type === "input");
  assert.equal(inputs[0].props.value, "");
  assert.equal(inputs[1].props.value, "Court");
  inputs[1].props.onChange({ target: { value: "Autre titre" } });
  assert.deepEqual(JSON.parse(values.footer_selectedLinkLabels), { "page-a": "Autre titre" });
  const before = writes.length;
  render({ readOnly: true })
    .find((n) => n.type === "input")
    .props.onChange({ target: { value: "Forbidden" } });
  assert.equal(writes.length, before);
  render()
    .filter((n) => n.type === "input")[1]
    .props.onChange({ target: { value: "" } });
  assert.deepEqual(JSON.parse(values.footer_selectedLinkLabels), {});
});

test("footer personalization keeps main links and respects an explicitly empty list", () => {
  const h = harness();
  assert.match(h.footer("footerColumn", { links: [node("legacy")] }), /legacy/);
  assert.doesNotMatch(h.footer("footerColumn", { links: [] }), /legacy/);
});

test("footer reusable external links reject executable protocols and keep editorial labels", () => {
  const external = (url) =>
    node("Academy", {
      isNodeType: (type) => type === "jahiacom:footerLink",
      getPropertyAsString: (property) => (property === "ctaType" ? "external" : url),
    });
  const h = harness();
  assert.match(
    h.footer("footerColumn", { links: [external("https://academy.jahia.com/")] }),
    /href="https:\/\/academy.jahia.com\/"[^>]*>Academy<\/a>/,
  );
  for (const url of ["javascript:alert(1)", "data:text/html,unsafe", "file:///secret"]) {
    assert.doesNotMatch(h.footer("footerColumn", { links: [external(url)] }), /<a/);
  }
});

test("footer options preserve every existing main CND declaration without a migration", () => {
  const cnd = readFileSync(resolve("src/templates/definition.cnd"), "utf8");
  assert.match(
    cnd,
    / - links \(weakreference, picker\) multiple mandatory < jnt:page, jmix:mainResource/,
  );
  assert.doesNotMatch(cnd, / - selectedLinks /);
  const definition = cnd.split("[jahiacom:footerLink]")[1].split("\n")[0];
  assert.match(definition, /jmix:mainResource/);
  const fieldset = JSON.parse(
    readFileSync(
      resolve("settings/content-editor-forms/fieldsets/jahiacom_footerColumn.json"),
      "utf8",
    ),
  );
  assert.equal(fieldset.fields[0].name, "links");
  assert.equal(fieldset.fields[0].selectorType, "FooterLinksPicker");
});
