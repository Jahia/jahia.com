export interface SimilarityProfile {
  tags: string[];
  countries: string[];
  level?: string;
}

const sharedCount = (left: string[], right: string[]) => {
  const values = new Set(left);
  return [...new Set(right)].filter((value) => value && values.has(value)).length;
};

/** Candidates are already filtered by type/region and ordered by title. */
export const rankSimilarPartners = <T extends SimilarityProfile>(
  current: SimilarityProfile,
  candidates: T[],
  limit = 3,
): T[] =>
  candidates
    .map((candidate, index) => ({
      candidate,
      index,
      tags: sharedCount(current.tags, candidate.tags),
      countries: sharedCount(current.countries, candidate.countries),
      level: Number(Boolean(current.level) && current.level === candidate.level),
    }))
    .sort(
      (a, b) =>
        b.tags - a.tags || b.countries - a.countries || b.level - a.level || a.index - b.index,
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
