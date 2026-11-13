import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { splitDefinition } from "../src/contents/GlossaryEntry/inlineTerms.ts";
import { faqBlocks } from "../src/contents/GlossaryEntry/faqBlocks.ts";
import { sanitizeHtml } from "../src/contents/GlossaryEntry/sanitizeHtml.ts";

const jsx = (type, props) => ({ type, props });
const renderedNodes = (node) => {
  if (node == null || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap(renderedNodes);
  if (typeof node !== "object") return [String(node)];
  if (typeof node.type === "function") return renderedNodes(node.type(node.props));
  return [node, ...renderedNodes(node.props?.children)];
};

const load = (file, imports) => {
  const exports = {};
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(output, {
    exports,
    Intl,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `Unexpected runtime dependency: ${name}`);
      return imports[name];
    },
  });
  return exports;
};

for (const language of ["fr", "en"])
  for (const editMode of [false, true])
    for (const [automatic, manual] of [
      [false, false],
      [true, false],
      [true, true],
    ]) {
      test(`${language}, edit=${editMode}, legacy autoLinks=${automatic}, manual=${manual}: only selected resources render`, () => {
        const resource = {
          id: "selected",
          title: "Selected article",
          url: "/article",
          kind: "blog",
        };
        const reference = { getIdentifier: () => resource.id };
        const FaqCard = load("../src/views/Card/FaqCard.tsx", {
          "react/jsx-runtime": { jsx, jsxs: jsx },
          "../Accordion/cards.module.css": { default: {} },
        }).default;
        const Entry = load("../src/contents/GlossaryEntry/Entry.tsx", {
          "react/jsx-runtime": { jsx, jsxs: jsx },
          "react-i18next": {
            // eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- React i18next API stub.
            useTranslation: () => ({ t: (key) => key }),
          },
          "../../mixins/CTA/index.jsx": {
            CTA: ({ href, children }) => jsx("a", { href, children }),
          },
          "@jahia/javascript-modules-library": {
            Island: ({ props, children }) =>
              props ? jsx("div", { "data-deferred-url": props.endpoint }) : children,
          },
          "../../views/Accordion/Accordion.client.jsx": { default: () => null },
          "../../views/Accordion/cards.module.css": { default: {} },
          "../../views/Card/FaqCard.jsx": { default: FaqCard },
          "../../views/Card/Collapsible.jsx": {
            default: ({ title, children }) => jsx("article", { children: [title, children] }),
          },
          "./faqBlocks.js": { faqBlocks },
          "./ManualResources.jsx": {
            default: ({ resources }) =>
              resources.length
                ? jsx("section", { id: "resources", children: resources[0].title })
                : null,
          },
          "./inlineTerms.js": { splitDefinition },
          "./sanitizeHtml.js": { sanitizeHtml },
          "./component.module.css": { default: {} },
        }).default;
        let render;
        let linkedCalls = 0;
        const dependencies = [];
        load("../src/contents/GlossaryEntry/fullPage.server.tsx", {
          "react/jsx-runtime": { jsx, jsxs: jsx },
          "@jahia/javascript-modules-library": {
            jahiaComponent: (_options, view) => {
              render = view;
            },
            buildNodeUrl: (_node, options) =>
              options?.extension
                ? `/${language}/term${options.extension}`
                : `/${language}/glossary`,
            server: { render: { addCacheDependency: (value) => dependencies.push(value.path) } },
          },
          "./faqItems.server.js": { selectedFaqItems: () => [] },
          "./manualResources.server.js": {
            manualResources: (nodes) => {
              assert.equal(nodes?.[0], manual ? reference : undefined);
              return manual ? [resource] : [];
            },
          },
          "./inlineTerms.server.js": {
            linkedEditorialContent: (props) => {
              linkedCalls++;
              return {
                ...props,
                body: `${props.body}<p><a href="/${language}/linked-term" data-glossary-mention="true">Linked term</a></p>`,
              };
            },
          },
          "./Entry.jsx": { default: Entry },
          "./indexPage.js": {
            resolveGlossaryIndex: (_node, depend) => {
              const index = { getPath: () => "/sites/test/index" };
              depend(index);
              return index;
            },
          },
        });
        const renderEntry = (faqView) =>
          renderedNodes(
            render(
              {
                "jcr:title": "Term",
                "summary": "Existing summary",
                "body": "<p>Existing introduction</p><p>Definition text</p>",
                "comparison": "<table><tbody><tr><td>Comparison</td></tr></tbody></table>",
                "example": "<p>Example</p>",
                "faq": "<h3>Question?</h3><p>Answer</p>",
                "faqView": faqView,
                // Stored options must never move selection back into the initial render.
                "autoLinks": automatic,
                "resources": manual ? [reference] : undefined,
                "resourceDisplayCount": "9",
                "preferEducational": true,
              },
              {
                currentNode: { hasProperty: () => false, getDisplayableName: () => "Term" },
                currentResource: { getLocale: () => ({ getLanguage: () => language }) },
                renderContext: { isEditMode: () => editMode },
              },
            ),
          );
        const nodes = renderEntry();
        const html = nodes
          .map((node) =>
            typeof node === "string"
              ? node
              : (node.props.dangerouslySetInnerHTML?.__html || "") +
                (node.props.href ? `href="${node.props.href}"` : "") +
                (node.props.id ? `id="${node.props.id}"` : ""),
          )
          .join(" ");
        const islands = nodes.filter(
          (node) => typeof node === "object" && node.props?.["data-deferred-url"],
        );
        assert.equal(islands.length, 0);
        assert.equal(linkedCalls, 1);
        assert.deepEqual(dependencies, ["/sites/test/index"]);
        for (const text of [
          "Term",
          "Existing introduction",
          "Definition text",
          "Comparison",
          "Example",
          "Question?",
          "Answer",
        ])
          assert.ok(html.includes(text), text);
        assert.ok(html.includes(`href="/${language}/linked-term"`));
        assert.ok(html.includes('data-glossary-mention="true"'));
        assert.ok(html.includes(`href="/${language}/glossary"`));
        assert.equal(html.includes('id="resources"'), manual);
        assert.equal(html.includes(resource.title), manual);
        assert.doesNotMatch(html, /topic-cta|related-term|\.suggestions\.html/);
        assert.equal(nodes.find((node) => node.type === "details")?.props.open, editMode);
        const classic = renderEntry("classic");
        assert.ok(classic.includes("Question?"));
        assert.ok(
          classic.some((node) => node.props?.dangerouslySetInnerHTML?.__html === "<p>Answer</p>"),
        );
        assert.ok(!classic.some((node) => node.type === "details"));
      });
    }

