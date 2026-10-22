/** Reuse pure text conversion without retaining JCR nodes or access decisions.
 * Limits count UTF-16 code units of keys and results, not total heap bytes.
 */
export function createBoundedTextReader(
  convert: (html: string) => string,
  { maxEntries = 8192, maxCharacters = 10_000_000 } = {},
): (html: string) => string {
  const cache = new Map<string, string>();
  let characters = 0;
  return (html) => {
    const cached = cache.get(html);
    if (cached !== undefined) {
      cache.delete(html);
      cache.set(html, cached);
      return cached;
    }
    const text = convert(html);
    const size = html.length + text.length;
    if (maxEntries < 1 || size > maxCharacters) return text;
    while (cache.size >= maxEntries || characters + size > maxCharacters) {
      const key = cache.keys().next().value;
      if (key === undefined) break;
      characters -= key.length + cache.get(key)!.length;
      cache.delete(key);
    }
    cache.set(html, text);
    characters += size;
    return text;
  };
}
