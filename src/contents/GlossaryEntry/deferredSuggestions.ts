export interface SuggestionLink {
  id: string;
  title: string;
  url: string;
}

export interface EntryResource extends SuggestionLink {
  kind: string;
  description?: string;
}

export interface GlossarySuggestions {
  resources: EntryResource[];
  terms: SuggestionLink[];
}

const isLink = (value: unknown, origin: string): value is SuggestionLink => {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<SuggestionLink>;
  if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.url !== "string")
    return false;
  if (!row.url.startsWith("/") && !/^https?:\/\//i.test(row.url)) return false;
  const url = new URL(row.url, origin);
  return url.origin === origin && !url.username && !url.password;
};

export function parseSuggestionsPayload(payload: string, origin: string): GlossarySuggestions {
  const value: unknown = JSON.parse(payload);
  if (!value || typeof value !== "object") throw new Error("Invalid glossary suggestions");
  const rows = value as Partial<GlossarySuggestions>;
  if (
    !Array.isArray(rows.resources) ||
    rows.resources.length > 9 ||
    rows.resources.some((row) => !isLink(row, origin) || typeof row.kind !== "string") ||
    !Array.isArray(rows.terms) ||
    rows.terms.length > 6 ||
    rows.terms.some((row) => !isLink(row, origin))
  )
    throw new Error("Invalid glossary suggestions");
  return { resources: rows.resources, terms: rows.terms };
}

/** The separate Jahia template supplies inert, escaped data, never executable markup. */
export async function loadSuggestions(
  endpoint: string,
  signal: AbortSignal,
): Promise<GlossarySuggestions> {
  const url = new URL(endpoint, location.origin);
  if (url.origin !== location.origin || url.username || url.password)
    throw new Error("Cross-origin glossary endpoint");
  const response = await fetch(url, { signal, credentials: "same-origin", redirect: "error" });
  if (!response.ok) throw new Error("Glossary suggestions unavailable");
  const document = new DOMParser().parseFromString(await response.text(), "text/html");
  const payload = document
    .querySelector("[data-glossary-resources]")
    ?.getAttribute("data-glossary-resources");
  if (!payload) throw new Error("Missing glossary suggestions");
  return parseSuggestionsPayload(payload, location.origin);
}
