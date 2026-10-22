import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = {
  "jcr:title"?: string;
  "description"?: string;
  "contentType"?: "communique" | "presse" | "recompense" | "tribune" | "evenement";
  "themeLabel"?: string;
  "date"?: string;
  "link"?: JCRNodeWrapper;
  "dateLabel"?: string;
  "image"?: JCRNodeWrapper;
  "cardTheme"?: "day" | "cloudy" | "night";
  "background"?: string;
  "j:defaultCategory"?: Array<JCRNodeWrapper | null>;
} & CTAProps;
