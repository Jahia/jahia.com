import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { linkTermMentions } from "../src/contents/GlossaryEntry/inlineTerms.ts";

function load(file, imports) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    console,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), name);
      return imports[name];
    },
  });
  return exports;
}
function harness() {
  const state = {
    workspace: "live",
    user: "guest",
    site: "/sites/test",
    lang: "fr",
    epoch: 0,
    fail: false,
  };
  const store = new Map(),
    dependencies = [];
  const service = {
    apply: () => String(state.epoch),
    termCatalogMemo(key, generation, value) {
      if (state.fail) throw Error("service unavailable");
      if (generation !== state.epoch) return null;
      if (value === null) return store.get(key) ?? null;
      store.set(key, value);
      return null;
    },
  };
  const context = {
    currentResource: { getWorkspace: () => state.workspace },
    renderContext: {
      getUser: () => ({ getUsername: () => state.user }),
      getSite: () => ({ getPath: () => state.site }),
    },
  };
  const sdk = {
    // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- SDK API stub in a VM fixture.
    useServerContext: () => context,
    server: {
      osgi: { getBundle: () => ({ getBundleId: () => 7 }), getService: () => service },
      render: { addCacheDependency: ({ path }) => dependencies.push(path) },
    },
  };
  const memo = load("../src/contents/GlossaryEntry/memo.server.ts", {
    "@jahia/javascript-modules-library": sdk,
  });
  const folder = { getPath: () => state.site + "/glossary" };
  const compute = (depend) => {
    depend({ getPath: () => folder.getPath() + "/portal/j:translation_" + state.lang });
    return [
      {
        id: "portal",
        url: "/" + state.lang + "/native",
        urlAliases: ["/old-portal"],
        labels: ["Portail web"],
      },
    ];
  };
  return {
    state,
    store,
    dependencies,
    sdk,
    context,
    memo,
    folder,
    compute,
    read: (fn = compute) => memo.memoTermCatalog(memo.glossaryMemo(), folder, state.lang, fn),
  };
}

test("term vocabulary is shared across entries, isolated by language/site and returned as fresh data", () => {
  const h = harness();
  let calls = 0;
  const compute = (depend) => {
    calls++;
    return h.compute(depend);
  };
  h.read(compute);
  const second = h.read(compute);
  assert.equal(calls, 1);
  second[0].labels.push("mutated");
  assert.equal(h.read(compute)[0].labels.length, 1);
  assert.ok(h.dependencies.includes("/sites/test/glossary/portal/j:translation_fr"));
  h.state.lang = "en";
  assert.equal(h.read(compute)[0].url, "/en/native");
  h.state.site = "/sites/other";
  h.read(compute);
  assert.equal(calls, 3);
});

test("DEFAULT, authenticated users and service failure always compute current vocabulary", () => {
  const h = harness();
  let calls = 0;
  const compute = (depend) => {
    calls++;
    return h.compute(depend);
  };
  h.state.workspace = "default";
  h.read(compute);
  h.read(compute);
  h.state.workspace = "live";
  h.state.user = "root";
  h.read(compute);
  h.read(compute);
  assert.equal(h.store.size, 0);
  h.state.user = "guest";
  h.state.fail = true;
  h.read(compute);
  assert.equal(calls, 5);
});

test("an invalidation during vocabulary construction prevents publishing a stale cache value", () => {
  const h = harness();
  h.read((depend) => {
    h.state.epoch++;
    return h.compute(depend);
  });
  assert.equal(h.store.size, 0);
  h.read();
  assert.equal(h.store.size, 1);
});

test("cached vocabulary preserves generated and editorial links in FR/EN, including disabled automatic mode", () => {
  const h = harness();
  const html = ['<p>Intro</p><p><a href="/old-portal#section">Source</a> Portail web.</p>'];
  for (const lang of ["fr", "en"])
    for (const enabled of [true, false]) {
      h.state.lang = lang;
      const expected = linkTermMentions(
        html,
        h.compute(() => {}),
        "current",
        enabled,
      );
      const actual = linkTermMentions(html, h.read(), "current", enabled);
      assert.deepEqual(actual, expected);
      assert.match(actual[0], new RegExp(`href="/${lang}/native#section"`));
    }
});

test("disabled automatic links skip the catalogue only when no authored link needs resolving", () => {
  const h = harness();
  let reads = 0;
  h.context.currentNode = { getParent: () => h.folder, getIdentifier: () => "current" };
  h.context.currentResource.getLocale = () => ({ getLanguage: () => h.state.lang });
  const inline = load("../src/contents/GlossaryEntry/inlineTerms.server.ts", {
    "@jahia/javascript-modules-library": {
      ...h.sdk,
      getChildNodes: () => {
        throw Error("Unexpected glossary traversal");
      },
    },
    "./memo.server.js": {
      glossaryMemo: () => undefined,
      memoTermCatalog: () => {
        reads++;
        return h.compute(() => {});
      },
    },
    "./inlineTerms.js": { linkTermMentions },
  });
  const plain = inline.linkedEditorialContent({
    autoTermLinks: false,
    body: "<p>Intro</p><p>Portail web.</p>",
  });
  assert.equal(reads, 0);
  assert.doesNotMatch(plain.body, /<a/);
  const linked = inline.linkedEditorialContent({
    autoTermLinks: false,
    body: '<p>Intro</p><p><a href="/old-portal">Source</a></p>',
  });
  assert.equal(reads, 1);
  assert.match(linked.body, /href="\/fr\/native"/);
});
