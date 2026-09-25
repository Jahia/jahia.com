import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "entriesFolder"?: JCRNodeWrapper;
  "jcr:title"?: string;
  "introduction"?: string;
  "explanation"?: string;
  "searchLabel"?: string;
  "searchPlaceholder"?: string;
  "searchHelp"?: string;
  "updatedLabel"?: string;
}
