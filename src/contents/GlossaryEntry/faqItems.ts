import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { sanitizeHtml } from "./sanitizeHtml.js";
export interface FaqItem {
  key: string;
  question: string;
  html: string;
}

/** Plain text for the existing FAQPage schema, without treating answer headings as questions. */
export function richTextPlainText(html: string): string {
  const text = (node: DefaultTreeAdapterMap["childNode"]): string => {
    if ("value" in node) return node.value;
    if (!("childNodes" in node)) return "";
    const value = node.childNodes.map(text).join("");
    return "tagName" in node && /^(p|div|li|ul|ol|br|blockquote|h[1-6])$/.test(node.tagName)
      ? `${value} `
      : value;
  };
  return parseFragment(sanitizeHtml(html))
    .childNodes.map(text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Invalid drafts never execute code or erase the historical fallback. */
export function parseFaqData(value?: string): FaqItem[] {
  try {
    const rows: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row, index) => {
      if (
        !row ||
        typeof row !== "object" ||
        typeof row.question !== "string" ||
        typeof row.answer !== "string"
      )
        return [];
      const question = row.question.trim();
      const html = sanitizeHtml(row.answer);
      return question && richTextPlainText(html) ? [{ key: "faq-" + index, question, html }] : [];
    });
  } catch {
    return [];
  }
}
