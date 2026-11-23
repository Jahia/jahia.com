import { getNodesByJCRQuery, server, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { contentCategories } from "../../utils/contentCategories.js";
import { directoryQuery, sqlLiteral } from "./queries.js";
import { summarizeAuthorStatistics, type AuthorStatistics } from "./statistics.js";

/** Published visitor-visible totals, even when the cards are previewed by an editor. */
export function useAuthorStatistics(source: JCRNodeWrapper): AuthorStatistics | null {
  const { renderContext, currentResource } = useServerContext();
  const sitePath = renderContext.getSite().getPath();
  const locale = currentResource.getLocale();
  server.render.addCacheDependency(
    { flushOnPathMatchingRegexp: "\\Q" + sitePath + "\\E/.*" },
    renderContext,
  );
  return server.jcr.doExecuteAsGuest(
    {
      doInJCR(session) {
        if (!session.nodeExists(source.getPath())) return null;
        const folder = session.getNode(source.getPath()) as JCRNodeWrapper;
        if (
          !folder.getPath().startsWith(sitePath + "/contents/") ||
          !folder.isNodeType("jahiacommix:authorFolder") ||
          !folder.hasPermission("jcr:read")
        )
          return null;
        const available = (node: JCRNodeWrapper) =>
          node.hasPermission("jcr:read") &&
          node.hasI18N(locale) &&
          (!node.hasProperty("j:invalidLanguages") ||
            !node
              .getProperty("j:invalidLanguages")
              .getValues()
              .some((value) => value.getString() === locale.getLanguage()));
        const read = (query: string) => {
          const nodes: JCRNodeWrapper[] = [];
          for (let offset = 0; offset < 10000; offset += 200) {
            const batch = getNodesByJCRQuery(session, query, 200, offset);
            nodes.push(...batch);
            if (batch.length < 200) return nodes;
          }
          return null; // Never present a truncated total as a complete count.
        };
        const authors = read(directoryQuery(folder.getPath()));
        const entries = read(
          "SELECT * FROM [jahiacom:blogEntry] AS n WHERE ISDESCENDANTNODE(n, " +
            sqlLiteral(sitePath) +
            ") ORDER BY n.[jcr:uuid] ASC",
        );
        if (!authors || !entries) return null;
        const authorIds = authors.filter(available).map((author) => author.getIdentifier());
        const articles: Array<{ id: string; author: string; topics: string[] }> = [];
        for (const entry of entries) {
          if (
            !available(entry) ||
            !entry.hasProperty("author") ||
            (entry.hasProperty("date") &&
              Date.parse(entry.getPropertyAsString("date")) > Date.now())
          )
            continue;
          let author: JCRNodeWrapper | null;
          try {
            author = entry.getProperty("author").getValue().getNode();
          } catch {
            continue;
          }
          if (!author) continue;
          const topics = contentCategories(entry).filter(
            (category) =>
              category.hasPermission("jcr:read") &&
              !/\/categories\/(pageTypes|resourcestypes|blogTypes)(\/|$)/.test(category.getPath()),
          );
          for (const category of topics)
            server.render.addCacheDependency({ path: category.getPath() }, renderContext);
          articles.push({
            id: entry.getIdentifier(),
            author: author.getIdentifier(),
            topics: topics.map((category) => category.getIdentifier()),
          });
        }
        return summarizeAuthorStatistics(authorIds, articles);
      },
    },
    locale,
    "live",
  );
}
