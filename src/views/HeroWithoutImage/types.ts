import type { ContainerProps } from "../../theme/index.js";
import type { CTAProps } from "../../mixins/CTA/server.jsx";
import type { AdditionalButtonProps } from "./Buttons.js";

export type Props = ContainerProps & {
  "jcr:title"?: string;
  "subtitle"?: string;
} & CTAProps &
  AdditionalButtonProps;
