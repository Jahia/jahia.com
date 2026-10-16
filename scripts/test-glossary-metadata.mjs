import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Exercise the real server adapter without a Jahia deployment or credentials.
let context;
let queryResults = [];
const dependencies = [];
globalThis.__glossaryMetadataHarness = {
  context: () => context,
  query: () => queryResults,
  depend: (value) => dependencies.push(value.path),
};
const hooks = registerHooks({
  resolve(specifier, ctx, next) {
    if (specifier === "@jahia/javascript-modules-library")
      return { url: "glossary-test:jahia", shortCircuit: true };
    if (specifier.endsWith(".js") && ctx.parentURL?.includes("/src/")) {
      const url = new URL(specifier.replace(/\.js$/, ".ts"), ctx.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, ctx);
    }
    return next(specifier, ctx);
  },
  load(url, ctx, next) {
    if (url === "glossary-test:jahia")
      return {
        format: "module",
        shortCircuit: true,
        source: `const h = globalThis.__glossaryMetadataHarness;
        export const useServerContext = h.context;
        export const useJCRQuery = h.query;
        export const getChildNodes = (node, _limit, _offset, filter = () => true) => node.children.filter(filter);
        export const buildNodeUrl = node => '/native/' + node.getName() + '.html';
        export const server = { render: { addCacheDependency: h.depend } };`,
      };
    return next(url, ctx);
  },
});
const { faqQuestions, entrySchemas, hubSchemas, mergeSchemas, serializeSchema } =
  await import("../src/contents/GlossaryEntry/structuredData.ts");
const { glossaryMetadata } = await import("../src/contents/GlossaryEntry/metadata.server.ts");
const { glossaryEntries } = await import("../src/views/Glossary/entries.server.ts");

test("FAQ reflects sanitized visible text, inline punctuation, entities, lists and edits", () => {
  const html = `<p>Intro ignored</p><h3>Qu’est-ce qu’un <em>CMS</em> ?</h3><p>L’<strong>application</strong> &amp; le site.</p><ul><li>Un</li><li>Deux</li></ul><script>hidden()</script><h3>Empty?</h3><h3>Next?</h3><p>Answer</p>`;
  assert.deepEqual(faqQuestions(html), [
    { name: "Qu’est-ce qu’un CMS ?", answer: "L’application & le site. Un Deux" },
    { name: "Next?", answer: "Answer" },
  ]);
  assert.equal(faqQuestions(html.replace("Answer", "Updated"))[1].answer, "Updated");
  assert.deepEqual(faqQuestions(""), []);
});

test("FR and EN schemas use distinct sets, current dates and one block per schema", () => {
  for (const language of ["fr", "en"]) {
    const url =
      language === "fr"
        ? "https://www.jahia.com/fr/glossaire/portail-web"
        : "https://www.jahia.com/glossary/web-portal";
    const indexUrl = url.slice(0, url.lastIndexOf("/"));
    const blocks = entrySchemas({
      url,
      indexUrl,
      title: "Portal",
      summary: "Definition",
      htmlTitle: "Portal — Jahia",
      language,
      slug: "web-portal",
      aliases: ["Portal website"],
      editorialDate: "2026-10-01T12:00:00Z",
      modified: "2026-10-16T10:00:00Z",
      faq: "<h3>Why?</h3><p>Because.</p>",
      breadcrumbs: [
        { name: "Home", url: "https://www.jahia.com" },
        { name: "Glossary", url: indexUrl },
        { name: "Portal", url },
      ],
    });
    assert.deepEqual(
      blocks.map((block) => block["@type"]),
      ["DefinedTerm", "WebPage", "BreadcrumbList", "FAQPage"],
    );
    assert.equal(blocks[0].inDefinedTermSet["@id"], `${indexUrl}#set`);
    assert.equal(blocks[0].termCode, "web-portal");
    assert.equal(blocks[0].inLanguage, undefined);
    assert.equal(blocks[1].inLanguage, language);
    assert.equal(blocks[1].dateModified, "2026-10-16T10:00:00.000Z");
    assert.equal(blocks[2].itemListElement[2].item, undefined);
    const html = blocks
      .map((block) => `<script type="application/ld+json">${serializeSchema(block)}</script>`)
      .join("");
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 4);
    scripts.forEach(([, raw], index) => assert.deepEqual(JSON.parse(raw), blocks[index]));
  }
});

