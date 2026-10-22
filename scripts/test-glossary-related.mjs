import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
const path = new URL("../src/contents/GlossaryEntry/relatedTerms.ts", import.meta.url);
const source = readFileSync(path, "utf8").replace(
  "./linkSelection.js",
  new URL("./linkSelection.ts", path).href,
);
const {
  selectRelatedTerms,
  selectRelatedTermDetails,
  mergeRelatedTranslations,
  resetRelatedCache,
  getRelatedCacheStats,
} = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const item = (id, title, content = "") => ({ id, title, content });
test("explicit comparison concepts come first, including French zone/Area", () => {
  const current = item("self", "Absolute Area", "Shared templates and references");
  const result = selectRelatedTerms(
    [current, item("area", "Area"), item("template", "Template"), item("ref", "Content Reference")],
    current,
    ["Zone"],
  );
  assert.equal(result[0].id, "area");
  assert.equal(result.length, 3);
});
test("minimum uses nearby concepts and rejects ambiguous dynamic fieldsets when alternatives exist", () => {
  const current = item(
    "self",
    "Static vs dynamic website",
    "Dynamic pages assembled through rendering architecture",
  );
  const result = selectRelatedTerms(
    [
      item("wrong", "Dynamic Fieldset", "Dynamic pages assembled through rendering architecture"),
      item("headless", "Headless CMS", "Rendering pages"),
      item("cloud", "Cloud content management", "Website hosting"),
      item("hybrid", "Hybrid CMS", "Rendering architecture"),
      item("enterprise", "Enterprise CMS", "Website architecture"),
    ],
    current,
  );
  assert.equal(result.length, 4);
  assert.ok(!result.some((x) => x.id === "wrong"));
});
test("self and duplicate references are excluded and six is a hard maximum", () => {
  const current = item("self", "CMS", "CMS architecture");
  const a = item("a", "Headless CMS");
  const pool = [
    current,
    a,
    a,
    ...Array.from({ length: 9 }, (_, i) => item(String(i), `CMS architecture ${i}`)),
  ];
  const result = selectRelatedTerms(pool, current);
  assert.equal(result.length, 6);
  assert.equal(new Set(result.map((x) => x.id)).size, 6);
  assert.ok(!result.some((x) => x.id === "self"));
});
test("small eligible pools are not filled with duplicates or invented entries", () => {
  const current = item("self", "CMS");
  assert.deepEqual(selectRelatedTerms([], current), []);
  assert.equal(selectRelatedTerms([current, item("one", "Headless CMS")], current).length, 1);
});
test("reverse mentions establish a relationship", () => {
  const current = item("self", "A/B Test");
  const result = selectRelatedTerms(
    [
      item("noise", "Template"),
      item("goal", "Goal", "A/B testing measures this goal"),
      item("conversion", "Conversion Rate"),
    ],
    current,
  );
  assert.equal(result[0].id, "goal");
});
test("a generic French service model does not become a Template relation", () => {
  const current = item("self", "Cloud hosting", "Un modèle de service pour hébergement cloud");
  const result = selectRelatedTerms(
    [
      item("template", "Template"),
      item("cloud", "Cloud content management"),
      item("cms", "Enterprise CMS"),
      item("hybrid", "Hybrid CMS"),
      item("headless", "Headless CMS"),
    ],
    current,
  );
  assert.ok(!result.some((x) => x.id === "template"));
});

test("shared translation profiles produce the same IDs and order regardless of display language", () => {
  const fr = {
    ...item("self", "Zone absolue", "Zone partagée, template et référence"),
    language: "fr",
    concepts: ["Zone", "Template"],
  };
  const en = {
    ...item("self", "Absolute Area", "Shared area and template"),
    language: "en",
    concepts: ["Area", "Template"],
  };
  const profileFR = mergeRelatedTranslations("self", [fr, en]);
  const profileEN = mergeRelatedTranslations("self", [en, fr]);
  assert.deepEqual(profileFR, profileEN);
  const pool = [
    item("area", "Area"),
    item("template", "Template"),
    item("reference", "Content Reference"),
    item("portal", "Web portal"),
  ];
  assert.deepEqual(
    selectRelatedTerms(pool, profileFR, profileFR.concepts).map((x) => x.id),
    selectRelatedTerms([...pool].reverse(), profileEN, profileEN.concepts).map((x) => x.id),
  );
});

