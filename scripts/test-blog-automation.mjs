import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const loadSelection = () => {
  const module = { exports: {} };
  const model = { exports: {} };
  const compile = (path) =>
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
  vm.runInNewContext(compile("../src/views/ResourceCarousel/contentModel.ts"), {
    exports: model.exports,
  });
  vm.runInNewContext(compile("../src/views/ResourceCarousel/selection.server.ts"), {
    exports: module.exports,
    require: (name) =>
      name.endsWith("contentModel.js") ? model.exports : { buildNodeUrl: (node) => node.getPath() },
  });
  return module.exports;
};
const { selectResources, articleResourceTopics } = loadSelection();
const root = "/sites/systemsite/categories/topics/";
const node = (id, type, props = {}, path = `/sites/test/${id}`) => ({
  getIdentifier: () => id,
  getPath: () => path,
  getName: () => path.split("/").pop(),
  getDisplayableName: () => id,
  isNodeType: (name) => name === type,
  hasProperty: (name) => name in props,
  getPropertyAsString: (name) => (typeof props[name] === "string" ? props[name] : ""),
  getParent: () => node("root", "nt:base"),
  getProperty: (name) => {
    if (!(name in props)) throw new Error("Missing property");
    return {
      isMultiple: () => Array.isArray(props[name]),
      getValues: () => props[name].map((value) => ({ getNode: () => value })),
      getBoolean: () => props[name],
      getValue: () => ({ getDate: () => ({ getTimeInMillis: () => Date.parse(props[name]) }) }),
    };
  },
});
const topic = (id, path = id) => node(id, "jnt:category", {}, root + path);
const blog = (id, categories, extra = {}) =>
  node(id, "jahiacom:blogEntry", {
    "j:published": true,
    "j:defaultCategory": categories,
    "date": "2026-01-01",
    ...extra,
  });
const select = (currentNode, candidates, options = {}) =>
  Array.from(
    selectResources({
      currentNode,
      candidates,
      manualNodes: [],
      count: 9,
      mode: "automatic",
      thematicIds: [],
      contentTypeIds: [],
      legacyIds: [],
      completeFallback: true,
      minimumItems: 1,
      ...options,
    }),
  ).map((item) => item.id);

test("blog automatic selection follows changed article topics without copying filters", () => {
  const seo = topic("seo");
  const dam = topic("dam");
  const candidates = [blog("seo-post", [seo]), blog("dam-post", [dam])];
  assert.deepEqual(select(blog("current", [seo]), candidates), ["seo-post"]);
  assert.deepEqual(select(blog("current", [dam]), candidates), ["dam-post"]);
});
test("format categories never create topical matches; no unrelated fillers", () => {
  const format = node(
    "blog",
    "jnt:category",
    {},
    "/sites/systemsite/categories/resourcestypes/blog",
  );
  const seo = topic("seo");
  assert.deepEqual(select(blog("current", [format, seo]), [blog("unrelated", [format])]), []);
});
test("specific topics take precedence over assigned broad parents", () => {
  const parent = topic("content_management");
  const child = topic("seo", "content_management/seo");
  assert.deepEqual(
    Array.from(articleResourceTopics(blog("a", [parent, child]))).map((x) => x.getIdentifier()),
    ["seo"],
  );
});
test("legacy clusters work when no theme is assigned", () => {
  const cluster = node("cluster", "jnt:category");
  const current = blog("current", [], { blogType: [cluster] });
  assert.deepEqual(
    select(current, [blog("match", [], { blogType: [cluster] }), blog("other", [])]),
    ["match"],
  );
});
test("manual choices and generic-page automatic behavior remain unchanged", () => {
  const seo = topic("seo");
  const other = blog("other", []);
  assert.deepEqual(
    select(blog("current", [seo]), [other], {
      mode: "manual",
      manualNodes: [other],
      completeFallback: false,
    }),
    ["other"],
  );
  assert.deepEqual(select(node("page", "jnt:page"), [other]), ["other"]);
  assert.deepEqual(select(blog("uncategorized", []), [other]), ["other"]);
});
test("current, future, unpublished and glossary entries remain excluded", () => {
  const seo = topic("seo");
  const current = blog("current", [seo]);
  assert.deepEqual(
    select(current, [
      current,
      blog("future", [seo], { date: "2999-01-01" }),
      blog("draft", [seo], { "j:published": false }),
      node("term", "jahiacom:glossaryEntry", { "j:published": true }),
      blog("valid", [seo]),
    ]),
    ["valid"],
  );
});