test("empty optional content creates no invented FAQ, aliases or dates", () => {
  const result = entrySchemas({
    url: "https://example.org/t",
    title: "Term",
    summary: "",
    language: "en",
    slug: "term",
    modified: "invalid",
    breadcrumbs: [],
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].alternateName, undefined);
  assert.equal(result[1].dateModified, undefined);
});

test("manual blocks are deduplicated including @graph, unrelated schemas survive and scripts stay safe", () => {
  const result = mergeSchemas(
    [
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [{ "@type": "FAQPage" }, { "@type": "Organization", "name": "Jahia" }],
      }),
      JSON.stringify([{ "@type": "DefinedTerm" }]),
      "invalid",
    ],
    [{ "@type": "DefinedTerm", "name": '</script><script>alert("x")</script>' }],
  );
  assert.equal(result.length, 2);
  assert.equal(JSON.parse(result[0])["@graph"][0]["@type"], "Organization");
  assert.doesNotMatch(result[1], /</);
  assert.equal(JSON.parse(result[1]).name, '</script><script>alert("x")</script>');
});

function node(name, type, props = {}, parent) {
  const value = {
    name,
    props,
    parent,
    children: [],
    vanity: undefined,
    readable: true,
    translated: true,
    getName: () => name,
    getIdentifier: () => name,
    getPath: () => (parent ? `${parent.getPath()}/${name}` : "/sites/test"),
    getParent: () => parent,
    isNodeType: (check) => check === type,
    getDisplayableName: () => props["jcr:title"] || name,
    hasProperty: (key) => props[key] !== undefined,
    getPropertyAsString: (key) => props[key] ?? null,
    getProperty: (key) => ({
      getNode: () => props[key],
      getValues: () => props[key].map((v) => ({ getString: () => v })),
    }),
    hasNode: (key) => value.children.some((child) => child.name === key),
    getNode: (key) => value.children.find((child) => child.name === key),
    hasPermission: () => value.readable,
    hasI18N: () => value.translated,
  };
  parent?.children.push(value);
  return value;
}

function fixture(language) {
  const site = node("site", "jnt:virtualsite");
  const home = node("home", "jnt:page", {}, site);
  const index = node("glossary", "jnt:page", { "jcr:title": "Glossary" }, home);
  const folder = node("terms", "jnt:contentFolder", { glossaryIndexPage: index }, site);
  const entry = node(
    "web-portal",
    "jahiacom:glossaryEntry",
    { "jcr:title": "Portal", "summary": "Summary", "faq": "<h3>Why?</h3><p>Answer.</p>" },
    folder,
  );
  const translation = node(
    `j:translation_${language}`,
    "jnt:translation",
    { "jcr:lastModified": "2026-10-16T10:00:00Z" },
    entry,
  );
  const component = node("directory", "jahiacom:glossary", { entriesFolder: folder }, index);
  const mappings = node("vanityUrlMapping", "mapping", {}, entry);
  node("default", "mapping", {}, mappings);
  site.getHome = () => home;
  site.getSiteKey = () => "test";
  const prefix = language === "fr" ? "/fr/glossaire" : "/glossary";
  entry.vanity = `${prefix}/${language === "fr" ? "portail-web" : "web-portal"}`;
  index.vanity = prefix;
  home.vanity = language === "fr" ? "/fr" : "/";
  context = {
    mainNode: entry,
    currentResource: {
      getWorkspace: () => "default",
      getLocale: () => ({ getLanguage: () => language, toString: () => language }),
    },
    renderContext: {
      getSite: () => site,
      getURLGenerator: () => ({ getServer: () => "https://www.jahia.com" }),
    },
  };
  queryResults = [component];
  globalThis.Java = {
    type: () => ({
      getBean: () => ({
        getVanityUrlForWorkspaceAndLocale: (node) =>
          node.vanity ? { isActive: () => true, getUrl: () => node.vanity } : null,
      }),
    }),
  };
  return { site, home, index, folder, entry, translation, component };
}

