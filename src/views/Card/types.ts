import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = {
  "jcr:title"?: string;
  "body"?: string;
  "icon"?: JCRNodeWrapper;
} & CTAProps;