function editorHarness({ categories = [], query, initial = {} } = {}) {
  const entries = new Map();
  const timers = new Map();
  let timerId = 0;
  const calls = [];
  const changes = [];
  const nativeCategory = { cmp: () => null };
  const registry = {
    add: (type, key, value) => entries.set(`${type}/${key}`, value),
    get: (type, key) => (key === "Category" ? nativeCategory : entries.get(`${type}/${key}`)),
  };
  vm.runInNewContext(
    readFileSync(new URL("../javascript/apps/partner-editors-1.5.js", import.meta.url), "utf8"),
    {
      window: {
        jahia: { uiExtender: { registry }, moonstone: { Button: "button", Typography: "span" } },
      },
      document: {
        createElement: () => ({
          set innerHTML(value) {
            this.value = value.replaceAll("&eacute;", "é").replaceAll("&nbsp;", " ");
          },
        }),
      },
      setTimeout: (callback) => {
        timers.set(++timerId, callback);
        return timerId;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  const fields = [
    "jcr:title",
    "summary",
    "text",
    "body",
    "image",
    "j:defaultCategory",
    "htmlTitle",
    "jcr:description",
    "seoKeywords",
    "openGraphImage",
  ].map((propertyName) => ({
    propertyName,
    name: `field:${propertyName}`,
    selectorType: propertyName === "j:defaultCategory" ? "Category" : "Text",
  }));
  const context = {
    mode: "create",
    nodeTypeName: "jahiacom:blogEntry",
    lang: "fr",
    uilang: "fr",
    sections: [{ fieldSets: [{ fields }] }],
    formik: {
      values: Object.fromEntries(
        Object.entries(initial).map(([name, value]) => [`field:${name}`, value]),
      ),
      setFieldValue: (name, value) => {
        context.formik.values[name] = value;
        const field = fields.find((item) => item.name === name);
        onChange(null, value, field, context);
      },
    },
    client: {
      query: (request) => {
        calls.push(request);
        return query
          ? query(request)
          : Promise.resolve({
              data: { jcr: { nodeByPath: { descendants: { nodes: categories } } } },
            });
      },
    },
    onSectionsUpdate: () => changes.push(true),
  };
  const onChange = entries.get("selectorType.onChange/jahiacomBlogTopicSuggestions").onChange;
  const change = (property, value) => {
    const field = fields.find((item) => item.propertyName === property);
    context.formik.values[field.name] = value;
    onChange(null, value, field, context);
  };
  const flush = async () => {
    const pending = [...timers.values()];
    timers.clear();
    pending.forEach((callback) => callback());
    await new Promise((resolve) => setImmediate(resolve));
  };
  const categoryField = () =>
    context.sections[0].fieldSets[0].fields.find(
      (field) => field.propertyName === "j:defaultCategory",
    );
  return { change, flush, context, calls, changes, categoryField, entries };
}
const categories = [
  { uuid: "seo", path: root + "content_management/seo", displayName: "SEO" },
  { uuid: "ai", path: root + "technology/ai", displayName: "Intelligence artificielle" },
  {
    uuid: "access",
    path: root + "content_management/web_accessibility",
    displayName: "Accessibilité",
  },
  { uuid: "format", path: "/sites/systemsite/categories/resourcestypes/blog", displayName: "Blog" },
];
test("French text yields existing themes and prefills the draft category references", async () => {
  const h = editorHarness({ categories });
  h.change("jcr:title", "Améliorer le référencement naturel et l’accessibilité");
  h.change("text", "<p>Accessibilité web, RGAA et WCAG</p>");
  await h.flush();
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items)
      .map((x) => x.uuid)
      .sort(),
    ["access", "seo"],
  );
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].variables.language, "fr");
  assert.ok(!JSON.stringify(h.calls[0]).includes("Améliorer"));
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]).sort(), [
    "access",
    "format",
    "seo",
  ]);
});
test("word boundaries prevent AI matching inside unrelated words; scripts ignored", async () => {
  const h = editorHarness({ categories });
  h.change("jcr:title", "Mail and daily details");
  h.change("text", "<script>SEO SEO SEO</script>");
  await h.flush();
  assert.equal(h.categoryField().jahiacomTopicSuggestions.items.length, 0);
});
test("body mentions need repetition and clearing the text clears suggestions", async () => {
  const h = editorHarness({ categories });
  h.change("text", "<p>SEO</p>");
  await h.flush();
  assert.equal(h.categoryField().jahiacomTopicSuggestions.items.length, 0);
  h.change("text", "<p>SEO SEO SEO</p>");
  await h.flush();
  assert.equal(h.categoryField().jahiacomTopicSuggestions.items[0].uuid, "seo");
  h.change("text", "");
  await h.flush();
  assert.equal(h.categoryField().jahiacomTopicSuggestions.items.length, 0);
});
test("language switching reloads taxonomy and invalidates the previous response", async () => {
  const pending = [];
  const h = editorHarness({ query: () => new Promise((resolve) => pending.push(resolve)) });
  h.change("jcr:title", "SEO");
  await h.flush();
  h.context.lang = "en";
  h.change("jcr:title", "Artificial intelligence");
  await h.flush();
  pending[1]({ data: { jcr: { nodeByPath: { descendants: { nodes: categories } } } } });
  await h.flush();
  pending[0]({ data: { jcr: { nodeByPath: { descendants: { nodes: categories } } } } });
  await h.flush();
  assert.deepEqual(
    h.calls.map((request) => request.variables.language),
    ["fr", "en"],
  );
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((item) => item.uuid),
    ["ai"],
  );
});
test("rapid changes discard stale asynchronous responses", async () => {
  let resolve;
  const h = editorHarness({
    query: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  h.change("jcr:title", "SEO");
  await h.flush();
  h.change("jcr:title", "Artificial intelligence");
  await h.flush();
  resolve({ data: { jcr: { nodeByPath: { descendants: { nodes: categories } } } } });
  await h.flush();
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((x) => x.uuid),
    ["ai"],
  );
});
test("other content types, unmount and errors do not change category selections", async () => {
  const h = editorHarness({ query: () => Promise.reject(new Error("Unavailable")) });
  h.context.nodeTypeName = "jnt:page";
  h.change("jcr:title", "SEO");
  await h.flush();
  assert.equal(h.calls.length, 0);
  h.context.nodeTypeName = "jahiacom:blogEntry";
  h.change("jcr:title", "SEO");
  h.change("jcr:title", undefined);
  await h.flush();
  assert.equal(h.calls.length, 0);
  h.change("jcr:title", "SEO");
  await h.flush();
  assert.equal(h.categoryField().jahiacomTopicSuggestions.status, "error");
});
test("accepting a suggestion preserves existing categories and uses native reference UUIDs", async () => {
  const h = editorHarness({ categories });
  h.change("jcr:title", "SEO");
  await h.flush();
  let selected;
  const render = h.entries.get("selectorType/BlogCategoryAssistant").cmp;
  const tree = render({
    field: h.categoryField(),
    editorContext: h.context,
    value: ["existing"],
    onChange: (value) => {
      selected = value;
    },
  });
  const findButtons = (element) =>
    !element
      ? []
      : [element]
          .filter((item) => item.type === "button")
          .concat(
            (Array.isArray(element.props?.children)
              ? element.props.children
              : [element.props?.children]
            ).flatMap(findButtons),
          );
  findButtons(tree)[0].props.onClick();
  assert.deepEqual(Array.from(selected), ["existing", "seo"]);
});

test("classification fills format, theme and existing ancestors like the DAM example", async () => {
  const h = editorHarness({
    categories: categories.concat([
      {
        uuid: "article",
        path: "/sites/systemsite/categories/pageTypes/blog_post",
        displayName: "Article de blog",
      },
      { uuid: "integrations", path: root + "integrations", displayName: "Intégrations" },
      { uuid: "dam", path: root + "integrations/dam", displayName: "DAM" },
    ]),
  });
  h.change("jcr:title", "Digital asset management (DAM)");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]).sort(), [
    "article",
    "dam",
    "format",
    "integrations",
  ]);
  h.change("jcr:title", "SEO");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]).sort(), [
    "article",
    "format",
    "seo",
  ]);
});
test("manual category removals and existing classifications remain authoritative", async () => {
  const h = editorHarness({ categories });
  h.change("jcr:title", "SEO");
  await h.flush();
  h.change("j:defaultCategory", []);
  h.change("jcr:title", "SEO and artificial intelligence");
  await h.flush();
  assert.deepEqual(h.context.formik.values["field:j:defaultCategory"], []);
  const existing = editorHarness({
    categories,
    initial: { "j:defaultCategory": ["editor-choice"] },
  });
  existing.change("jcr:title", "SEO");
  await existing.flush();
  assert.deepEqual(existing.context.formik.values["field:j:defaultCategory"], ["editor-choice"]);
});
test("SEO drafts use summary and cover image but never fill keywords", async () => {
  const h = editorHarness({ categories });
  h.change("jcr:title", "SEO &amp; accessibilité");
  h.change("summary", "<p>Découvrez comment améliorer le référencement naturel.</p>");
  h.change("image", "image-reference");
  await h.flush();
  assert.equal(
    h.context.formik.values["field:jcr:description"],
    "Découvrez comment améliorer le référencement naturel.",
  );
  assert.equal(h.context.formik.values["field:openGraphImage"], "image-reference");
  assert.equal(h.context.formik.values["field:seoKeywords"], undefined);
  h.change("summary", "Une description plus récente.");
  await h.flush();
  assert.equal(h.context.formik.values["field:jcr:description"], "Une description plus récente.");
});
test("manual SEO edits, including clearing a field, stop subsequent automatic updates", async () => {
  const h = editorHarness({
    categories,
    initial: { htmlTitle: "Titre validé", openGraphImage: "chosen-image" },
  });
  h.change("jcr:title", "SEO");
  h.change("summary", "Initial summary");
  await h.flush();
  h.change("jcr:description", "");
  h.change("summary", "New summary");
  h.change("image", "new-image");
  await h.flush();
  assert.equal(h.context.formik.values["field:jcr:description"], "");
  assert.equal(h.context.formik.values["field:htmlTitle"], "Titre validé");
  assert.equal(h.context.formik.values["field:openGraphImage"], "chosen-image");
});
test("SEO works without taxonomy access; read-only fields are never filled", async () => {
  const h = editorHarness({ query: () => Promise.reject(new Error("Denied")) });
  h.categoryField().readOnly = true;
  h.context.sections[0].fieldSets[0].fields.find(
    (item) => item.propertyName === "htmlTitle",
  ).readOnly = true;
  h.change("jcr:title", "SEO");
  h.change("text", "<p>" + "Des informations utiles. ".repeat(15) + "</p>");
  await h.flush();
  assert.equal(h.context.formik.values["field:htmlTitle"], undefined);
  assert.equal(h.context.formik.values["field:j:defaultCategory"], undefined);
  assert.ok(h.context.formik.values["field:jcr:description"].length <= 160);
  assert.ok(!h.context.formik.values["field:jcr:description"].includes("<p>"));
});

