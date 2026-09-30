// Read-only Docker/preproduction audit. Credentials are supplied through the process environment.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const origin = new URL(arg("--base-url", "http://localhost:8081"));
const site = arg("--site", "mySite");
const workspace = arg("--workspace", "default");
const limit = Number(arg("--limit", "0"));
const budgetMs = Number(arg("--budget-ms", "15000"));
if (
  !/^[\w-]+$/.test(site) ||
  !["default", "live"].includes(workspace) ||
  !["http:", "https:"].includes(origin.protocol) ||
  !Number.isInteger(limit) ||
  limit < 0 ||
  !Number.isFinite(budgetMs) ||
  budgetMs <= 0
)
  throw Error("Invalid audit parameters");
if (origin.username || origin.password)
  throw Error("Pass credentials through environment variables, not the URL");
const authorization =
  process.env.JAHIA_AUTHORIZATION ||
  (process.env.JAHIA_USER ? "Basic " + Buffer.from(process.env.JAHIA_USER).toString("base64") : "");
if (!authorization) throw Error("Set JAHIA_AUTHORIZATION or JAHIA_USER in this process");
const output = arg("--out", join(tmpdir(), `jahia-glossary-audit-${Date.now()}.json`));
const headers = { Authorization: authorization, Origin: origin.origin };
const request = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
const folder = `/sites/${site}/contents/glossary`;
const query = `{jcr${workspace === "live" ? "(workspace:LIVE)" : ""}{nodeByPath(path:${JSON.stringify(folder)}){children{nodes{uuid name path properties(names:["autoLinks","j:published","j:invalidLanguages"],language:"en"){name value values}}}}}}`;
const response = await request(new URL("/modules/graphql", origin), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
if (!response.ok) throw Error(`Inventory HTTP ${response.status}`);
const inventory = await response.json();
if (inventory.errors) console.error(JSON.stringify(inventory.errors.map((e) => e.message)));
if (inventory.errors || !inventory.data?.jcr?.nodeByPath)
  throw Error("Inventory query failed; check site and permissions");
const all = inventory.data.jcr.nodeByPath.children.nodes;
const props = (node) =>
  Object.fromEntries(node.properties.map((p) => [p.name, p.values || p.value]));
const eligible = all.filter(
  (n) =>
    props(n)["j:published"] === "true" &&
    !["fr", "en"].some((l) => (props(n)["j:invalidLanguages"] || []).includes(l)),
);
if (!eligible.length)
  throw Error("No eligible glossary entries; audit cannot pass on an empty inventory");
const nodes = limit ? eligible.slice(0, limit) : eligible;
const allowedPaths = new Set(eligible.map((n) => n.path + ".html"));
const jobs = nodes.flatMap((node) => ["fr", "en"].map((language) => ({ node, language })));
const pages = [],
  failures = [];
let cursor = 0,
  done = 0;
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (cursor < jobs.length) {
      const { node, language } = jobs[cursor++];
      const url = new URL(`/cms/render/${workspace}/${language}${node.path}.html`, origin);
      const started = performance.now();
      try {
        const r = await request(url);
        const html = await r.text();
        const ms = Math.round(performance.now() - started);
        const section =
          html.match(/<section[^>]*aria-labelledby="related"[^>]*>([\s\S]*?)<\/section>/)?.[1] ||
          "";
        const links = [...section.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(
          (m) => new URL(m[1].replaceAll("&amp;", "&"), url),
        );
        const targets = links.map((link) => link.pathname.replace(/^.*?\/sites\//, "/sites/"));
        const issues = [];
        if (r.status !== 200 || !html.includes('id="definition"')) issues.push("render-error");
        const automatic = props(node).autoLinks !== "false";
        const minimum = Math.min(4, Math.max(0, eligible.length - 1));
        if (automatic && (targets.length < minimum || targets.length > 6))
          issues.push("count-out-of-range");
        if (!automatic && targets.length) issues.push("automatic-disabled-but-links-visible");
        if (new Set(targets).size !== targets.length) issues.push("duplicate-links");
        if (targets.includes(node.path + ".html")) issues.push("self-link");
        if (
          links.some((link) => link.origin !== origin.origin) ||
          targets.some((path) => !allowedPaths.has(path))
        )
          issues.push("ineligible-target");
        if (links.some((link) => !link.pathname.includes(`/render/${workspace}/${language}/`)))
          issues.push("wrong-language-or-workspace");
        const page = {
          name: node.name,
          path: node.path,
          language,
          status: r.status,
          ms,
          count: targets.length,
          targets,
          issues,
        };
        pages.push(page);
        if (issues.length) failures.push(page);
      } catch (error) {
        const page = {
          name: node.name,
          path: node.path,
          language,
          status: 0,
          ms: Math.round(performance.now() - started),
          targets: [],
          issues: [error.name === "TimeoutError" ? "timeout" : "request-failed"],
        };
        pages.push(page);
        failures.push(page);
      }
      if (++done % 20 === 0) console.log(`${done}/${jobs.length} pages checked`);
    }
  }),
);
for (const node of nodes) {
  const pair = pages.filter((p) => p.path === node.path);
  if (pair.length !== 2 || JSON.stringify(pair[0].targets) !== JSON.stringify(pair[1].targets))
    failures.push({ name: node.name, issues: ["fr-en-mismatch"] });
}
// Every selected target has its own audited page during a full run.
const badTargets = new Set(
  pages
    .filter((p) => p.status !== 200 || p.issues.includes("render-error"))
    .map((p) => p.path + ".html"),
);
for (const page of pages)
  if (page.targets.some((path) => badTargets.has(path)))
    failures.push({ name: page.name, language: page.language, issues: ["target-render-error"] });
const times = pages.map((p) => p.ms).sort((a, b) => a - b);
const percentile = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))] || 0;
const timing = { medianMs: percentile(0.5), p95Ms: percentile(0.95), maxMs: times.at(-1) || 0 };
const warnings = [];
if (timing.p95Ms > budgetMs) warnings.push(`HTTP p95 exceeds budget (${budgetMs} ms)`);
const baselinePath = arg("--baseline", null);
if (baselinePath) {
  const before = JSON.parse(await readFile(baselinePath, "utf8"));
  if (
    before.origin !== origin.origin ||
    before.site !== site ||
    before.workspace !== workspace ||
    JSON.stringify(before.pages.map((p) => p.path + ":" + p.language).sort()) !==
      JSON.stringify(pages.map((p) => p.path + ":" + p.language).sort())
  )
    throw Error("Baseline must use the same origin, site, workspace and pages");
  if (timing.p95Ms > before.timing.p95Ms * 1.5 + 100)
    warnings.push("HTTP p95 regression: more than 50% + 100 ms above baseline");
}
const report = {
  at: new Date().toISOString(),
  origin: origin.origin,
  site,
  workspace,
  scope: limit ? "sample" : "full",
  pairs: nodes.length,
  pageCount: pages.length,
  timing,
  warnings,
  failures,
  pages,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    report: output,
    pairs: report.pairs,
    pages: pages.length,
    failures: failures.length,
    timing,
    warnings,
  }),
);
process.exitCode = failures.length || warnings.length ? 1 : 0;
