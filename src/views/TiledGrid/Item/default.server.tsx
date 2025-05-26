import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { MixinCTA, type CTAProps } from "../../../mixins/CTA/server.jsx";

type Props = {
  "jcr:title"?: string;
  "body"?: string;
} & CTAProps;

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
          <MixinCTA cta={cta} />
        </p>
      )}
    </article>
  ),
);
