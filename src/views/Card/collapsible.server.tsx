import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
    name: "collapsible",
  },
  ({ "jcr:title": title, body, ...cta }: Props, { renderContext }) => (
    <article className={classes.collapsible} aria-expanded={renderContext.isEditMode()}>
      <h3 className={classes.header}>
        <button type="button" className={classes.toggle}>
          <span style={{ flex: 1 }}>{title}</span>
          <span className={classes.button}>
            <span className="i-ri:add-line" aria-label="Toggle" />
          </span>
        </button>
      </h3>
      <div className={classes.body}>
        <div className="_stack-4" style={{ padding: "1rem" }}>
          {body && <div className="_richtext" dangerouslySetInnerHTML={{ __html: body }} />}
          {cta.ctaType !== "none" && (
            <p>
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
      </div>
    </article>
  ),
);
