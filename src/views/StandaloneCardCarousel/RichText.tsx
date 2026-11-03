import { sanitizeRichText } from "./security.js";

export default function RichText({ html }: { html?: string }) {
  // Content Editor HTML crosses a sanitization boundary before HTML insertion.
  return html ? <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} /> : null;
}
