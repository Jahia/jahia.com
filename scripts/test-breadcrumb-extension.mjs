import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbItems } from "../src/templates/breadcrumbModel.ts";
import { defaults, decode } from "../javascript/breadcrumb/model.js";
function fixture() {
  const nodes = new Map();
  const make = (id, parent, kind = "jnt:page", props = {}) => {
    const node = {
      getIdentifier: () => id,
      getName: () => id,
      getPath: () => (parent ? parent.getPath() + "/" + id : "/sites/test/home"),
      getParent: () => parent,
      isNodeType: (type) => type === kind,
      hasPermission: () => true,
      hasI18N: () => true,
      getDisplayableName: () => id,
      hasProperty: (key) => key in props,
      getPropertyAsString: (key) => props[key],
      getProperty: (key) => ({ getNode: () => nodes.get(props[key]) }),
      hasNode: (name) =>
        [...nodes.values()].some((n) => n.getPath() === node.getPath() + "/" + name),
      getNode: (name) =>
        [...nodes.values()].find((n) => n.getPath() === node.getPath() + "/" + name),
    };
    nodes.set(id, node);
    return node;
  };
  const home = make("home");
  const options = {
    settings: defaults(),
    language: "fr",
    title: "Jahia DXP",
    homeLabel: "Accueil",
    available: (n) => n.hasPermission("jcr:read") && n.hasI18N(),
    resolve: (id) => nodes.get(id),
    url: (n) => "/fr" + n.getPath() + ".html",
    cache: () => {},
  };
  return { nodes, make, home, options };
}
test("links section mothers, skips structural groups and preserves physical page parents", () => {
  const f = fixture(),
    product = f.make("product", f.home, "jnt:navMenuText"),
    overview = f.make("overview", product),
    platform = f.make("platform", product, "jnt:navMenuText"),
    dxp = f.make("dxp", platform);
  f.options.settings.parents.product = "overview";
  let items = breadcrumbItems(dxp, f.home, f.options);
  assert.deepEqual(
    items.map((i) => i.label),
    ["Accueil", "product", "Jahia DXP"],
  );
  assert.equal(items[1].node, overview);
  assert.match(items[1].href, /product\/overview.html$/);
  const page = f.make("portal", product),
    child = f.make("finance", page);
  items = breadcrumbItems(child, f.home, { ...f.options, title: "Finance" });
  assert.deepEqual(
    items.map((i) => i.label),
    ["Accueil", "product", "portal", "Finance"],
  );
  assert.equal(items[2].node, page);
});
test("no section mother is inferred, and removing an explicit association leaves text", () => {
  const f = fixture(),
    group = f.make("why-jahia", f.home, "jnt:navMenuText", {
      navLandingPage: "overview",
      navDiscoverPage: "why-jahia-page",
    }),
    overview = f.make("overview", group),
    sameName = f.make("why-jahia-page", group),
    page = f.make("developers", group);
  sameName.getName = () => "why-jahia";
  sameName.getPath = () => group.getPath() + "/why-jahia";
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
  f.options.settings.parents["why-jahia"] = "overview";
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].node, overview);
  delete f.options.settings.parents["why-jahia"];
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
  f.options.settings.parents["why-jahia"] = "missing";
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
});
test("home and current mother do not produce duplicate steps; labels and references are editable", () => {
  const f = fixture(),
    group = f.make("resources", f.home, "jnt:navMenuText"),
    index = f.make("library", group),
    page = f.make("article", group);
  f.options.settings.parents.resources = "library";
  f.options.settings.labels.resources = { fr: "Ressources utiles" };
  f.options.settings.labels.article = { fr: "Mon article" };
  f.options.settings.homeLabels.fr = "Départ";
  assert.deepEqual(
    breadcrumbItems(page, f.home, f.options).map((i) => i.label),
    ["Départ", "Ressources utiles", "Mon article"],
  );
  const items = breadcrumbItems(index, f.home, { ...f.options, title: "Bibliothèque" });
  assert.deepEqual(
    items.map((i) => i.label),
    ["Départ", "Ressources utiles"],
  );
  assert.equal(items[1].href, undefined);
  assert.deepEqual(breadcrumbItems(f.home, f.home, f.options), []);
});
test("missing, private, untranslated and foreign mothers never become links", () => {
  const f = fixture(),
    group = f.make("resources", f.home, "jnt:navMenuText"),
    page = f.make("blog", group);
  let items = breadcrumbItems(page, f.home, f.options);
  assert.equal(items[1].href, undefined);
  f.options.settings.parents.resources = "missing";
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
  const index = f.make("overview", group);
  f.options.settings.parents.resources = "overview";
  index.hasPermission = () => false;
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
  index.hasPermission = () => true;
  index.hasI18N = () => false;
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
  index.hasI18N = () => true;
  assert.equal(
    breadcrumbItems(page, f.home, { ...f.options, url: () => "javascript:alert(1)" })[1].href,
    undefined,
  );
  f.options.settings.enabled = false;
  assert.deepEqual(breadcrumbItems(page, f.home, f.options), []);
});
test("a section mother can be any page in its site, but never another site", () => {
  const f = fixture(),
    group = f.make("solutions", f.home, "jnt:navMenuText"),
    page = f.make("portal", group),
    target = f.make("contact", undefined);
  target.getPath = () => "/sites/test/contact";
  f.options.settings.parents.solutions = "contact";
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].node, target);
  target.getPath = () => "/sites/other/home/contact";
  assert.equal(breadcrumbItems(page, f.home, f.options)[1].href, undefined);
});
test("the blog can omit Resources while an article keeps its link to Blog", () => {
  const f = fixture();
  const resources = f.make("resources", f.home, "jnt:navMenuText");
  const blog = f.make("blog", resources);
  const entry = f.make("post", undefined, "jahiacom:blogEntry");
  const options = { ...f.options, omitAncestorPath: resources.getPath(), title: "Blog" };
  assert.deepEqual(
    breadcrumbItems(blog, f.home, options).map((item) => item.label),
    ["Accueil", "Blog"],
  );
  const items = breadcrumbItems(entry, f.home, { ...options, index: blog, title: "Article" });
  assert.deepEqual(
    items.map((item) => item.label),
    ["Accueil", "blog", "Article"],
  );
  assert.equal(items[1].node, blog);
  assert.deepEqual(
    breadcrumbItems(blog, f.home, f.options).map((item) => item.id),
    ["home", "resources", "blog"],
  );
});