test("product vocabulary detects CMS and multilingual without inventing categories", async () => {
  const h = editorHarness({
    categories: [
      { uuid: "cms", path: root + "cms", displayName: "CMS" },
      { uuid: "languages", path: root + "multilingual", displayName: "Multilingue" },
    ],
  });
  h.change("jcr:title", "jContent simplifie le Content Editor");
  h.change("summary", "Une traduction plus simple pour les contributeurs.");
  await h.flush();
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((x) => x.uuid),
    ["cms", "languages"],
  );
});

test("a dedicated heading qualifies a theme but incidental body mentions do not", async () => {
  const h = editorHarness({ categories });
  h.change(
    "text",
    "<h2>Accessibilité</h2><p>SEO</p><script><h2>Intelligence artificielle</h2></script>",
  );
  await h.flush();
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((x) => x.uuid),
    ["access"],
  );
});

test("body repetition cannot outrank a title topic and does not match Java in JavaScript", async () => {
  const h = editorHarness({
    categories: categories.concat([
      { uuid: "java", path: root + "technology/java", displayName: "Java" },
      { uuid: "js", path: root + "technology/javascript", displayName: "JavaScript" },
    ]),
  });
  h.change("jcr:title", "Accessibilité");
  h.change("text", "<p>" + "SEO JavaScript ".repeat(100) + "</p>");
  await h.flush();
  const ids = Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((x) => x.uuid);
  assert.equal(ids[0], "access");
  assert.ok(!ids.includes("java"));
});

