import type { CTAProps } from "../../mixins/CTA/server.jsx";
import type { ContainerProps } from "../../theme/index.jsx";

export type CardCarouselProps = {
  "jcr:title"?: string;
  "eyebrow"?: string;
  "subtitle"?: string;
  "desktopCards"?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  "tabletCards"?: "1" | "2";
  "cardSpacing"?: "compact" | "normal" | "large";
  "showArrows"?: boolean;
  "showPagination"?: boolean;
} & ContainerProps &
  CTAProps;
