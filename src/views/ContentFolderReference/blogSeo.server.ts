import {
  buildNodeUrl,
  getChildNodes,
  server,
  useJCRQuery,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { blogPage, blogPageSize, blogPageUrl, blogCanonicalOrigin } from "./blogPagination.js";
import { eligibleBlogEntries } from "./blogEntries.server.js";

interface VanityService {
  getVanityUrlForWorkspaceAndLocale(
    node: JCRNodeWrapper,
    workspace: string,
    locale: unknown,
    site: string,
  ): { isActive(): boolean; getUrl(): string } | null;
}
let vanityService: VanityService | undefined;

/** The native SEO filter leaves an existing canonical untouched. Override only
 * paginated/filtered blog lists, never articles, other lists or the clean first page.
 * Paginated language collections need not have equal lengths/order, so their
 * page numbers are not asserted to be translation equivalents via hreflang.
 */
export function blogListingSeo() {
  const { mainNode, currentResource, renderContext } = useServerContext();
  if (renderContext.isEditMode() || !mainNode.isNodeType("jnt:page")) return;
  const request = renderContext.getRequest();
  const requested = blogPage(request.getParameter("blogPage"));
  const filtered = Boolean(request.getParameter("filter1") || request.getParameter("filter2"));
  if (requested === 1 && !filtered) return;
  const path = "'" + mainNode.getPath().replace(/'/g, "''") + "'";
  const listing = useJCRQuery({
    query:
      "SELECT * FROM [jnt:contentFolderReference] WHERE ISDESCENDANTNODE(" +
      path +
      ") AND [j:view] = 'blog'",
  }).find((node) => {
    let parent = node.getParent() as JCRNodeWrapper;
    while (parent.getPath() !== "/" && !parent.isNodeType("jnt:page"))
      parent = parent.getParent() as JCRNodeWrapper;
    return parent.getIdentifier() === mainNode.getIdentifier() && node.hasPermission("jcr:read");
  });
  if (!listing?.hasProperty("j:node")) return;
  const folder = listing.getProperty("j:node").getNode() as JCRNodeWrapper | null;
  if (!folder?.hasPermission("jcr:read")) return;
  const entries = eligibleBlogEntries(folder);
  const count = Math.max(0, entries.length - 1);
  const size = blogPageSize(listing.getPropertyAsString("blogPageSize"));
  const page = Math.min(requested, Math.max(1, Math.ceil(count / size)));
  const depend = (node: JCRNodeWrapper) =>
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
  depend(mainNode);
  depend(renderContext.getSite());
  depend(listing);
  server.render.addCacheDependency(
    { flushOnPathMatchingRegexp: "\\Q" + folder.getPath() + "\\E/.*" },
    renderContext,
  );
  if (mainNode.hasNode("vanityUrlMapping")) {
    const mappings = mainNode.getNode("vanityUrlMapping");
    depend(mappings);
    for (const mapping of getChildNodes(mappings, -1, 0)) depend(mapping);
  }
  if (!vanityService) {
    // @ts-expect-error Java runtime service, resolved only during rendering.
    const spring = Java.type("org.jahia.services.SpringContextSingleton");
    vanityService = spring.getBean("org.jahia.services.seo.jcr.VanityUrlService") as VanityService;
  }
  const vanity = vanityService.getVanityUrlForWorkspaceAndLocale(
    mainNode,
    currentResource.getWorkspace(),
    currentResource.getLocale(),
    renderContext.getSite().getSiteKey(),
  );
  const base = vanity?.isActive() ? vanity.getUrl() : buildNodeUrl(mainNode, { mode: "live" });
  const site = renderContext.getSite();
  const origin = blogCanonicalOrigin(
    site.hasProperty("sitemapIndexURL") ? site.getPropertyAsString("sitemapIndexURL") : undefined,
    renderContext.getURLGenerator().getServer(),
  );
  const absolute = /^https?:\/\//i.test(base) ? base : origin + "/" + base.replace(/^\//, "");
  return { canonical: blogPageUrl(absolute, page), filtered };
}
