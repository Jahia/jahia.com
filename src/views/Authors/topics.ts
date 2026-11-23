export interface AuthorTopic {
  id: string;
  label: string;
  path: string;
  count: number;
}

/** One article contributes once to a tag, including when its child tag is also assigned. */
export function countAuthorTopics(articles: Array<{ topics: Omit<AuthorTopic, "count">[] }>) {
  const counts = new Map<string, AuthorTopic>();
  for (const article of articles) {
    const seen = new Set<string>();
    for (const topic of article.topics) {
      if (seen.has(topic.id)) continue;
      seen.add(topic.id);
      const current = counts.get(topic.id);
      counts.set(topic.id, { ...topic, count: (current?.count || 0) + 1 });
    }
  }
  return [...counts.values()];
}

export function suggestedTopics(topics: AuthorTopic[], limit = 5) {
  return topics
    .filter(
      (topic) =>
        !topics.some(
          (other) => other.path.startsWith(topic.path + "/") && other.count === topic.count,
        ),
    )
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