test("a shared explicit concept improves a nearby candidate and explains its selection", () => {
  const current = { ...item("self", "Alpha Topic"), concepts: ["Shared Bridge"] };
  const pool = [
    { ...item("beta", "Beta Topic"), concepts: ["Shared Bridge"] },
    item("bridge", "Shared Bridge"),
    item("noise", "Unrelated Topic"),
    item("other", "Other Topic"),
  ];
  const result = selectRelatedTermDetails(pool, current, current.concepts);
  assert.ok(
    result.findIndex((x) => x.item.id === "beta") < result.findIndex((x) => x.item.id === "noise"),
  );
  assert.equal(result.find((x) => x.item.id === "beta").reason, "shared-concepts");
  assert.deepEqual(result.find((x) => x.item.id === "beta").via, ["Shared Bridge"]);
});

test("cache reuses bilingual corpus and returns fresh eligible objects", () => {
  resetRelatedCache();
  const current = item("self", "CMS");
  const pool = [item("a", "Headless CMS"), item("b", "Hybrid CMS")];
  const first = selectRelatedTermDetails(pool, current);
  first[0].via.push("must not leak");
  const fresh = pool.map((x) => ({ ...x, url: "/fr/" + x.id })).reverse();
  const second = selectRelatedTermDetails(fresh, { ...current });
  assert.equal(getRelatedCacheStats().prepared, 1);
  assert.equal(getRelatedCacheStats().resultHits, 1);
  assert.ok(second.every((x) => fresh.includes(x.item) && !x.via.includes("must not leak")));
});

test("editorial changes and eligible pool changes invalidate cached results", () => {
  const fields = {
    title: "Changed",
    aliases: ["Changed"],
    description: "Changed",
    content: "Changed",
    comparison: "Changed",
    concepts: ["Changed"],
    taxonomyIds: ["Changed"],
  };
  for (const [field, value] of Object.entries(fields)) {
    resetRelatedCache();
    const current = item("self", "CMS");
    const pool = [item("a", "Headless CMS"), item("b", "Hybrid CMS")];
    selectRelatedTerms(pool, current);
    selectRelatedTerms([{ ...pool[0], [field]: value }, pool[1]], current);
    assert.equal(getRelatedCacheStats().prepared, 2, field);
    assert.deepEqual(
      selectRelatedTerms([pool[1]], current).map((x) => x.id),
      ["b"],
    );
    assert.equal(getRelatedCacheStats().prepared, 3);
  }
});

test("cache is bounded and comparison choices have separate result keys", () => {
  resetRelatedCache();
  const pool = [item("a", "Headless CMS"), item("b", "Hybrid CMS")];
  const current = item("self", "CMS");
  selectRelatedTerms(pool, current, ["Headless CMS"]);
  assert.equal(selectRelatedTerms(pool, current, ["Hybrid CMS"])[0].id, "b");
  assert.equal(getRelatedCacheStats().prepared, 1);
  assert.equal(getRelatedCacheStats().resultHits, 0);
  for (let i = 0; i < 6; i++) selectRelatedTerms(pool, { ...current, content: String(i) });
  assert.equal(getRelatedCacheStats().corpora, 4);
  assert.equal(getRelatedCacheStats().evictions, 3);
});