test("server adapter uses native default vanity, translation date and inherited editable image in FR/EN", () => {
  for (const language of ["fr", "en"]) {
    const { entry, index } = fixture(language);
    const image = node("image", "jnt:file");
    index.props.openGraphImage = image;
    const result = glossaryMetadata({ "jcr:title": "Portal", "htmlTitle": "SEO title" }, "Home");
    assert.equal(result.url, `https://www.jahia.com${entry.vanity}`);
    assert.equal(result.type, "article");
    assert.equal(result.locale, language === "fr" ? "fr_FR" : "en_US");
    assert.equal(result.image, image);
    assert.equal(result.jsonLd.length, 4);
    assert.equal(JSON.parse(result.jsonLd[1]).dateModified, "2026-10-16T10:00:00.000Z");
    assert.ok(dependencies.some((path) => path.endsWith("vanityUrlMapping/default")));
    const override = node("override", "jnt:file");
    assert.equal(
      glossaryMetadata({ "jcr:title": "Portal", "openGraphImage": override }, "Home").image,
      override,
    );
  }
});

test("hub lists exactly visible entries and ignores merged, unreadable and unavailable translations", () => {
  const { index, folder, entry } = fixture("fr");
  node("merged", "jahiacom:glossaryEntry", { mergedInto: entry }, folder);
  node("private", "jahiacom:glossaryEntry", {}, folder).readable = false;
  node("untranslated", "jahiacom:glossaryEntry", {}, folder).translated = false;
  node("invalid", "jahiacom:glossaryEntry", { "j:invalidLanguages": ["fr"] }, folder);
  entry.props.indexLabel = "Portail web";
  context.mainNode = index;
  const result = glossaryMetadata({ "jcr:title": "Glossaire" }, "Accueil");
  assert.equal(result.type, "website");
  assert.equal(result.isHub, true);
  assert.equal(result.jsonLd.length, 2);
  assert.deepEqual(
    JSON.parse(result.jsonLd[0]).hasDefinedTerm,
    glossaryEntries(folder).map((node) => ({
      "@type": "DefinedTerm",
      "name": node.props.indexLabel,
      "url": `https://www.jahia.com${node.vanity}`,
    })),
  );
  assert.equal(
    hubSchemas({
      url: result.url,
      title: "Glossaire",
      language: "fr",
      entries: [],
      breadcrumbs: [],
    })[0].hasDefinedTerm.length,
    0,
  );
});

test("ordinary pages and nested child-page directories keep their existing metadata", () => {
  const { home } = fixture("en");
  context.mainNode = home;
  assert.equal(glossaryMetadata({ "jcr:title": "Home" }, "Home"), undefined);
  queryResults = [];
  assert.equal(glossaryMetadata({ "jcr:title": "Home" }, "Home"), undefined);
});

test("missing vanity and optional image references do not break rendering", () => {
  const { entry, index } = fixture("en");
  entry.vanity = undefined;
  index.props.openGraphImage = null;
  let result = glossaryMetadata({ "jcr:title": "Portal" }, "Home");
  assert.equal(result.url, "https://www.jahia.com/native/web-portal.html");
  assert.equal(result.image, undefined);
  const image = node("private-image", "jnt:file");
  image.readable = false;
  index.props.openGraphImage = image;
  result = glossaryMetadata({ "jcr:title": "Portal" }, "Home");
  assert.equal(result.image, undefined);
  index.getProperty = () => {
    throw new Error("Unresolved weak reference");
  };
  assert.equal(glossaryMetadata({ "jcr:title": "Portal" }, "Home").image, undefined);
});

test.after(() => {
  hooks.deregister();
  delete globalThis.__glossaryMetadataHarness;
  delete globalThis.Java;
});
