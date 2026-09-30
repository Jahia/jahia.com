/** Deterministic editorial matching: whole expressions, no generic recent-item fallback. */
export interface LinkCandidate {
  id: string;
  title: string;
  description?: string;
  content?: string;
  aliases?: string[];
  taxonomyIds?: string[];
}
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
// Keep exact phrase matching as the default. A/B testing has common bilingual
// spellings whose word order differs; normalize the expression, not arbitrary words.
export const canonical = (value: string) =>
  normalize(value)
    .replace(/\b(?:tests?|testing|tester) a b\b/g, "a b test")
    .replace(/\ba b (?:tests?|testing|tester)\b/g, "a b test");
const genericWords = new Set(
  "a an and are as at be been by can de des du dans d en et est une un le la les l au aux avec pour par sur ce ces cette se ses son sa qui que qu ou ne pas plus tout tous entre comme sont the this that those these is it its on of or to with from for into in not without your their which when where how what vous vos nous notre nos leur leurs selon aussi ainsi permettre permet peut utilise utiliser utilises utilisee contenu contenus content contents page pages site sites web digital digitale experience experiences jahia exemple exemples example examples definition terme termes term terms concept concepts source academy glossaire glossary lien liens besoin besoins maniere faire fait mettre place".split(
    " ",
  ),
);
export const tokens = (value: string) => [
  ...new Set(
    canonical(value)
      .split(" ")
      .filter((word) => word.length >= 3 && !genericWords.has(word)),
  ),
];
export const usefulExpression = (value: string) => tokens(value).length > 0;

/** Shared vocabulary is weighted against this candidate pool, not a list of promoted URLs. */
function contextScores<T extends LinkCandidate>(
  candidates: T[],
  context: string,
): Map<string, number> {
  const query = tokens(context);
  if (query.length < 3) return new Map();
  const documents = candidates.map((item) => ({
    item,
    words: new Set(tokens(`${item.title} ${item.description || ""} ${item.content || ""}`)),
    heading: new Set(tokens(`${item.title} ${item.description || ""}`)),
  }));
  const weighted = query
    .map((word) => ({
      word,
      weight: Math.log(
        1 + candidates.length / (1 + documents.filter((doc) => doc.words.has(word)).length),
      ),
    }))
    .filter(({ word }) => documents.some((doc) => doc.words.has(word)))
    .sort((a, b) => b.weight - a.weight || a.word.localeCompare(b.word))
    .slice(0, 24);
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const scores = new Map<string, number>();
  for (const doc of documents) {
    const matching = weighted.filter(({ word }) => doc.words.has(word));
    const headingMatches = matching.filter(({ word }) => doc.heading.has(word)).length;
    const coverage = matching.reduce((sum, entry) => sum + entry.weight, 0) / (total || 1);
    if (matching.length >= 3 && coverage >= 0.22 && (headingMatches >= 1 || matching.length >= 6)) {
      scores.set(doc.item.id, 10 + Math.min(25, coverage * 25 + headingMatches));
    }
  }
  return scores;
}
const contains = (text: string, phrase: string) => ` ${canonical(text)} `.includes(` ${phrase} `);
export function rankLinks<T extends LinkCandidate>(
  candidates: T[],
  expressions: string[],
  themes: string[],
  excluded: string[],
  limit: number,
  relatedExpressions: string[] = [],
  context = "",
  concepts: string[] = [],
): T[] {
  const phrases = [...new Set(expressions.map(canonical).filter((value) => value.length >= 2))];
  const related = [
    ...new Set(
      relatedExpressions
        .map(canonical)
        .filter((value) => value.length >= 3 && usefulExpression(value)),
    ),
  ];
  candidates = candidates.filter(
    (item) => themes.length === 0 || themes.some((id) => item.taxonomyIds?.includes(id)),
  );
  const contextMatches = contextScores(candidates, context);
  const conceptPhrases = concepts.map(canonical).filter(usefulExpression);
  const blocked = new Set(excluded);
  const seen = new Set<string>();
  return candidates
    .filter((item) => !blocked.has(item.id) && !seen.has(item.id) && Boolean(seen.add(item.id)))
    .map((item) => ({
      item,
      score: Math.max(
        contextMatches.get(item.id) || 0,
        ...conceptPhrases.map((phrase) =>
          canonical(item.title) === phrase ||
          (item.aliases || []).some((alias) => canonical(alias) === phrase)
            ? 85
            : 0,
        ),
        ...phrases.map((phrase) =>
          contains(item.title, phrase)
            ? 100
            : (item.aliases || []).some((alias) => contains(alias, phrase))
              ? 90
              : contains(item.description || "", phrase)
                ? 80
                : contains(item.content || "", phrase)
                  ? 60
                  : 0,
        ),
        ...related.map((phrase) =>
          contains(item.title, phrase) ? 30 : contains(item.description || "", phrase) ? 20 : 0,
        ),
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.title.localeCompare(b.item.title) ||
        a.item.id.localeCompare(b.item.id),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}
