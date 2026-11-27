import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const AI = "11111111-1111-4111-8111-111111111111",
  CMS = "22222222-2222-4222-8222-222222222222";
const source = fs.readFileSync(new URL("../javascript/authors/editor.js", import.meta.url), "utf8");

test("an author without a directory page uses the site's own blog listing", () => {
  const site = "/sites/demo";
  const path = site + "/home/resources/blog";
  const blog = {
    getPath: () => path,
    getIdentifier: () => "blog",
    isNodeType: (type) => type === "jnt:page",
    hasPermission: () => true,
  };
  const listing = { getParent: () => blog, hasPermission: () => true };
  const session = { nodeExists: (candidate) => candidate === path, getNode: () => blog };
  const author = {
    getPath: () => site + "/contents/Blog/authors/delphine",
    getSession: () => session,
  };
  const { outputText } = ts.transpileModule(
    fs.readFileSync(new URL("../src/views/Authors/blog.server.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const dependencies = {
    "@jahia/javascript-modules-library": { getNodesByJCRQuery: () => [listing] },
    "./folder.server.js": { authorDirectoryPage: () => undefined },
    "./queries.js": { sqlLiteral: (value) => "'" + value + "'" },
  };
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (name) => dependencies[name] });
  const depend = () => {};
  assert.equal(exports.authorBlogPage(author, depend), blog);
  listing.getParent = () => ({ ...blog, getIdentifier: () => "another-page" });
  assert.equal(exports.authorBlogPage(author, depend), undefined);
});

function fixture({ readOnly = false, selected = [] } = {}) {
  const changed = [],
    requests = [];
  const items = [
    { id: AI, label: "IA", count: 7 },
    { id: CMS, label: "CMS", count: 2 },
    { id: "partner", label: "Partenaires", count: 9 },
  ];
  const sandbox = {
    AbortController,
    URL,
    DOMParser: class {
      parseFromString(text) {
        if (text === "blog")
          return {
            querySelectorAll: () => [
              { value: "", textContent: "Tous" },
              { value: AI, textContent: "IA" },
              { value: CMS, textContent: "CMS" },
            ],
          };
        return {
          querySelector: () => ({
            getAttribute: (name) =>
              name === "data-author-blog-url" ? "/blog.html" : JSON.stringify(items),
          }),
        };
      }
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        text: async () => (String(url).includes("/blog.html") ? "blog" : "author"),
      };
    },
    window: {
      location: { origin: "http://localhost:8081", href: "http://localhost:8081/editor" },
      contextJsParameters: { contextPath: "" },
      jahia: { moonstone: { Button: "button", Typography: "p" } },
    },
  };
  vm.runInNewContext(
    source.replace("export function AuthorTopicSuggestions", "function AuthorTopicSuggestions") +
      ";globalThis.Selector=AuthorTopicSuggestions",
    sandbox,
  );
  const component = new sandbox.Selector({
    field: { readOnly },
    value: selected,
    onChange: (value) => changed.push(Array.from(value)),
    editorContext: {
      lang: "fr",
      uilang: "fr",
      mode: "edit",
      nodeData: { uuid: "author", path: "/sites/demo/contents/authors/one" },
    },
  });
  component.updater = {
    enqueueSetState: (_, state) => {
      component.state = { ...component.state, ...state };
    },
  };
  component.active = true;
  return { component, changed, requests };
}
function nodes(tree, type = "button") {
  const out = [];
  function visit(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (n.type === type) out.push(n);
    visit(n.props?.children);
  }
  visit(tree);
  return out;
}
test("loading constrained choices does not edit existing selections", async () => {
  const f = fixture({ selected: [CMS] });
  await f.component.load();
  assert.equal(f.component.state.status, "ready");
  assert.deepEqual(f.changed, []);
  assert.equal(f.requests.length, 2);
  const buttons = nodes(f.component.render()).filter((n) => n.props.label?.startsWith("Ajouter "));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].props.label, "Ajouter IA · 7 articles");
  buttons[0].props.onClick();
  assert.deepEqual(f.changed, [[CMS, AI]]);
});
test("readonly controls cannot write or expose the global category tree", async () => {
  const f = fixture({ readOnly: true });
  await f.component.load();
  const tree = f.component.render();
  assert.equal(nodes(tree, "native-category").length, 0);
  const select = nodes(tree, "select")[0];
  assert.equal(select.props.disabled, true);
  select.props.onChange({ target: { value: AI } });
  for (const button of nodes(tree)) {
    assert.equal(button.props.isDisabled ?? button.props.disabled, true);
    button.props.onClick();
  }
  assert.deepEqual(f.changed, []);
});
test("only blog filter IDs can be added and legacy choices remain removable", async () => {
  const f = fixture({ selected: ["legacy-partner-tag"] });
  await f.component.load();
  assert.deepEqual(f.changed, []);
  const tree = f.component.render();
  assert.ok(JSON.stringify(tree).includes("hors filtres du blog"));
  const select = nodes(tree, "select")[0];
  select.props.onChange({ target: { value: "partner" } });
  assert.deepEqual(f.changed, []);
  select.props.onChange({ target: { value: AI } });
  assert.deepEqual(f.changed, [["legacy-partner-tag", AI]]);
  assert.deepEqual(
    nodes(tree, "option").map((n) => n.props.value),
    ["", CMS, AI],
  );
});
test("new author has no requests and no automatic selections", async () => {
  const f = fixture();
  f.component.props.editorContext.mode = "create";
  await f.component.load();
  assert.equal(f.component.state.status, "new");
  assert.equal(f.requests.length, 0);
  assert.deepEqual(f.changed, []);
});