test("equally supported topics follow editorial order rather than translated labels", async () => {
  const h = editorHarness({ categories });
  h.change("text", "<h2>SEO</h2><h2>Accessibilité</h2>");
  await h.flush();
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((x) => x.uuid),
    ["seo", "access"],
  );
});

const productCategories = [
  {
    uuid: "updates",
    path: "/sites/systemsite/categories/blogTypes/product-updates",
    displayName: "MAJ Produit",
  },
  {
    uuid: "product",
    path: "/sites/systemsite/categories/products/enterprise_cms_and_dxp_for_organizations",
    displayName: "CMS et DXP d’entreprise",
  },
  { uuid: "cms", path: root + "cms", displayName: "CMS" },
];
test("FR and EN product announcements include editorial type and Jahia product", async () => {
  for (const title of [
    "Nouveautés jContent 3.7.1",
    "Jahia from the Field: jContent 3.7.1 simplifies Content Editor",
  ]) {
    const h = editorHarness({ categories: productCategories });
    h.change("jcr:title", title);
    await h.flush();
    assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]).sort(), [
      "cms",
      "product",
      "updates",
    ]);
  }
});
test("tutorials and generic CMS articles are not product announcements", async () => {
  for (const title of [
    "Comment mettre à jour jContent 3.7.1",
    "How to upgrade to Jahia 8.2",
    "Choisir un CMS pour son site",
  ]) {
    const h = editorHarness({ categories: productCategories });
    h.change("jcr:title", title);
    await h.flush();
    assert.ok(!(h.context.formik.values["field:j:defaultCategory"] || []).includes("updates"));
    if (title.includes("Choisir"))
      assert.ok(!(h.context.formik.values["field:j:defaultCategory"] || []).includes("product"));
  }
});
test("existing keywords and categories stay intact while missing dimensions are suggested", async () => {
  const h = editorHarness({
    categories: productCategories,
    initial: { "j:defaultCategory": ["cms"], "seoKeywords": ["Editorial keyword"] },
  });
  h.change("jcr:title", "Nouveautés jContent 3.7.1");
  await h.flush();
  assert.deepEqual(h.context.formik.values["field:j:defaultCategory"], ["cms"]);
  assert.deepEqual(h.context.formik.values["field:seoKeywords"], ["Editorial keyword"]);
  assert.ok(h.categoryField().jahiacomTopicSuggestions.items.some((x) => x.uuid === "updates"));
});

