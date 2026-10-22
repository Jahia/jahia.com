import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = {
  "jcr:title"?: string;
  "body"?: string;
  "cardTheme"?: "day" | "cloudy" | "night";
  "hideCtaIcon"?: boolean;
  "icon"?: JCRNodeWrapper;
  "image"?: JCRNodeWrapper;
  "background"?: string;
  "partnerRegionTarget"?: "europe" | "americas" | "apac";
  "glossaryMetric"?: "none" | "entries" | "letters" | "updated";
  "glossaryFolder"?: JCRNodeWrapper;
  "cardPurpose"?: "standard" | "partnerRegion" | "glossaryStatistic";
  "metric"?: "entries" | "letters" | "updated";
  "entriesFolder"?: JCRNodeWrapper;
  "regionTarget"?: "europe" | "americas" | "apac";
} & CTAProps;
