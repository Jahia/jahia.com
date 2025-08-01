import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";
import { MixinCTA } from "../../mixins/CTA/server.jsx";

export const HeroWithoutImage = jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:heroWithoutImage",
  },
  ({ theme, "jcr:title": title, subtitle, background, ...cta }: Props) => (
    <header className={classes.hero} data-theme={theme} data-bg={background}>
      <div className={classes.grid}>
        {title && <h1>{title}</h1>}
        <div className="_stack-4">
          {subtitle && <div className="_richtext" dangerouslySetInnerHTML={{ __html: subtitle }} />}
          {cta.ctaType !== "none" && (
            <p>
              <MixinCTA cta={cta} />
            </p>
          )}
        </div>
      </div>
    </header>
  ),
);