for (const editMode of [false, true]) {
  test(`site FAQ defaults to chevron cards and keeps an explicit classic view, edit=${editMode}`, () => {
    const views = new Map();
    const lib = {
      jahiaComponent: (options, view) => {
        const name = options.name || "default";
        assert.ok(!views.has(name), `Duplicate FAQ view: ${name}`);
        views.set(name, view);
        return view;
      },
      getChildNodes: () => [
        {
          getName: () => "question",
          getDisplayableName: () => "Existing question",
          getPropertyAsString: (name) =>
            name === "body" ? "<p>Existing answer</p>" : "Existing question",
        },
      ],
      RenderChildren: ({ view }) => jsx("items", { view }),
      Island: ({ children }) => children,
    };
    const imports = {
      "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
      "@jahia/javascript-modules-library": lib,
      "../../contents/GlossaryEntry/faqItems.js": {
        richTextPlainText: (html) => html.replace(/<[^>]*>/g, ""),
      },
      "./cards.module.css": { default: {} },
      "./Accordion.client.jsx": { default: ({ children }) => children },
    };
    const cards = load("../src/views/Accordion/cards.server.tsx", imports);
    load("../src/views/Accordion/default.server.tsx", { ...imports, "./cards.server.jsx": cards });
    load("../src/views/Accordion/classic.server.tsx", imports);
    assert.equal(views.get("default"), views.get("cards"));
    assert.notEqual(views.get("default"), views.get("classic"));
    const context = { currentNode: {}, renderContext: { isEditMode: () => editMode } };
    for (const [view, childView] of [
      ["default", "hidden.faqCard"],
      ["cards", "hidden.faqCard"],
      ["classic", "hidden.collapsible"],
    ]) {
      const nodes = renderedNodes(views.get(view)({}, context));
      assert.equal(nodes.find((n) => n.type === "items")?.props.view, childView);
      const schemas = nodes.filter((n) => n.type === "script");
      assert.equal(schemas.length, editMode ? 0 : 1);
      if (!editMode) {
        const schema = JSON.parse(
          schemas[0].props.dangerouslySetInnerHTML?.__html || schemas[0].props.children,
        );
        assert.equal(schema.mainEntity[0].name, "Existing question");
        assert.equal(schema.mainEntity[0].acceptedAnswer.text, "Existing answer");
      }
    }
  });
}
