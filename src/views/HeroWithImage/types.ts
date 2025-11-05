import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ContainerProps } from "../../theme/index.js";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = ContainerProps & {
  "jcr:title"?: string;
  "subtitle"?: string;
  "image"?: JCRNodeWrapper;
} & CTAProps;
