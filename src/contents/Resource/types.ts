import type { JCRNodeWrapper } from "org.jahia.services.content";

export interface Props {
  "jcr:title"?: string;
  "jcr:description"?: string;
  "kind"?: JCRNodeWrapper;
  "description"?: string;
  "form"?: string;
}
