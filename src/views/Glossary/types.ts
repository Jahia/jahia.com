import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "showUnusedLetters"?: boolean;
  "entriesFolder"?: JCRNodeWrapper;
  "jcr:title"?: string;
  "introduction"?: string;
  "explanation"?: string;
  "searchLabel"?: string;
  "searchPlaceholder"?: string;
  "searchHelp"?: string;
  "updatedLabel"?: string;
}
