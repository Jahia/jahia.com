import { projectUpperBar, upperBarUrl } from "../javascript/navigation/upperBar.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { automaticNavigation } from "../src/templates/automaticNavigation.ts";
import { automaticNavigationColumns } from "../src/templates/automaticNavigationColumns.ts";
import { emptySection, validateSettings } from "../javascript/navigation/model.js";

const compiled = ts.transpileModule(
  readFileSync(new URL("../src/templates/navigationEditorPreview.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext } },
).outputText;
const exports = {};
runInNewContext(compiled, {
  exports,
  require: (name) => {
    if (name.endsWith("upperBar.js")) return { projectUpperBar, upperBarUrl };
    if (name.endsWith("model.js")) return { validateSettings };
    if (name.endsWith("automaticNavigation.js")) return { automaticNavigation };
    throw Error(`Unexpected import: ${name}`);
  },
});
const { navigationEditorPreview } = exports;

const node = (id, children = [], kind = "jnt:page", native = {}) => ({
  id,
  children,
  kind,
  native,
  name: id,
  path: `/sites/test/home/${id}`,
  fr: { "jcr:title": id },
  en: { "jcr:title": `en-${id}` },
});

test("unsaved preview uses real selection, labels, weights, column and sibling ordering without mutating input", () => {
  const tree = [
    node(
      "product",
      [node("platform", [node("cms"), node("dxp")], "jnt:navMenuText"), node("cloud")],
      "jnt:navMenuText",
    ),
  ];
  const settings = {
    version: 1,
    mode: "automatic",
    sections: {
      product: {
        ...emptySection(),
        labels: { cms: { fr: "Mon CMS", en: "My CMS" } },
        weights: { cms: "bold", dxp: "normal" },
        columns: { platform: 2, cloud: 1 },
        childOrder: { platform: ["dxp", "cms"] },
      },
    },
  };
  const original = structuredClone({ tree, settings });
  for (const language of ["fr", "en"]) {
    const [root] = navigationEditorPreview(tree, settings, "test", language);
    const columns = automaticNavigationColumns(
      root.children,
      root.panel.branchColumns,
      root.panel.treeColumns,
      root.panel.branchOrder,
      root.panel.childOrder,
    );
    assert.deepEqual(
      columns.map((column) => column.map((item) => item.id)),
      [["cloud"], ["dxp", "cms"]],
    );
    assert.equal(columns[1][1].title, language === "fr" ? "Mon CMS" : "My CMS");
    assert.equal(columns[1][1].weight, "bold");
    assert.equal(columns[1][0].weight, "normal");
  }
  settings.sections.product.excluded = ["cms"];
  assert.equal(
    navigationEditorPreview(tree, settings, "test", "fr")[0].children[0].children.length,
    1,
  );
  settings.sections.product.excluded = [];
  assert.deepEqual(
    { tree, settings },
    {
      ...original,
      settings: {
        ...original.settings,
        sections: { product: { ...original.settings.sections.product, excluded: [] } },
      },
    },
  );
});

test("preview preserves direct/hidden modes, prevents foreign and unsafe links and breaks reference cycles", () => {
  const external = node("external", [], "jnt:externalLink", { "j:url": "javascript:alert(1)" });
  const foreign = node("foreign");
  foreign.path = "/sites/other/home/page";
  const loop = node("loop", [], "jnt:nodeLink", { "j:node": "loop" });
  const settings = { version: 1, mode: "automatic", sections: { root: { ...emptySection() } } };
  const tree = [node("root", [external, foreign, loop, node("good")])];
  assert.deepEqual(
    navigationEditorPreview(tree, settings, "test", "fr")[0].children.map((item) => item.id),
    ["good"],
  );
  settings.sections.root.mode = "link";
  assert.equal(
    navigationEditorPreview(tree, settings, "test", "fr")[0].href,
    "/cms/render/default/fr/sites/test/home/root.html",
  );
  settings.sections.root.mode = "hidden";
  assert.deepEqual(navigationEditorPreview(tree, settings, "test", "fr"), []);
  assert.throws(() => navigationEditorPreview(tree, settings, "../test", "fr"));
  assert.throws(() => navigationEditorPreview(tree, settings, "test", "de"));
});

test("preview resolves editorial cards and discover destinations outside the displayed tree without foreign-site access", () => {
  const target = node("resource");
  target.path = "/sites/test/contents/resource";
  const section = {
    ...emptySection(),
    discover: { visible: true, labels: { fr: "Découvrir" }, target: "resource" },
    feature: {
      visible: true,
      target: "resource",
      eyebrow: { fr: "Nouveau" },
      heading: { fr: "Ma ressource" },
      text: { fr: "Description" },
      label: { fr: "Lire" },
    },
  };
  const settings = { version: 1, mode: "automatic", sections: { root: section } };
  const tree = [node("root", [node("child")])];
  const [root] = navigationEditorPreview(tree, settings, "test", "fr", "", {}, [target]);
  assert.equal(root.panel.feature.heading, "Ma ressource");
  assert.equal(root.panel.feature.link.title, "Lire");
  assert.equal(root.panel.landing.title, "Découvrir");
  assert.match(root.panel.feature.link.href, /\/contents\/resource.html$/);
  target.path = "/sites/other/contents/resource";
  assert.equal(
    navigationEditorPreview(tree, settings, "test", "fr", "", {}, [target])[0].panel.feature,
    undefined,
  );
});

test("upper preview resolves language-specific destinations and rejects foreign or untranslated pages", () => {
  const item = node("support");
  const enOnly = { ...node("demo-en"), fr: {} };
  const foreign = { ...node("foreign"), path: "/sites/another/home/private" };
  const config = {
    version: 1,
    mode: "automatic",
    sections: {},
    upperBar: {
      items: [
        {
          key: "support",
          kind: "internal",
          id: "support",
          visible: true,
          labels: { fr: "Assistance" },
        },
        { key: "foreign", kind: "internal", id: "foreign", visible: true, labels: {} },
      ],
      buttons: [
        {
          key: "demo",
          visible: true,
          targets: { fr: "demo-en", en: "demo-en" },
          labels: {},
          style: "primary",
          placement: "upper",
        },
      ],
      rss: { url: "", labels: {} },
    },
  };
  const before = structuredClone(config);
  const fr = exports.upperBarEditorPreview([], config, "test", "fr", "", {}, [
    item,
    enOnly,
    foreign,
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(fr.utilityEntries)), [
    {
      title: "Assistance",
      href: "/cms/render/default/fr/sites/test/home/support.html",
      current: false,
    },
  ]);
  assert.equal(fr.buttons.length, 0);
  const en = exports.upperBarEditorPreview([], config, "test", "en", "", {}, [
    item,
    enOnly,
    foreign,
  ]);
  assert.equal(en.buttons[0].href, "/cms/render/default/en/sites/test/home/demo-en.html");
  assert.deepEqual(config, before);
});
