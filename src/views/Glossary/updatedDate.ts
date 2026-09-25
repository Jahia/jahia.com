import type { JCRNodeWrapper } from "org.jahia.services.content";

export function nodeModifiedAt(node: JCRNodeWrapper): number {
  return Math.max(
    ...["jcr:lastModified", "jcr:created"].map((name) => {
      if (!node.hasProperty(name)) return 0;
      try {
        const value = node.getProperty(name).getValue() as unknown as {
          getDate: () => { getTimeInMillis: () => number };
        };
        const timestamp = Number(value.getDate().getTimeInMillis());
        return Number.isFinite(timestamp) ? timestamp : 0;
      } catch {
        const timestamp = Date.parse(node.getPropertyAsString(name));
        return Number.isFinite(timestamp) ? timestamp : 0;
      }
    }),
  );
}

export function glossaryUpdatedLabel(timestamp: number, language: string): string | undefined {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
  return new Intl.DateTimeFormat(language, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
