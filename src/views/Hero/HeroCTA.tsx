import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { CTA } from "../../components/CTA.jsx";

export type HeroCTAProps =
  | { "ctaType": "internal"; "j:linknode": JCRNodeWrapper; "ctaLabel"?: string }
  | { "ctaType": "external"; "j:url": string; "j:linkTitle": string; "ctaLabel"?: string };

export const HeroCTA = ({ cta }: { cta: HeroCTAProps }) => (
  <CTA
    href={cta.ctaType === "internal" ? buildNodeUrl(cta["j:linknode"]) : cta["j:url"]}
    title={cta.ctaType === "external" ? cta["j:linkTitle"] : undefined}
    icon
  >
    {cta.ctaLabel ||
      (cta.ctaType === "internal"
        ? cta["j:linknode"].getPropertyAsString("jcr:title")
        : cta["j:linkTitle"])}
  </CTA>
);
