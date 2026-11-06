import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { planFaqMigration } from "./lib/glossary-faq-migration.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
if (flag("--help")) {
  console.log(
    "Node >=22.18. JAHIA_URL + JAHIA_AUTHORIZATION required.\nnode scripts/migrate-glossary-faq.mjs [--workspace default|live|both] [--site /sites/key] [--backup-dir PATH] [--apply]\nDry run by default. Writes only faqData and removes converted faq. LIVE writes require --workspace live|both explicitly; drafts are never published.",
  );
  process.exit(0);
}
const base = new URL(process.env.JAHIA_URL || "http://localhost:8081");
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
  throw Error("Use an HTTP(S) Jahia URL without embedded credentials");
const authorization = process.env.JAHIA_AUTHORIZATION;
if (!authorization)
  throw Error("Set JAHIA_AUTHORIZATION in the current process; never commit credentials");
const workspace = option("--workspace", "default");
if (!["default", "live", "both"].includes(workspace)) throw Error("Unknown workspace");
const site = option("--site", "/sites");
if (!/^\/sites(?:\/[a-zA-Z0-9_-]+)?$/.test(site)) throw Error("Expected /sites or /sites/siteKey");
const workspaces = workspace === "both" ? ["default", "live"] : [workspace];
async function consoleScript(script) {
  const url = new URL("/modules/tools/groovyConsole.jsp", base);
  const page = await fetch(url, { headers: { Authorization: authorization }, redirect: "error" });
  const html = await page.text();
  const token = html.match(/name="toolAccessToken" value="([^"]+)"/)?.[1];
  if (!page.ok || !token)
    throw Error(
      "Authenticated Groovy console is unavailable; verify URL, permissions and installed tools",
    );
  const cookie = page.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Cookie": cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ toolAccessToken: token, runScript: "true", script }),
    redirect: "error",
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  const output = text
    .match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1]
    ?.replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  if (!res.ok || !output?.includes("MIGRATION_OK"))
    throw Error("Migration did not confirm completion: " + (output || res.status).slice(0, 1200));
  return output;
}
const inventory = `import org.jahia.services.content.JCRSessionFactory
import java.util.Base64
for(def ws:${JSON.stringify(workspaces)}) {
 def s=JCRSessionFactory.getInstance().getCurrentSystemSession(ws,null,null)
 s.workspace.queryManager.createQuery("SELECT * FROM [jahiacom:glossaryEntry] WHERE ISDESCENDANTNODE('${site}')",'JCR-SQL2').execute().nodes.each{n->n.nodes.each{tr->if(tr.name.startsWith('j:translation_')){
  def enc={v->Base64.encoder.encodeToString((v?:'').getBytes('UTF-8'))}
  println('ROW\\t'+ws+'\\t'+enc(tr.path)+'\\t'+enc(tr.hasProperty('faq')?tr.getProperty('faq').string:'')+'\\t'+enc(tr.hasProperty('faqData')?tr.getProperty('faqData').string:''))
 }}}
}
println('MIGRATION_OK')`;
const out = await consoleScript(inventory);
const decode = (v) => Buffer.from(v || "", "base64").toString("utf8");
const rows = out
  .split(/\r?\n/)
  .filter((l) => l.startsWith("ROW\t"))
  .map((l) => {
    const [, workspace, path, faq, faqData] = l.split("\t");
    return { workspace, path: decode(path), faq: decode(faq), faqData: decode(faqData) };
  });
const plan = planFaqMigration(rows);
const directory = resolve(
  option("--backup-dir", `./glossary-faq-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`),
);
await mkdir(directory, { recursive: true });
await writeFile(
  resolve(directory, "backup.json"),
  JSON.stringify({ url: base.origin, rows }, null, 2),
  { flag: "wx", mode: 0o600 },
);
await writeFile(resolve(directory, "plan.json"), JSON.stringify(plan, null, 2), {
  flag: "wx",
  mode: 0o600,
});
console.log(
  JSON.stringify({
    mode: flag("--apply") ? "apply" : "dry-run",
    translations: rows.length,
    migrate: plan.filter((p) => p.action === "migrate").length,
    skipped: plan.filter((p) => p.action === "skip").length,
    backup: directory,
  }),
);
if (flag("--apply")) {
  for (const ws of workspaces) {
    const selected = plan.filter((p) => p.action === "migrate" && p.workspace === ws);
    if (!selected.length) continue;
    const chunks = Buffer.from(JSON.stringify(selected))
      .toString("base64")
      .match(/.{1,20000}/g)
      .map((s) => `'${s}'`)
      .join(",");
    const script = `import org.jahia.services.content.JCRSessionFactory
import org.jahia.services.cache.CacheHelper
import groovy.json.JsonSlurperClassic
import java.util.Base64
 def rows=new JsonSlurperClassic().parseText(new String(Base64.decoder.decode([${chunks}].join('')),'UTF-8'))
 def session=JCRSessionFactory.getInstance().getCurrentSystemSession('${ws}',null,null)
 try {
 rows.each{r->def tr=session.getNode(r.path);assert tr.getProperty('faq').string==r.faq;assert (tr.hasProperty('faqData')?tr.getProperty('faqData').string:'')==r.faqData}
 rows.each{r->def tr=session.getNode(r.path);tr.setProperty('faqData',r.nextData);tr.getProperty('faq').remove()}
 session.save()
 rows.each{r->def tr=session.getNode(r.path);assert !tr.hasProperty('faq');assert tr.getProperty('faqData').string==r.nextData}
 CacheHelper.flushOutputCachesForPaths(rows.collect{session.getNode(it.path).parent.path} as Set,true)
 println('MIGRATION_OK ${ws} '+rows.size())
 } finally {session.refresh(false)}
 `;
    console.log((await consoleScript(script)).trim());
  }
}
