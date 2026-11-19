import { seedUpperBar } from "./upperBar.js";
import { decodeSettings, emptySection, validateSettings } from "./model.js";

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
const names = [
  "jcr:title",
  "navLabel",
  "navUtilityLabel",
  "navAutoLabel",
  "navDiscoverLabel",
  "navFeatureEyebrow",
  "navFeatureHeading",
  "navFeatureText",
  "navFeatureLabel",
];
const props = [
  "jcr:primaryType",
  "navIcon",
  "navIconImage",
  "navExcluded",
  "navExpandChildren",
  "navDiscoverVisible",
  "navDiscoverPage",
  "navLandingPage",
  "navColumnOneLinks",
  "navColumnTwoLinks",
  "navFeatureLink",
  "j:node",
  "j:url",
  "j:invalidLanguages",
];
const fields = `uuid name path properties(names:${JSON.stringify(props)}){name value values} fr:properties(names:${JSON.stringify(names)},language:"fr"){name value} en:properties(names:${JSON.stringify(names)},language:"en"){name value}`;
const branchFields = `${fields} children{nodes{${fields} children{nodes{${fields}}}}}`;
const mapProperties = (properties = []) =>
  Object.fromEntries(
    properties.map((property) => [property.name, property.values || property.value]),
  );
const types = ["jnt:page", "jnt:navMenuText", "jnt:nodeLink", "jnt:externalLink"];
function sourceNode(raw) {
  const native = mapProperties(raw.properties),
    fr = mapProperties(raw.fr),
    en = mapProperties(raw.en);
  return {
    id: raw.uuid,
    path: raw.path,
    name: raw.name,
    kind: native["jcr:primaryType"],
    native,
    fr,
    en,
    children: (raw.children?.nodes || [])
      .filter((node) => types.includes(mapProperties(node.properties)["jcr:primaryType"]))
      .map(sourceNode),
  };
}
export function walk(nodes) {
  return nodes.flatMap((node) => [node, ...walk(node.children || [])]);
}
export function sourceLabel(node, language) {
  return (
    node[language]?.navAutoLabel ||
    node[language]?.navLabel ||
    node[language]?.["jcr:title"] ||
    node.name
  );
}
export async function loadPreviewReferences(site, identifiers, request = graphql) {
  const path = sitePath(site);
  if (
    !Array.isArray(identifiers) ||
    identifiers.length > 2000 ||
    identifiers.some((id) => typeof id !== "string" || !/^[\w-]{1,100}$/.test(id))
  )
    throw Error("Invalid preview references");
  const result = [];
  const ids = [...new Set(identifiers)];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const query = `SELECT * FROM [nt:base] AS n WHERE ISDESCENDANTNODE(n, '${path}') AND (${ids
      .slice(offset, offset + 100)
      .map((id) => `n.[jcr:uuid] = '${id}'`)
      .join(" OR ")})`;
    const data = await request(
      `query($query:String!){jcr{nodesByQuery(query:$query,limit:100){nodes{${fields}}}}}`,
      { query },
    );
    result.push(...data.jcr.nodesByQuery.nodes.map(sourceNode));
  }
  return result;
}
export async function loadIconImage(id, language, request = graphql) {
  if (!/^[\w-]{1,100}$/.test(id || "")) throw Error("Invalid image ID");
  const result = await request(
    "query($query:String!,$language:String!){jcr{nodesByQuery(query:$query,limit:1){nodes{uuid path url name:displayName(language:$language)}}}}",
    {
      query: `SELECT * FROM [jmix:image] AS n WHERE ISDESCENDANTNODE(n, '/sites') AND n.[jcr:uuid] = '${id}'`,
      language,
    },
  );
  const image = result.jcr.nodesByQuery.nodes[0];
  if (!image) throw Error("IMAGE_UNAVAILABLE");
  return image;
}
const translated = (node, name) =>
  Object.fromEntries(["fr", "en"].map((language) => [language, node[language]?.[name] || ""]));
