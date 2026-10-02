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
/** Each alternative requires all groups; each group accepts bilingual synonyms.
 * Profiles identify concepts, never resource URLs. Unmapped terms keep their existing ranking.
 */
const resourceConcepts: Record<string, string[][][]> = {
  "absolute-area": [
    [
      [
        "shared content blocks",
        "content blocks shared",
        "blocs de contenu partages",
        "shared fragments",
        "fragments partages",
      ],
      ["sites", "templates", "pages"],
    ],
    [
      [
        "shared header",
        "shared footer",
        "shared navigation",
        "en tete partage",
        "pied de page partage",
        "navigation partagee",
      ],
      ["templates", "template", "sites", "pages"],
    ],
  ],
  "content-reference": [
    [
      [
        "content reuse",
        "content re use",
        "reuse content",
        "reusing content",
        "reutilisation du contenu",
        "reutilisation de contenu",
        "reutilisation de pages et de contenus",
        "contenus reutilisables",
      ],
      ["cms", "sites", "pages", "centralisee", "centralized"],
    ],
    [
      ["content references", "references de contenu", "linked content", "contenu lie"],
      ["source", "reuse", "reutilisation", "reference"],
    ],
  ],
  "property-content": [
    [
      [
        "content type",
        "content types",
        "type de contenu",
        "types de contenu",
        "content model",
        "modele de contenu",
      ],
      ["editorial properties", "proprietes editoriales", "fields", "champs", "cnd"],
    ],
  ],
  "visibility-condition": [
    [
      [
        "visibility conditions",
        "conditions de visibilite",
        "conditional display",
        "affichage conditionnel",
        "display conditions",
        "conditions d affichage",
      ],
    ],
    [
      [
        "display content based on",
        "afficher le contenu en fonction",
        "show or hide",
        "afficher ou masquer",
      ],
      ["permissions", "roles", "authenticated", "authentifie", "conditions"],
    ],
  ],
  "event-jexperience": [
    [
      ["jexperience", "unomi", "jcustomer"],
      ["event", "events", "evenement", "evenements"],
      [
        "collect",
        "collected",
        "collecte",
        "collectees",
        "collectes",
        "tracking",
        "suivi",
        "interaction",
        "interactions",
        "behavior",
        "behaviors",
        "comportement",
        "comportements",
      ],
    ],
  ],
  "property-jexperience": [
    [
      ["jexperience", "unomi", "jcustomer"],
      [
        "visitor profile",
        "visitor profiles",
        "profil visiteur",
        "profils visiteurs",
        "profil des visiteurs",
      ],
      [
        "attribute",
        "attributes",
        "attribut",
        "attributs",
        "enrich",
        "enriched",
        "enrichir",
        "enrichis",
        "customer data",
        "donnees clients",
      ],
    ],
  ],
};

