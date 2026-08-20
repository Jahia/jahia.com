import { readFile, writeFile } from "node:fs/promises";

const origin = "https://www.jahia.com";
const sections = {
  blog: "/fr/blog",
  customerStories: "/fr/clients",
  resources: "/fr/ressources",
};

const decodeHtml = (value) =>
  value.replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", '"');

const fetchText = async (path) => {
  const response = await fetch(new URL(path, origin));
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${path}`);
  }

  return response.text();
};

const extractContents = (html) => {
  const contents = new Map();
  const articlePattern = /<article\b[\s\S]*?<\/article>/g;
  const linkPattern = /<a\b[^>]*\bhref="([^"]+)"[^>]*\bdata-element-name="([^"]+)"[^>]*>/;
  for (const article of html.matchAll(articlePattern)) {
    const match = article[0].match(linkPattern);
    if (!match) continue;
    const href = decodeHtml(match[1]);
    const name = decodeHtml(match[2]);
    if (href.startsWith("/") && !contents.has(name)) {
      contents.set(name, href);
    }
  }

  return contents;
};

const extractCategoryPaths = (html) => {
  const match = html.match(/"categories"\s*:\s*(\[[^\]]*\])/);
  if (!match) {
    return [];
  }

  const paths = JSON.parse(match[1]);
  return Array.isArray(paths) ? [...new Set(paths)].sort() : [];
};

const outputUrl = new URL("../settings/category-migration-1.3.3.json", import.meta.url);
const dockerMapping = JSON.parse(await readFile(outputUrl, "utf8"));
const patchSource = await readFile(
  new URL(
    "../settings/patches/1.3.4-02-restore-content-categories.started.groovy",
    import.meta.url,
  ),
  "utf8",
);
const encodedBlock = patchSource.match(
  /final String encodedMapping =([\s\S]*?)(?=\r?\nfinal Map<String, List<Map<String, Object>>> mapping =)/,
)?.[1];
const embeddedMapping = encodedBlock
  ? JSON.parse(
      Buffer.from(
        [...encodedBlock.matchAll(/"([A-Za-z0-9+/=]+)"/g)].map((m) => m[1]).join(""),
        "base64",
      ),
    )
  : {};
const baseMapping = Object.fromEntries(
  Object.keys(sections).map((section) => {
    const merged = new Map((embeddedMapping[section] ?? []).map((entry) => [entry.name, entry]));
    for (const entry of dockerMapping[section] ?? []) merged.set(entry.name, entry);
    return [section, [...merged.values()]];
  }),
);
const mapping = {};
for (const [section, listingPath] of Object.entries(sections)) {
  const listing = await fetchText(listingPath);
  const contents = extractContents(listing);
  if (contents.size === 0) {
    throw new Error(`No content found in listing: ${listingPath}`);
  }

  const entries = [];
  for (const [name, href] of contents) {
    const detail = await fetchText(href);
    const publicPaths = extractCategoryPaths(detail);
    const dockerEntry = baseMapping[section]?.find((entry) => entry.name === name);
    const categoryPaths = publicPaths.length > 0 ? publicPaths : dockerEntry?.categoryPaths;
    if (!categoryPaths?.length) {
      throw new Error(`No public or Docker category assignment found: ${name} (${href})`);
    }
    entries.push({ name, categoryPaths });
  }

  const merged = new Map((baseMapping[section] ?? []).map((entry) => [entry.name, entry]));
  for (const entry of entries) merged.set(entry.name, entry);
  mapping[section] = [...merged.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  console.log(`${section}: ${mapping[section].length} content(s)`);
}

await writeFile(outputUrl, `${JSON.stringify(mapping, null, 2)}\n`);
