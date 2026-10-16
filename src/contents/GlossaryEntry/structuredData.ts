import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { sanitizeHtml } from "./sanitizeHtml.js";

type Node = DefaultTreeAdapterMap["childNode"];
const text = (node: Node): string =>
  "value" in node ? node.value : "childNodes" in node ? node.childNodes.map(text).join("") : "";
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

/** Parse the same sanitized rich text as the visible FAQ, including lists and emphasis. */
export function faqQuestions(html: string) {
  const questions: Array<{ name: string; answer: string }> = [];
  let current: { name: string; answer: string } | undefined;
  const visit = (node: Node) => {
    if ("tagName" in node && node.tagName === "h3") {
      current = { name: clean(text(node)), answer: "" };
      questions.push(current);
    } else if ("tagName" in node && /^h[12]$/.test(node.tagName)) {
      current = undefined;
    } else if ("childNodes" in node) {
      node.childNodes.forEach(visit);
      if (
        current &&
        "tagName" in node &&
        /^(p|div|li|ul|ol|br|blockquote|h[4-6])$/.test(node.tagName)
      )
        current.answer += " ";
    } else if (current && "value" in node) current.answer += node.value;
  };
  parseFragment(sanitizeHtml(html)).childNodes.forEach(visit);
  return questions
    .map(({ name, answer }) => ({ name, answer: clean(answer) }))
    .filter(({ name, answer }) => name && answer);
}

export type BreadcrumbItem = { name: string; url?: string };
export const breadcrumbSchema = (url: string, items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": `${url}#breadcrumb`,
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    ...(index < items.length - 1 && item.url ? { item: item.url } : {}),
  })),
});

const date = (value?: string) => {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
};

export function entrySchemas(input: {
  url: string;
  indexUrl?: string;
  title: string;
  htmlTitle?: string;
  summary: string;
  aliases?: string[];
  slug: string;
  language: string;
  editorialDate?: string;
  modified?: string;
  faq?: string;
  breadcrumbs: BreadcrumbItem[];
}) {
  const { url, indexUrl, language } = input;
  const questions = faqQuestions(input.faq || "");
  return [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "@id": `${url}#term`,
      "name": input.title,
      "description": input.summary,
      "url": url,
      "termCode": input.slug,
      ...(indexUrl ? { inDefinedTermSet: { "@id": `${indexUrl}#set` } } : {}),
      ...(input.aliases?.length ? { alternateName: input.aliases } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url,
      "url": url,
      "name": input.htmlTitle || input.title,
      "inLanguage": language,
      "mainEntity": { "@id": `${url}#term` },
      ...(indexUrl ? { isPartOf: { "@id": `${indexUrl}#set` } } : {}),
      ...(date(input.editorialDate) ? { datePublished: date(input.editorialDate) } : {}),
      ...(date(input.modified) ? { dateModified: date(input.modified) } : {}),
    },
    ...(input.breadcrumbs.length > 1 ? [breadcrumbSchema(url, input.breadcrumbs)] : []),
    ...(questions.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            "inLanguage": language,
            "mainEntity": questions.map(({ name, answer }) => ({
              "@type": "Question",
              name,
              "acceptedAnswer": { "@type": "Answer", "text": answer },
            })),
          },
        ]
      : []),
  ];
}

export function hubSchemas(input: {
  url: string;
  title: string;
  description?: string;
  language: string;
  entries: Array<{ title: string; url: string }>;
  breadcrumbs: BreadcrumbItem[];
}) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": `${input.url}#set`,
      "url": input.url,
      "name": input.title,
      "description": input.description,
      "inLanguage": input.language,
      "hasDefinedTerm": input.entries.map((entry) => ({
        "@type": "DefinedTerm",
        "name": entry.title,
        "url": entry.url,
      })),
    },
    breadcrumbSchema(input.url, input.breadcrumbs),
  ];
}

/** Prevent HTML script termination even when an editor supplies markup in a title. */
export const serializeSchema = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** Preserve unrelated editorial schemas while replacing previously hand-written glossary blocks. */
export function mergeSchemas(manual: string[] = [], generated: unknown[] = []) {
  const managed = new Set([
    "DefinedTerm",
    "DefinedTermSet",
    "WebPage",
    "BreadcrumbList",
    "FAQPage",
  ]);
  const keep = (value: Record<string, unknown>): Record<string, unknown> | undefined => {
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some((type) => managed.has(String(type)))) return undefined;
    if (Array.isArray(value["@graph"])) {
      const graph = value["@graph"].flatMap((item) =>
        item && typeof item === "object" ? [keep(item)].filter(Boolean) : [],
      );
      return graph.length ? { ...value, "@graph": graph } : undefined;
    }
    return value;
  };
  return [
    ...manual.flatMap((raw) => {
      try {
        const parsed = JSON.parse(raw);
        return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const value = keep(item);
          return value ? [serializeSchema(value)] : [];
        });
      } catch {
        return []; // An invalid editorial JSON string must not create an invalid script block.
      }
    }),
    ...generated.map(serializeSchema),
  ];
}
