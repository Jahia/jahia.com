import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "jcr:title"?: string;
  "author": JCRNodeWrapper;
  "summary"?: string;
  "date"?: string;
  "blogType"?: Array<JCRNodeWrapper | null>;
  "image"?: JCRNodeWrapper;
  "text"?: string;
  "seoKeywords"?: string[];
}
