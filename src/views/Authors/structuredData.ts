import { socialUrl } from "./socialLinks.js";

/** GraalVM-compatible URL resolution: no browser URL global or invented public domain. */
export function authorAbsoluteUrl(path: string, origin: string) {
  const absolute = /^https?:\/\//i.test(path)
    ? path
    : path.startsWith("/") && !path.startsWith("//")
      ? (origin.match(/^https?:\/\/[^/?#]+/i)?.[0] || "") + path
      : "";
  const authority = absolute.match(/^https?:\/\/([^/?#]+)/i)?.[1];
  if (
    !authority ||
    !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(authority) ||
    /[\s@\\]/.test(absolute) ||
    /^(null|undefined)(:\d+)?$/i.test(authority)
  )
    return "";
  return absolute;
}

export function authorProfileSchema(input: {
  url: string;
  name: string;
  language: string;
  jobTitle?: string;
  description?: string;
  linkedin?: string;
  reddit?: string;
  github?: string;
  updated?: string;
}) {
  if (!authorAbsoluteUrl(input.url, "") || !input.name.trim()) return undefined;
  const sameAs = [
    socialUrl(input.linkedin || "", "linkedin"),
    socialUrl(input.reddit || "", "reddit"),
    socialUrl(input.github || "", "github"),
  ].filter(Boolean);
  const updated = input.updated ? Date.parse(input.updated) : NaN;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": input.url + "#profile",
    "url": input.url,
    "inLanguage": input.language,
    ...(Number.isFinite(updated) ? { dateModified: new Date(updated).toISOString() } : {}),
    "mainEntity": {
      "@type": "Person",
      "@id": input.url + "#person",
      "name": input.name,
      "url": input.url,
      ...(input.jobTitle?.trim() ? { jobTitle: input.jobTitle.trim() } : {}),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    },
  };
}

export const authorSchemaJson = (schema: NonNullable<ReturnType<typeof authorProfileSchema>>) =>
  JSON.stringify(schema).replaceAll("<", "\\u003c");