test("author trails omit Resources with the directory, Blog or Home as their index", () => {
  const f = fixture();
  const resources = f.make("resources", f.home, "jnt:navMenuText");
  const blog = f.make("blog", resources);
  const directory = f.make("authors", blog);
  const author = f.make("author", undefined, "jahiacom:blogAuthor");
  author.getPath = () => "/sites/test/contents/authors/author";
  const options = { ...f.options, omitAncestorPath: resources.getPath(), title: "Jahia Team" };
  for (const [index, labels] of [
    [directory, ["Accueil", "blog", "authors", "Jahia Team"]],
    [blog, ["Accueil", "blog", "Jahia Team"]],
    [f.home, ["Accueil", "Jahia Team"]],
  ]) {
    const items = breadcrumbItems(author, f.home, { ...options, index });
    assert.deepEqual(
      items.map((item) => item.label),
      labels,
    );
    assert.equal(items.at(-1).href, undefined);
    assert.ok(items.slice(0, -1).every((item) => item.href));
  }
  assert.deepEqual(
    breadcrumbItems(directory, f.home, { ...options, title: "Auteurs" }).map((item) => item.label),
    ["Accueil", "blog", "Auteurs"],
  );
});

test("entries outside Home use the existing editorial index hierarchy", () => {
  const f = fixture(),
    group = f.make("resources", f.home, "jnt:navMenuText"),
    index = f.make("glossary", group),
    term = f.make("term", undefined);
  term.getPath = () => "/sites/test/contents/term";
  const items = breadcrumbItems(term, f.home, { ...f.options, index, title: "Terme" });
  assert.deepEqual(
    items.map((i) => i.label),
    ["Accueil", "resources", "glossary", "Terme"],
  );
  assert.equal(items[2].node, index);
  index.hasPermission = () => false;
  assert.deepEqual(breadcrumbItems(term, f.home, { ...f.options, index }), []);
});
test("breadcrumb configuration is independent, compatible when absent and rejects invalid references", () => {
  assert.deepEqual(decode(null), defaults());
  for (const change of [
    { version: 2 },
    { enabled: "true" },
    { parents: { root: "https://example.com" } },
    { labels: { root: { fr: 3 } } },
    { labels: { "../bad": { fr: "x" } } },
  ])
    assert.throws(() => decode(JSON.stringify({ ...defaults(), ...change })));
});

test("saving and publishing affect only the independent configuration, and stale editors are rejected", async () => {
  const { load, save, publish } = await import("../javascript/breadcrumb/api.js");
  let raw = null,
    live = null;
  const mutations = [];
  const request = async (query, variables = {}) => {
    if (query.startsWith("mutation")) {
      mutations.push({ query, variables });
      if (query.includes("addNode")) {
        assert.equal(variables.parent, "/sites/test");
        raw = variables.properties.find((p) => p.name === "configuration").value;
      } else if (query.includes("setPropertiesBatch")) {
        assert.equal(variables.path, "/sites/test/breadcrumb-settings");
        raw = variables.raw;
      } else {
        assert.equal(variables.path, "/sites/test/breadcrumb-settings");
        assert.match(query, /publishSubNodes:false,includeSubTree:false/);
        live = raw;
      }
      return {};
    }
    if (query.includes("nodesByQuery"))
      return {
        jcr: {
          site: { children: { nodes: raw ? [{ name: "breadcrumb-settings" }] : [] } },
          home: { children: { nodes: [] } },
          pages: { nodes: [] },
          groups: { nodes: [] },
        },
      };
    if (query.includes("aggregatedPublicationInfo"))
      return {
        jcr: {
          nodeByPath: {
            configuration: { value: raw },
            fr: { allowedToPublishWithoutWorkflow: true },
            en: { allowedToPublishWithoutWorkflow: true },
            live: { configuration: { value: live } },
          },
        },
      };
    return {
      jcr: {
        nodeByPath: {
          kind: { value: "jahiacom:breadcrumbSettings" },
          configuration: { value: raw },
        },
      },
    };
  };
  const snapshot = await load("test", request);
  assert.equal(mutations.length, 0);
  const settings = { ...defaults(), homeLabels: { fr: "Départ" } };
  const saved = await save(snapshot, settings, request);
  assert.equal(saved.settings.homeLabels.fr, "Départ");
  assert.equal(await publish(saved, request), true);
  assert.equal(mutations.length, 2);
  await assert.rejects(save(snapshot, settings, request), /CONFLICT/);
  assert.equal(mutations.length, 2);
  assert.ok(mutations.every((m) => !m.query.includes("navigation-settings")));
});
