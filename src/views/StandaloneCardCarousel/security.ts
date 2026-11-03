import filterXSS from "xss";

const { safeAttrValue } = filterXSS as unknown as typeof import("xss");

/** No executable URLs, protocol-relative URLs, controls or local file paths. */
export const safeUrl = (value?: string): string | undefined => {
  const url = value?.trim();
  if (
    !url ||
    url.startsWith("//") ||
    [...url].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === "\\";
    })
  )
    return undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1].toLowerCase();
  return !scheme || ["https", "http", "mailto", "tel"].includes(scheme) ? url : undefined;
};

export const sanitizeRichText = (value: string): string =>
  filterXSS(value, {
    whiteList: {
      p: [],
      br: [],
      strong: [],
      em: [],
      b: [],
      i: [],
      u: [],
      ul: [],
      ol: [],
      li: [],
      blockquote: [],
      a: ["href", "title"],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style", "iframe", "object", "svg", "math"],
    safeAttrValue: (tag, name, value, cssFilter) =>
      name === "href"
        ? safeAttrValue(tag, name, safeUrl(value) || "", cssFilter)
        : safeAttrValue(tag, name, value, cssFilter),
  });
