import { parseFragment, serializeOuter, type DefaultTreeAdapterMap } from "parse5";
type Node = DefaultTreeAdapterMap["childNode"];
const text = (node: Node): string =>
  "value" in node ? node.value : "childNodes" in node ? node.childNodes.map(text).join("") : "";
const hasHeading = (node: Node): boolean =>
  ("tagName" in node && /^h[23]$/.test(node.tagName)) ||
  ("childNodes" in node && node.childNodes.some(hasHeading));

/** Split sanitized editorial H3/answer pairs; never alter the stored FAQ or its JSON-LD parser. */
export function faqBlocks(sanitizedHtml: string) {
  const blocks: Array<{ key: string; question?: string; html: string }> = [];
  let current: (typeof blocks)[number] | undefined;
  const block = (question?: string) => {
    const next = { key: `faq-block-${blocks.length}`, question, html: "" };
    blocks.push(next);
    current = next;
    return next;
  };
  const visit = (node: Node) => {
    if ("tagName" in node && node.tagName === "h3") {
      block(text(node).replace(/\s+/g, " ").trim());
      return;
    }
    if ("tagName" in node && node.tagName === "h2") {
      block().html = serializeOuter(node);
      current = undefined;
      return;
    }
    if ("tagName" in node && node.tagName === "div" && hasHeading(node)) {
      node.childNodes.forEach(visit);
      return;
    }
    (current || block()).html += serializeOuter(node);
  };
  parseFragment(sanitizedHtml).childNodes.forEach(visit);
  return blocks.filter((b) => b.question || b.html.trim());
}
