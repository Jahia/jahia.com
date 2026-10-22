import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = {
  "jcr:title"?: string;
  "description"?: string;
  "formatLabel"?: string;
  "visualLabel"?: string;
  "image"?: JCRNodeWrapper;
  "document"?: JCRNodeWrapper;
  "isDownload"?: boolean;
  "copyText"?: string;
  "copyLabel"?: string;
} & CTAProps;
