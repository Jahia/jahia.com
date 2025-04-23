import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { LinkTypeProps } from "../LinkTypeCTA.jsx";

export type Props = {
  "jcr:title"?: string;
  "subtitle"?: string;
  "image": JCRNodeWrapper;
  "background"?: "plusses" | "stripes";
} & ({ ctaType: "none" } | LinkTypeProps);
