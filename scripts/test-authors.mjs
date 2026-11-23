import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (
      specifier === "./socialLinks.js" &&
      context.parentURL?.endsWith("/Authors/structuredData.ts")
    )
      return next(new URL("./socialLinks.ts", context.parentURL).href, context);
    return next(specifier, context);
  },
});
import { socialUrl } from "../src/views/Authors/socialLinks.ts";
import { readBiography } from "../src/views/Authors/biography.ts";
import { findAuthorFolder, isAuthorSourceFolder } from "../src/views/Authors/folder.server.ts";

test("directory and counters accept a regular content folder from the current site", () => {
  const site = "/sites/demo";
  const folder = {
    getPath: () => site + "/contents/blog/authors",
    isNodeType: (type) => type === "jnt:contentFolder",
    hasPermission: (permission) => permission === "jcr:read",
  };
  assert.equal(isAuthorSourceFolder(folder, site), true);
  assert.equal(isAuthorSourceFolder(folder, "/sites/other"), false);
  assert.equal(
    isAuthorSourceFolder({ ...folder, getPath: () => site + "/home/authors" }, site),
    false,
  );
  assert.equal(isAuthorSourceFolder({ ...folder, hasPermission: () => false }, site), false);
  assert.equal(isAuthorSourceFolder({ ...folder, isNodeType: () => false }, site), false);
});

test("author profiles work under the unmarked Authors folder, including in a subfolder", () => {
  const site = "/sites/demo";
  const siteNode = { getPath: () => site };
  const folder = (path, parent, readable = true, marked = false) => ({
    getPath: () => path,
    getName: () => path.split("/").at(-1),
    getParent: () => parent,
    isNodeType: (type) =>
      type === "jnt:contentFolder" || (marked && type === "jahiacommix:authorFolder"),
    hasPermission: () => readable,
  });
  const find = (parent) =>
    findAuthorFolder(
      { getPath: () => parent.getPath() + "/delphine", getParent: () => parent },
      () => {},
    );
  const authorsPath = site + "/contents/Blog/Authors";
  const authors = folder(authorsPath, siteNode);
  assert.equal(find(folder(authorsPath + "/team", authors)), authors);
  assert.equal(find(folder(authorsPath, siteNode, false)), undefined);
  assert.equal(find(folder(site + "/home/authors", siteNode)), undefined);
  assert.equal(find(folder(site + "/contents/Blog/Entries", siteNode)), undefined);
  const marked = folder(site + "/contents/contributors", siteNode, true, true);
  assert.equal(find(marked), marked);
});

test("biography excerpts decode entities and keep existing social links separate", () => {
  const html =
    '<p>Ben A&iuml;m &amp; l&rsquo;accessibilit&eacute;.</p><p>Second paragraph.</p><p><a href="https://www.linkedin.com/in/example">https://www.linkedin.com/in/example</a></p>';
  assert.deepEqual(readBiography(html), {
    excerpt: "Ben Aïm & l’accessibilité.",
    links: ["https://www.linkedin.com/in/example"],
  });
  assert.deepEqual(readBiography(""), { excerpt: "", links: [] });
});

test("missing social information stays empty", () => {
  assert.equal(socialUrl("", "linkedin"), "");
  assert.equal(socialUrl("   ", "reddit"), "");
});

test("existing HTTPS professional profile links are preserved", () => {
  const linkedin = "https://www.linkedin.com/in/romain-pm";
  assert.equal(socialUrl(linkedin, "linkedin"), linkedin);
  assert.equal(
    socialUrl("https://reddit.com/user/example", "reddit"),
    "https://reddit.com/user/example",
  );
});

test("active schemes, misleading hosts and credential URLs are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://linkedin.com/in/test",
    "//linkedin.com/in/test",
    "https://linkedin.com.evil.test/in/test",
    "https://linkedin.com@evil.test/in/test",
    "https://evil.test@linkedin.com/in/test",
    "https://linkedin.com\\@evil.test",
    "https://linkedin.com/\nprofile",
    "https://reddit.com/user/example",
  ])
    assert.equal(socialUrl(url, "linkedin"), "", url);
});

