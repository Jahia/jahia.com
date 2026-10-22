import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const root = "/sites/systemsite/categories/technology-partners";
const category = (name, path = `${root}/${name}`) => ({
  getName: () => name,
  getPath: () => path,
  getIdentifier: () => path,
  getDisplayableName: () => `FR ${name}`,
});
const partner = (name, categories, extra = {}) => ({
  getName: () => name,
  getPath: () => `/sites/test/contents/technology-partners/${name}`,
  getIdentifier: () => name,
  hasProperty: (key) =>
    key === "partnerType" || (key === "j:defaultCategory" && categories !== undefined),
  getProperty: (key) => {
    if (key === "partnerType") return { getString: () => "technology" };
    assert.equal(key, "j:defaultCategory");
    return { getValues: () => categories.map((value) => ({ getNode: () => value })) };
  },
  ...extra,
});

function harness() {
  let view;
  const dependencies = [];
  const queried = [];
  const cache = new Map();
  const jsx = (type, props) => ({ type, props });
  const stubs = {
    "@jahia/javascript-modules-library": {
      jahiaComponent: (_, component) => (view = component),
      // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- Match Jahia's server query API.
      useJCRQuery: () => queried,
      buildNodeUrl: (node) => `/${node.getName()}`,
      Island: "Island",
    },
    "../../contents/Partner/default.server.jsx": { PartnerCard: "PartnerCard" },
    "../../contents/Partner/types.js": {
      classificationOf: () => ({ type: "technology", partnership: "integration" }),
      configuredRegions: () => [],
      legacyRegion: () => undefined,
      regionCountries: () => [],
    },
    "./Directory.client.jsx": { default: "Directory" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    });
    runInNewContext(outputText, {
      module,
      exports: module.exports,
      require: (id) => {
        if (stubs[id]) return stubs[id];
        const target = resolve(dirname(file), id.replace(/\.js$/, ".ts"));
        if (id.endsWith(".json")) return JSON.parse(readFileSync(resolve(dirname(file), id)));
        return load(target);
      },
      server: {
        render: { addCacheDependency: (dependency) => dependencies.push(dependency.path) },
      },
    });
    return module.exports;
  }
  const { technologyCategories } = load(resolve("src/contents/Partner/technologyCategories.ts"));
  load(resolve("src/views/PartnerDirectory/list.server.tsx"));
  const render = () =>
    view(
      { directoryMode: "technology" },
      {
        currentNode: partner("directory", undefined, {
          getSession: () => ({ nodeExists: () => false }),
        }),
        currentResource: { getLocale: () => "fr" },
        renderContext: {},
      },
    );
  return { technologyCategories, queried, dependencies, render };
}

test("all eleven technology families come from native Categories, without Tags", () => {
  const { technologyCategories } = harness();
  const families = [
    "ai-genai",
    "crm",
    "marketing-automation",
    "dam-media",
    "pim",
    "translation-localization",
    "analytics-data",
    "seo-content",
    "accessibility-web-quality",
    "support-customer-service",
    "collaboration",
  ];
  const result = technologyCategories(
    partner(
      "test",
      families.map((name) => category(name)),
    ),
  );
  assert.deepEqual(
    Array.from(result, (node) => node.getName()),
    families,
  );
});

test("format, page, unrelated categories and taxonomy root are excluded", () => {
  const { technologyCategories } = harness();
  const result = technologyCategories(
    partner("test", [
      category("integration", "/sites/systemsite/categories/resourcestypes/integration"),
      category("partner_page", "/sites/systemsite/categories/pageTypes/partner_page"),
      category("crm", "/sites/systemsite/categories/topics/crm"),
      category("technology-partners", root),
      null,
      category("crm"),
    ]),
  );
  assert.deepEqual(
    Array.from(result, (node) => node.getName()),
    ["crm"],
  );
  assert.equal(technologyCategories(partner("empty", undefined)).length, 0);
});

test("directory options and card filtering share native families, merge duplicates and track labels", () => {
  const h = harness();
  h.queried.push(
    partner("ChatGPT", [category("ai-genai")]),
    partner("ChatGPT", [category("dam-media"), category("ai-genai")]),
    partner("DeepL", [category("translation-localization")]),
  );
  const tree = h.render();
  const options = tree.props.props.technologies;
  assert.deepEqual(Array.from(options, (option) => option.value).sort(), [
    "ai-genai",
    "dam-media",
    "translation-localization",
  ]);
  assert.ok(options.every((option) => option.label === `FR ${option.value}`));
  assert.ok(options.every((option) => option.partnerships.includes("integration")));
  const cards = tree.props.children;
  assert.equal(cards.length, 2);
  const chatgpt = cards.find((card) => card.props.currentNode.getName() === "ChatGPT");
  assert.deepEqual(
    Array.from(chatgpt.props.technologies, (node) => node.getName()),
    ["ai-genai", "dam-media"],
  );
  assert.ok(h.dependencies.includes(`${root}/ai-genai`));
});
