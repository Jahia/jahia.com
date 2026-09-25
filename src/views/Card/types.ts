import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = {
  "jcr:title"?: string;
  "body"?: string;
  "icon"?: JCRNodeWrapper;
  "technologyCategories"?: string[];
  "technologyPartnerType"?: "strategic" | "integration";
  "glossaryMetric"?: "none" | "entries" | "letters" | "updated";
  "glossaryFolder"?: JCRNodeWrapper;
  "partnerRegionTarget"?: "europe" | "americas" | "apac";
} & CTAProps;
