import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { parseSuggestionsPayload } from "../src/contents/GlossaryEntry/deferredSuggestions.ts";

const origin = "http://localhost:8081";
const resource = {
  id: "resource",
  title: "Existing article",
  kind: "article",
  url: "/fr/blog/article",
};
const term = { id: "term", title: "Existing term", url: "/fr/glossaire/terme" };
const payload = { resources: [resource], terms: [term] };
const jsx = (type, props) => ({ type, props });
const payloadFrom = (tree) =>
  JSON.parse(tree.props.children[1].props.children.props["data-glossary-resources"]);

const load = (file, imports, globals = {}) => {
  const exports = {};
  const output = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(output, {
    exports,
    ...globals,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected runtime dependency: ${name}`);
      return imports[name];
    },
  });
  return exports;
};

test("shared payload preserves localized links, editorial text and selection order", () => {
  const value = {
    resources: [
      resource,
      {
        ...resource,
        id: "two",
        title: "<script>literal text</script>",
        url: `${origin}/en/article`,
      },
    ],
    terms: [term],
  };
  assert.deepEqual(parseSuggestionsPayload(JSON.stringify(value), origin), value);
  assert.deepEqual(parseSuggestionsPayload('{"resources":[],"terms":[]}', origin), {
    resources: [],
    terms: [],
  });
});

test("malformed, excessive and unsafe suggestion payloads are rejected", () => {
  for (const value of ["bad", "null", "[]", "{}", '{"resources":[],"terms":[null]}'])
    assert.throws(() => parseSuggestionsPayload(value, origin));
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//example.org/x",
    "/\\example.org/x",
    "https://example.org/x",
    "http://user@localhost:8081/x",
    "",
  ])
    for (const field of ["resources", "terms"])
      assert.throws(() =>
        parseSuggestionsPayload(
          JSON.stringify({
            ...payload,
            [field]: [{ ...(field === "resources" ? resource : term), url }],
          }),
          origin,
        ),
      );
  assert.throws(() =>
    parseSuggestionsPayload(
      JSON.stringify({ ...payload, resources: Array(10).fill(resource) }),
      origin,
    ),
  );
  assert.throws(() =>
    parseSuggestionsPayload(JSON.stringify({ ...payload, terms: Array(7).fill(term) }), origin),
  );
});

test("the legacy suggestions URL returns no results even with automatic settings enabled", () => {
  let view;
  const headers = [];
  load("../src/contents/GlossaryEntry/suggestions.server.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@jahia/javascript-modules-library": {
      jahiaComponent: (_configuration, component) => {
        view = component;
      },
    },
  });
  const context = {
    renderContext: {
      getResponse: () => ({ setHeader: (...args) => headers.push(args) }),
    },
  };
  const rendered = view({ autoLinks: true, resourceDisplayCount: "9" }, context);
  assert.equal(rendered.props.children[0].props.children.props.content, "noindex");
  assert.deepEqual(payloadFrom(rendered), { resources: [], terms: [] });
  assert.deepEqual(headers[0], ["X-Robots-Tag", "noindex"]);
});

test("suggestion requests never forward credentials across origins or follow redirects", async () => {
  const requests = [];
  const { loadSuggestions } = load(
    "../src/contents/GlossaryEntry/deferredSuggestions.ts",
    {},
    {
      URL,
      location: { origin },
      fetch: async (url, options) => {
        requests.push({ url: String(url), ...options });
        return { ok: false };
      },
    },
  );
  const signal = new AbortController().signal;
  await assert.rejects(loadSuggestions("https://example.org/suggestions", signal));
  await assert.rejects(loadSuggestions("http://user@localhost:8081/suggestions", signal));
  assert.equal(requests.length, 0);
  await assert.rejects(loadSuggestions("/fr/term.suggestions.html", signal));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].credentials, "same-origin");
  assert.equal(requests[0].redirect, "error");
  assert.equal(requests[0].signal, signal);
});

test("an HTML response without the expected payload fails instead of remaining in loading state", async () => {
  const { loadSuggestions } = load(
    "../src/contents/GlossaryEntry/deferredSuggestions.ts",
    {},
    {
      URL,
      location: { origin },
      fetch: async () => ({ ok: true, text: async () => "Login or error document" }),
      DOMParser: class {
        parseFromString() {
          return { querySelector: () => null };
        }
      },
    },
  );
  await assert.rejects(
    loadSuggestions("/fr/term.suggestions.html", new AbortController().signal),
    /Missing glossary suggestions/,
  );
});

test("duplicate intersections share one request and fill both blocks; unmount cancels it", async () => {
  let intersection,
    calls = 0,
    signal;
  const effects = [],
    updates = [];
  const initial = [0, "waiting", [], []];
  let state = 0;
  const component = load(
    "../src/contents/GlossaryEntry/DeferredSuggestions.client.tsx",
    {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "react": {
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- React API stubs.
        useEffect: (effect) => effects.push(effect),
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- React API stubs.
        useRef: () => ({ current: {} }),
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- React API stubs.
        useState: () => [initial[state++], (value) => updates.push(value)],
      },
      "react-i18next": {
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- React API stub.
        useTranslation: () => ({ t: (key) => key }),
      },
      "./deferredSuggestions.js": {
        loadSuggestions: async (_url, value) => {
          calls++;
          signal = value;
          return payload;
        },
      },
      "../../views/ResourceCarousel/Carousel.client.jsx": { default: () => null },
      "../../mixins/CTA/index.jsx": { CTA: () => null },
      "../../mixins/CTA/component.module.css": { default: {} },
      "./component.module.css": { default: {} },
    },
    {
      AbortController,
      setTimeout,
      clearTimeout,
      IntersectionObserver: class {
        constructor(callback) {
          intersection = callback;
        }
        observe() {}
        disconnect() {}
      },
    },
  ).default;
  component({ endpoint: "/fr/term.suggestions.html" });
  const cleanup = effects[0]();
  assert.equal(calls, 0);
  intersection([{ isIntersecting: true }]);
  intersection([{ isIntersecting: true }]);
  await new Promise(setImmediate);
  assert.equal(calls, 1);
  assert.ok(updates.includes(payload.resources));
  assert.ok(updates.includes(payload.terms));
  assert.ok(updates.includes("done"));
  cleanup();
  assert.equal(signal.aborted, true);
});
