import { test } from "node:test";
import assert from "node:assert/strict";
import { automaticNavigation } from "../src/templates/automaticNavigation.ts";
import { automaticNavigationColumns } from "../src/templates/automaticNavigationColumns.ts";
import { emptySection, safeSettings, validateSettings } from "../javascript/navigation/model.js";

function node(name, type = "jnt:page", children = [], properties = {}, extra = {}) {
  return {
    children,
    getIdentifier: () => name,
    getDisplayableName: () => name,
    getPath: () => `/sites/test/home/${name}`,
    isNodeType: (candidate) => candidate === type,
    hasPermission: () => true,
    hasProperty: (key) => Object.hasOwn(properties, key),
    getPropertyAsString: (key) => properties[key],
    getProperty: (key) => ({
      getBoolean: () => properties[key],
      getValues: () => properties[key].map((value) => ({ getString: () => value })),
      getValue: () => ({ getNode: () => properties[key] }),
    }),
    ...extra,
  };
}
function render(children, overrides = {}) {
  const dependencies = [];
  const entries = automaticNavigation(node("home", "jnt:page", children), {
    language: "fr",
    translated: (value) => value.translated !== false,
    children: (value) => value.children,
    cache: (value) => dependencies.push(value.getPath()),
    page: (value, title) => ({
      title: title || value.getDisplayableName(),
      href: `/${value.getIdentifier()}`,
      current: false,
    }),
    discoverLabel: (title) => `Découvrir ${title}`,
    ...overrides,
  });
  return { entries, dependencies };
}

test("central icons apply to sections and links, and explicit removal never revives a native icon", () => {
  const root = node("section", "jnt:navMenuText", [
    node("preset"),
    node("removed"),
    node("inherited"),
    node("missing-image"),
  ]);
  const section = {
    ...emptySection(),
    icons: {
      "section": { kind: "preset", name: "dxp" },
      "preset": { kind: "preset", name: "cms" },
      "removed": null,
      "missing-image": { kind: "image", id: "missing" },
    },
  };
  const { entries } = render([root], {
    settings: { version: 1, mode: "automatic", sections: { section } },
    page: (value, title) => ({
      title,
      href: `/${value.getIdentifier()}`,
      current: false,
      icon: "native.png",
    }),
    icon: (choice) => (choice?.kind === "preset" ? `${choice.name}.png` : undefined),
  });
  assert.equal(entries[0].icon, "dxp.png");
  assert.deepEqual(
    entries[0].children.map((page) => page.icon),
    ["cms.png", undefined, "native.png", undefined],
  );
  assert.equal(entries[0].children.length, 4);
});

test("central weights apply individually to roots, parents and leaves without inheritance", () => {
  const settings = {
    version: 1,
    mode: "automatic",
    sections: {
      product: {
        ...emptySection(),
        weights: { product: "normal", cms: "bold", dxp: "bold", parent: "normal" },
      },
    },
  };
  const root = node("product", "jnt:page", [
    node("cms"),
    node("dxp"),
    node("parent", "jnt:page", [node("child")]),
    node("unchanged"),
  ]);
  const { entries } = render([root], { settings });
  assert.equal(entries[0].weight, "normal");
  assert.deepEqual(
    automaticNavigationColumns(entries[0].children)
      .flat()
      .map((item) => [item.id, item.weight]),
    [
      ["cms", "bold"],
      ["dxp", "bold"],
      ["parent", "normal"],
      ["child", undefined],
      ["unchanged", undefined],
    ],
  );
  delete settings.sections.product.weights.cms;
  assert.equal(render([root], { settings }).entries[0].children[0].weight, undefined);
});

test("columns keep branches and descendants together in source-tree order", () => {
  const page = (title) => ({ title, href: `/${title}`, current: false });
  const columns = automaticNavigationColumns(
    [
      {
        id: "portals",
        title: "portals",
        destination: page("portals"),
        children: [page("finance"), page("health")],
      },
      page("global"),
      {
        id: "migration",
        title: "migration",
        destination: page("migration"),
        children: [page("diagnostic")],
      },
    ],
    { portals: 2, migration: 1 },
  );
  assert.deepEqual(
    columns.map((column) => column.length),
    [3, 3],
  );
  assert.deepEqual(
    columns.flat().map((item) => item.title),
    ["global", "migration", "diagnostic", "portals", "finance", "health"],
  );
});

