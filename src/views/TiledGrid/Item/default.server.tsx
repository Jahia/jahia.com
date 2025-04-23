import { jahiaComponent } from "@jahia/javascript-modules-library";
import { LinkTypeCTA, type LinkTypeProps } from "../../LinkTypeCTA.jsx";

type Props = {
  "jcr:title"?: string;
  "body"?: string;
} & ({ ctaType: "none" } | LinkTypeProps);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:tiledGridItem",
  },
  ({ "jcr:title": title, body, ...cta }: Props) => (
    <article>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {cta.ctaType !== "none" && <LinkTypeCTA cta={cta} />}
    </article>
  ),
);
