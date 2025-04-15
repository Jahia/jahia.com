import { buildNodeUrl } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { JCRNodeWrapper } from "org.jahia.services.content";

export type CTAProps =
  | { "j:linkType": "internal"; "j:linknode": JCRNodeWrapper; "ctaLabel"?: string }
  | { "j:linkType": "external"; "j:url": string; "j:linkTitle": string; "ctaLabel"?: string };

export const CTA = ({ cta }: { cta: CTAProps }) => (
  <a
    className={classes.cta}
    href={cta["j:linkType"] === "internal" ? buildNodeUrl(cta["j:linknode"]) : cta["j:url"]}
    title={cta["j:linkType"] === "external" ? cta["j:linkTitle"] : undefined}
  >
    {cta.ctaLabel ||
      (cta["j:linkType"] === "internal"
        ? cta["j:linknode"].getPropertyAsString("jcr:title")
        : cta["j:linkTitle"])}
    <span className={classes.ctaLine} />
    <span className="i-ri:arrow-right-wide-line" />
  </a>
);
