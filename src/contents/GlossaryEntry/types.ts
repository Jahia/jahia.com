import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
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
  "comparisonTitle"?: string;
  "comparison"?: string;
}
