import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "autoLinks"?: boolean;
  "linkKeywords"?: string[];
  "linkThemes"?: JCRNodeWrapper[];
  "excludedLinks"?: JCRNodeWrapper[];
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
