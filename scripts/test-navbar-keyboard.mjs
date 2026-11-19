/* eslint-disable @eslint-react/no-unnecessary-use-prefix -- React hook doubles retain their native names. */
import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const compiled = ts.transpileModule(
  readFileSync(new URL("../src/templates/NavBar.client.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
function fixture() {
  let cursor = 0,
    focused = null;
  const hooks = [],
    effects = [],
    listeners = new Map();
  const element = (type, props, key) => ({ type, props: props || {}, key });
  const state = (value) => {
    const index = cursor++;
    hooks[index] ??= { value };
    return [
      hooks[index].value,
      (next) => {
        hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next;
      },
    ];
  };
  const react = {
    useState: state,
    useRef: (value) => {
      const index = cursor++;
      return (hooks[index] ??= { current: value });
    },
    useId: () => {
      cursor++;
      return "nav-test";
    },
    useMemo: (fn) => {
      cursor++;
      return fn();
    },
    useCallback: (fn) => {
      cursor++;
      return fn;
    },
    useEffect: (fn) => {
      const index = cursor++;
      effects.push(() => {
        hooks[index]?.cleanup?.();
        hooks[index] = { cleanup: fn() };
      });
    },
    useSyncExternalStore: () => {
      cursor++;
      return false;
    },
    Fragment: "Fragment",
  };
  const firstLink = {
    focus: () => {
      focused = "first-link";
    },
  };
  const document = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      if (listeners.get(name) === fn) listeners.delete(name);
    },
    getElementById: (id) =>
      id === "nav-test-desktop-0" ? { querySelector: () => firstLink } : null,
    activeElement: null,
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    URL,
    location: { href: "http://localhost/" },
    document,
    requestAnimationFrame: (fn) => fn(),
    window: {},
    HTMLElement: class {},
    Node: class {},
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element };
      if (name.endsWith(".module.css")) return { default: new Proxy({}, { get: (_, key) => key }) };
      if (name.endsWith("hoverIntent.js"))
        return { createHoverIntent: () => ({ cancel() {}, schedule() {} }) };
      if (name.endsWith("automaticNavigationColumns.js"))
        return { automaticNavigationColumns: () => [] };
      if (name.endsWith("/CTA/index.jsx")) return { CTA: "CTA" };
      if (name.endsWith("Search.client.jsx")) return { default: "SearchDialog" };
      throw Error("Unexpected import " + name);
    },
  });
  const props = {
    automatic: true,
    entries: [
      {
        id: "product",
        title: "Produit",
        children: [{ title: "Jahia CMS", href: "/cms", current: false }],
        panel: { automatic: true },
      },
    ],
    logo: { href: "/", src: "/logo.svg", current: true },
    controls: {
      searchVisible: false,
      searchLabel: "Rechercher",
      languagesVisible: false,
      languagesLabel: "Langues",
    },
    langs: [],
    language: "fr",
    search: { requested: false },
  };
  const flatten = (node) => {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  };
  const render = () => {
    cursor = 0;
    const tree = exports.default(props);
    const nodes = flatten(tree);
    for (const node of nodes)
      if (node.type === "button" && node.props.ref)
        node.props.ref.current = {
          focus: () => {
            focused = node.props["aria-controls"];
          },
        };
    effects.splice(0).forEach((fn) => fn());
    return nodes;
  };
  const escape = () => {
    let prevented = false;
    listeners.get("keydown")({
      key: "Escape",
      preventDefault() {
        prevented = true;
      },
    });
    return prevented;
  };
  return { render, escape, focus: () => focused, firstLink };
}
test("Escape from a mobile subcategory closes the menu and returns focus to its visible opener", () => {
  const f = fixture();
  let nodes = f.render();
  const menu = nodes.find(
    (n) => n.type === "button" && n.props["aria-controls"] === "nav-test-mobile",
  );
  menu.props.onClick({ currentTarget: menu.props.ref.current });
  nodes = f.render();
  const branch = nodes.find(
    (n) => n.type === "button" && n.props["aria-controls"] === "nav-test-mobile-0",
  );
  branch.props.onClick({
    currentTarget: {
      focus() {
        throw Error("Hidden submenu trigger must not regain focus");
      },
    },
  });
  f.render();
  assert.equal(f.escape(), true);
  nodes = f.render();
  assert.equal(nodes.find((n) => n.props.id === "nav-test-mobile").props.hidden, true);
  assert.equal(f.focus(), "nav-test-mobile");
});
test("ArrowDown opens the automatic desktop panel, focuses its first link, and Escape returns to the category", () => {
  const f = fixture();
  let nodes = f.render();
  const category = nodes.find(
    (n) => n.type === "button" && n.props["aria-controls"] === "nav-test-desktop-0",
  );
  let returned = false,
    prevented = false;
  category.props.onKeyDown({
    key: "ArrowDown",
    preventDefault() {
      prevented = true;
    },
    currentTarget: {
      parentElement: { querySelector: () => ({ hidden: true, querySelector: () => f.firstLink }) },
      focus() {
        returned = true;
      },
    },
  });
  nodes = f.render();
  assert.equal(prevented, true);
  assert.equal(nodes.find((n) => n.props.id === "nav-test-desktop-0").props.hidden, false);
  assert.equal(f.focus(), "first-link");
  assert.equal(f.escape(), true);
  nodes = f.render();
  assert.equal(returned, true);
  assert.equal(nodes.find((n) => n.props.id === "nav-test-desktop-0").props.hidden, true);
});
