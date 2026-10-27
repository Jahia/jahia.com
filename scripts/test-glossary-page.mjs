import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { splitDefinition } from "../src/contents/GlossaryEntry/inlineTerms.ts";
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
    for (const automatic of [false, true]) {
      test(`${language}, edit=${editMode}, automatic=${automatic}: initial render keeps editorial links without selecting suggestions`, () => {
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
            Island: ({ props }) => jsx("div", { "data-deferred-url": props.endpoint }),
          },
          "./DeferredSuggestions.client.jsx": { default: () => null },
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
        const nodes = renderedNodes(
          render(
            {
              "jcr:title": "Term",
              "summary": "Existing summary",
              "body": "<p>Existing introduction</p><p>Definition text</p>",
              "comparison": "<table><tbody><tr><td>Comparison</td></tr></tbody></table>",
              "example": "<p>Example</p>",
              "faq": "<h3>Question?</h3><p>Answer</p>",
              // Stored options must never move selection back into the initial render.
              "autoLinks": automatic,
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
        assert.equal(islands.length, !editMode && automatic ? 1 : 0);
        if (islands.length)
          assert.equal(islands[0].props["data-deferred-url"], `/${language}/term.suggestions.html`);
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
        assert.doesNotMatch(
          html,
          /topic-cta|resource-detail|related-term|data-carousel-item|id="resources"/,
        );
      });
    }
