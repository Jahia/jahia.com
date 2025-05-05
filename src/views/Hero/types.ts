import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { LinkTypeProps } from "../LinkTypeCTA.jsx";
import type { ThemeProps } from "../../theme.js";

export type Props = ThemeProps & {
  "jcr:title"?: string;
  "subtitle"?: string;
  "image": JCRNodeWrapper;
  "background"?: "plusses" | "stripes";
} & ({ ctaType: "none" } | LinkTypeProps);
