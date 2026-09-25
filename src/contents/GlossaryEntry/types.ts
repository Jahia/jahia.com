import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "indexPage"?: JCRNodeWrapper;
  "jcr:title"?: string;
  "summary": string;
  "aliases"?: string[];
  "body"?: string;
  "definitionTitle"?: string;
  "exampleTitle"?: string;
  "example"?: string;
  "faq"?: string;
  "comparisonTitle"?: string;
  "comparison"?: string;
  "resources"?: JCRNodeWrapper[];
  "relatedTerms"?: JCRNodeWrapper[];
}
