import { canonical, tokens, usefulExpression, type LinkCandidate } from "./linkSelection.js";

export const RELATED_TERMS_MIN = 4;
export const RELATED_TERMS_MAX = 6;
export interface RelatedCandidate extends LinkCandidate {
  comparison?: string;
  concepts?: string[];
}

// Vocabulary equivalences, not curated links between individual entries.
const equivalents: Record<string, string> = {
  zone: "area",
  zones: "area",
  areas: "area",
  templates: "template",
  portail: "portal",
  portails: "portal",
  portals: "portal",
  reference: "reference",
  references: "reference",
  composant: "component",
  composants: "component",
  components: "component",
  propriete: "property",
  proprietes: "property",
  properties: "property",
  champ: "field",
  champs: "field",
  fields: "field",
  dossier: "folder",
  dossiers: "folder",
  folders: "folder",
  utilisateur: "user",
  utilisateurs: "user",
  users: "user",
  visiteur: "visitor",
  visiteurs: "visitor",
  visitors: "visitor",
  personnalisation: "personalization",
  personnaliser: "personalization",
  gestion: "management",
  donnees: "data",
  contenu: "content",
  contenus: "content",
  publication: "publishing",
  publier: "publishing",
  workflow: "workflow",
  hybride: "hybrid",
  traditionnel: "traditional",
  traditionnelle: "traditional",
  hebergement: "hosting",
  nuage: "cloud",
  statique: "static",
  dynamique: "dynamic",
};
const words = (text: string) => [...new Set(tokens(text).map((word) => equivalents[word] || word))];
const phrase = (text: string) =>
  canonical(text)
    .split(" ")
    .map((w) => equivalents[w] || w)
    .join(" ");
const names = (item: LinkCandidate) =>
  [item.title, ...(item.aliases || [])].filter(usefulExpression);
const document = (item: RelatedCandidate) =>
  `${item.title} ${(item.aliases || []).join(" ")} ${item.description || ""} ${item.content || ""} ${item.comparison || ""}`;

// Specific editorial domains. These are vocabulary rules, not hand-picked links.
const domains = (item: LinkCandidate) => {
  const title = canonical([item.title, ...(item.aliases || [])].join(" "));
  const rules: Array<[string, RegExp]> = [
    ["portals", /\b(portal|portals|portail|portails|intranet|extranet)\b/],
    [
      "delivery",
      /headless|hybrid|traditional|decoupled|static|dynamic website|content as a service|graphql/,
    ],
    ["platform", /\b(cms|dxp|composable|monolithic)\b|content management|digital experience/],
    ["hosting", /hosting|cloud|on premise|hebergement/],
    ["multisite", /multisite|multilingual|site factory/],
    ["assets", /\bdam\b|digital asset/],
    ["rendering", /\b(area|template|view|component|module)\b/],
    [
      "structure",
      /\b(field|fieldset|repository|reference|child)\b|content (type|item|folder)|property content|displayable/,
    ],
    ["workflow", /workflow|lifecycle|workspace|work in progress|content editor/],
    ["taxonomy", /category|classification|tags|site search|vanity/],
    ["personalization", /audience|visitor|conversion|goal|jexperience|a b test|visibility/],
  ];
  return new Set(rules.filter(([, pattern]) => pattern.test(title)).map(([domain]) => domain));
};
const distinctiveName = (name: string) =>
  phrase(name).split(" ").length > 1 ||
  /^[A-Z0-9/]+$/.test(name) ||
  /headless|intranet|extranet|graphql/i.test(name);