const defaultFormats = [
  {
    uuid: "format-blog",
    path: "/sites/systemsite/categories/resourcestypes/blog",
    displayName: "Blog",
  },
  {
    uuid: "format-article",
    path: "/sites/systemsite/categories/pageTypes/blog_post",
    displayName: "Article de blog",
  },
];
test("existing blog format defaults do not block automatic topics", async () => {
  const h = editorHarness({
    categories: defaultFormats.concat(productCategories),
    initial: { "j:defaultCategory": ["format-blog", "format-article"] },
  });
  h.change("jcr:title", "Nouveautés jContent 3.7.1");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]).sort(), [
    "cms",
    "format-article",
    "format-blog",
    "product",
    "updates",
  ]);
});
test("manual removal down to format defaults remains protected", async () => {
  const h = editorHarness({
    categories: defaultFormats.concat(productCategories),
    initial: { "j:defaultCategory": ["format-blog", "format-article"] },
  });
  h.change("jcr:title", "Nouveautés jContent 3.7.1");
  await h.flush();
  h.change("j:defaultCategory", ["format-blog", "format-article"]);
  h.change("summary", "Nouvelle version jContent");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]).sort(), [
    "format-article",
    "format-blog",
  ]);
});
test("unresolved existing categories are never treated as format defaults", async () => {
  const h = editorHarness({
    categories: defaultFormats.concat(productCategories),
    initial: { "j:defaultCategory": ["format-blog", "unknown"] },
  });
  h.change("jcr:title", "Nouveautés jContent 3.7.1");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]), [
    "format-blog",
    "unknown",
  ]);
});

