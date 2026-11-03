import type { JCRNodeWrapper } from "org.jahia.services.content";

export type CardProps = {
  "jcr:title"?: string;
  "image"?: JCRNodeWrapper;
  "body"?: string;
  "label"?: string;
} & (
  | { "j:linkType"?: "none" }
  | { "j:linkType": "internal"; "j:linknode"?: JCRNodeWrapper }
  | { "j:linkType": "external"; "j:url"?: string; "j:linkTitle"?: string }
);
