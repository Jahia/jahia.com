import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";
import type { ContainerProps } from "../../theme/index.jsx";

export type SelectionMode = "automatic" | "filtered" | "manual";

type OptionalCTAProps = CTAProps | { ctaType?: undefined };

export type ResourceCarouselProps = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "itemCount"?: number;
  "minimumItems"?: number;
  "selectionMode"?: SelectionMode;
  "clusters"?: Array<JCRNodeWrapper | null>;
  "manualItems"?: Array<JCRNodeWrapper | null>;
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
  clusters: string[];
};
