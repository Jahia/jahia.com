import {
  buildNodeUrl,
  getChildNodes,
  server,
  useJCRQuery,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { resolveGlossaryIndex } from "./indexPage.js";
import { entrySchemas, hubSchemas, mergeSchemas } from "./structuredData.js";
import { glossaryEntries } from "../../views/Glossary/entries.server.js";

interface VanityService {
  getVanityUrlForWorkspaceAndLocale(
    node: JCRNodeWrapper,
    workspace: string,
    locale: unknown,
    site: string,
  ): { isActive(): boolean; getUrl(): string } | null;
}
let vanityService: VanityService | undefined;

/** Use Jahia's own default mapping selection, independent of the requested alias/edit URL. */
function publicUrl(node: JCRNodeWrapper): string {
  const { currentResource, renderContext } = useServerContext();
  server.render.addCacheDependency({ path: node.getPath() }, renderContext);
  if (node.hasNode("vanityUrlMapping")) {
    const mappings = node.getNode("vanityUrlMapping");
    server.render.addCacheDependency({ path: mappings.getPath() }, renderContext);
    for (const mapping of getChildNodes(mappings, -1, 0))
      server.render.addCacheDependency({ path: mapping.getPath() }, renderContext);
  }
  if (!vanityService) {
    // Resolve Java only during rendering, never while initializing a pooled JS engine.
    // @ts-expect-error Java runtime class, absent from the library's declarations.
    const spring = Java.type("org.jahia.services.SpringContextSingleton");
    vanityService = spring.getBean("org.jahia.services.seo.jcr.VanityUrlService") as VanityService;
  }
  const vanity = vanityService.getVanityUrlForWorkspaceAndLocale(
    node,
    currentResource.getWorkspace(),
    currentResource.getLocale(),
    renderContext.getSite().getSiteKey(),
  );
  const path = vanity?.isActive() ? vanity.getUrl() : buildNodeUrl(node, { mode: "live" });
  const origin = renderContext.getURLGenerator().getServer();
  return /^https?:\/\//i.test(path)
    ? path
    : `${origin.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/** A nested child page's glossary must not turn its ancestor into a glossary hub. */
function hubComponent(page: JCRNodeWrapper) {
  if (!page.isNodeType("jnt:page")) return undefined;
  const path = "'" + page.getPath().replace(/'/g, "''") + "'";
  return useJCRQuery({
    query: `SELECT * FROM [jahiacom:glossary] AS g WHERE ISDESCENDANTNODE(g, ${path})`,
  }).find((node) => {
    let parent = node.getParent() as JCRNodeWrapper;
    while (!parent.isNodeType("jnt:page") && parent.getPath() !== "/")
      parent = parent.getParent() as JCRNodeWrapper;
    return parent.getIdentifier() === page.getIdentifier() && node.hasPermission("jcr:read");
  });
}

export function glossaryMetadata(
  props: {
    "jcr:title": string;
    "htmlTitle"?: string;
    "jcr:description"?: string;
    "openGraphImage"?: JCRNodeWrapper;
    "jsonLd"?: string[];
  },
  homeLabel: string,
) {
  const { mainNode, currentResource, renderContext } = useServerContext();
  const isEntry = mainNode.isNodeType("jahiacom:glossaryEntry");
  const hub = isEntry ? undefined : hubComponent(mainNode);
  if (!isEntry && !hub) return undefined;
  const depend = (node: JCRNodeWrapper) =>
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
  const language = currentResource.getLocale().getLanguage();
  const home = renderContext.getSite().getHome();
  depend(renderContext.getSite());
  depend(mainNode);
  const url = publicUrl(mainNode);
  const homeUrl = publicUrl(home);
  const read = (node: JCRNodeWrapper, key: string) =>
    node.hasProperty(key) ? node.getPropertyAsString(key) : undefined;
  const reference = (node: JCRNodeWrapper, key: string) => {
    if (!node.hasProperty(key)) return undefined;
    try {
      const target = node.getProperty(key).getNode() as JCRNodeWrapper | null;
      return target?.hasPermission("jcr:read") ? target : undefined;
    } catch {
      // Optional weak references can point at deleted or inaccessible content.
      return undefined;
    }
  };
  const index = isEntry ? resolveGlossaryIndex(mainNode, depend) : mainNode;
  const indexUrl = index ? publicUrl(index) : undefined;
  let image = props.openGraphImage;
  if (!image && index) image = reference(index, "openGraphImage");
  if (image) depend(image);
  let generated: unknown[];
  if (isEntry) {
    const translation = `j:translation_${language}`;
    const translatedNode = mainNode.hasNode(translation)
      ? mainNode.getNode(translation)
      : undefined;
    if (translatedNode) depend(translatedNode);
    generated = entrySchemas({
      url,
      indexUrl,
      language,
      title: props["jcr:title"],
      htmlTitle: props.htmlTitle,
      summary: read(mainNode, "summary") || "",
      slug: mainNode.getName(),
      aliases: mainNode.hasProperty("aliases")
        ? Array.from(mainNode.getProperty("aliases").getValues(), (value) => value.getString())
        : [],
      editorialDate: read(mainNode, "editorialDate"),
      modified: translatedNode ? read(translatedNode, "jcr:lastModified") : undefined,
      faq: read(mainNode, "faq"),
      breadcrumbs:
        index && indexUrl
          ? [
              { name: homeLabel, url: homeUrl },
              { name: index.getDisplayableName(), url: indexUrl },
              { name: props["jcr:title"] },
            ]
          : [],
    });
  } else {
    depend(hub!);
    const parent = reference(hub!, "entriesFolder") || hub!;
    generated = hubSchemas({
      url,
      language,
      title: props.htmlTitle || props["jcr:title"],
      description: props["jcr:description"],
      entries: glossaryEntries(parent).map((node) => ({
        title: read(node, "indexLabel") || read(node, "jcr:title") || node.getName(),
        url: publicUrl(node),
      })),
      breadcrumbs: [{ name: homeLabel, url: homeUrl }, { name: props["jcr:title"] }],
    });
  }
  return {
    url,
    image,
    isHub: Boolean(hub),
    type: isEntry ? "article" : "website",
    locale:
      language === "fr"
        ? "fr_FR"
        : language === "en"
          ? "en_US"
          : currentResource.getLocale().toString(),
    jsonLd: mergeSchemas(props.jsonLd, generated),
  };
}
