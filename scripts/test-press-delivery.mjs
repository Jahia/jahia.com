import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const jsx = (type, props) => ({ type, props: props || {} });
function load(relative, overrides = {}) {
  const module = { exports: {} };
  const library = {
    jahiaComponent: (_definition, view) => {
      module.exports.view = view;
      return view;
    },
    getChildNodes: () => [],
    Island: "Island",
    Render: "Render",
    RenderChildren: "RenderChildren",
  };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(relative, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => {
        if (name === "@jahia/javascript-modules-library") return { ...library, ...overrides[name] };
        if (name in overrides) return overrides[name];
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- Mock the React hook API.
        if (name === "react") return { useRef: () => ({ current: null }), useEffect() {} };
        // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- Mock the translation hook API.
        if (name === "react-i18next") return { useTranslation: () => ({ t: (key) => key }) };
        if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_v, key) => key }) };
        return { default: name, MixinCTA: "MixinCTA" };
      },
    },
  );
  return module.exports;
}
const find = (tree, predicate) => {
  if (Array.isArray(tree)) return tree.flatMap((node) => find(node, predicate));
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...find(tree.props?.children, predicate)];
};

const Filters = load("../src/views/PressNews/Filters.client.tsx").default;
test("hiding every press filter removes the whole form, including its frame", () => {
  const tree = Filters({
    id: "news",
    hiddenFilters: ["type", "query", "theme", "year", "sort"],
  });
  assert.equal(find(tree, (node) => node.type === "form").length, 0);
});

test("a hidden search cannot continue filtering through a disabled control", () => {
  const tree = Filters({ id: "news", hiddenFilters: ["query"] });
  const search = find(tree, (node) => node.type === "input" && node.props.name === "query");
  assert.equal(search.length, 1);
  assert.equal(search[0].props.disabled, true);
  assert.equal(find(tree, (node) => node.type === "form").length, 1);
});

test("press type options follow the configured list, without adding other types", () => {
  const tree = Filters({ id: "news", filterTypes: ["presse", "evenement"] });
  assert.deepEqual(
    find(tree, (node) => node.props["data-press-tab"] !== undefined).map(
      (node) => node.props["data-press-tab"],
    ),
    ["", "presse", "evenement"],
  );
});

test("coverage and edit modes do not render an interactive filter form", () => {
  for (const props of [{ layout: "coverage" }, { isEditMode: true }])
    assert.equal(find(Filters({ id: "news", ...props }), (node) => node.type === "form").length, 0);
});

const node = { getIdentifier: () => "experts", getName: () => "experts" };
test("the experts carousel retains 8-card layout and personalized controls", () => {
  const { view } = load("../src/views/CardCarousel/default.server.tsx", {
    "@jahia/javascript-modules-library": {
      getChildNodes: () => [{ getIdentifier: () => "expert" }],
    },
  });
  const tree = view(
    { desktopCards: "8", tabletCards: "2", cardSpacing: "large", showArrows: false },
    { currentNode: node, renderContext: { isEditMode: () => false } },
  );
  const island = find(tree, (item) => item.type === "Island")[0];
  assert.equal(island.props.props.layout.desktop, 8);
  assert.equal(island.props.props.layout.tablet, 2);
  assert.equal(island.props.props.layout.gap, "2rem");
  assert.equal(island.props.props.showArrows, false);
  assert.equal(island.props.props.showPagination, true);
});
