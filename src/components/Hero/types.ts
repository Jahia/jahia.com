import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { CTAProps } from "./CTA.jsx";

export type Props = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "image": JCRNodeWrapper;
  "background"?: "plusses" | "stripes";
} & ({ "j:linkType": "none" } | CTAProps);
