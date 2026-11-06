import { faqBlocks } from "../../src/contents/GlossaryEntry/faqBlocks.ts";
import { sanitizeHtml } from "../../src/contents/GlossaryEntry/sanitizeHtml.ts";

/** Refuse ambiguous content rather than losing editorial text. */
export function planFaqMigration(rows) {
  return rows
    .filter((row) => row.faq?.trim())
    .map((row) => {
      if (row.faqData?.trim() && row.faqData.trim() !== "[]")
        return {
          ...row,
          action: "skip",
          reason: "Structured FAQ already exists; preserve both values for editorial review.",
        };
      const blocks = faqBlocks(sanitizeHtml(row.faq));
      const orphan = blocks.some((b) => !b.question && b.html.replace(/<[^>]*>/g, "").trim());
      const items = blocks
        .filter((b) => b.question)
        .map((b, i) => ({ id: `migrated-${i + 1}`, question: b.question, answer: b.html }));
      if (orphan || !items.length || items.some((i) => !i.answer.replace(/<[^>]*>/g, "").trim()))
        return {
          ...row,
          action: "skip",
          reason: "Unpaired text or incomplete question; manual review required.",
        };
      return {
        ...row,
        action: "migrate",
        nextData: JSON.stringify(items),
        questions: items.length,
      };
    });
}
