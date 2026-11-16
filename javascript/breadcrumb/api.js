import { decode, validate } from "./model.js";
export function sitePath(site) {
  if (!/^[a-zA-Z0-9_-]+$/.test(site || "")) throw Error("Invalid site");
  return `/sites/${site}`;
}
export async function graphql(query, variables = {}) {
  const context = globalThis.window?.contextJsParameters?.contextPath || "";
  const response = await fetch(`${context}/modules/graphql`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`Jahia : ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw Error(result.errors.map((error) => error.message).join(" · "));
  return result.data;
}

const names = ["jcr:title", "navLabel"];
const fields =
  "uuid name path fr:properties(names:" +
  JSON.stringify(names) +
  ',language:"fr"){name value} en:properties(names:' +
  JSON.stringify(names) +
  ',language:"en"){name value}';
const props = (list = []) => Object.fromEntries(list.map((p) => [p.name, p.value]));
export const label = (node, lang) => node[lang]?.navLabel || node[lang]?.["jcr:title"] || node.name;
export async function load(site, request = graphql) {
  const path = sitePath(site),
    home = path + "/home";
  const data = await request(
    "query($site:String!,$home:String!,$pages:String!,$groups:String!){jcr{site:nodeByPath(path:$site){children{nodes{name}}} home:nodeByPath(path:$home){children{nodes{uuid}}} pages:nodesByQuery(query:$pages,limit:2001){nodes{" +
      fields +
      "}} groups:nodesByQuery(query:$groups,limit:2001){nodes{" +
      fields +
      "}}}}",
    {
      site: path,
      home,
      pages: "SELECT * FROM [jnt:page] AS n WHERE ISDESCENDANTNODE(n, '" + path + "')",
      groups: "SELECT * FROM [jnt:navMenuText] AS n WHERE ISDESCENDANTNODE(n, '" + home + "')",
    },
  );
  if (!data.jcr.site || !data.jcr.home) throw Error("Site inaccessible");
  const rawItems = [
    ...data.jcr.pages.nodes.map((n) => ({ ...n, page: true })),
    ...data.jcr.groups.nodes.map((n) => ({ ...n, page: false })),
  ];
  if (rawItems.length > 2000) throw Error("Too many breadcrumb pages");
  const items = rawItems
    .map((n) => ({ ...n, fr: props(n.fr), en: props(n.en) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const roots = data.jcr.home.children.nodes
    .map((n) => n.uuid)
    .filter((id) => items.some((n) => n.uuid === id));
  const exists = data.jcr.site.children.nodes.some((n) => n.name === "breadcrumb-settings");
  let raw = null;
  if (exists) {
    const stored = await request(
      'query($path:String!){jcr{nodeByPath(path:$path){kind:property(name:"jcr:primaryType"){value} configuration:property(name:"configuration"){value}}}}',
      { path: path + "/breadcrumb-settings" },
    );
    if (stored.jcr.nodeByPath.kind?.value !== "jahiacom:breadcrumbSettings")
      throw Error("Existing breadcrumb-settings content is incompatible and was preserved");
    raw = stored.jcr.nodeByPath.configuration?.value || null;
  }
  return { site, items, roots, exists, raw, settings: decode(raw) };
}
export async function save(snapshot, settings, request = graphql) {
  validate(settings);
  const current = await load(snapshot.site, request);
  if (current.exists !== snapshot.exists || current.raw !== snapshot.raw) throw Error("CONFLICT");
  const path = `${sitePath(snapshot.site)}/breadcrumb-settings`;
  const raw = JSON.stringify(settings);
  if (raw.length > 500000) throw Error("Configuration too large");
  if (!snapshot.exists)
    await request(
      'mutation($parent:String!,$properties:[InputJCRProperty]){jcr{addNode(parentPathOrId:$parent,name:"breadcrumb-settings",primaryNodeType:"jahiacom:breadcrumbSettings",properties:$properties){uuid}}}',
      {
        parent: sitePath(snapshot.site),
        properties: [
          { name: "configuration", type: "STRING", value: raw },
          { name: "jcr:title", type: "STRING", value: "Fil d’Ariane", language: "fr" },
          { name: "jcr:title", type: "STRING", value: "Breadcrumb", language: "en" },
        ],
      },
    );
  else
    await request(
      'mutation($path:String!,$raw:String!){jcr{mutateNode(pathOrId:$path){setPropertiesBatch(properties:[{name:"configuration",type:STRING,value:$raw}]){property{name}}}}}',
      { path, raw },
    );
  return load(snapshot.site, request);
}
export async function publish(
  snapshot,
  request = graphql,
  pause = () => new Promise((resolve) => setTimeout(resolve, 500)),
) {
  const path = `${sitePath(snapshot.site)}/breadcrumb-settings`;
  const read = async () => {
    const data = await request(
      'query($path:String!){jcr{nodeByPath(path:$path){configuration:property(name:"configuration"){value} fr:aggregatedPublicationInfo(language:"fr"){allowedToPublishWithoutWorkflow locked workInProgress} en:aggregatedPublicationInfo(language:"en"){allowedToPublishWithoutWorkflow locked workInProgress} live:nodeInWorkspace(workspace:LIVE){configuration:property(name:"configuration"){value}}}}}',
      { path },
    );
    const node = data.jcr.nodeByPath;
    if (!snapshot.raw || node?.configuration?.value !== snapshot.raw) throw Error("CONFLICT");
    return node;
  };
  const before = await read();
  if (
    [before.fr, before.en].some(
      (info) => !info?.allowedToPublishWithoutWorkflow || info.locked || info.workInProgress,
    )
  )
    throw Error("PUBLICATION_NOT_ALLOWED");
  await request(
    'mutation($path:String!){jcr{mutateNode(pathOrId:$path){publish(languages:["fr","en"],publishSubNodes:false,includeSubTree:false)}}}',
    { path },
  );
  // The native mutation schedules a job. Its true response is not proof of publication.
  for (let attempt = 0; attempt < 20; attempt++) {
    const node = await read();
    if (node.live?.configuration?.value === snapshot.raw) return true;
    if (attempt < 19) await pause();
  }
  return false;
}
