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
// Only complete multi-word expressions are eligible for automatic linking.
const isCompleteExpression = (value: string) => /\S+\s+\S+/.test(value.trim());
const maximumAutomaticLinks = 6;
const unlinked = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "thead", "caption"]);
const isColumnHeader = (node: Node) =>
  "tagName" in node &&
  node.tagName === "th" &&
  node.attrs.some(({ name, value }) => name === "scope" && /^(col|colgroup)$/i.test(value));
const blocked = new Set(["a", ...unlinked, "code", "pre", "script", "style", "textarea", "button"]);

/** Link the first eligible mention per target, with a shared page-wide budget. */
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
  const usable = [...labels.values()].filter(
    (item) => item && item.term.id !== currentId && isCompleteExpression(item.label),
  );
  const pattern = usable
    .map((item) => item!.label)
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const expression = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, "giu");
  const documents = sections.map((html) => parseFragment(html));
  // This is the paragraph moved directly below H1 by splitDefinition.
  const first = documents[0]?.childNodes.find(
    (node) => node.nodeName !== "#text" || ("value" in node && node.value.trim()),
  );
  const introduction = first && "tagName" in first && first.tagName === "p" ? first : undefined;
  const urls = new Map(
    terms.flatMap((term) =>
      [term.url, ...(term.urlAliases || [])].map((url) => [url, term] as const),
    ),
  );
  const markLinks = (nodes: Node[], insideUnlinked = false): Node[] =>
    nodes.flatMap((node): Node[] => {
      const suppress =
        insideUnlinked ||
        node === introduction ||
        isColumnHeader(node) ||
        ("tagName" in node && unlinked.has(node.tagName));
      if ("childNodes" in node) node.childNodes = markLinks(node.childNodes, suppress);
      if (
        "tagName" in node &&
        node.tagName === "a" &&
        (suppress || node.attrs.some((attr) => attr.name === "data-glossary-mention"))
      )
        return node.childNodes;
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
  if (!enabled) return documents.map((document) => serialize(document));
  const linkedTargets = new Set<string>();
  let automaticCount = 0;
  const eligible = (item: { label: string; term: InlineTerm }) =>
    item.term.id !== currentId &&
    isCompleteExpression(item.label) &&
    !linkedTargets.has(item.term.id) &&
    automaticCount < maximumAutomaticLinks;
  const remember = (id: string) => {
    linkedTargets.add(id);
    automaticCount++;
  };
  const visit = (nodes: Node[]): Node[] =>
    nodes.flatMap((node): Node[] => {
      if (node === introduction) return [node];
      if ("tagName" in node && node.tagName === "a") {
        const href = node.attrs.find((attr) => attr.name === "href");
        const target = href && urls.get(href.value.split(/[?#]/)[0]);
        if (target) {
          if (linkedTargets.has(target.id)) return node.childNodes;
          linkedTargets.add(target.id);
        }
        return [node];
      }
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
          eligible(exact) &&
          (!/^[A-Z0-9]{2,5}$/.test(exact.label) || value === exact.label)
        ) {
          remember(exact.term.id);
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
          if (!item || !eligible(item)) continue;
          // Short uppercase acronyms must not turn ordinary words into links.
          if (/^[A-Z0-9]{2,5}$/.test(item.label) && match[0] !== item.label) continue;
          remember(item.term.id);
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
