import { getChildNodes, server } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";
import { timestamp } from "../ContentFolderReference/blogEntries.server.js";
import { comparePressDates } from "./dateOrder.js";

export function pressItems(container: JCRNodeWrapper) {
  return getChildNodes(container, -1).filter((node) => node.isNodeType("jahiacom:pressItem"));
}

export function pressItemsByDate(items: JCRNodeWrapper[]) {
  return items
    .map((node) => ({ node, date: timestamp(node, "date") }))
    .sort((a, b) => comparePressDates(a.date, b.date))
    .map(({ node }) => node);
}

export function latestPressRelease(items: JCRNodeWrapper[]) {
  return pressItemsByDate(
    items.filter(
      (node) => (node.getPropertyAsString("contentType") || "communique") === "communique",
    ),
  )[0];
}

export function latestPublishedPressRelease(
  section: JCRNodeWrapper,
  renderContext: RenderContext,
  resource: Resource,
): string | null {
  const sectionPath = section.getPath();
  const areaPath = section.getParent().getPath();
  const locale = resource.getLocale();
  server.render.addCacheDependency(
    { flushOnPathMatchingRegexp: "\\Q" + areaPath + "\\E(?:/.*)?" },
    renderContext,
  );
  return server.jcr.doExecuteAsGuest(
    {
      doInJCR(session) {
        if (!session.nodeExists(sectionPath)) return null;
        const publishedSection = session.getNode(sectionPath) as JCRNodeWrapper;
        const sources = getChildNodes(publishedSection.getParent() as JCRNodeWrapper, -1).filter(
          (node) => node.isNodeType("jahiacom:pressNews") && node.hasPermission("jcr:read"),
        );
        const eligible = [publishedSection, ...sources]
          .flatMap(pressItems)
          .filter(
            (item) =>
              item.hasPermission("jcr:read") &&
              item.hasI18N(locale) &&
              (!item.hasProperty("j:invalidLanguages") ||
                !Array.from(item.getProperty("j:invalidLanguages").getValues()).some(
                  (value) => value.getString() === locale.getLanguage(),
                )),
          );
        return latestPressRelease(eligible)?.getPath() ?? null;
      },
    },
    locale,
    "live",
  );
}
