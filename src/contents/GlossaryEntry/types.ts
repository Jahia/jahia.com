import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "resources"?: Array<JCRNodeWrapper | null>;
  "resourceDisplayCount"?: "3" | "6" | "9";
  "conceptTerms"?: string[];
  "conceptScope"?: string[];
  "conceptSignals"?: string[];
  "preferEducational"?: boolean;
  "indexLabel"?: string;
  "editorialDate"?: string;
  "autoTermLinks"?: boolean;
  "mergedInto"?: JCRNodeWrapper;
  "autoLinks"?: boolean;
  "linkThemes"?: JCRNodeWrapper[];
  "indexPage"?: JCRNodeWrapper;
  "jcr:title"?: string;
  "summary": string;
  "aliases"?: string[];
  "body"?: string;
  "definitionTitle"?: string;
  "exampleTitle"?: string;
  "example"?: string;
  "faq"?: string;
  "faqData"?: string;
  "faqView"?: "cards" | "classic";
  "comparisonTitle"?: string;
  "comparison"?: string;
}
