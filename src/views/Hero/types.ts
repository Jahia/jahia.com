import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { LinkTypeProps } from "../LinkTypeCTA.jsx";
import type { ContainerProps } from "../../theme/index.js";

export type Props = ContainerProps & { image: JCRNodeWrapper } & (
    | { ctaType: "none" }
    | LinkTypeProps
  );
