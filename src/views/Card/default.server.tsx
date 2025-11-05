import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
  },
  ({ "jcr:title": title, body, icon, ...cta }: Props) => (
    <article className={classes.card}>
      {icon && (
        <img
          src={`${buildNodeUrl(icon)}?w=96&h=96`}
          alt={icon.getPropertyAsString("jcr:title")}
          width="48"
          height="48"
        />
      )}
      {title && <h3>{title}</h3>}
      {body && (
        <div className="_richtext" style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: body }} />
      )}
      {cta.ctaType !== "none" && (
        <p style={{ marginTop: "1rem", position: "relative", zIndex: 1 }}>
          <MixinCTA cta={cta} />
        </p>
      )}
    </article>
  ),
);
