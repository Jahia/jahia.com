import { parseFragment, serialize, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["childNode"];
export interface InlineTerm {
  id: string;
  url: string;
  labels: string[];
  urlAliases?: string[];
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const key = (value: string) => value.normalize("NFC").toLocaleLowerCase();
// Standalone table labels are explicit concepts; these short words in prose are ambiguous.
const ambiguousProseLabels = new Set([
  "vue",
  "view",
  "champ",
  "field",
  "zone",
  "area",
  "enfant",
  "child",
]);
const unlinked = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "thead", "caption"]);
const isColumnHeader = (node: Node) =>
  "tagName" in node &&
  node.tagName === "th" &&
  node.attrs.some(({ name, value }) => name === "scope" && /^(col|colgroup)$/i.test(value));
const blocked = new Set(["a", ...unlinked, "code", "pre", "script", "style", "textarea", "button"]);

/** Link every unambiguous mention, preserving existing markup and editorial links. */
export function linkTermMentions(
  sections: string[],
  terms: InlineTerm[],
  currentId: string,
  enabled = true,
): string[] {
  const labels = new Map<string, { label: string; term: InlineTerm } | null>();
  for (const term of terms) {
    if (!/^(?:\/(?!\/)|https?:\/\/)/i.test(term.url)) continue;
    for (const label of term.labels
      .map((value) => value.trim())
      .filter((value) => value.length > 1)) {
      const normalized = key(label);
      const previous = labels.get(normalized);
      if (previous === null || (previous && previous.term.id !== term.id))
        labels.set(normalized, null);
      else labels.set(normalized, { label, term });
    }
  }
  const usable = [...labels.values()].filter((item) => item && item.term.id !== currentId);
  const pattern = usable
    .map((item) => item!.label)
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const expression = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, "giu");
  const documents = sections.map((html) => parseFragment(html));
  const urls = new Map(
    terms.flatMap((term) =>
      [term.url, ...(term.urlAliases || [])].map((url) => [url, term] as const),
    ),
  );
  const markLinks = (nodes: Node[], insideUnlinked = false): Node[] =>
    nodes.flatMap((node): Node[] => {
      const suppress =
        insideUnlinked || isColumnHeader(node) || ("tagName" in node && unlinked.has(node.tagName));
      if ("childNodes" in node) node.childNodes = markLinks(node.childNodes, suppress);
      if (suppress && "tagName" in node && node.tagName === "a") return node.childNodes;
      if ("tagName" in node && node.tagName === "a") {
        const href = node.attrs.find((attr) => attr.name === "href");
        const target = href && urls.get(href.value.split(/[?#]/)[0]);
        if (target && href) {
          // Resolve editorial vanity links through Jahia in both preview and live mode.
          href.value = target.url + href.value.slice(href.value.split(/[?#]/)[0].length);
        }
      }
      return [node];
    });
  documents.forEach((document) => {
    document.childNodes = markLinks(document.childNodes);
  });
  if (!enabled || !usable.length) return documents.map((document) => serialize(document));
  const visit = (nodes: Node[]): Node[] =>
    nodes.flatMap((node): Node[] => {
      if (isColumnHeader(node) || ("tagName" in node && blocked.has(node.tagName))) return [node];
      if ("tagName" in node && /^(?:th|td|p)$/.test(node.tagName)) {
        const inlineText = (children: Node[]): string | null => {
          let value = "";
          for (const child of children) {
            if (child.nodeName === "#text" && "value" in child) value += child.value;
            else if (
              "tagName" in child &&
              ["strong", "em", "b", "i", "span", "small", "sup", "sub"].includes(child.tagName)
            ) {
              const nested = inlineText(child.childNodes);
              if (nested === null) return null;
              value += nested;
            } else return null;
          }
          return value;
        };
        const value = inlineText(node.childNodes)?.trim();
        const exact = value ? labels.get(key(value)) : undefined;
        if (
          exact &&
          exact.term.id !== currentId &&
          (!/^[A-Z0-9]{2,5}$/.test(exact.label) || value === exact.label)
        ) {
          node.childNodes = parseFragment(
            `<a href="${escapeHtml(exact.term.url)}" data-glossary-mention="true">${serialize(node)}</a>`,
          ).childNodes;
          return [node];
        }
      }
      if (node.nodeName === "#text" && "value" in node) {
        let cursor = 0;
        let html = "";
        for (const match of node.value.matchAll(expression)) {
          const item = labels.get(key(match[0]));
          if (!item || item.term.id === currentId || ambiguousProseLabels.has(key(match[0])))
            continue;
          // Short uppercase acronyms must not turn ordinary words into links.
          if (/^[A-Z0-9]{2,5}$/.test(item.label) && match[0] !== item.label) continue;
          html += escapeHtml(node.value.slice(cursor, match.index));
          html += `<a href="${escapeHtml(item.term.url)}" data-glossary-mention="true">${escapeHtml(match[0])}</a>`;
          cursor = match.index + match[0].length;
        }
        if (!cursor) return [node];
        html += escapeHtml(node.value.slice(cursor));
        return parseFragment(html).childNodes;
      }
      if ("childNodes" in node) node.childNodes = visit(node.childNodes);
      return [node];
    });
  return documents.map((document) => {
    document.childNodes = visit(document.childNodes);
    return serialize(document);
  });
}

export function splitDefinition(html: string): { lead: string; body: string } {
  const fragment = parseFragment(html);
  const first = fragment.childNodes.findIndex(
    (node) => node.nodeName !== "#text" || ("value" in node && node.value.trim()),
  );
  const paragraph = fragment.childNodes[first];
  if (!paragraph || !("tagName" in paragraph) || paragraph.tagName !== "p")
    return { lead: "", body: html };
  fragment.childNodes.splice(first, 1);
  return { lead: serialize(paragraph), body: serialize(fragment) };
}