export interface ResourceOptions {
  conceptTerms?: string[];
  conceptScope?: string[];
  conceptSignals?: string[];
  preferEducational?: boolean;
}
export function resourceProfile(
  key: string,
  options: ResourceOptions = {},
): string[][][] | undefined {
  const groups = [
    options.conceptTerms || [],
    options.conceptScope || [],
    options.conceptSignals || [],
  ].map((group) => [...new Set(group.map(canonical).filter(Boolean))]);
  return groups[0].length ? [groups.filter((group) => group.length)] : resourceConcepts[key];
}
export interface SelectionEvidence {
  reason:
    | "direct-title"
    | "direct-alias"
    | "direct-summary"
    | "direct-body"
    | "concept"
    | "context"
    | "related";
  score: number;
  phrases: string[];
  passage: string;
}
/** Excerpts are normalized for matching; the original page remains the editorial source. */
function excerpt(text: string, phrase: string): string {
  const normalized = canonical(text);
  const at = Math.max(0, normalized.indexOf(phrase));
  return normalized.slice(Math.max(0, at - 100), at + 350);
}
function resourceConceptEvidence(item: LinkCandidate, profile: string[][][]): SelectionEvidence[] {
  const heading = `${item.title} ${item.description || ""}`;
  const normalized = canonical(`${heading} ${item.content || ""}`);
  const evidence: SelectionEvidence[] = [];
  for (const groups of profile) {
    for (const anchor of groups[0]) {
      let start = 0;
      while ((start = normalized.indexOf(anchor, start)) !== -1) {
        const passage = normalized.slice(Math.max(0, start - 250), start + 350);
        start += anchor.length;
        const phrases = groups.map((group) => group.find((phrase) => contains(passage, phrase)));
        if (phrases.every(Boolean)) {
          const headingGroups = groups.filter((group) =>
            group.some((phrase) => contains(heading, phrase)),
          ).length;
          evidence.push({
            reason: "concept",
            score: 40 + Math.min(15, headingGroups * 5),
            phrases: phrases as string[],
            passage,
          });
          break;
        }
      }
    }
  }
  return evidence;
}
export function educationalPriority(item: LinkCandidate): { adjustment: number; reason: string } {
  const title = canonical(item.title);
  if (/^(?:pricing|tarifs|customers|clients|contact|request a demo|demander une demo)$/.test(title))
    return { adjustment: -12, reason: "commercial-navigation" };
  if (
    /\b(?:how to|how can|how integrators|comment|guide|tutorial|tutoriel|definition|what is|qu est ce|steps|etapes|comprendre|explained)\b/.test(
      title,
    )
  )
    return { adjustment: 8, reason: "educational-title" };
  return { adjustment: 0, reason: "neutral" };
}
export function rankLinksWithEvidence<T extends LinkCandidate>(
  candidates: T[],
  expressions: string[],
  themes: string[],
  excluded: string[],
  limit: number,
  relatedExpressions: string[] = [],
  context = "",
  concepts: string[] = [],
  resourceConcept = "",
  options: ResourceOptions = {},
): Array<{
  item: T;
  evidence: SelectionEvidence;
  educational: { adjustment: number; reason: string };
  score: number;
}> {
  const phrases = [...new Set(expressions.map(canonical).filter((value) => value.length >= 2))];
  const related = [
    ...new Set(
      relatedExpressions
        .map(canonical)
        .filter((value) => value.length >= 3 && usefulExpression(value)),
    ),
  ];
  candidates = candidates.filter(
    (item) => !themes.length || themes.some((id) => item.taxonomyIds?.includes(id)),
  );
  const profile = resourceProfile(resourceConcept, options);
  const contextMatches = profile ? new Map<string, number>() : contextScores(candidates, context);
  const conceptPhrases = concepts.map(canonical).filter(usefulExpression);
  const blocked = new Set(excluded);
  const seen = new Set<string>();
  return candidates
    .filter((item) => !blocked.has(item.id) && !seen.has(item.id) && Boolean(seen.add(item.id)))
    .flatMap((item) => {
      const matches: SelectionEvidence[] = profile ? resourceConceptEvidence(item, profile) : [];
      const add = (
        reason: SelectionEvidence["reason"],
        score: number,
        phrase: string,
        text: string,
      ) => {
        if (score > 0)
          matches.push({ reason, score, phrases: [phrase], passage: excerpt(text, phrase) });
      };
      for (const phrase of phrases) {
        if (contains(item.title, phrase)) add("direct-title", 100, phrase, item.title);
        else if ((item.aliases || []).some((alias) => contains(alias, phrase)))
          add("direct-alias", 90, phrase, (item.aliases || []).join(" "));
        else if (contains(item.description || "", phrase))
          add("direct-summary", 80, phrase, item.description || "");
        else if (contains(item.content || "", phrase))
          add("direct-body", 60, phrase, item.content || "");
      }
      for (const phrase of conceptPhrases) {
        if (
          canonical(item.title) === phrase ||
          (item.aliases || []).some((alias) => canonical(alias) === phrase)
        )
          add("concept", 85, phrase, item.title);
      }
      if (!profile) {
        for (const phrase of related) {
          if (contains(item.title, phrase)) add("related", 30, phrase, item.title);
          else if (contains(item.description || "", phrase))
            add("related", 20, phrase, item.description || "");
        }
        const score = contextMatches.get(item.id) || 0;
        if (score) {
          const text = `${item.title} ${item.description || ""} ${item.content || ""}`;
          const words = new Set(tokens(text));
          const shared = tokens(context).filter((word) => words.has(word));
          matches.push({
            reason: "context",
            score,
            phrases: shared,
            passage: excerpt(text, shared[0] || ""),
          });
        }
      }
      const evidence = matches.sort((a, b) => b.score - a.score)[0];
      if (!evidence) return [];
      const educational = options.preferEducational
        ? educationalPriority(item)
        : { adjustment: 0, reason: "disabled" };
      // The preference only orders already-relevant items within their relevance tier.
      return [{ item, evidence, educational, score: evidence.score + educational.adjustment }];
    })
    .sort(
      (a, b) =>
        Number(b.evidence.score >= 60) - Number(a.evidence.score >= 60) ||
        b.score - a.score ||
        a.item.title.localeCompare(b.item.title) ||
        a.item.id.localeCompare(b.item.id),
    )
    .slice(0, limit);
}
export function rankLinks<T extends LinkCandidate>(
  candidates: T[],
  expressions: string[],
  themes: string[],
  excluded: string[],
  limit: number,
  relatedExpressions: string[] = [],
  context = "",
  concepts: string[] = [],
  resourceConcept = "",
  options: ResourceOptions = {},
): T[] {
  return rankLinksWithEvidence(
    candidates,
    expressions,
    themes,
    excluded,
    limit,
    relatedExpressions,
    context,
    concepts,
    resourceConcept,
    options,
  ).map((result) => result.item);
}
