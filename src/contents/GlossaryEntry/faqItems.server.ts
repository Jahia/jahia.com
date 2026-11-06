import type { JCRNodeWrapper } from "org.jahia.services.content";
import { parseFaqData } from "./faqItems.js";

/** Both visible FAQ and metadata read the same translated property in the current workspace. */
export function selectedFaqItems(entry: JCRNodeWrapper) {
  return parseFaqData(
    entry.hasProperty("faqData") ? entry.getPropertyAsString("faqData") : undefined,
  );
}
