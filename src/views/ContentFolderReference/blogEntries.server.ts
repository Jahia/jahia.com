import { useJCRQuery } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
export const timestamp = (entry: JCRNodeWrapper, propertyName: string) => {
  if (!entry.hasProperty(propertyName)) return 0;
  try {
    const dateValue = entry.getProperty(propertyName).getValue() as unknown as {
      getDate: () => { getTimeInMillis: () => number };
    };
    const value = Number(dateValue.getDate().getTimeInMillis());
    if (Number.isFinite(value)) return value;
  } catch {
    // Fall through to support legacy string properties.
  }

  const fallback = Date.parse(entry.getPropertyAsString(propertyName));
  return Number.isFinite(fallback) ? fallback : 0;
};

const isPublished = (entry: JCRNodeWrapper) =>
  entry.hasProperty("j:published") && entry.getProperty("j:published").getBoolean();

const isCurrentlyVisible = (entry: JCRNodeWrapper) => {
  const publicationDate = timestamp(entry, "date");
  return (
    isPublished(entry) &&
    (!publicationDate || publicationDate <= Date.now()) &&
    entry.hasProperty("jcr:title") &&
    Boolean(entry.getPropertyAsString("jcr:title").trim())
  );
};

export const eligibleBlogEntries = (folder: JCRNodeWrapper) => {
  const path = "'" + folder.getPath().replace(/'/g, "''") + "'";
  return useJCRQuery({
    query:
      "SELECT * FROM [jahiacom:blogEntry] WHERE ISDESCENDANTNODE(" +
      path +
      ") AND [j:published] = true AND [date] <= CAST('" +
      new Date().toISOString() +
      "' AS DATE) ORDER BY [date] DESC",
  }).filter(isCurrentlyVisible);
};
