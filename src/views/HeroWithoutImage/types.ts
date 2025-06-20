import type { ContainerProps } from "../../theme/index.js";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = ContainerProps & {
  "jcr:title"?: string;
  "subtitle"?: string;
} & CTAProps;
