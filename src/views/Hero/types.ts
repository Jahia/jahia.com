import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ContainerProps } from "../../theme/index.js";
import type { CTAProps } from "../../mixins/CTA/server.jsx";

export type Props = ContainerProps & { image: JCRNodeWrapper } & CTAProps;