// Per-JavaScript-context LRU. Exact content keys avoid collisions and stale editorial data.
// No JCR wrappers, render contexts, URLs or permission decisions are retained.
function prepareCorpus(documents: RelatedCandidate[]) {
  const sets = documents.map((item) => new Set(words(document(item))));
  const weights = new Map<string, number>();
  for (const set of sets) for (const word of set) weights.set(word, (weights.get(word) || 0) + 1);
  for (const [word, count] of weights) weights.set(word, Math.log(1 + documents.length / count));
  const vector = (item: RelatedCandidate) => {
    const map = new Map<string, number>();
    for (const [text, boost] of [
      [document(item), 1],
      [item.description || "", 2],
      [names(item).join(" "), 3],
    ] as const)
      for (const word of words(text))
        map.set(word, (map.get(word) || 0) + boost * (weights.get(word) || 0));
    return map;
  };
  const normalizedDocuments = new Map(
    documents.map((item) => [item.id, ` ${phrase(document(item))} `]),
  );
  const normalizedNames = new Map(
    documents.map((item) => [item.id, names(item).map((name) => ` ${phrase(name)} `)]),
  );
  const comparisonPhrases = new Map(
    documents.map((item) => [item.id, new Set((item.concepts || []).map(phrase))]),
  );
  const graphNames = new Map(
    documents.map((item) => [
      item.id,
      names(item)
        .filter((name) => distinctiveName(name) && phrase(name).split(" ").length > 1)
        .map((name) => ` ${phrase(name)} `),
    ]),
  );
  const explicitReference = (from: RelatedCandidate, to: RelatedCandidate) =>
    normalizedNames.get(to.id)!.some((name) => comparisonPhrases.get(from.id)!.has(name.trim()));
  const mentions = (from: RelatedCandidate, to: RelatedCandidate) =>
    graphNames.get(to.id)!.some((name) => normalizedDocuments.get(from.id)!.includes(name));
  // Only explicit comparisons and distinctive mentions establish graph edges.
  const edges = new Map(documents.map((item) => [item.id, new Set<string>()]));
  for (let i = 0; i < documents.length; i++)
    for (let j = i + 1; j < documents.length; j++) {
      const a = documents[i],
        b = documents[j];
      if (explicitReference(a, b) || explicitReference(b, a) || mentions(a, b) || mentions(b, a)) {
        edges.get(a.id)!.add(b.id);
        edges.get(b.id)!.add(a.id);
      }
    }
  return {
    vectors: new Map(documents.map((item) => [item.id, vector(item)])),
    normalizedDocuments,
    normalizedNames,
    edges,
    results: new Map<string, Array<{ id: string; reason: string; via: string[] }>>(),
  };
}
const corpusCache = new Map<string, ReturnType<typeof prepareCorpus>>();
let cacheStats = { prepared: 0, corpusHits: 0, resultHits: 0, evictions: 0 };
export function resetRelatedCache() {
  corpusCache.clear();
  cacheStats = { prepared: 0, corpusHits: 0, resultHits: 0, evictions: 0 };
}
export function getRelatedCacheStats() {
  return { ...cacheStats, corpora: corpusCache.size };
}
const getCorpus = (documents: RelatedCandidate[]) => {
  const ordered = [...documents].sort((a, b) => a.id.localeCompare(b.id));
  const key = JSON.stringify(
    ordered.map((item) => [
      item.id,
      item.title,
      item.aliases || [],
      item.description || "",
      item.content || "",
      item.comparison || "",
      item.concepts || [],
      item.taxonomyIds || [],
    ]),
  );
  const found = corpusCache.get(key);
  if (found) {
    corpusCache.delete(key);
    corpusCache.set(key, found);
    cacheStats.corpusHits++;
    return found;
  }
  const prepared = prepareCorpus(ordered);
  cacheStats.prepared++;
  // Large catalogues still work; they simply avoid retaining excessive memory here.
  if (documents.length <= 300 && key.length <= 1_000_000) {
    if (corpusCache.size >= 4) {
      corpusCache.delete(corpusCache.keys().next().value!);
      cacheStats.evictions++;
    }
    corpusCache.set(key, prepared);
  }
  return prepared;
};

