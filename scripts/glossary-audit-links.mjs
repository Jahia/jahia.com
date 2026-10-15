import { parse } from "parse5";

// Use the CTA's semantic markers, independently of presentation and section titles.
export function readRelatedLinks(html, baseUrl) {
  const links = [];
  const visit = (node) => {
    const attributes = Object.fromEntries(
      (node.attrs || []).map(({ name, value }) => [name, value]),
    );
    if (
      node.tagName === "a" &&
      attributes["data-element-location"] === "glossary" &&
      attributes["data-element-name"] === "related-term" &&
      attributes.href
    ) {
      links.push(new URL(attributes.href, baseUrl));
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html));
  return links;
}