test("glossary description uses summary, then definition, and preserves editorial SEO", async () => {
  const h = editorHarness();
  h.context.nodeTypeName = "jahiacom:glossaryEntry";
  h.change("body", "<p>A definition of the term.</p>");
  await h.flush();
  assert.equal(h.context.formik.values["field:jcr:description"], "A definition of the term.");
  h.change("summary", "A short definition.");
  await h.flush();
  assert.equal(h.context.formik.values["field:jcr:description"], "A short definition.");
  h.change("jcr:description", "My editorial description");
  h.change("summary", "Changed summary");
  await h.flush();
  assert.equal(h.context.formik.values["field:jcr:description"], "My editorial description");
  assert.equal(h.context.formik.values["field:seoKeywords"], undefined);
});
test("glossary matches exact term identity, ignores incidental text and blog formats", async () => {
  const h = editorHarness({
    categories: categories.concat([
      { uuid: "portal", path: root + "portal", displayName: "Portail" },
    ]),
  });
  h.context.nodeTypeName = "jahiacom:glossaryEntry";
  h.change("jcr:title", "Web portal");
  h.change("summary", "SEO CMS intelligence artificielle");
  h.change("body", "<h2>Accessibilité et SEO</h2>");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]), ["portal"]);
  h.change("jcr:title", "Absolute Area");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]), []);
});
test("glossary preserves existing editorial categories and recognizes exact bilingual synonyms", async () => {
  const h = editorHarness({ categories, initial: { "j:defaultCategory": ["access"] } });
  h.context.nodeTypeName = "jahiacom:glossaryEntry";
  h.change("jcr:title", "Search engine optimization");
  await h.flush();
  assert.deepEqual(Array.from(h.context.formik.values["field:j:defaultCategory"]), ["access"]);
  assert.deepEqual(
    Array.from(h.categoryField().jahiacomTopicSuggestions.items).map((x) => x.uuid),
    ["seo"],
  );
});

test("glossary descriptions never cut a sentence or retain ellipses", async () => {
  const h = editorHarness();
  h.context.nodeTypeName = "jahiacom:glossaryEntry";
  h.change("jcr:title", "A/B Test");
  h.change("summary", "Une phrase complète. " + "Une explication longue ".repeat(15) + ".");
  await h.flush();
  assert.equal(h.context.formik.values["field:jcr:description"], "Une phrase complète.");
  h.change("summary", "Une explication longue ".repeat(15) + ".");
  await h.flush();
  let description = h.context.formik.values["field:jcr:description"];
  assert.ok(description.includes("A/B Test"));
  assert.ok(description.endsWith("."));
  assert.ok(description.length <= 160);
  h.change("summary", "Une phrase coupée…");
  await h.flush();
  assert.ok(!h.context.formik.values["field:jcr:description"].includes("…"));
});

test("blog descriptions keep complete sentences and use a complete fallback for long sources", async () => {
  for (const lang of ["fr", "en"]) {
    const h = editorHarness();
    h.context.lang = lang;
    h.change("jcr:title", "Portail client");
    h.change("summary", "A complete sentence. " + "Long explanation ".repeat(30) + ".");
    await h.flush();
    assert.equal(h.context.formik.values["field:jcr:description"], "A complete sentence.");
    h.change("summary", "Long explanation ".repeat(30) + ".");
    await h.flush();
    const value = h.context.formik.values["field:jcr:description"];
    assert.ok(value.length <= 160 && value.endsWith("."));
    assert.ok(
      value.includes("Portail client") && !value.includes("…") && !value.includes("glossaire"),
    );
  }
});