/** Select direct relations first, then nearest vocabulary neighbours to reach the minimum. */
export function selectRelatedTermDetails<T extends RelatedCandidate>(
  candidates: T[],
  current: RelatedCandidate,
  concepts: string[] = [],
): Array<{ item: T; reason: string; via: string[] }> {
  const seen = new Set([current.id]);
  const pool = candidates.filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
  if (!pool.length) return [];
  const documents = [...pool, current];
  const prepared = getCorpus(documents);
  const resultKey = JSON.stringify([current.id, concepts]);
  const cachedResult = prepared.results.get(resultKey);
  if (cachedResult) {
    cacheStats.resultHits++;
    const eligible = new Map(pool.map((item) => [item.id, item]));
    return cachedResult
      .filter((entry) => eligible.has(entry.id))
      .map((entry) => ({
        item: eligible.get(entry.id)!,
        reason: entry.reason,
        via: [...entry.via],
      }));
  }
  const { normalizedDocuments, normalizedNames, edges } = prepared;
  const vector = (item: RelatedCandidate) => prepared.vectors.get(item.id)!;
  const currentVector = vector(current);
  const currentDomains = domains(current);
  const currentText = normalizedDocuments.get(current.id)!;
  const similarity = (a: Map<string, number>, b: Map<string, number>) => {
    let dot = 0,
      normA = 0,
      normB = 0;
    for (const [word, value] of a) {
      dot += value * (b.get(word) || 0);
      normA += value * value;
    }
    for (const value of b.values()) normB += value * value;
    return dot / (Math.sqrt(normA * normB) || 1);
  };
  const topicAffinity = (other: Set<string>) => {
    const union = new Set([...currentDomains, ...other]);
    const common = [...currentDomains].filter((domain) => other.has(domain));
    return common.length / (union.size || 1);
  };

  const ranked = pool
    .map((item) => {
      const itemNames = names(item);
      const explicit = itemNames.some((name) =>
        concepts.some((concept) => phrase(concept) === phrase(name)),
      );
      const matchNames = normalizedNames.get(item.id)!;
      const forward = itemNames
        .filter(distinctiveName)
        .some((name) => currentText.includes(` ${phrase(name)} `));
      const reverse = names(current)
        .filter(distinctiveName)
        .some((name) => normalizedDocuments.get(item.id)!.includes(` ${phrase(name)} `));
      const itemDomains = domains(item);
      const sameDomain = [...currentDomains].some((domain) => itemDomains.has(domain));
      const architecture = new Set([
        "delivery",
        "platform",
        "hosting",
        "multisite",
        "assets",
        "portals",
      ]);
      const adjacentArchitecture =
        [...currentDomains].some((domain) => architecture.has(domain)) &&
        [...itemDomains].some((domain) => architecture.has(domain));
      const compatible =
        sameDomain || adjacentArchitecture || currentDomains.size === 0 || itemDomains.size === 0;
      const overlap = similarity(currentVector, vector(item));
      const shared = documents.filter(
        (bridge) => edges.get(current.id)!.has(bridge.id) && edges.get(item.id)!.has(bridge.id),
      );
      // Highly connected generic concepts provide less evidence than specific bridges.
      const graphScore = shared.reduce(
        (sum, bridge) => sum + 1 / Math.max(1, edges.get(bridge.id)!.size),
        0,
      );
      const affinity = topicAffinity(itemDomains);
      const taxonomyMatch = (current.taxonomyIds || []).some((id) =>
        item.taxonomyIds?.includes(id),
      );
      // Connectivity is only a tie-breaker when lexical evidence is equal.
      const connections = pool.filter(
        (other) =>
          other.id !== item.id &&
          matchNames.some((name) => normalizedDocuments.get(other.id)!.includes(name)),
      ).length;
      return {
        item,
        strength: explicit ? 3 : forward ? 2 : reverse ? 1 : 0,
        compatible,
        overlap,
        connections,
        affinity,
        graphScore: Math.min(graphScore, 0.5),
        shared,
        taxonomyMatch,
      };
    })
    .sort(
      (a, b) =>
        b.strength - a.strength ||
        Number(b.compatible) - Number(a.compatible) ||
        b.affinity +
          b.graphScore +
          b.overlap +
          Number(b.taxonomyMatch) * 0.1 -
          (a.affinity + a.graphScore + a.overlap + Number(a.taxonomyMatch) * 0.1) ||
        b.connections - a.connections ||
        a.item.title.localeCompare(b.item.title) ||
        a.item.id.localeCompare(b.item.id),
    );
  const strong = ranked.filter(
    (entry) => entry.strength > 0 || (entry.compatible && entry.overlap >= 0.22),
  ).length;
  const count = Math.min(pool.length, RELATED_TERMS_MAX, Math.max(RELATED_TERMS_MIN, strong));
  const result = ranked.slice(0, count).map((entry) => ({
    item: entry.item,
    reason:
      entry.strength === 3
        ? "comparison"
        : entry.strength > 0
          ? "mention"
          : entry.shared.length && entry.compatible
            ? "shared-concepts"
            : entry.compatible
              ? "same-domain"
              : "broader-discovery",
    via: entry.shared
      .sort(
        (a, b) => edges.get(a.id)!.size - edges.get(b.id)!.size || a.title.localeCompare(b.title),
      )
      .slice(0, 2)
      .map((item) => item.title),
  }));
  if (prepared.results.size >= 128) prepared.results.delete(prepared.results.keys().next().value!);
  prepared.results.set(
    resultKey,
    result.map((entry) => ({ id: entry.item.id, reason: entry.reason, via: [...entry.via] })),
  );
  return result;
}

export function selectRelatedTerms<T extends RelatedCandidate>(
  candidates: T[],
  current: RelatedCandidate,
  concepts: string[] = [],
): T[] {
  return selectRelatedTermDetails(candidates, current, concepts).map((entry) => entry.item);
}

/** A shared bilingual profile makes relation IDs independent of the display language. */
export function mergeRelatedTranslations(
  id: string,
  translations: Array<RelatedCandidate & { language: string; concepts?: string[] }>,
): RelatedCandidate & { concepts: string[] } {
  const ordered = [...translations].sort((a, b) => a.language.localeCompare(b.language));
  return {
    id,
    title: ordered[0]?.title || "",
    aliases: [...new Set(ordered.flatMap((entry) => [entry.title, ...(entry.aliases || [])]))],
    description: ordered.map((entry) => entry.description || "").join(" "),
    content: ordered.map((entry) => entry.content || "").join(" "),
    comparison: ordered.map((entry) => entry.comparison || "").join(" "),
    concepts: [...new Set(ordered.flatMap((entry) => entry.concepts || []))],
    taxonomyIds: [...new Set(ordered.flatMap((entry) => entry.taxonomyIds || []))],
  };
}