test("automatic links localize only selected terms in ranking order", () => {
  const urls = [];
  const profiles = [];
  const makeNode = (id) => {
    const values = {
      summary: `Summary ${id}`,
      body: `Body ${id}`,
      comparison: "",
      aliases: [`Alias ${id}`],
    };
    const node = {
      getIdentifier: () => id,
      getPath: () => `/sites/test/terms/${id}`,
      getName: () => id,
      getDisplayableName: () => `Title ${id}`,
      getParent: () => ({ getPath: () => "/sites/test/terms" }),
      hasPermission: () => true,
      hasI18N: () => true,
      hasNode: (name) => name.startsWith("j:translation_"),
      hasProperty: (name) => name === "j:published" || name in values,
      getPropertyAsString: (name) => values[name] || "",
      getProperty: (name) => ({
        getBoolean: () => true,
        getValues: () => values[name].map((value) => ({ getString: () => value })),
      }),
    };
    node.getNode = (name) => ({
      ...node,
      getPath: () => `${node.getPath()}/${name}`,
      getPropertyAsString: (property) =>
        property === "jcr:title" ? `Title ${id}` : values[property] || "",
    });
    return node;
  };
  const nodes = ["self", "a", "b", "unused"].map(makeNode);
  const module = { exports: {} };
  const source = readFileSync(
    new URL("../src/contents/GlossaryEntry/automaticLinks.server.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const queryContent = ({ query }) => (query.includes("[jahiacom:glossaryEntry]") ? nodes : []);
  const getContext = () => ({
    currentNode: nodes[0],
    currentResource: { getLocale: () => ({ getLanguage: () => "fr" }) },
    renderContext: { getSite: () => ({ getPath: () => "/sites/test" }) },
  });
  vm.runInNewContext(output, {
    exports: module.exports,
    require: (name) => {
      if (name === "@jahia/javascript-modules-library")
        return {
          buildNodeUrl: (node) => {
            urls.push(node.getIdentifier());
            return node.getPath();
          },
          getChildNodes: () => [],
          server: { render: { addCacheDependency: () => {} } },
          useJCRQuery: queryContent,
          useServerContext: getContext,
        };
      if (name.endsWith("contentModel.js"))
        return { RESOURCE_MODEL: { blogNodeType: "blog", pageNodeType: "page" } };
      if (name.endsWith("types.js")) return { htmlToText: (value) => value };
      if (name.endsWith("indexPage.js")) return { resolveGlossaryIndex: () => null };
      if (name.endsWith("linkSelection.js"))
        return { usefulExpression: Boolean, rankLinks: () => [] };
      if (name.endsWith("memo.server.js"))
        return {
          glossaryMemo: () => undefined,
          resourceMetadata: () => undefined,
          editorialParts: () => undefined,
          memoProfile: (_memo, _node, _site, _lang, compute) => compute(),
        };
      if (name.endsWith("editorialText.js"))
        return { createBoundedTextReader: (convert) => convert };
      if (name.endsWith("relatedTerms.js"))
        return {
          mergeRelatedTranslations: (id, translations) => ({ ...translations[0], id }),
          selectRelatedTerms: (candidates) => {
            profiles.push(...candidates.map((candidate) => candidate.id));
            return [candidates[2], candidates[1]];
          },
        };
      return {};
    },
  });
  const result = module.exports.automaticLinks({}, []);
  assert.deepEqual(profiles, ["self", "a", "b", "unused"]);
  assert.deepEqual(urls, ["b", "a"]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.terms)),
    ["b", "a"].map((id) => ({
      id,
      title: `Title ${id}`,
      url: `/sites/test/terms/${id}`,
      summary: `Summary ${id}`,
      description: `Summary ${id}`,
      content: `Body ${id}`,
      comparison: "",
      aliases: [`Alias ${id}`],
    })),
  );
});

const { createBoundedTextReader } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      stripTypeScriptTypes(
        readFileSync(
          new URL("../src/contents/GlossaryEntry/editorialText.ts", import.meta.url),
          "utf8",
        ),
      ),
    ).toString("base64")
);
test("editorial conversion reuses only exact input strings, including empty output", () => {
  const calls = [];
  const read = createBoundedTextReader((html) => {
    calls.push(html);
    return html.replace(/<[^>]+>/g, "");
  });
  assert.equal(read("<p>Édition FR</p>"), "Édition FR");
  assert.equal(read("<p>Édition FR</p>"), "Édition FR");
  assert.equal(read("<p>Changed EN</p>"), "Changed EN");
  assert.equal(read("<p></p>"), "");
  assert.equal(read("<p></p>"), "");
  assert.deepEqual(calls, ["<p>Édition FR</p>", "<p>Changed EN</p>", "<p></p>"]);
});
test("editorial conversion bounds entries with LRU eviction and keys plus results by character budget", () => {
  let count = 0;
  const read = createBoundedTextReader(
    (html) => {
      count++;
      return html;
    },
    { maxEntries: 2, maxCharacters: 12 },
  );
  for (const input of ["abc", "def", "abc", "ghi", "abc", "def"]) assert.equal(read(input), input);
  assert.equal(count, 4);
  const large = "x".repeat(20);
  assert.equal(read(large), large);
  assert.equal(read(large), large);
  assert.equal(count, 6);
  assert.equal(read("def"), "def");
  assert.equal(count, 6);
  const constrained = createBoundedTextReader(
    (html) => {
      count++;
      return html;
    },
    { maxEntries: 10, maxCharacters: 6 },
  );
  constrained("abc");
  constrained("def");
  constrained("abc");
  assert.equal(count, 9);
});
test("editorial conversion keeps failures observable and supports a disabled cache", () => {
  let count = 0;
  const read = createBoundedTextReader(() => {
    count++;
    throw new Error("Conversion failed");
  });
  assert.throws(() => read("bad"), /Conversion failed/);
  assert.throws(() => read("bad"), /Conversion failed/);
  assert.equal(count, 2);
  const disabled = createBoundedTextReader(
    (html) => {
      count++;
      return html;
    },
    { maxEntries: 0 },
  );
  disabled("same");
  disabled("same");
  assert.equal(count, 4);
});

