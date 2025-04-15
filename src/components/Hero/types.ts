import type { JCRNodeWrapper } from "org.jahia.services.content";

export type Props = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "image": JCRNodeWrapper;
  "ctaLabel"?: string;
} & ( // Reflect the three possible values of j:linkType
  | { "j:linkType": "none" }
  | { "j:linkType": "external"; "j:url": string; "j:linkTitle": string }
  | { "j:linkType": "internal"; "j:linknode": JCRNodeWrapper }
);
