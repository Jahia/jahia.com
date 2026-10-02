import xss from "xss";

// The CommonJS runtime exposes these helpers on its default export.
const { FilterXSS, safeAttrValue } = xss as unknown as typeof import("xss");

const attributes: Record<string, string[]> = {
  a: ["href", "target", "data-glossary-mention"],
  th: ["scope", "colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  col: ["span"],
  colgroup: ["span"],
  ol: ["start", "reversed", "type"],
  li: ["value"],
  img: ["src", "alt", "width", "height", "loading"],
};
const tags =
  "p br hr div span h2 h3 h4 h5 h6 strong em b i u s small sub sup abbr a ul ol li dl dt dd blockquote cite code pre table caption thead tbody tfoot tr th td colgroup col figure figcaption img".split(
    " ",
  );
const filter = new FilterXSS({
  whiteList: Object.fromEntries(
    tags.map((tag) => [tag, ["title", "lang", "dir", ...(attributes[tag] || [])]]),
  ),
  stripIgnoreTag: true,
  stripIgnoreTagBody: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "svg",
    "math",
    "template",
    "noscript",
  ],
  allowCommentTag: false,
  css: false,
  safeAttrValue(tag, name, value, cssFilter) {
    const safe = safeAttrValue(tag, name, value, cssFilter);
    if (
      (name === "href" || name === "src") &&
      (!/^(?:https?:\/\/|\/(?!\/)|\.\.?\/|#|mailto:|tel:)/i.test(safe) || safe.includes("\\"))
    )
      return "";
    return safe;
  },
  onTagAttr(tag, name, value, isWhite) {
    if (isWhite && tag === "a" && name === "target")
      return value === "_blank" ? 'target="_blank" rel="noopener noreferrer"' : "";
  },
});

/** Final render boundary for CMS rich text; the stored editorial source is untouched. */
export function sanitizeHtml(html: string): string {
  return filter.process(html);
}