test("automatic links reread editorial values and permissions before reusing pure conversion", () => {
  let readable = true,
    textReads = 0;
  const conversions = [],
    options = [];
  const fields = { "jcr:title": "Article", "text": "<p>First text</p>" };
  const make = (id, values) => {
    const n = {
      getIdentifier: () => id,
      getPath: () => "/sites/test/" + id,
      getName: () => id,
      getDisplayableName: () => values["jcr:title"] || id,
      getParent: () => ({ getPath: () => "/sites/test/terms" }),
      hasPermission: () => id !== "resource" || readable,
      hasI18N: () => true,
      hasNode: (name) => name.startsWith("j:translation_"),
      hasProperty: (name) => name in values,
      getPropertyAsString: (name) => {
        if (id === "resource" && name === "text") textReads++;
        return values[name] || "";
      },
      getProperty: (name) => ({
        getValues: () => (values[name] || []).map((value) => ({ getString: () => value })),
      }),
    };
    n.getNode = (name) => ({ ...n, getPath: () => n.getPath() + "/" + name });
    return n;
  };
  const current = make("self", { "jcr:title": "Term" }),
    resource = make("resource", fields);
  const getContext = () => ({
    currentNode: current,
    currentResource: { getLocale: () => ({ getLanguage: () => "fr" }) },
    renderContext: { getSite: () => ({ getPath: () => "/sites/test" }) },
  });
  const queryContents = ({ query }) => (query.includes("[blog]") ? [resource] : []);
  const module = { exports: {} };
  const output = ts.transpileModule(
    readFileSync(
      new URL("../src/contents/GlossaryEntry/automaticLinks.server.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText;
  vm.runInNewContext(output, {
    exports: module.exports,
    require: (name) => {
      if (name === "@jahia/javascript-modules-library")
        return {
          buildNodeUrl: (n) => n.getPath(),
          getChildNodes: () => [],
          server: { render: { addCacheDependency: () => {} } },
          useServerContext: getContext,
          useJCRQuery: queryContents,
        };
      if (name.endsWith("memo.server.js"))
        return {
          glossaryMemo: () => undefined,
          resourceMetadata: () => undefined,
          editorialParts: () => undefined,
          memoProfile: (_memo, _node, _site, _lang, compute) => compute(),
        };
      if (name.endsWith("editorialText.js")) return { createBoundedTextReader };
      if (name.endsWith("selection.server.js"))
        return {
          toCard: (n, opts) => {
            options.push(opts);
            return {
              id: n.getIdentifier(),
              title: "Article",
              kind: "blog",
              taxonomyIds: opts.includeTaxonomy ? ["topic"] : [],
            };
          },
          cardPresentation: () => {
            throw new Error("Glossary must not resolve unused media");
          },
        };
      if (name.endsWith("contentModel.js"))
        return { RESOURCE_MODEL: { blogNodeType: "blog", pageNodeType: "page" } };
      if (name.endsWith("types.js"))
        return {
          htmlToText: (html) => {
            conversions.push(html);
            return html.replace(/<[^>]+>/g, " ").trim();
          },
        };
      if (name.endsWith("indexPage.js")) return { resolveGlossaryIndex: () => null };
      if (name.endsWith("linkSelection.js"))
        return { usefulExpression: Boolean, rankLinks: (items) => items };
      if (name.endsWith("relatedTerms.js"))
        return {
          mergeRelatedTranslations: (id, entries) => ({ ...entries[0], id, concepts: [] }),
          selectRelatedTerms: () => [],
        };
      throw new Error("Unexpected test import " + name);
    },
  });
  const run = (props) => module.exports.automaticLinks(props || {}, []);
  assert.match(run().resources[0].content, /First text/);
  fields.text = "<p>Changed text</p>";
  const changed = run().resources[0].content;
  assert.match(changed, /Changed text/);
  assert.doesNotMatch(changed, /First text/);
  readable = false;
  const readsBefore = textReads;
  assert.equal(run().resources.length, 0);
  assert.equal(textReads, readsBefore);
  readable = true;
  fields.text = "<p>First text</p>";
  assert.match(run().resources[0].content, /First text/);
  assert.equal(textReads, readsBefore + 1);
  assert.equal(conversions.filter((html) => html === fields.text).length, 1);
  run({ linkThemes: [{ getIdentifier: () => "topic", getPath: () => "/categories/topic" }] });
  assert.equal(options[0].includeTaxonomy, false);
  assert.equal(options.at(-1).includeTaxonomy, true);
});

function memoHarness() {
  const state = { workspace: "live", user: "guest", epoch: 0, fail: false, readable: ["en", "fr"] };
  const stored = new Map(),
    dependencies = [];
  const service = {
    apply: () => String(state.epoch),
    profileMemo: (key, generation, value) => {
      if (state.fail) throw Error("Unavailable");
      if (generation !== state.epoch) return null;
      if (value === null) return stored.get(key) ?? null;
      stored.set(key, value);
      return null;
    },
    prepareResourceMetadata: () => {
      state.epoch++;
      return JSON.stringify({ records: [], dependencies: [] });
    },
  };
  const context = {
    currentResource: { getWorkspace: () => state.workspace },
    renderContext: { getUser: () => ({ getUsername: () => state.user }) },
  };
  const output = ts.transpileModule(
    readFileSync(new URL("../src/contents/GlossaryEntry/memo.server.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    console: { warn: () => {} },
    require: (name) => {
      assert.equal(name, "@jahia/javascript-modules-library");
      return {
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- SDK API stub in a VM fixture.
        useServerContext: () => context,
        server: {
          osgi: { getBundle: () => ({ getBundleId: () => 7 }), getService: () => service },
          render: { addCacheDependency: () => {} },
        },
      };
    },
  });
  const node = {
    getPath: () => "/sites/test/terms/a",
    getIdentifier: () => "a",
    hasPermission: () => true,
    hasNode: () => true,
    getNode: (path) => ({
      getPath: () => "/sites/test/terms/a/" + path,
      hasPermission: () => state.readable.includes(path.replace("j:translation_", "")),
    }),
  };
  const profile = (memo, compute, site = "/sites/test", lang = "fr") =>
    exports.memoProfile(memo, node, site, lang, compute, (n) => dependencies.push(n.getPath()));
  return { state, exports, stored, dependencies, profile };
}

test("glossary memo excludes DEFAULT and authenticated renders", () => {
  const h = memoHarness();
  assert.ok(h.exports.glossaryMemo());
  h.state.workspace = "default";
  assert.equal(h.exports.glossaryMemo(), undefined);
  h.state.workspace = "live";
  h.state.user = "editor";
  assert.equal(h.exports.glossaryMemo(), undefined);
});

test("profile memo separates sites, languages and freshly readable translations", () => {
  const h = memoHarness();
  let computations = 0;
  const compute = () => ({ title: "value-" + ++computations });
  const memo = h.exports.glossaryMemo();
  assert.equal(h.profile(memo, compute).title, "value-1");
  assert.equal(h.profile(memo, compute).title, "value-1");
  assert.equal(computations, 1);
  assert.ok(h.dependencies.includes("/sites/test/terms/a/j:translation_en"));
  h.state.readable = ["fr"];
  assert.equal(h.profile(memo, compute).title, "value-2");
  assert.equal(h.profile(memo, compute, "/sites/another").title, "value-3");
  assert.equal(h.profile(memo, compute, "/sites/another", "en").title, "value-4");
});

test("memo returns isolated values and falls back after invalidation or service failure", () => {
  const h = memoHarness();
  let computations = 0;
  const compute = () => ({ title: "value-" + ++computations });
  const memo = h.exports.glossaryMemo();
  h.profile(memo, compute);
  const cached = h.profile(memo, compute);
  cached.title = "mutated";
  assert.equal(h.profile(memo, compute).title, "value-1");
  h.state.epoch++;
  assert.equal(h.profile(memo, compute).title, "value-2");
  h.state.fail = true;
  assert.equal(h.profile(h.exports.glossaryMemo(), compute).title, "value-3");
});

test("resource metadata changed during its read is discarded", () => {
  const h = memoHarness();
  assert.equal(
    h.exports.resourceMetadata(h.exports.glossaryMemo(), "/sites/test", "fr", false),
    undefined,
  );
});
