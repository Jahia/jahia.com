import { getNodesByJCRQuery, server, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { contentCategories } from "../../utils/contentCategories.js";
import { publicationQuery } from "./queries.js";
import { countAuthorTopics, suggestedTopics, type AuthorTopic } from "./topics.js";

type Topic = Omit<AuthorTopic, "count">;

export function readAuthorTopicSelection(
  author: JCRNodeWrapper,
  sitePath: string,
  cache: (node: JCRNodeWrapper) => void,
): Topic[] {
  const topics = new Map<string, Topic>();
  if (!author.hasProperty("expertiseTopics")) return [];
  for (const value of author.getProperty("expertiseTopics").getValues()) {
    try {
      const node = value.getNode();
      if (!node?.isNodeType("jnt:category") || !node.hasPermission("jcr:read")) continue;
      const path = node.getPath();
      if (!path.startsWith("/sites/systemsite/categories/") && !path.startsWith(sitePath + "/"))
        continue;
      cache(node);
      const id = node.getIdentifier();
      topics.set(id, { id, path, label: node.getDisplayableName() });
    } catch {
      /* Deleted optional category. */
    }
  }
  return [...topics.values()];
}

/** Always use guest LIVE, including in preview: draft articles never inflate public counts. */
export function usePublishedTopicsByAuthor(authorIds: string[]): Map<string, AuthorTopic[]> {
  const { currentResource, renderContext } = useServerContext();
  if (authorIds.length === 0) return new Map<string, AuthorTopic[]>();
  const sitePath = renderContext.getSite().getPath();
  const locale = currentResource.getLocale();
  server.render.addCacheDependency(
    { flushOnPathMatchingRegexp: "\\Q" + sitePath + "\\E/.*" },
    renderContext,
  );
  return (
    server.jcr.doExecuteAsGuest(
      {
        doInJCR(session) {
          const articles = new Map(authorIds.map((id) => [id, [] as Array<{ topics: Topic[] }>]));
          const query = publicationQuery(sitePath, authorIds);
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
              if (!article.hasProperty("author")) continue;
              const authorArticles = articles.get(article.getProperty("author").getString());
              if (!authorArticles) continue;
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
              const topics: Topic[] = [];
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
              authorArticles.push({ topics });
            }
            if (batch.length < 100)
              return new Map(
                [...articles].map(([id, publications]) => [id, countAuthorTopics(publications)]),
              );
          }
          // Never display a partial count as a full total.
          return new Map<string, AuthorTopic[]>();
        },
      },
      locale,
      "live",
    ) ?? new Map<string, AuthorTopic[]>()
  );
}

export function suggestAuthorTopics(counts: AuthorTopic[], sitePath: string) {
  return suggestedTopics(
    counts.filter(
      (topic) =>
        topic.path.startsWith("/sites/systemsite/categories/topics/") ||
        topic.path.startsWith(sitePath + "/"),
    ),
  );
}

export function usePublishedAuthorTopics(author: JCRNodeWrapper, selected: Topic[]) {
  const { renderContext } = useServerContext();
  const id = author.getIdentifier();
  const counts = usePublishedTopicsByAuthor([id]).get(id) ?? [];
  const suggestions = suggestAuthorTopics(counts, renderContext.getSite().getPath());
  const topics = selected.length
    ? selected.map((topic) => ({
        ...topic,
        count: counts.find((item) => item.id === topic.id)?.count || 0,
      }))
    : suggestions;
  return { topics, suggestions };
}
