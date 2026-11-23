import { parseFragment, serialize, type DefaultTreeAdapterMap } from "parse5";

export function profileBiography(html: string, socialLinks: string[]) {
  const fragment = parseFragment(html);
  fragment.childNodes = fragment.childNodes.filter((node) => {
    if (!("tagName" in node) || node.tagName !== "p") return true;
    const content = node.childNodes.filter((child) => !("value" in child) || child.value.trim());
    return !(
      content.length === 1 &&
      "tagName" in content[0] &&
      content[0].tagName === "a" &&
      socialLinks.includes(content[0].attrs.find((attr) => attr.name === "href")?.value || "")
    );
  });
  return serialize(fragment);
}

/** Reuse the existing biography without copying or generating editorial fields. */
export function readBiography(html: string) {
  const fragment = parseFragment(html);
  const links: string[] = [];
  const text = (node: DefaultTreeAdapterMap["childNode"]): string => {
    if ("value" in node) return node.value;
    if (!("childNodes" in node)) return "";
    if ("tagName" in node && /^(script|style)$/.test(node.tagName)) return "";
    const value = node.childNodes.map(text).join("");
    if ("tagName" in node && node.tagName === "a") {
      const href = node.attrs.find((attr) => attr.name === "href")?.value;
      if (href) links.push(href);
      if (/^https?:\/\//i.test(value.trim())) return "";
    }
    return "tagName" in node && /^(p|div|br|li)$/.test(node.tagName) ? `${value} ` : value;
  };
  const paragraphs = fragment.childNodes
    .map(text)
    .map((value) => value.replace(/\s+/g, " ").trim());
  return { excerpt: paragraphs.find(Boolean) || "", links };
}

/** Keep cards brief without CSS clipping or ellipses; full text stays on the profile. */
export function cardIntroduction(value: string, limit = 160) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit + 1);
  const sentence = [...prefix.matchAll(/[.!?](?=\s|$)/g)].at(-1);
  if (sentence && sentence.index >= 40) return prefix.slice(0, sentence.index + 1);
  const boundary = prefix.lastIndexOf(" ");
  return prefix.slice(0, boundary > 0 ? boundary : limit - 1).replace(/[\s,;:….-]+$/g, "") + ".";
}
