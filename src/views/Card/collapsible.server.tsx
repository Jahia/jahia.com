import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import { MixinCTA } from "../../mixins/CTA/server.jsx";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:card",
    // Prefix the view name with "hidden." to prevent manual selection in the UI
    name: "hidden.collapsible",
  },
  ({ "jcr:title": title, body, icon, ...cta }: Props, { renderContext }) => (
    <article className={classes.collapsible} aria-expanded={renderContext.isEditMode()}>
      <h3 className={classes.header}>
        <button type="button" className={classes.toggle}>
          {icon && (
            <img
              src={`${icon.getUrl()}?w=48&h=48`}
              alt={icon.getPropertyAsString("jcr:title")}
              width="24"
              height="24"
            />
          )}
          <span style={{ flex: 1 }}>{title}</span>
          <span className={classes.button}>
            <span className="i-ri:add-line" aria-label="Toggle" />
          </span>
        </button>
      </h3>
      <div className={classes.body}>
        <div className="_stack-4" style={{ padding: "0 1rem 1rem" }}>
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
