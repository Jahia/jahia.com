/** Read-only report: correlate actual public resource links with shared ranking evidence.
 * Usage: node scripts/report-glossary-concepts.mjs <corpus.json> <config.json> <output-directory>
 * corpus is a read-only export of published local nodes, keyed by fr/en.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse, parseFragment } from "parse5";
import { rankLinksWithEvidence } from "../src/contents/GlossaryEntry/linkSelection.ts";
const [corpusFile, configFile, outputDirectory] = process.argv.slice(2);
if (!outputDirectory) throw Error("Expected corpus, configuration and output directory");
const corpus = JSON.parse(readFileSync(corpusFile, "utf8"));
const configs = JSON.parse(readFileSync(configFile, "utf8"));
const text = (n) => (n.nodeName === "#text" ? n.value : (n.childNodes || []).map(text).join(" "));
const clean = (s) =>
  text(parseFragment(String(s || "")))
    .replace(/\s+/g, " ")
    .trim();
const walk = (n, f) => {
  f(n);
  for (const c of n.childNodes || []) walk(c, f);
};
const attr = (n, k) => n.attrs?.find((a) => a.name === k)?.value;
const reports = [];
const jobs = ["fr", "en"].flatMap((lang) => Object.keys(configs).map((name) => ({ lang, name })));
let cursor = 0;
const candidates = {};
for (const lang of ["fr", "en"]) {
  const all = corpus[lang];
  const roots = all.filter((n) => ["jnt:page", "jahiacom:blogEntry"].includes(n.type));
  candidates[lang] = roots.map((n) => {
    const descendants = all.filter(
      (c) =>
        c.path === n.path ||
        (c.path.startsWith(n.path + "/") &&
          !roots.some(
            (r) =>
              r.path !== n.path &&
              r.path.startsWith(n.path + "/") &&
              (c.path === r.path || c.path.startsWith(r.path + "/")),
          )),
    );
    return {
      id: n.id,
      path: n.path,
      title: n.props["jcr:title"] || "",
      description: clean(n.props.summary || n.props["jcr:description"] || n.props.description),
      content: descendants
        .map((c) =>
          ["jcr:title", "text", "body", "subtitle", "introduction", "description"]
            .map((k) => clean(c.props[k]))
            .join(" "),
        )
        .join(" "),
    };
  });
}
async function worker() {
  while (cursor < jobs.length) {
    const { lang, name } = jobs[cursor++];
    const path = "/sites/mySite/contents/glossary/" + name;
    const entry = corpus[lang].find((n) => n.path === path);
    const english = corpus.en.find((n) => n.path === path);
    const url = `http://localhost:8081/cms/render/live/${lang}${path}.html`;
    const r = await fetch(url);
    if (!r.ok) throw Error(`${r.status}: ${url}`);
    const nodes = [];
    walk(parse(await r.text()), (n) => nodes.push(n));
    const section = nodes.find(
      (n) => n.tagName === "section" && attr(n, "aria-labelledby") === "resources",
    );
    const links = [];
    if (section)
      walk(section, (n) => {
        if (n.tagName === "a") links.push(n);
      });
    const resources = links.map((link) => {
      const href = new URL(attr(link, "href"), url).href;
      const item = candidates[lang].find((c) => decodeURI(href).includes(c.path + ".html"));
      if (!item)
        return {
          title: text(link).trim(),
          url: href,
          error: "Resource path not found in snapshot",
        };
      const result = rankLinksWithEvidence(
        [item],
        [
          entry.props["jcr:title"],
          ...(entry.props.aliases || []),
          ...(lang === "fr" ? [english.props["jcr:title"]] : []),
        ],
        [],
        [],
        1,
        [],
        clean((entry.props.summary || "") + " " + (entry.props.body || "")),
        [],
        name,
        { ...configs[name], preferEducational: true },
      )[0];
      return {
        title: item.title,
        url: href,
        ...(result
          ? { evidence: result.evidence, educational: result.educational, score: result.score }
          : { error: "Selection evidence not reproduced" }),
      };
    });
    reports.push({ lang, name, title: entry.props["jcr:title"], url, resources });
    console.log(
      lang,
      name,
      resources.length,
      "unexplained",
      resources.filter((r) => r.error).length,
    );
  }
}
await Promise.all([worker(), worker()]);
reports.sort((a, b) => a.name.localeCompare(b.name) || a.lang.localeCompare(b.lang));
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    "Six configured concepts, actual Docker live links. Evidence excerpts normalized (case, accents and punctuation) for matching; source links retain original text.",
  entries: reports,
};
writeFileSync(
  join(resolve(outputDirectory), "resource-relevance-report.json"),
  JSON.stringify(report, null, 2),
);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const reasons = {
  "direct-title": "Terme dans le titre",
  "direct-alias": "Synonyme",
  "direct-summary": "Terme dans le résumé",
  "direct-body": "Terme dans le contenu",
  "concept": "Correspondance par concept",
  "context": "Vocabulaire partagé",
  "related": "Concept associé",
};
const html =
  '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Pertinence des ressources du glossaire</title><body><h1>Pertinence des ressources du glossaire</h1><p>Docker uniquement. Six concepts, douze versions FR/EN. Liens réellement affichés. Les passages ci-dessous sont normalisés pour la comparaison (accents et ponctuation retirés) : consulter la ressource pour le texte original.</p>' +
  reports
    .map(
      (e) =>
        `<section><h2>${escape(e.title)} (${e.lang.toUpperCase()})</h2><p>${e.resources.length} ressource(s) | <a href="${escape(e.url)}">Voir la fiche</a></p><ol>${e.resources.map((r) => `<li><h3><a href="${escape(r.url)}">${escape(r.title)}</a></h3>${r.error ? `<p>${escape(r.error)}</p>` : `<p>${escape(reasons[r.evidence.reason])}. Expressions : ${escape(r.evidence.phrases.join(", "))}.</p><blockquote>${escape(r.evidence.passage)}</blockquote><p>Priorité pédagogique : ${r.educational.adjustment > 0 ? "renforcée" : r.educational.adjustment < 0 ? "réduite (page commerciale ou de navigation)" : "neutre"}. Score : ${r.score}.</p>`}</li>`).join("")}</ol></section>`,
    )
    .join("") +
  "</body></html>";
writeFileSync(join(resolve(outputDirectory), "resource-relevance-report.html"), html);
if (reports.some((r) => r.resources.some((x) => x.error))) process.exitCode = 1;
