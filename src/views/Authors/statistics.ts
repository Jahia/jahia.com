export type AuthorStatistics = { authors: number; articles: number; topics: number };

export function summarizeAuthorStatistics(
  authorIds: string[],
  articles: Array<{ id: string; author: string; topics: string[] }>,
): AuthorStatistics {
  const authors = new Set(authorIds);
  const publications = new Set<string>();
  const topics = new Set<string>();
  for (const article of articles) {
    if (!authors.has(article.author)) continue;
    publications.add(article.id);
    article.topics.forEach((id) => topics.add(id));
  }
  return { authors: authors.size, articles: publications.size, topics: topics.size };
}