test("profile biography retains editorial links and removes only duplicated social paragraphs", async () => {
  const { profileBiography } = await import("../src/views/Authors/biography.ts");
  const body =
    '<p>Une <a href="https://example.com/source">source</a> vérifiée.</p><p><a href="https://www.linkedin.com/in/example">LinkedIn</a></p>';
  assert.equal(
    profileBiography(body, ["https://www.linkedin.com/in/example"]),
    '<p>Une <a href="https://example.com/source">source</a> vérifiée.</p>',
  );
});

test("directory and publications queries stay scoped and escape editorial paths", async () => {
  const { directoryQuery, publicationQuery, directoryPageNumber } =
    await import("../src/views/Authors/queries.ts");
  assert.match(directoryQuery("/sites/demo/contents/O'Brien"), /O''Brien/);
  assert.match(directoryQuery("/sites/demo/contents/authors"), /showInDirectory/);
  assert.ok(publicationQuery("/sites/demo", "author-id").includes("n.[author] = 'author-id'"));
  assert.match(
    publicationQuery("/sites/demo", ["author-one", "O'Brien"]),
    /AND \(n\.\[author\] = 'author-one' OR n\.\[author\] = 'O''Brien'\)/,
  );
  for (const value of ["-1", "1.5", "99999", "abc"]) assert.equal(directoryPageNumber(value), 0);
  assert.equal(directoryPageNumber("2"), 2);
});

test("directory introductions are short, word bounded and have no generated ellipsis", async () => {
  const { cardIntroduction } = await import("../src/views/Authors/biography.ts");
  assert.equal(cardIntroduction("Une présentation courte."), "Une présentation courte.");
  const sentence = "Une première phrase complète qui présente le parcours.";
  assert.equal(cardIntroduction(sentence + " " + "Suite ".repeat(50)), sentence);
  const clipped = cardIntroduction("Compétences et expériences ".repeat(20));
  assert.ok(clipped.length <= 160);
  assert.ok(!clipped.includes("…") && !clipped.includes("..."));
  assert.match(clipped, /[a-zé]\.$/);
  assert.equal(cardIntroduction(""), "");
});

test("topic counts deduplicate article tags and suggestions keep specific themes", async () => {
  const { countAuthorTopics, suggestedTopics } = await import("../src/views/Authors/topics.ts");
  const cms = { id: "cms", label: "CMS", path: "/topics/cms" };
  const ai = { id: "ai", label: "IA", path: "/topics/cms/ai" };
  const security = { id: "security", label: "Sécurité", path: "/topics/security" };
  const counts = countAuthorTopics([
    { topics: [cms, ai, cms] },
    { topics: [cms, ai] },
    { topics: [security] },
  ]);
  assert.equal(counts.find((topic) => topic.id === "cms").count, 2);
  assert.equal(counts.find((topic) => topic.id === "ai").count, 2);
  assert.deepEqual(
    suggestedTopics(counts).map((topic) => topic.id),
    ["ai", "security"],
  );
  assert.deepEqual(countAuthorTopics([]), []);
});

test("directory statistics count unique authors, publications and editorial topics", async () => {
  const { summarizeAuthorStatistics } = await import("../src/views/Authors/statistics.ts");
  assert.deepEqual(
    summarizeAuthorStatistics(
      ["a", "a", "b"],
      [
        { id: "one", author: "a", topics: ["cms", "cms", "ai"] },
        { id: "one", author: "a", topics: ["cms", "ai"] },
        { id: "two", author: "b", topics: ["cms"] },
        { id: "hidden", author: "excluded", topics: ["security"] },
      ],
    ),
    { authors: 2, articles: 2, topics: 2 },
  );
  assert.deepEqual(summarizeAuthorStatistics([], []), { authors: 0, articles: 0, topics: 0 });
});

