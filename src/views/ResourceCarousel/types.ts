import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";
import type { ContainerProps } from "../../theme/index.jsx";

export type SelectionMode = "automatic" | "filtered" | "manual";
export type ResourceKind =
  | "blog"
  | "webinar"
  | "whitepaper"
  | "customerCase"
  | "video"
  | "infographic"
  | "resource";

type OptionalCTAProps = CTAProps | { ctaType?: undefined };

export type ResourceCarouselProps = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "itemCount"?: number;
  "minimumItems"?: number;
  "selectionMode"?: SelectionMode;
  "filteredThemes"?: Array<JCRNodeWrapper | null>;
  "filteredContentTypes"?: Array<JCRNodeWrapper | null>;
  "manualThemes"?: Array<JCRNodeWrapper | null>;
  "manualContentTypes"?: Array<JCRNodeWrapper | null>;
  "selectedContent"?: Array<JCRNodeWrapper | null>;
  "completeFallback"?: boolean;
  "sourceRoot"?: JCRNodeWrapper;
  "hidden"?: boolean;
} & OptionalCTAProps &
  ContainerProps;

export type ResourceCardData = {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
  timestamp: number;
  image?: JCRNodeWrapper;
  kind: ResourceKind;
  typeLabel?: string;
  taxonomyIds: string[];
};
