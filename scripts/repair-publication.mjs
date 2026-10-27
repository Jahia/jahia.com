// Node 22+. Read-only diagnostic. Mutations are handled only by the native guard.
// Set process-scoped JAHIA_AUTHORIZATION; pass --base-url, --paths, --languages.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const bookkeeping = new Set([
  "j:published",
  "j:lastPublished",
  "j:lastPublishedBy",
  "j:liveProperties",
  "j:originWS",
  "j:fullpath",
  "j:nodename",
  "jcr:uuid",
  "jcr:created",
  "jcr:createdBy",
  "jcr:lastModified",
  "jcr:lastModifiedBy",
  "jcr:baseVersion",
  "jcr:versionHistory",
  "jcr:predecessors",
  "jcr:isCheckedOut",
]);
export function editorialProperties(node) {
  return node.properties
    .filter((p) => !bookkeeping.has(p.name))
    .map((p) => ({
      ...p,
      values:
        p.name === "jcr:mixinTypes"
          ? p.values?.filter((v) => v !== "jmix:liveProperties").sort()
          : p.values,
    }))
    .filter((p) => p.name !== "jcr:mixinTypes" || p.values?.length)
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function validateSnapshots(edit, live) {
  if (edit.length !== live.length) throw Error("EDIT/LIVE structure mismatch");
  for (const [i, node] of edit.entries()) {
    if (node.uuid !== live[i].uuid || node.path !== live[i].path)
      throw Error("EDIT/LIVE identity mismatch");
    if (
      !node.path.includes("/vanityUrlMapping") &&
      (node.properties.some((p) => p.name === "j:published" && p.value === "false") ||
        live[i].properties.some((p) => p.name === "j:published" && p.value === "false"))
    )
      throw Error("Partially unpublished content: manual review required");
    if (JSON.stringify(editorialProperties(node)) !== JSON.stringify(editorialProperties(live[i])))
      throw Error(`Draft differs from LIVE: ${node.path}. Refusing to publish editorial changes.`);
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.some((value) => ["--apply", "--unpublish", "--backup-dir"].includes(value)))
    throw Error(
      "Read-only diagnostic: mutation options are disabled; use normal Jahia unpublication with the native guard installed",
    );
  const arg = (name) => argv[argv.indexOf(name) + 1];
  const required = (name) => {
    if (!argv.includes(name) || !arg(name) || arg(name).startsWith("--"))
      throw Error(`Missing ${name}`);
    return arg(name);
  };
  const origin = new URL(required("--base-url"));
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !["http:", "https:"].includes(origin.protocol)
  )
    throw Error("Use an HTTP(S) origin without credentials");
  if (
    origin.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
  )
    throw Error("HTTPS is required outside localhost");
  const paths = required("--paths").split(",");
  if (!paths.every((p) => /^\/sites\/[\w-]+\/contents\/[\w/-]+$/.test(p)))
    throw Error("Pass explicit content paths below /sites/<site>/contents");
  if (
    new Set(paths).size !== paths.length ||
    paths.some((p) => paths.some((other) => other !== p && p.startsWith(other + "/")))
  )
    throw Error("Duplicate or overlapping paths");
  const authorization = env.JAHIA_AUTHORIZATION;
  if (!authorization) throw Error("Set JAHIA_AUTHORIZATION in this process");
  const languages = required("--languages").split(",");
  if (
    !languages.every((l) => /^[a-z]{2}(?:[-_][A-Za-z]{2})?$/.test(l)) ||
    new Set(languages).size !== languages.length
  )
    throw Error("Invalid languages");
  const quote = JSON.stringify;

  async function query(query) {
    const r = await fetch(new URL("/modules/graphql", origin), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(60000),
      headers: {
        "Authorization": authorization,
        "Origin": origin.origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!r.ok) throw Error(`GraphQL HTTP ${r.status}`);
    const result = await r.json();
    if (result.errors) throw Error(JSON.stringify(result.errors));
    return result.data;
  }
  async function read(path, live = false) {
    return (
      await query(`{jcr${live ? "(workspace:LIVE)" : ""}{nodeByPath(path:${quote(path)}){
    uuid path translationLanguages properties{name value values}
    children{nodes{uuid path properties{name value values}}}
  }}}`)
    ).jcr.nodeByPath;
  }
  const property = (node, name) => node.properties.find((p) => p.name === name);
  for (const path of paths) {
    const name = path.split("/").at(-1);
    const staged = await read(path);
    if ([...staged.translationLanguages].sort().join() !== [...languages].sort().join())
      throw Error(`Select all existing languages explicitly for ${path}`);
    if (property(staged, "j:published")?.value === "false") {
      for (const lang of languages) {
        const response = await fetch(new URL(`/cms/render/live/${lang}${path}.html`, origin), {
          redirect: "manual",
          signal: AbortSignal.timeout(30000),
        });
        if (response.status !== 404)
          throw Error(
            `Marked unpublished but anonymous LIVE returns ${response.status}: ${path} ${lang}`,
          );
      }
      console.log(
        JSON.stringify({ partner: name, result: "already unpublished; skipped without changes" }),
      );
      continue;
    }
    if (
      staged.children.nodes.some(
        (n) =>
          !["vanityUrlMapping", ...languages.map((l) => "j:translation_" + l)].includes(
            n.path.split("/").at(-1),
          ),
      )
    )
      throw Error(`Nested editorial contents require manual review: ${path}`);
    const nodesToRead = [path, ...languages.map((l) => `${path}/j:translation_${l}`)];
    if (staged.children.nodes.some((n) => n.path === path + "/vanityUrlMapping"))
      nodesToRead.push(path + "/vanityUrlMapping");
    const edit = [],
      live = [];
    for (const p of nodesToRead) {
      edit.push(await read(p));
      live.push(await read(p, true));
    }
    validateSnapshots(edit, live);
    if (
      live
        .slice(1, languages.length + 1)
        .some((n) =>
          property(n, "j:liveProperties")?.values?.some((p) =>
            ["j:lastPublished", "j:lastPublishedBy"].includes(p),
          ),
        )
    )
      throw Error("Protected translation publication metadata requires manual review");
    for (const [i, node] of edit.entries())
      if (node.path.endsWith("/vanityUrlMapping"))
        validateSnapshots(node.children.nodes, live[i].children.nodes);
    if (edit.some((n, i) => n.uuid !== live[i].uuid))
      throw Error(`EDIT/LIVE identity mismatch: ${name}`);
    const protectedMetadata = (property(live[0], "j:liveProperties")?.values || []).filter((p) =>
      ["j:lastPublished", "j:lastPublishedBy"].includes(p),
    );
    console.log(
      JSON.stringify({
        partner: name,
        action: "read-only",
        protectedMetadata,
        missingTranslationMarkers: edit
          .slice(1, languages.length + 1)
          .filter((n) => !property(n, "j:published"))
          .map((n) => n.path),
        instruction: "Use normal Jahia unpublication with the native guard installed",
      }),
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