test("profile structured data omits missing fields and uses only supported social identities", async () => {
  const { authorProfileSchema, authorSchemaJson } =
    await import("../src/views/Authors/structuredData.ts");
  const input = {
    url: "https://example.test/auteur.html",
    name: "Nom </script> test",
    language: "fr",
  };
  const schema = authorProfileSchema(input);
  assert.equal(schema["@type"], "ProfilePage");
  assert.equal(schema.mainEntity["@type"], "Person");
  for (const field of ["jobTitle", "description", "sameAs", "image"])
    assert.equal(field in schema.mainEntity, false);
  assert.equal("dateModified" in schema, false);
  assert(!authorSchemaJson(schema).includes("</script>"));
  assert.equal(JSON.parse(authorSchemaJson(schema)).mainEntity.name, input.name);
  const full = authorProfileSchema({
    ...input,
    jobTitle: " Responsable ",
    description: " Présentation ",
    linkedin: "https://www.linkedin.com/in/example",
    reddit: "https://evil.test",
    updated: "2026-11-20",
  });
  assert.equal(full.mainEntity.jobTitle, "Responsable");
  assert.deepEqual(full.mainEntity.sameAs, ["https://www.linkedin.com/in/example"]);
  assert.equal(full.dateModified, "2026-11-20T00:00:00.000Z");
});

test("author structured data URLs reject invalid origins and unsafe schemes", async () => {
  const { authorAbsoluteUrl, authorProfileSchema } =
    await import("../src/views/Authors/structuredData.ts");
  assert.equal(
    authorAbsoluteUrl("/profil.html", "http://localhost:8081/sites/mySite"),
    "http://localhost:8081/profil.html",
  );
  assert.equal(authorAbsoluteUrl("/profil.html", "http://null"), "");
  assert.equal(authorAbsoluteUrl("/profil.html", "http://localhost:8081:8081"), "");
  assert.equal(authorAbsoluteUrl("//evil.test", "https://example.test"), "");
  assert.equal(authorAbsoluteUrl("javascript:alert(1)", "https://example.test"), "");
  assert.equal(
    authorProfileSchema({ url: "http://null/profile", name: "Nom", language: "fr" }),
    undefined,
  );
});

test("GitHub identities accept only HTTPS on the expected host", () => {
  assert.equal(socialUrl("https://github.com/jahia", "github"), "https://github.com/jahia");
  for (const value of [
    "https://github.com.evil.test/jahia",
    "https://github.com@evil.test",
    "javascript:alert(1)",
    "http://github.com/jahia",
  ])
    assert.equal(socialUrl(value, "github"), "");
});

test("work email links cannot add recipients or mail headers", async () => {
  const { professionalEmailLink } = await import("../src/views/Authors/socialLinks.ts");
  assert.equal(
    professionalEmailLink(" auteur+contact@example.com "),
    "mailto:auteur+contact@example.com",
  );
  for (const value of [
    "",
    "mailto:auteur@example.com",
    "auteur@example.com?bcc=other@example.com",
    "auteur@example.com;other@example.com",
    "auteur@example.com\r\nBcc: other@example.com",
    ".auteur@example.com",
    "au..teur@example.com",
  ])
    assert.equal(professionalEmailLink(value), "");
});

test("GitHub enriches the identity graph without publishing contact data in JSON-LD", async () => {
  const { authorProfileSchema } = await import("../src/views/Authors/structuredData.ts");
  const schema = authorProfileSchema({
    url: "https://example.test/auteur",
    name: "Auteur",
    language: "fr",
    github: "https://github.com/jahia",
  });
  assert.deepEqual(schema.mainEntity.sameAs, ["https://github.com/jahia"]);
  assert.equal("email" in schema.mainEntity, false);
});