test("new branches default to column one without redistributing existing branches", () => {
  const page = (title) => ({ id: title, title, href: `/${title}`, current: false });
  const columns = automaticNavigationColumns([page("CMS"), page("DXP"), page("New page")], {
    CMS: 2,
    DXP: 1,
  });
  assert.deepEqual(
    columns.flat().map((item) => item.title),
    ["DXP", "New page", "CMS"],
  );
});

test("public column order matches the editor and never separates parent and descendants", () => {
  const page = (id) => ({ id, title: id, href: `/${id}`, current: false });
  const columns = automaticNavigationColumns(
    [
      { id: "parent", title: "parent", destination: page("parent"), children: [page("child")] },
      page("sibling"),
      page("new"),
      page("other-column"),
    ],
    { "other-column": 2 },
    2,
    { 1: ["removed", "sibling", "parent"] },
  );
  assert.deepEqual(
    columns.map((column) => column.map((item) => [item.id, item.depth])),
    [
      [
        ["sibling", 0],
        ["parent", 0],
        ["child", 1],
        ["new", 0],
      ],
      [["other-column", 0]],
    ],
  );
});

test("public child order keeps source ancestry, handles hidden group destinations and ignores foreign IDs", () => {
  const page = (id) => ({ id, title: id, href: `/${id}`, current: false });
  const entries = [
    {
      id: "parent",
      title: "parent",
      destination: page("parent"),
      children: [
        { id: "first", title: "first", destination: page("first"), children: [page("grandchild")] },
        page("second"),
        page("new"),
      ],
    },
    { id: "group", title: "group", children: [page("group-first"), page("group-second")] },
  ];
  const original = structuredClone(entries);
  const result = automaticNavigationColumns(
    entries,
    { parent: 2 },
    2,
    {},
    {
      parent: ["removed", "group-first", "second", "first"],
      group: ["group-second", "group-first"],
    },
  );
  assert.deepEqual(
    result.map((column) => column.map((entry) => [entry.id, entry.depth])),
    [
      [
        ["group-second", 0],
        ["group-first", 0],
      ],
      [
        ["parent", 0],
        ["second", 1],
        ["first", 1],
        ["grandchild", 2],
        ["new", 1],
      ],
    ],
  );
  assert.deepEqual(entries, original);
});

test("central selection, labels and direct-link mode override old per-page settings", () => {
  const section = {
    ...emptySection(),
    mode: "selected",
    selected: ["cms"],
    columns: { cms: 2 },
    labels: { cms: { fr: "Mon CMS" } },
  };
  const { entries } = render(
    [
      node("product", "jnt:page", [
        node("cms", "jnt:page", [], { navExcluded: true }),
        node("dxp"),
      ]),
    ],
    { settings: { version: 1, mode: "automatic", sections: { product: section } } },
  );
  assert.equal(entries[0].children.length, 1);
  assert.equal(entries[0].children[0].title, "Mon CMS");
  assert.equal(entries[0].panel.branchColumns.cms, 2);
  const direct = render([node("cases", "jnt:page", [node("case")])], {
    settings: {
      version: 1,
      mode: "automatic",
      sections: { cases: { ...emptySection(), mode: "link" } },
    },
  });
  assert.equal(direct.entries[0].href, "/cases");
});

test("invalid centralized settings are rejected without replacing old settings", () => {
  assert.equal(safeSettings('{"version":2}'), undefined);
  assert.throws(() =>
    validateSettings({
      version: 1,
      mode: "automatic",
      sections: { product: { ...emptySection(), columnCount: 9 } },
    }),
  );
  assert.throws(() =>
    validateSettings({
      version: 1,
      mode: "automatic",
      sections: { product: { ...emptySection(), columns: { cms: 3 } } },
    }),
  );
});

