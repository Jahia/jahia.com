/** Brand blog metadata without shortening or replacing the editorial title. */
export function blogMetaTitle(value: string | undefined, fallback = ""): string {
  const source = (value || "").trim() || fallback.trim();
  if (!source) return "";
  const stem = source.replace(/(?:\s*[-|–—]\s*Jahia\s*)+$/i, "").trimEnd();
  return stem ? stem + " - Jahia" : source;
}
