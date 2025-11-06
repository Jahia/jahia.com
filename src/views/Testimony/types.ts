import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";
import type { ContainerProps } from "../../theme/index.jsx";

export type Props = ContainerProps & {
  author?: string;
  quote: string;
  image?: JCRNodeWrapper;
} & CTAProps;