export function seedSettings(sections, mode = "automatic") {
  const settings = { version: 1, mode, sections: {} };
  for (const source of sections) {
    const section = emptySection();
    const nodes = walk([source]);
    section.mode =
      source.native.navExcluded === "true"
        ? "hidden"
        : source.native.navExpandChildren === "false" || !source.children.length
          ? "link"
          : "automatic";
    section.selected = nodes.map((node) => node.id);
    section.excluded = nodes
      .filter((node) => node !== source && node.native.navExcluded === "true")
      .map((node) => node.id);
    section.direct = nodes
      .filter((node) => node !== source && node.native.navExpandChildren === "false")
      .map((node) => node.id);
    for (const node of nodes) section.labels[node.id] = translated(node, "navAutoLabel");
    source.children.forEach((branch) => {
      // Reuse explicit legacy assignments of whole branches, never split descendants.
      const first = source.native.navColumnOneLinks || [],
        second = source.native.navColumnTwoLinks || [];
      section.columns[branch.id] = first.includes(branch.id)
        ? 1
        : second.includes(branch.id)
          ? 2
          : 1;
    });
    section.discover = {
      visible:
        source.native.navDiscoverVisible !== "false" &&
        Boolean(
          source.native.navDiscoverPage ||
          source.native.navLandingPage ||
          source.kind === "jnt:page",
        ),
      labels: translated(source, "navDiscoverLabel"),
      ...(source.native.navDiscoverPage ? { target: source.native.navDiscoverPage } : {}),
    };
    if (source.native.navFeatureLink)
      section.feature = {
        visible: true,
        target: source.native.navFeatureLink,
        eyebrow: translated(source, "navFeatureEyebrow"),
        heading: translated(source, "navFeatureHeading"),
        text: translated(source, "navFeatureText"),
        label: translated(source, "navFeatureLabel"),
      };
    settings.sections[source.id] = section;
  }
  return validateSettings(settings);
}
const upperFields =
  'upper:properties(names:["jcr:mixinTypes","utilityItemsData","utilityNavigationLinks","utilityLinksPosition","utilityRssPosition","utilitySearchPosition","utilityLanguagesPosition","utilitySearchVisible","utilityLanguagesVisible","utilityRssVisible","utilityRssUrl","utilityRssImage","primaryCTAStyle","secondaryCTAStyle","primaryCTAPlacement","secondaryCTAPlacement","navbarCTAOrder"]){name value values} upperFr:properties(names:["utilitySearchLabel","utilityLanguagesLabel","utilityRssLabel","primaryCTALink","primaryCTALabel","secondaryCTALink","secondaryCTALabel"],language:"fr"){name value values} upperEn:properties(names:["utilitySearchLabel","utilityLanguagesLabel","utilityRssLabel","primaryCTALink","primaryCTALabel","secondaryCTALink","secondaryCTALabel"],language:"en"){name value values}';
export async function load(site, request = graphql) {
  const path = sitePath(site);
  const data = await request(
    `query($path:String!,$home:String!,$rssQuery:String!){jcr{site:nodeByPath(path:$path){${upperFields} mode:property(name:"navbarMode"){value} children{nodes{name}}} home:nodeByPath(path:$home){${upperFields} children{nodes{${branchFields}}}} rss:nodesByQuery(query:$rssQuery,limit:2){nodes{path href:property(name:"href"){value}}}}}`,
    {
      path,
      home: `${path}/home`,
      rssQuery: `SELECT * FROM [nt:base] AS n WHERE ISSAMENODE(n, '${path}/footer/iconsLeft/rss') OR ISSAMENODE(n, '${path}/footer/iconsRight/rss')`,
    },
  );
  if (!data.jcr.site || !data.jcr.home) throw Error("Site inaccessible");
  const sections = data.jcr.home.children.nodes
    .filter((node) => types.includes(mapProperties(node.properties)["jcr:primaryType"]))
    .map(sourceNode);
  const exists = data.jcr.site.children.nodes.some((node) => node.name === "navigation-settings");
  let raw = null;
  if (exists) {
    const stored = await request(
      'query($path:String!){jcr{nodeByPath(path:$path){kind:property(name:"jcr:primaryType"){value} configuration:property(name:"configuration"){value}}}}',
      { path: `${path}/navigation-settings` },
    );
    if (stored.jcr.nodeByPath.kind?.value !== "jahiacom:navigationSettings")
      throw Error(
        "The navigation-settings node has an incompatible type; existing content was preserved.",
      );
    raw = stored.jcr.nodeByPath.configuration?.value || null;
  }
  const settings =
    decodeSettings(raw) ||
    seedSettings(sections, data.jcr.site.mode?.value === "legacy" ? "legacy" : "automatic");
  // New root sections are discovered without an editor having to add them.
  const newSettings = seedSettings(sections);
  for (const source of sections)
    if (!Object.hasOwn(settings.sections, source.id))
      settings.sections[source.id] = newSettings.sections[source.id];
  const upperNode = (node) => ({
    native: mapProperties(node.upper),
    fr: mapProperties(node.upperFr),
    en: mapProperties(node.upperEn),
  });
  const upperBar = seedUpperBar(upperNode(data.jcr.home), upperNode(data.jcr.site), {
    href:
      data.jcr.rss?.nodes?.find((node) => node.path === `${path}/footer/iconsLeft/rss`)?.href
        ?.value ||
      data.jcr.rss?.nodes?.find((node) => node.path === `${path}/footer/iconsRight/rss`)?.href
        ?.value,
  });
  return { site, sections, settings, raw, exists, upperBar };
}
export async function save(snapshot, settings, request = graphql) {
  validateSettings(settings);
  const current = await load(snapshot.site, request);
  if (current.exists !== snapshot.exists || current.raw !== snapshot.raw) throw Error("CONFLICT");
  const path = `${sitePath(snapshot.site)}/navigation-settings`;
  const raw = JSON.stringify(settings);
  if (raw.length > 500000) throw Error("Configuration too large");
  if (!snapshot.exists)
    await request(
      'mutation($parent:String!,$properties:[InputJCRProperty]){jcr{addNode(parentPathOrId:$parent,name:"navigation-settings",primaryNodeType:"jahiacom:navigationSettings",properties:$properties){uuid}}}',
      {
        parent: sitePath(snapshot.site),
        properties: [
          { name: "configuration", type: "STRING", value: raw },
          { name: "jcr:title", type: "STRING", value: "Navigation du site", language: "fr" },
          { name: "jcr:title", type: "STRING", value: "Site navigation", language: "en" },
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
  const path = `${sitePath(snapshot.site)}/navigation-settings`;
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
