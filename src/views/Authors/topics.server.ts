import { getNodesByJCRQuery, server, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { contentCategories } from "../../utils/contentCategories.js";
import { publicationQuery } from "./queries.js";
import { countAuthorTopics, suggestedTopics, type AuthorTopic } from "./topics.js";

/** Always use guest LIVE, including in preview: draft articles never inflate public counts. */
export function usePublishedAuthorTopics(author: JCRNodeWrapper, selected: JCRNodeWrapper[]) {
  const { currentResource, renderContext } = useServerContext();
  const sitePath = renderContext.getSite().getPath();
  const locale = currentResource.getLocale();
  server.render.addCacheDependency(
    { flushOnPathMatchingRegexp: "\\Q" + sitePath + "\\E/.*" },
    renderContext,
  );
  const counts: AuthorTopic[] | null = server.jcr.doExecuteAsGuest(
    {
      doInJCR(session) {
        const articles: Array<{ topics: Omit<AuthorTopic, "count">[] }> = [];
        const query = publicationQuery(sitePath, author.getIdentifier());
        const seen = new Set<string>();
        for (let offset = 0; offset < 10000; offset += 100) {
          const batch = getNodesByJCRQuery(session, query, 100, offset);
          for (const article of batch) {
            if (
              seen.has(article.getIdentifier()) ||
              !article.hasPermission("jcr:read") ||
              !article.hasI18N(locale)
            )
              continue;
            if (
              article.hasProperty("j:invalidLanguages") &&
              article
                .getProperty("j:invalidLanguages")
                .getValues()
                .some((value) => value.getString() === locale.getLanguage())
            )
              continue;
            if (
              article.hasProperty("date") &&
              Date.parse(article.getPropertyAsString("date")) > Date.now()
            )
              continue;
            seen.add(article.getIdentifier());
            server.render.addCacheDependency(
              { path: article.getParent().getPath() },
              renderContext,
            );
            server.render.addCacheDependency({ path: article.getPath() }, renderContext);
            const translation = "j:translation_" + locale.getLanguage();
            if (article.hasNode(translation))
              server.render.addCacheDependency(
                { path: article.getNode(translation).getPath() },
                renderContext,
              );
            const topics: Omit<AuthorTopic, "count">[] = [];
            for (const assigned of contentCategories(article)) {
              let category: JCRNodeWrapper | null = assigned;
              for (let depth = 0; category && depth < 16; depth++) {
                const path = category.getPath();
                if (
                  !category.isNodeType("jnt:category") ||
                  !category.hasPermission("jcr:read") ||
                  !(
                    path.startsWith("/sites/systemsite/categories/") ||
                    path.startsWith(sitePath + "/")
                  )
                )
                  break;
                server.render.addCacheDependency({ path }, renderContext);
                topics.push({
                  id: category.getIdentifier(),
                  label: category.getDisplayableName(),
                  path,
                });
                category = category.getParent() as JCRNodeWrapper;
              }
            }
            articles.push({ topics });
          }
          if (batch.length < 100) return countAuthorTopics(articles);
        }
        // Never display a partial count as a full total.
        return null;
      },
    },
    locale,
    "live",
  );
  if (!counts) return { topics: [], suggestions: [] };
  const suggestions = suggestedTopics(
    counts.filter(
      (topic) =>
        topic.path.startsWith("/sites/systemsite/categories/topics/") ||
        topic.path.startsWith(sitePath + "/"),
    ),
  );
  const topics = selected.length
    ? [...new Map(selected.map((topic) => [topic.getIdentifier(), topic])).values()].map(
        (topic) => ({
          id: topic.getIdentifier(),
          label: topic.getDisplayableName(),
          path: topic.getPath(),
          count: counts.find((item) => item.id === topic.getIdentifier())?.count || 0,
        }),
      )
    : suggestions;
  return { topics, suggestions };
}
