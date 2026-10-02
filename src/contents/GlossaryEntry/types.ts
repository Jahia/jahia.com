import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "resourceCtaLabel"?: string;
  "resourceCtaVariant"?: "primary" | "secondary";
  "relatedCtaVariant"?: "primary" | "secondary";
  "resourceDisplayCount"?: "3" | "6" | "9";
  "conceptTerms"?: string[];
  "conceptScope"?: string[];
  "conceptSignals"?: string[];
  "preferEducational"?: boolean;
  "indexLabel"?: string;
  "editorialAuthor"?: string;
  "editorialDate"?: string;
  "autoTermLinks"?: boolean;
  "mergedInto"?: JCRNodeWrapper;
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
