import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
  },
  ({ "jcr:title": title, body, ...cta }: Props) => (
    <article className={classes.card}>
      {title && <h3>{title}</h3>}
      {body && (
        <div className="_richtext" style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: body }} />
      )}
      {cta.ctaType !== "none" && (
        <p>
          <MixinCTA cta={cta} />
        </p>
      )}
    </article>
  ),
);
