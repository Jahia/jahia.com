import { jahiaComponent } from "@jahia/javascript-modules-library";
import { LinkTypeCTA, type LinkTypeProps } from "../../LinkTypeCTA.jsx";
import classes from "./component.module.css";

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
    <article className={classes.item}>
      <h3>{title}</h3>
      {body && <p style={{ flex: 1 }}>{body}</p>}
      {cta.ctaType !== "none" && (
        <p>
          <LinkTypeCTA cta={cta} />
        </p>
      )}
    </article>
  ),
);