test("new root pages and their children automatically enter the three-level tree", () => {
  const leaf = node("page", "jnt:page", [node("too-deep")]);
  const section = node("product", "jnt:page", [node("cms", "jnt:page", [leaf])]);
  const { entries } = render([section, node("ecosystem", "jnt:page", [node("partners")])]);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].children[0].children[0].href, "/page");
  assert.equal(entries[0].children[0].children[0].children, undefined);
  assert.equal(entries[1].title, "ecosystem");
});
test("excluding a branch removes descendants without removing siblings", () => {
  const { entries, dependencies } = render([
    node("hidden", "jnt:page", [node("secret")], { navExcluded: true }),
    node("public"),
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.title),
    ["public"],
  );
  assert.ok(dependencies.includes("/sites/test/home/hidden"));
  assert.ok(!dependencies.includes("/sites/test/home/secret"));
});

test("an editorial direct-link setting keeps a page without traversing its children", () => {
  const { entries, dependencies } = render([
    node("customer-stories", "jnt:page", [node("case-study")], { navExpandChildren: false }),
    node("product", "jnt:page", [node("cms")]),
  ]);
  assert.equal(entries[0].href, "/customer-stories");
  assert.equal(entries[0].children, undefined);
  assert.ok(!dependencies.includes("/sites/test/home/case-study"));
  assert.equal(entries[1].children.length, 1);
});
test("overview visibility, custom label and destination are independent of children", () => {
  const target = node("overview");
  const { entries } = render([
    node("product", "jnt:page", [node("cms")], {
      navDiscoverLabel: "Tout découvrir",
      navDiscoverPage: target,
    }),
    node("solutions", "jnt:page", [node("portal")], { navDiscoverVisible: false }),
  ]);
  assert.equal(entries[0].panel.landing.title, "Tout découvrir");
  assert.equal(entries[0].panel.landing.href, "/overview");
  assert.equal(entries[0].destination.href, "/product");
  assert.equal(entries[1].panel.landing, undefined);
  assert.equal(entries[1].destination.href, "/solutions");
  assert.equal(entries[1].children.length, 1);
});
test("existing menu labels keep their hierarchy and omit duplicated overview pages", () => {
  const target = node("overview");
  const { entries } = render([
    node(
      "product",
      "jnt:navMenuText",
      [node("features", "jnt:navMenuText", [node("cms")]), target],
      { navLandingPage: target },
    ),
  ]);
  assert.equal(entries[0].panel.landing.href, "/overview");
  assert.equal(entries[0].children.length, 1);
  assert.equal(entries[0].children[0].title, "features");
});
test("untranslated, invalid-language, private and broken entries do not leak", () => {
  const { entries } = render([
    node("untranslated", "jnt:page", [], {}, { translated: false }),
    node("invalid", "jnt:page", [], { "j:invalidLanguages": ["fr"] }),
    node("private", "jnt:page", [], {}, { hasPermission: () => false }),
    node("broken", "jnt:nodeLink"),
    node("valid"),
  ]);
  assert.deepEqual(
    entries.map((entry) => entry.title),
    ["valid"],
  );
});

test("optional legacy presentation failures preserve automatic menu entries", () => {
  const { entries } = render([node("solutions", "jnt:page", [node("portal")])], {
    presentation: () => {
      throw Error("Broken optional presentation");
    },
  });
  assert.equal(entries[0].children[0].href, "/portal");
  assert.equal(entries[0].panel.automatic, true);
});
test("internal references cannot expose private targets or recurse through cycles", () => {
  const hidden = node("hidden", "jnt:page", [], {}, { hasPermission: () => false });
  const cyclic = node("cycle");
  cyclic.children.push(cyclic);
  const { entries } = render([
    node("link", "jnt:nodeLink", [], { "j:node": cyclic }),
    node("leak", "jnt:nodeLink", [], { "j:node": hidden }),
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].children, undefined);
});
test("broken or untranslated discover targets do not remove the section", () => {
  const { entries } = render([
    node("product", "jnt:page", [node("cms")], { navDiscoverPage: null }),
    node("solutions", "jnt:page", [node("portal")], {
      navDiscoverPage: node("untranslated", "jnt:page", [], {}, { translated: false }),
    }),
  ]);
  assert.ok(
    entries.every((entry) => entry.children.length === 1 && entry.panel.landing === undefined),
  );
});
