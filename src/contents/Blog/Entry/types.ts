import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "jcr:title"?: string;
  "author": JCRNodeWrapper;
  "summary"?: string;
  "date"?: string;
  "useLastModifiedDate"?: boolean;
  "jcr:lastModified"?: string;
  "blogType"?: Array<JCRNodeWrapper | null>;
  "j:defaultCategory"?: Array<JCRNodeWrapper | null>;
  "image"?: JCRNodeWrapper;
  "text"?: string;
  "seoKeywords"?: string[];
  "jcr:description"?: string; /* Meta description, fall back for summary */
}
